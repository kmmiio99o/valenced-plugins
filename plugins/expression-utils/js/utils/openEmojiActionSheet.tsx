import { ActionSheetActionCreators } from '@valenced/discord/actions'
import { getModuleWithImportedPath } from '@valenced/discord/utils/modules/finders'
import type { ComponentType } from 'react'

interface EmojiActionSheetProps {
	emojiNode: {
		id: string
		alt: string
		src: string
	}
}

let EmojiActionSheet: ComponentType<EmojiActionSheetProps> | undefined

export function findEmojiActionSheet() {
	return getModuleWithImportedPath<{
		default: ComponentType<EmojiActionSheetProps>
	}>('modules/messages/native/emoji/MessageEmojiActionSheet.tsx', module => {
		EmojiActionSheet = module.default
	})
}

export function openEmojiActionSheet(emoji: {
	id: string
	name: string
	animated?: boolean
}) {
	if (!EmojiActionSheet) return
	ActionSheetActionCreators.openLazy(
		Promise.resolve({ default: EmojiActionSheet }),
		'expression-utils-reaction-emoji',
		{
			emojiNode: {
				id: emoji.id,
				alt: emoji.name,
				src: `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'webp'}?size=128`,
			},
		},
		'stack',
	)
}
