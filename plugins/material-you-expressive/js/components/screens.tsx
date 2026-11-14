import { Tokens } from '@valenced/discord/common/tokens'
import { Design } from '@valenced/discord/design'
import {
	createContext,
	createElement,
	isValidElement,
	useContext,
	useSyncExternalStore,
} from 'react'
import { StyleSheet, View } from 'react-native'
import { color, withAlpha } from './colors'
import type { ComponentType, ReactNode } from 'react'

type Props = Record<string, any>
type Component = ComponentType<Props>

const Pill = 999
const HeaderActionsContext = createContext(false)
let guildShapesEnabled = false
const guildShapeListeners = new Set<() => void>()

function subscribeToGuildShapes(listener: () => void) {
	guildShapeListeners.add(listener)
	return () => guildShapeListeners.delete(listener)
}

const Surface = () =>
	color(['BACKGROUND_SURFACE_HIGH', 'BACKGROUND_MOD_SUBTLE'], '#242b2a')

function componentName(value: unknown): string | undefined {
	if (Array.isArray(value)) {
		for (const child of value) {
			const name = componentName(child)
			if (name) return name
		}
		return
	}
	const type = isValidElement(value) ? value.type : value
	if (typeof type !== 'function') return
	const component = type as ComponentType & { displayName?: string }
	return component.displayName ?? component.name
}

export function setGuildShapesEnabled(enabled: boolean) {
	if (guildShapesEnabled === enabled) return
	guildShapesEnabled = enabled
	for (const listener of guildShapeListeners) listener()
}

/** Marks Discord channel-header actions so their native controls can be styled individually. */
export const expressiveHeaderActions = (Actions: Component) =>
	function ExpressiveHeaderActions(props: Props) {
		return (
			<HeaderActionsContext.Provider value>
				<Actions {...props} />
			</HeaderActionsContext.Provider>
		)
	}

/** Keep channel-header icon buttons compact and surface the channel search action. */
export const expressiveHeaderAction = (Button: Component) =>
	function ExpressiveHeaderAction(props: Props) {
		const inHeaderActions = useContext(HeaderActionsContext)
		if (!inHeaderActions) return createElement(Button, props)

		if (props.icon != null)
			return createElement(Button, { ...props, size: 'sm' })

		const iconName = componentName(props.IconComponent ?? props.children)
		if (iconName === 'MagnifyingGlassIcon')
			return createElement(Button, {
				...props,
				hitSlop: props.hitSlop ?? 8,
				style: [
					props.style,
					styles.searchAction,
					{ backgroundColor: Surface() },
				],
			})

		return createElement(Button, props)
	}

export const largeTitle = () =>
	function LargeTitle({ title }: { title?: ReactNode }) {
		const { Text } = Design as unknown as {
			Text: ComponentType<{
				variant: string
				color?: string
				lineClamp?: number
				style?: object
				children?: ReactNode
			}>
		}

		return (
			<Text variant="heading-xl/extrabold" color="text-strong" lineClamp={1}>
				{title}
			</Text>
		)
	}

const MessageRowSurfaceContext = createContext(false)

export const messageRowSurface = (Row: Component) =>
	function MessageRowSurface(props: Props) {
		return (
			<MessageRowSurfaceContext.Provider value>
				<Row {...props} />
			</MessageRowSurfaceContext.Provider>
		)
	}

export const expressiveMessageRowPressable = (Button: Component) =>
	function ExpressiveMessageRowPressable(props: Props) {
		const inMessageRow = useContext(MessageRowSurfaceContext)
		if (!inMessageRow) return createElement(Button, props)

		const style = StyleSheet.flatten(props.style)
		if (style?.backgroundColor != null) return createElement(Button, props)

		const radius =
			style?.borderRadius ??
			Tokens.default.modules.mobile.TABLE_ROW_BORDER_RADIUS
		const tintLayer = createElement(View, {
			pointerEvents: 'none',
			style: [
				StyleSheet.absoluteFill,
				{
					borderRadius: radius,
					backgroundColor: withAlpha(Surface(), 0.62),
				},
			],
		})
		return createElement(Button, {
			...props,
			style: [props.style, { position: 'relative', borderRadius: radius }],
			children: [tintLayer, props.children],
		})
	}

/** Servers are circles, the selected one morphs into a rounded square. */
export const shapedGuild = (Item: Component) =>
	function ShapedGuild(props: Props) {
		const enabled = useSyncExternalStore(
			subscribeToGuildShapes,
			() => guildShapesEnabled,
		)
		return <Item {...props} circle={enabled ? !props.selected : props.circle} />
	}

const styles = StyleSheet.create({
	searchAction: {
		minWidth: 32,
		minHeight: 32,
		padding: 4,
		borderRadius: Pill,
		alignItems: 'center',
		justifyContent: 'center',
	},
})
