import { getModuleWithImportedPath } from '@valenced/discord/utils/modules/finders'
import { before } from '@valenced/patcher'
import { openTypingIndicatorEmojis } from '../components/TypingIndicatorEmojisSheet'
import type { FC } from 'react'
import type { TypingIndicatorEmoji } from '../components/TypingIndicatorEmojisSheet'

interface TypingIndicatorDisplayProps {
	config?: { emojis?: TypingIndicatorEmoji[] }
	[key: string]: unknown
}

type AddCleanup = (cleanup: () => void) => void
type ReportError = (error: unknown) => void

export function installTypingIndicatorPatch(
	addCleanup: AddCleanup,
	reportError: ReportError,
) {
	addCleanup(
		getModuleWithImportedPath<{
			default: FC<TypingIndicatorDisplayProps>
		}>(
			'modules/custom_typing_indicator/native/CustomTypingIndicatorDisplay.tsx',
			module => {
				addCleanup(
					before(module, 'default', args => {
						const props = args[0]
						const emojis = props?.config?.emojis ?? []
						args[0] = {
							...props,
							onPress:
								emojis.length > 0
									? () => openTypingIndicatorEmojis(emojis, reportError)
									: undefined,
						}
						return args
					}),
				)
			},
		),
	)
}
