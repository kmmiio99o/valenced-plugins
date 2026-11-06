import { ActionSheetActionCreators } from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import ApplicationEditor from '../components/ApplicationEditor'
import { APPLICATION_SHEET_KEY } from '../sheetKeys'

function closeSheet() {
	ActionSheetActionCreators.hideActionSheet(APPLICATION_SHEET_KEY)
}

function ApplicationSheet() {
	const { ActionSheet, BottomSheetTitleHeader } = Design

	return (
		<ActionSheet>
			<BottomSheetTitleHeader title="Application" />
			<ApplicationEditor onVerified={closeSheet} />
		</ActionSheet>
	)
}

export function openApplicationSheet() {
	ActionSheetActionCreators.openLazy(
		Promise.resolve({ default: ApplicationSheet }),
		APPLICATION_SHEET_KEY,
		{},
	)
}
