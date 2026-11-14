import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { forwardRef } from 'react'
import { M3Radio, M3Switch } from '../../components'
import { M3Fab } from '../../components/fab'
import { segmented } from '../../components/groups'
import { AccentTitle, tonalIcon } from '../../components/rows'
import { patchChatInput } from './chatInput'
import { replaceExport, replaceProperty } from './exports'
import { patchComponentByName, patchNamedComponents } from './named'
import { patchSliders } from './sliders'
import type { ComponentType } from 'react'
import type { Settings } from '../../settings/types'
import type { Exports, Restore } from './exports'

const Pill = 999

export function patchComponents(
	settings: Settings,
	reportError: (error: unknown) => void,
) {
	const restores: Restore[] = []
	const cleanups: (() => void)[] = []

	if (settings.expressiveButtons)
		cleanups.push(
			getModules(withProps<Exports>('Button', 'TableRow'), exports =>
				replaceExport(
					exports,
					'Button',
					Button =>
						forwardRef((props: any, ref) => (
							<Button cornerRadius={Pill} {...props} ref={ref} />
						)),
					restores,
					reportError,
				),
			),
		)
	if (settings.expressiveGroups) {
		cleanups.push(
			patchComponentByName('TableRowGroup', segmented, restores, reportError),
			patchComponentByName('RowGroup', segmented, restores, reportError),
		)
	}
	if (settings.expressiveSwitches)
		cleanups.push(
			patchComponentByName('FormSwitch', () => M3Switch, restores, reportError),
		)
	if (settings.expressiveRowTitles)
		cleanups.push(
			patchComponentByName(
				'TableRowGroupTitle',
				() => AccentTitle,
				restores,
				reportError,
			),
		)
	if (settings.expressiveRowIcons) {
		cleanups.push(
			patchComponentByName('TableRowIcon', tonalIcon, restores, reportError),
		)
		cleanups.push(
			getModules(
				withProps<{ TableRow: { Icon?: ComponentType<any> } }>('TableRow'),
				({ TableRow }) => {
					const original = TableRow.Icon
					if (!original) return
					if (
						!replaceProperty(
							TableRow as unknown as Exports,
							'Icon',
							tonalIcon(original),
							restores,
						)
					)
						reportError(new Error('Cannot replace TableRow.Icon export.'))
				},
			),
		)
	}
	if (settings.expressiveSliders)
		cleanups.push(patchSliders(restores, reportError))
	if (settings.expressiveChatInput) cleanups.push(patchChatInput())
	if (settings.expressiveFloatingActionButtons)
		cleanups.push(
			patchComponentByName(
				'FloatingActionButton',
				() => M3Fab,
				restores,
				reportError,
			),
		)
	if (settings.expressiveRadioButtons)
		cleanups.push(
			patchComponentByName('FormRadio', () => M3Radio, restores, reportError),
		)
	cleanups.push(...patchNamedComponents(settings, restores, reportError))

	return () => {
		for (const cleanup of cleanups) cleanup()
		for (const restore of restores.splice(0)) restore()
	}
}
