import { getModuleWithImportedPath } from '@valenced/discord/utils/modules/finders'
import { appendAction, patchFunction } from './reactTree'
import type { FC } from 'react'

interface EmojiContentProps {
	emojiNode?: { id: string; src: string; alt: string; animated?: boolean }
}

type AddCleanup = (cleanup: () => void) => void
type ReportError = (error: unknown) => void

export function installEmojiSheetPatch(
	addCleanup: AddCleanup,
	reportError: ReportError,
) {
	addCleanup(
		getModuleWithImportedPath<{
			default: FC<EmojiContentProps>
		}>('modules/messages/native/emoji/CustomEmojiContent.tsx', module => {
			addCleanup(
				patchFunction(module, 'default', (args, result) => {
					const emoji = (args[0] as EmojiContentProps | undefined)?.emojiNode
					if (!emoji?.id) return result

					try {
						appendAction(result, {
							kind: 'emoji',
							emoji: {
								id: emoji.id,
								src: emoji.src,
								alt: emoji.alt,
								animated: emoji.animated,
							},
						})
					} catch (error) {
						reportError(`Failed to add emoji actions: ${String(error)}`)
					}
					return result
				}),
			)
		}),
	)
}
