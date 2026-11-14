import { Tokens } from '@valenced/discord/common/tokens'
import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { beforeJSX } from '@valenced/react/jsx-runtime'
import { M3Radio, M3Switch } from '../../components'
import { segmented } from '../../components/groups'
import { AccentTitle, tonalIcon } from '../../components/rows'
import { expressiveHeaderAction } from '../../components/screens'
import { patchChatInput } from './chatInput'
import { replaceProperty } from './exports'
import { patchFloatingActionButtons } from './floatingActionButtons'
import { patchInputFields } from './inputFields'
import { patchComponentByName, patchNamedComponents } from './named'
import { patchSliders } from './sliders'
import type { ComponentType } from 'react'
import type { Settings } from '../../settings/types'
import type { Exports, Restore } from './exports'

type PressablesModule = {
	PressableOpacity: ComponentType<any>
}

function patchExpressivePressables(restores: Restore[]) {
	return getModules(
		withProps<PressablesModule>('PressableOpacity'),
		({ PressableOpacity }) => {
			const ExpressivePressable = expressiveHeaderAction(PressableOpacity)
			restores.push(
				beforeJSX(PressableOpacity, args => {
					const [, props, key] = args
					return [ExpressivePressable, props, key]
				}),
			)
		},
	)
}

function patchCardRadius(restores: Restore[]) {
	return getModules(
		withProps<{
			Card: ComponentType<any>
			InternalCard: ComponentType<any>
		}>('Card', 'InternalCard'),
		({ Card }) => {
			restores.push(
				beforeJSX(Card, args => {
					const [type, props, key] = args
					return [type, { ...props, radius: Tokens.default.radii.lg }, key]
				}),
			)
		},
		{ max: 1 },
	)
}

export function patchComponents(
	settings: Settings,
	reportError: (error: unknown) => void,
) {
	const restores: Restore[] = []
	const cleanups: (() => void)[] = []

	cleanups.push(patchInputFields(restores))
	if (settings.expressiveButtons || settings.expressiveChatInput)
		cleanups.push(patchExpressivePressables(restores))
	if (settings.expressiveCorners) cleanups.push(patchCardRadius(restores))
	if (settings.expressiveGroups) {
		cleanups.push(
			patchComponentByName('TableRowGroup', segmented, restores, reportError),
			patchComponentByName('RowGroup', segmented, restores, reportError),
		)
	} else if (settings.expressiveRowTitles) {
		cleanups.push(
			patchComponentByName(
				'TableRowGroup',
				Group =>
					function ExpressiveTableRowGroup({ title, ...props }) {
						return (
							<>
								{title != null ? <AccentTitle title={title} /> : null}
								<Group {...props} />
							</>
						)
					},
				restores,
				reportError,
			),
		)
	}
	if (settings.expressiveSwitches)
		cleanups.push(
			patchComponentByName('FormSwitch', () => M3Switch, restores, reportError),
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
		cleanups.push(patchFloatingActionButtons(restores, reportError))
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
