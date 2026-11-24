import { ActionSheetActionCreators } from '@valenced/discord/actions'
import { getModuleWithImportedPath } from '@valenced/discord/utils/modules/finders'
import { modules } from '../common'
import type { ComponentType } from 'react'

type EmojiActionSheetProps = {
	emojiNode:
		| { id: string; alt: string; src: string }
		| { surrogate: string; content: string }
}

let EmojiActionSheet: ComponentType<EmojiActionSheetProps> | undefined

export function findEmojiActionSheet() {
	return getModuleWithImportedPath<{
		default: ComponentType<EmojiActionSheetProps>
	}>('modules/messages/native/emoji/MessageEmojiActionSheet.tsx', module => {
		EmojiActionSheet = module.default
	})
}

export function emojiSrc(id: string, animated?: boolean, size = 128) {
	return (
		modules.avatarUtils?.getEmojiURL({ id, animated: animated ?? false, size }) ??
		`https://cdn.discordapp.com/emojis/${id}.webp?size=${size}${animated ? '&animated=true' : ''}`
	)
}

/** Returns false when the Discord sheet module has not been found yet. */
export function openEmojiActionSheet(emoji: {
	id: string
	name: string
	animated?: boolean
}): boolean {
	if (!EmojiActionSheet) return false
	ActionSheetActionCreators.openLazy(
		Promise.resolve({ default: EmojiActionSheet }),
		'expression-utils-reaction-emoji',
		{
			emojiNode: {
				id: emoji.id,
				alt: emoji.name,
				src: emojiSrc(emoji.id, emoji.animated),
			},
		},
		'stack',
	)
	return true
}

export function openUnicodeEmojiActionSheet(
	surrogate: string,
	name: string,
): boolean {
	if (!EmojiActionSheet) return false
	ActionSheetActionCreators.openLazy(
		Promise.resolve({ default: EmojiActionSheet }),
		'expression-utils-typing-unicode-emoji',
		{ emojiNode: { surrogate, content: `:${name}:` } },
		'stack',
	)
	return true
}
