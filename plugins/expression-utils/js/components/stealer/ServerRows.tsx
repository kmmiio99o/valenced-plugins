import { ActionSheetActionCreators } from '@valenced/discord/actions'
import { Constants } from '@valenced/discord/common/constants'
import { Design } from '@valenced/discord/design'
import { Stores } from '@valenced/discord/flux'
import { useSyncExternalStore } from 'react'
import { Image, View } from 'react-native'
import { modules } from '../../common'
import { uploadEmoji } from '../../utils/uploadEmoji'
import { uploadSticker } from '../../utils/uploadSticker'
import type { Guild } from '../../types'
import type { CloneableExpression } from './types'

interface EmojiStore {
	getGuilds(): Record<
		string,
		{ emojis?: { name: string; animated?: boolean }[] }
	>
	addReactChangeListener(callback: () => void): void
	removeReactChangeListener(callback: () => void): void
}

interface GuildStore {
	getGuilds(): Record<string, Guild>
}

interface PermissionStore {
	can(permission: bigint, target: Guild): boolean
}

const EMPTY_EMOJIS: { name: string; animated?: boolean }[] = []

export function getGuilds(): Guild[] {
	const guilds = (
		Stores.GuildStore as unknown as GuildStore | undefined
	)?.getGuilds()
	const permission = (
		Constants as unknown as {
			Permissions?: { MANAGE_GUILD_EXPRESSIONS?: bigint }
		}
	).Permissions?.MANAGE_GUILD_EXPRESSIONS
	const permissionStore = Stores.PermissionStore as unknown as
		| PermissionStore
		| undefined

	if (!guilds || permission === undefined || !permissionStore) return []
	return Object.values(guilds).filter(guild =>
		permissionStore.can(permission, guild),
	)
}

function useGuildEmojis(guildId: string) {
	const store = Stores.EmojiStore as unknown as EmojiStore | undefined
	return useSyncExternalStore(
		callback => {
			store?.addReactChangeListener(callback)
			return () => store?.removeReactChangeListener(callback)
		},
		() => store?.getGuilds()[guildId]?.emojis ?? EMPTY_EMOJIS,
		() => EMPTY_EMOJIS,
	)
}

function GuildAvatar({ guild }: { guild: Guild }) {
	if (!guild.icon) {
		return <View style={{ width: 32, height: 32, borderRadius: 16 }} />
	}
	return (
		<Image
			source={{
				uri: `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=64`,
			}}
			style={{ width: 32, height: 32, borderRadius: 16 }}
		/>
	)
}

export function ServerRow({
	guild,
	expression,
	name,
}: {
	guild: Guild
	expression: CloneableExpression
	name: string
}) {
	const { TableRow } = Design
	const emojis = useGuildEmojis(guild.id)
	const isEmoji = expression.kind === 'emoji'
	const animated =
		isEmoji &&
		(expression.emoji.animated || expression.emoji.src.includes('.gif'))
	const used = isEmoji
		? emojis.filter(value => Boolean(value.animated) === animated).length
		: 0
	const max = isEmoji ? modules.emojiSlotUtils?.getMaxEmojiSlots(guild) : 1
	const duplicate = isEmoji && emojis.some(value => value.name === name)
	const detail = !isEmoji
		? 'Clone this sticker to the server'
		: max === undefined
			? 'Emoji capacity is unavailable'
			: `${Math.max(max - used, 0)}/${max} ${
					animated ? 'animated' : 'static'
				} slots available${duplicate ? ' · duplicate name' : ''}`

	return (
		<TableRow
			label={guild.name}
			subLabel={detail}
			icon={<GuildAvatar guild={guild} />}
			disabled={max === undefined}
			onPress={() => {
				ActionSheetActionCreators.hideActionSheet()
				if (expression.kind === 'emoji') {
					void uploadEmoji(guild.id, expression.emoji, name)
				} else {
					void uploadSticker(guild.id, expression.sticker, name)
				}
			}}
		/>
	)
}
