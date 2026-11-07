import { getModuleWithImportedPath } from '@valenced/discord/utils/modules/finders'
import { instead } from '@valenced/patcher'
import { React } from '@valenced/react'
import type {
	ActionSheetStoreModule,
	EmojiReactionRowButtonsModule,
} from '../../types'

const ACTION_SHEET_STORE_PATH =
	'modules/action_sheet/native/ActionSheetStore.tsx'
const REACTION_BUTTONS_PATH =
	'modules/reactions/native/EmojiReactionRowButton.tsx'
const MESSAGE_ACTION_SHEET_KEY = 'MessageLongPressActionSheet'

export function installReactionButtonBackgroundPatch(
	addCleanup: (cleanup: () => void) => void,
) {
	addCleanup(
		getModuleWithImportedPath<ActionSheetStoreModule>(
			ACTION_SHEET_STORE_PATH,
			storeModule => {
				addCleanup(
					getModuleWithImportedPath<EmojiReactionRowButtonsModule>(
						REACTION_BUTTONS_PATH,
						buttonModule => {
							for (const name of [
								'EmojiReactionRowButton',
								'EmojiPickerRowButton',
							] as const) {
								addCleanup(
									instead(buttonModule, name, function (args, original) {
										const result = Reflect.apply(original, this, args)
										if (
											storeModule.default.getKey() !== MESSAGE_ACTION_SHEET_KEY
										) {
											return result
										}
										if (!React.isValidElement(result)) return result
										const element = result as React.ReactElement<{
											style?: unknown
										}>
										return React.cloneElement(element, {
											...element.props,
											style: [
												element.props.style,
												{ backgroundColor: 'transparent' },
											],
										})
									}),
								)
							}
						},
					),
				)
			},
		),
	)
}
