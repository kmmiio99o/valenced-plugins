import {
	getModuleWithImportedPath,
	lookupModuleWithImportedPath,
} from '@valenced/discord/utils/modules/finders'
import { instead } from '@valenced/patcher'
import { replaceActionSheetTree } from '../actionSheetTree'
import { installLongPressOriginCapture } from './longPressOrigin'
import { installPanDownDismissProtection } from './panDownDismiss'
import { installReactionButtonBackgroundPatch } from './reactionButtonBackground'
import type {
	ActionSheetActionCreatorsModule,
	LongPressSheetModule,
} from '../../types'

const LONG_PRESS_SHEET_PATH =
	'modules/messages/native/long_press/LongPressMessageActionSheet.tsx'
const ACTION_SHEET_ACTION_CREATORS_PATH =
	'modules/action_sheet/native/ActionSheetActionCreators.tsx'
const LOG_PREFIX = '[MessageContextMenu]'

export function installLongPressMenu(
	addCleanup: (cleanup: () => void) => void,
) {
	installLongPressOriginCapture(addCleanup)
	installPanDownDismissProtection(addCleanup)
	installReactionButtonBackgroundPatch(addCleanup)
	addCleanup(
		getModuleWithImportedPath<LongPressSheetModule>(
			LONG_PRESS_SHEET_PATH,
			module => {
				console.log(LOG_PREFIX, 'long-press sheet module found')
				addCleanup(
					instead(
						module as Record<'default', LongPressSheetModule['default']>,
						'default',
						function (args, original) {
							const result = Reflect.apply(original, this, args)
							const [actionSheetActionCreators] =
								lookupModuleWithImportedPath<ActionSheetActionCreatorsModule>(
									ACTION_SHEET_ACTION_CREATORS_PATH,
								)
							if (!actionSheetActionCreators) {
								console.warn(
									LOG_PREFIX,
									'ActionSheet action creators module not found',
								)
								return result
							}

							return replaceActionSheetTree(
								result,
								args[0],
								actionSheetActionCreators.default,
							)
						},
					),
				)
			},
		),
	)
}
