import { Tokens } from '@valenced/discord/common/tokens'
import { getModules } from '@valenced/modules/finders'
import {
	createFilterGenerator,
	withProps,
} from '@valenced/modules/finders/filters'
import { beforeJSX } from '@valenced/react/jsx-runtime'
import { StyleSheet, View } from 'react-native'
import { Roles, withAlpha } from '../../components/colors'
import { SegmentedGroupSurface, segmented } from '../../components/groups'
import {
	expressiveHeaderAction,
	expressiveHeaderActions,
	largeTitle,
	messageRowSurface,
	setGuildShapesEnabled,
	shapedGuild,
} from '../../components/screens'
import { replaceExport, replaceProperty } from './exports'
import type { ComponentType } from 'react'
import type { Settings } from '../../settings/types'
import type { Exports, Restore } from './exports'

type Component = {
	displayName?: string
	name?: string
	render?: unknown
	type?: unknown
}

function componentName(component: unknown): string | undefined {
	if (typeof component === 'function')
		return (component as Component).displayName ?? component.name
	if (!component || typeof component !== 'object') return

	const candidate = component as Component
	return (
		candidate.displayName ??
		componentName(candidate.render) ??
		componentName(candidate.type)
	)
}

const withComponent = createFilterGenerator<[name: string]>(
	([name], _id, exports) => {
		if (!exports || typeof exports !== 'object') return false
		const module = exports as Record<string, unknown>
		return (
			componentName(module[name]) === name ||
			componentName(module.default) === name
		)
	},
	([name]) => `material-you-expressive.component(${name})`,
)

export function patchComponentByName(
	name: string,
	wrap: (original: ComponentType<any>) => ComponentType<any>,
	restores: Restore[],
	reportError: (error: unknown) => void,
) {
	return getModules(
		withComponent(name),
		exports => {
			const module = exports as Exports
			const key = componentName(module[name]) === name ? name : 'default'
			replaceExport(module, key, wrap, restores, reportError)
		},
		{ returnNamespace: true },
	)
}

export function replaceComponentByName(
	name: string,
	replacement: ComponentType<any>,
	restores: Restore[],
	reportError: (error: unknown) => void,
) {
	const patchedComponents = new Set<ComponentType<any>>()
	return getModules(
		withComponent(name),
		exports => {
			const module = exports as Exports
			const key = componentName(module[name]) === name ? name : 'default'
			const original = module[key] as ComponentType<any>
			if (!patchedComponents.has(original)) {
				patchedComponents.add(original)
				restores.push(
					beforeJSX(original, args => [replacement, args[1], args[2]]),
				)
			}
			replaceExport(module, key, () => replacement, restores, reportError)
		},
		{ returnNamespace: true },
	)
}

const NamedComponents = [
	['expressiveButtons', 'ChannelActions', expressiveHeaderActions],
	[
		'expressiveButtons',
		'NavigationHeaderWithSearchWrapped',
		expressiveHeaderActions,
	],
	['expressiveButtons', 'IconButton', expressiveHeaderAction],
	['expressiveButtons', 'IconActionButton', expressiveHeaderAction],
	['expressiveHeaders', 'GenericHeaderTitle', largeTitle],
	['expressiveMessageRows', 'MessagesItemChannelBase', messageRowSurface],
] as const

const GuildsBarComponent = 'GuildsBarAnimatedItemWrapper'
const ExpressiveHeaderTitle = largeTitle()

