import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { forwardRef } from 'react'
import { M3Radio, M3Switch } from '../../components'
import { M3Fab } from '../../components/fab'
import { segmented } from '../../components/groups'
import { AccentTitle, tonalIcon } from '../../components/rows'
import { replaceExport } from './exports'
import { patchNamedComponents } from './named'
import { patchSliders } from './sliders'
import type { ComponentType } from 'react'
import type { Settings } from '../../settings/types'
import type { Exports, Restore } from './exports'

const Pill = 999

export function patchComponents(settings: Settings) {
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
				),
			),
		)
	if (settings.expressiveGroups) {
		cleanups.push(
			getModules(
				withProps<Exports>('TableRowGroup'),
				exports => replaceExport(exports, 'TableRowGroup', segmented, restores),
				{ max: 4 },
			),
		)
		cleanups.push(
			getModules(
				withProps<Exports>('RowGroup', 'RowGroupProps'),
				exports => replaceExport(exports, 'RowGroup', segmented, restores),
				{ max: 4 },
			),
		)
	}
	if (settings.expressiveSwitches)
		cleanups.push(
			getModules(
				withProps<Exports>('FormSwitch'),
				exports =>
					replaceExport(exports, 'FormSwitch', () => M3Switch, restores),
				{ max: 4 },
			),
		)
	if (settings.expressiveRowTitles)
		cleanups.push(
			getModules(
				withProps<Exports>('TableRowGroupTitle'),
				exports =>
					replaceExport(
						exports,
						'TableRowGroupTitle',
						() => AccentTitle,
						restores,
					),
				{ max: 4 },
			),
		)
	if (settings.expressiveRowIcons) {
		cleanups.push(
			getModules(
				withProps<Exports>('TableRowIcon'),
				exports => replaceExport(exports, 'TableRowIcon', tonalIcon, restores),
				{ max: 4 },
			),
		)
		cleanups.push(
			getModules(
				withProps<{ TableRow: { Icon?: ComponentType<any> } }>('TableRow'),
				({ TableRow }) => {
					const original = TableRow.Icon
					if (!original) return
					TableRow.Icon = tonalIcon(original)
					restores.push(() => {
						TableRow.Icon = original
					})
				},
			),
		)
	}
	if (settings.expressiveSliders) cleanups.push(patchSliders(restores))
	if (settings.expressiveFloatingActionButtons)
		cleanups.push(
			getModules(
				withProps<Exports>('FloatingActionButton', 'FloatingActionButtonProps'),
				exports =>
					replaceExport(exports, 'FloatingActionButton', () => M3Fab, restores),
				{ max: 4 },
			),
		)
	if (settings.expressiveRadioButtons)
		cleanups.push(
			getModules(
				withProps<Exports>('FormRadio'),
				exports => replaceExport(exports, 'FormRadio', () => M3Radio, restores),
				{ max: 4 },
			),
		)
	cleanups.push(...patchNamedComponents(settings, restores))

	return () => {
		for (const cleanup of cleanups) cleanup()
		for (const restore of restores.splice(0)) restore()
	}
}
