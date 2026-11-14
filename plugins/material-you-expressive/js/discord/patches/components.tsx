import { Tokens } from '@valenced/discord/common/tokens'
import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { beforeJSX } from '@valenced/react/jsx-runtime'
import { cloneElement, isValidElement } from 'react'
import { StyleSheet, View } from 'react-native'
import { M3Radio, M3Switch } from '../../components'
import { segmented } from '../../components/groups'
import { AccentTitle, tonalIcon } from '../../components/rows'
import {
	expressiveHeaderAction,
	expressiveMessageRowPressable,
} from '../../components/screens'
import { patchChatInput } from './chatInput'
import { replaceProperty } from './exports'
import { patchFloatingActionButtons } from './floatingActionButtons'
import { patchInputFields } from './inputFields'
import { patchComponentByName, patchNamedComponents } from './named'
import { patchSliders } from './sliders'
import type { ComponentType, ReactElement, ReactNode } from 'react'
import type { StyleProp, TextStyle } from 'react-native'
import type { Settings } from '../../settings/types'
import type { Exports, Restore } from './exports'

type PressableOpacityModule = {
	PressableOpacity: ComponentType<any>
}

type PressableHighlightModule = {
	PressableHighlight: ComponentType<any>
}

type GuildTagProps = {
	disabledTooltip?: boolean
	userId?: string
}

type ChannelNameProps = {
	ellipsizeMode?: 'tail'
	lineClamp?: number
	style?: StyleProp<TextStyle>
}

function patchGuildTagNicknameTruncation() {
	return beforeJSX(View, args => {
		const [type, props, key] = args
		const style = StyleSheet.flatten(props.style)
		if (
			style?.flexDirection === 'row' &&
			style.justifyContent === 'flex-end' &&
			style.marginLeft != null &&
			style.alignItems == null
		)
			return [type, { ...props, style: [props.style, { flexShrink: 0 }] }, key]

		if (
			style?.flex !== 1 ||
			style.minWidth !== 0 ||
			style.flexDirection !== 'row' ||
			!Array.isArray(props.children)
		)
			return args

		const children = props.children as ReactNode[]
		const tagIndex = children.findIndex(
			child =>
				isValidElement<GuildTagProps>(child) &&
				child.props.disabledTooltip === true &&
				typeof child.props.userId === 'string',
		)
		if (tagIndex < 1) return args

		const nickname = children[tagIndex - 1]
		if (!isValidElement<ChannelNameProps>(nickname)) return args

		const nextChildren = [...children]
		nextChildren[tagIndex - 1] = cloneElement(nickname, {
			style: [
				nickname.props.style,
				{
					flex: 1,
					minWidth: 0,
				},
			],
			lineClamp: 1,
			ellipsizeMode: 'tail',
		}) as ReactElement

		return [type, { ...props, children: nextChildren }, key]
	})
}

function patchExpressivePressables(restores: Restore[], settings: Settings) {
	const cleanups: (() => void)[] = []
	if (settings.expressiveButtons) {
		cleanups.push(
			getModules(
				withProps<PressableOpacityModule>('PressableOpacity'),
				({ PressableOpacity }) => {
					const ExpressivePressable = expressiveHeaderAction(PressableOpacity)
					restores.push(
						beforeJSX(PressableOpacity, args => {
							const [, props, key] = args
							return [ExpressivePressable, props, key]
						}),
					)
				},
			),
		)
	}
	if (settings.expressiveMessageRows) {
		cleanups.push(
			getModules(
				withProps<PressableHighlightModule>('PressableHighlight'),
				({ PressableHighlight }) => {
					const ExpressiveMessageRowPressable =
						expressiveMessageRowPressable(PressableHighlight)
					restores.push(
						beforeJSX(PressableHighlight, args => {
							const [, props, key] = args
							return [ExpressiveMessageRowPressable, props, key]
						}),
					)
				},
			),
		)
	}
	return () => {
		for (const cleanup of cleanups) cleanup()
	}
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

	cleanups.push(patchGuildTagNicknameTruncation())
	cleanups.push(patchInputFields(restores))
	if (settings.expressiveButtons || settings.expressiveMessageRows)
		cleanups.push(patchExpressivePressables(restores, settings))
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