function patchTabStyles(restores: Restore[]) {
	const segmentedControlBackground =
		Tokens.default.colors.MOBILE_SEGMENTED_CONTROL_BACKGROUND
	const segmentedControlIndicator =
		Tokens.default.colors.MOBILE_SEGMENTED_CONTROL_INDICATOR_BACKGROUND

	restores.push(
		beforeJSX(View, args => {
			const [type, props, key] = args
			const style = StyleSheet.flatten(props.style)

			if (
				style?.position === 'absolute' &&
				style.width === '100%' &&
				style.height === '100%' &&
				style.flexDirection === 'row' &&
				(style.borderRadius != null || style.alignItems === 'flex-end')
			)
				return [type, { ...props, pointerEvents: 'none' }, key]

			if (
				style?.display === 'flex' &&
				style.flexDirection === 'row' &&
				style.alignItems === 'center' &&
				style.paddingVertical != null &&
				style.borderRadius != null &&
				style.backgroundColor === segmentedControlBackground
			)
				return [
					type,
					{
						...props,
						style: [
							props.style,
							{
								backgroundColor: Roles.surfaceHighest(),
								borderColor: withAlpha(Roles.outline(), 0.32),
								borderWidth: 1,
								paddingHorizontal: 2,
							},
						],
					},
					key,
				]

			if (
				style?.flex === 1 &&
				style.borderRadius != null &&
				style.backgroundColor === segmentedControlIndicator
			)
				return [
					type,
					{
						...props,
						style: [
							props.style,
							{
								backgroundColor: withAlpha(Roles.primary(), 0.16),
							},
						],
					},
					key,
				]

			return args
		}),
	)
}

function patchLeftAlignedHeaderTitle(restores: Restore[]) {
	return getModules(
		withProps<{ Heading: ComponentType<any> }>('Heading'),
		exports => {
			restores.push(
				beforeJSX(exports.Heading, args => {
					const [, props, key] = args
					if (
						props.variant !== 'redesign/heading-18/bold' ||
						props.color !== 'mobile-text-heading-primary' ||
						props.lineClamp !== 1
					)
						return args

					return [ExpressiveHeaderTitle, { title: props.children }, key]
				}),
			)
		},
		{ max: 1 },
	)
}

function patchActionSheetRowGroup(
	restores: Restore[],
	reportError: (error: unknown) => void,
) {
	return getModules(
		withProps<Exports>('ActionSheetRow'),
		exports => {
			const module = exports as unknown as Exports
			const actionSheetRow = module.ActionSheetRow as
				| (ComponentType<any> & { Group?: ComponentType<any> })
				| undefined
			const group = actionSheetRow?.Group
			if (!group || componentName(group) !== 'ActionSheetRowGroup') return
			if (
				!replaceProperty(
					actionSheetRow as unknown as Exports,
					'Group',
					segmented(group),
					restores,
				)
			)
				reportError(new Error('Cannot replace ActionSheetRow.Group export.'))
		},
		{ returnNamespace: true },
	)
}

function patchSegmentedGroupSurface(restores: Restore[]) {
	restores.push(
		beforeJSX(View, args => {
			const [, props, key] = args
			const style = StyleSheet.flatten(props.style)
			const tableRowGroupSurface =
				style?.overflow === 'hidden' &&
				style.flexGrow === 1 &&
				style.flexShrink === 0 &&
				style.padding === 0 &&
				typeof style.borderRadius === 'number'
			const rowGroupSurface =
				style?.backgroundColor ===
					Tokens.default.colors.TABLEROW_BACKGROUND_DEFAULT &&
				style.borderRadius ===
					Tokens.default.modules.mobile.TABLE_ROW_BORDER_RADIUS &&
				style.padding === Tokens.default.modules.mobile.TABLE_ROW_PADDING

			if (!tableRowGroupSurface && !rowGroupSurface) return args

			return [SegmentedGroupSurface, props, key]
		}),
	)
}

export function patchNamedComponents(
	settings: Settings,
	restores: Restore[],
	reportError: (error: unknown) => void,
) {
	setGuildShapesEnabled(settings.expressiveGuilds)
	const patches = NamedComponents.filter(([feature]) => settings[feature]).map(
		([, name, wrap]) => patchComponentByName(name, wrap, restores, reportError),
	)
	patchSegmentedGroupSurface(restores)
	if (settings.expressiveGroups) {
		patches.push(patchActionSheetRowGroup(restores, reportError))
	}
	if (settings.expressiveHeaders)
		patches.push(patchLeftAlignedHeaderTitle(restores))
	if (settings.expressiveTabs) patchTabStyles(restores)
	patches.push(
		patchComponentByName(
			GuildsBarComponent,
			shapedGuild,
			restores,
			reportError,
		),
		() => setGuildShapesEnabled(false),
	)
	return patches
}
