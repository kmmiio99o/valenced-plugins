import { ActionSheetActionCreators } from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import { ACTIVITY_LABELS } from '../../constants'
import { getSettings, setSettings } from '../../lib/state'
import { ACTION_SHEET_KEY } from '../sheetKeys'
import type { ActivityType } from '../../types'

function closeSheet() {
	ActionSheetActionCreators.hideActionSheet(ACTION_SHEET_KEY)
}

export function ActivityTypeSheet() {
	const {
		ActionSheet,
		BottomSheetTitleHeader,
		TableRadioGroup,
		TableRadioRow,
	} = Design

	const current = getSettings().activityType

	return (
		<ActionSheet>
			<BottomSheetTitleHeader title="Activity Status" />
			<TableRadioGroup
				value={current as ActivityType}
				onChange={(value: ActivityType) => {
					const v = Number(value)
					if (!ACTIVITY_LABELS[v as ActivityType]) return
					setSettings({ activityType: v as ActivityType })
					closeSheet()
				}}
			>
				{Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
					<TableRadioRow
						key={value}
						value={Number(value) as ActivityType}
						label={label}
					/>
				))}
			</TableRadioGroup>
		</ActionSheet>
	)
}

export function openActivityTypePicker() {
	ActionSheetActionCreators.openLazy(
		Promise.resolve({ default: ActivityTypeSheet }),
		ACTION_SHEET_KEY,
		{},
	)
}
