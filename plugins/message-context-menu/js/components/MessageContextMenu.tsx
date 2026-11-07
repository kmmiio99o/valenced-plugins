import { lookupModuleWithImportedPath } from '@valenced/discord/utils/modules/finders'
import { React, ReactNative } from '@valenced/react'
import { getMenuPlacement } from '../geometry/menuPlacement'
import { useDiscordTheme } from '../theme/discordTheme'
import ActionGroups from './ActionGroups'
import ReactionBar from './ReactionBar'
import type { View as NativeView } from 'react-native'
import type { ElementProps, MessageContextMenuProps } from '../types'

const LOG_PREFIX = '[MessageContextMenu]'
const CONTEXT_MENU_CONSTANTS_PATH =
	'design/components/ContextMenu/native/ContextMenuConstants.native.tsx'
const TABLE_ROW_CONSTANTS_PATH =
	'design/components/TableRow/native/TableRowConstants.tsx'

interface ContextMenuConstants {
	CONTEXT_MENU_EDGE_OFFSET: number
	CONTEXT_MENU_ITEM_BASE_HEIGHT: number
	CONTEXT_MENU_ITEM_PADDING: number
	CONTEXT_MENU_MIN_WIDTH: number
	CONTEXT_MENU_OFFSET: number
}

interface TableRowConstants {
	TABLE_ROW_HEIGHT: number
}

function ScaledActionGroup({
	children,
	scale,
}: {
	children: React.ReactNode
	scale: number
}) {
	const [height, setHeight] = React.useState<number>()

	return (
		<ReactNative.View
			style={{
				alignItems: 'flex-start',
				height: height == null ? undefined : height * scale,
				width: '100%',
			}}
		>
			<ReactNative.View
				onLayout={({ nativeEvent }) => setHeight(nativeEvent.layout.height)}
				style={{
					transform: [{ scale }],
					transformOrigin: [0, 0, 0],
					width: `${100 / scale}%`,
				}}
			>
				{children}
			</ReactNative.View>
		</ReactNative.View>
	)
}

function wrapActionHandlers(
	node: React.ReactNode,
	onSelect: (action: () => void) => void,
	rowScale?: number,
): React.ReactNode {
	if (Array.isArray(node))
		return node.map(child => wrapActionHandlers(child, onSelect, rowScale))
	if (!React.isValidElement<ElementProps>(node)) return node

	const props = node.props
	const originalOnPress = props.onPress
	const children = wrapActionHandlers(props.children, onSelect, rowScale)
	if (
		typeof props.label === 'string' &&
		typeof originalOnPress === 'function'
	) {
		const row = React.cloneElement(node, {
			...props,
			children,
			onPress: () => {
				console.log(LOG_PREFIX, 'native action pressed')
				onSelect(() => originalOnPress())
			},
		})
		return row
	}

	const wrappedNode = React.cloneElement(node, { ...props, children })
	if (rowScale != null && (props.title != null || props.hasIcons != null))
		return <ScaledActionGroup scale={rowScale}>{wrappedNode}</ScaledActionGroup>
	return wrappedNode
}

export default function MessageContextMenu({
	children,
	header,
	origin,
	sheetExpansion,
	actionSheetActionCreators,
}: MessageContextMenuProps) {
	const { Animated, BackHandler, Pressable, StyleSheet, View } = ReactNative
	const [contextMenuConstants] =
		lookupModuleWithImportedPath<ContextMenuConstants>(
			CONTEXT_MENU_CONSTANTS_PATH,
		)
	const [tableRowConstants] = lookupModuleWithImportedPath<TableRowConstants>(
		TABLE_ROW_CONSTANTS_PATH,
	)
	const theme = useDiscordTheme()
	const animation = React.useRef(new Animated.Value(0)).current
	const rootRef = React.useRef<NativeView>(null)
	const springTo = React.useCallback(
		(toValue: number) =>
			Animated.spring(animation, {
				toValue,
				useNativeDriver: true,
				mass: 0.55,
				damping: 20,
				stiffness: 250,
			}),
		[Animated, animation],
	)
	const closing = React.useRef(false)
	const [dismissed, setDismissed] = React.useState(false)
	const [closingMenu, setClosingMenu] = React.useState(false)
	const [sheetExpanded, setSheetExpanded] = React.useState(false)
	const [rootFrame, setRootFrame] = React.useState<{
		x: number
		y: number
		width: number
		height: number
	}>()
	const [menuHeight, setMenuHeight] = React.useState(0)
	const [contentWidth, setContentWidth] = React.useState(0)
	const [reactionSize, setReactionSize] = React.useState({
		width: 0,
		height: 0,
	})
	const { height: windowHeight, width: windowWidth } =
		ReactNative.useWindowDimensions()
	const rootX = rootFrame?.x ?? 0
	const rootY = rootFrame?.y ?? 0
	const viewportWidth = rootFrame?.width ?? windowWidth
	const viewportHeight = rootFrame?.height ?? windowHeight
	const rowScale =
		contextMenuConstants != null && tableRowConstants?.TABLE_ROW_HEIGHT
			? Math.min(
					1,
					(contextMenuConstants.CONTEXT_MENU_ITEM_BASE_HEIGHT +
						contextMenuConstants.CONTEXT_MENU_ITEM_PADDING / 2) /
						tableRowConstants.TABLE_ROW_HEIGHT,
				)
			: undefined
	const hasReactionBar = header != null
	const attachedHeight = hasReactionBar ? reactionSize.height : 0
	const edgeInset = Math.min(
		Math.max(0, contextMenuConstants?.CONTEXT_MENU_EDGE_OFFSET ?? 0),
		viewportWidth / 2,
		viewportHeight / 2,
	)
	const reactionMaxWidth = Math.max(0, viewportWidth - edgeInset * 2)
	const localOrigin = origin
		? { x: origin.x - rootX, y: origin.y - rootY }
		: undefined
	const placement = getMenuPlacement(
		localOrigin,
		contextMenuConstants
			? Math.max(
					contextMenuConstants.CONTEXT_MENU_MIN_WIDTH +
						contextMenuConstants.CONTEXT_MENU_ITEM_PADDING * 2,
					reactionSize.width,
				)
			: Math.max(contentWidth, viewportWidth),
		menuHeight,
		attachedHeight,
		viewportWidth,
		viewportHeight,
		contextMenuConstants?.CONTEXT_MENU_EDGE_OFFSET ?? 0,
		contextMenuConstants?.CONTEXT_MENU_OFFSET ?? 0,
		contextMenuConstants?.CONTEXT_MENU_MIN_WIDTH ?? 0,
	)
	const reactionMaxLeft = Math.max(
		edgeInset,
		viewportWidth - edgeInset - reactionSize.width,
	)
	const reactionLeft = Math.max(
		Math.min(
			placement.left + (placement.width - reactionSize.width) / 2,
			reactionMaxLeft,
		),
		edgeInset,
	)
	const transformOrigin = [
		localOrigin?.x ?? viewportWidth / 2,
		(localOrigin?.y ?? placement.top + (menuHeight + attachedHeight) / 2) -
			placement.top,
		0,
	]
	const scale = animation.interpolate({
		inputRange: [0, 1],
		outputRange: [0.01, 1],
	})

	const dismiss = React.useCallback(
		(action?: () => void) => {
			if (closing.current) return
			closing.current = true
			setClosingMenu(true)
			springTo(0).start(({ finished }) => {
				if (!finished) return
				setDismissed(true)
				sheetExpansion.reset()
				actionSheetActionCreators.hideAllActionSheets()
				action?.()
			})
		},
		[actionSheetActionCreators, sheetExpansion, springTo],
	)

	React.useEffect(() => {
		if (!sheetExpanded) return
		const transition = springTo(1)
		console.log(LOG_PREFIX, 'menu opening', {
			origin: origin
				? { x: Math.round(origin.x), y: Math.round(origin.y) }
				: null,
			root: { x: Math.round(rootX), y: Math.round(rootY) },
			viewport: {
				width: Math.round(viewportWidth),
				height: Math.round(viewportHeight),
			},
			placement: {
				left: Math.round(placement.left),
				top: Math.round(placement.top),
				width: Math.round(placement.width),
				menuHeight: Math.round(menuHeight),
				maxMenuHeight: Math.round(placement.maxMenuHeight),
				opensBelow: placement.opensBelow,
				reactionHeight: Math.round(reactionSize.height),
			},
			rowScale,
			nativeRowHeight: tableRowConstants?.TABLE_ROW_HEIGHT ?? null,
			contextMenuRowHeight:
				contextMenuConstants?.CONTEXT_MENU_ITEM_BASE_HEIGHT ?? null,
		})
		transition.start()
		return () => transition.stop()
	}, [sheetExpanded, springTo])

	React.useEffect(() => {
		if (contextMenuConstants && tableRowConstants) return
		console.warn(LOG_PREFIX, 'native menu sizing constants unavailable', {
			contextMenuConstantsAvailable: contextMenuConstants != null,
			tableRowConstantsAvailable: tableRowConstants != null,
		})
	}, [contextMenuConstants, tableRowConstants])

	React.useEffect(() => {
		const unsubscribe = sheetExpansion.subscribe(() => {
			closing.current = false
			animation.setValue(0)
			rootRef.current?.measureInWindow((x, y, width, height) => {
				console.log(LOG_PREFIX, 'root measured', {
					x: Math.round(x),
					y: Math.round(y),
					width: Math.round(width),
					height: Math.round(height),
				})
				setRootFrame({ x, y, width, height })
			})
			setDismissed(false)
			setClosingMenu(false)
			setSheetExpanded(true)
		})
		return unsubscribe
	}, [animation, sheetExpansion])

	React.useEffect(() => {
		if (dismissed) return
		const subscription = BackHandler.addEventListener(
			'hardwareBackPress',
			() => {
				dismiss()
				return true
			},
		)
		return () => subscription.remove()
	}, [dismiss, dismissed])

	if (dismissed) return null

	return (
		<View
			accessibilityViewIsModal
			onAccessibilityEscape={() => dismiss()}
			collapsable={false}
			pointerEvents={sheetExpanded && !closingMenu ? 'auto' : 'none'}
			ref={rootRef}
			onLayout={({ nativeEvent }) => {
				setRootFrame(previous => ({
					x: previous?.x ?? 0,
					y: previous?.y ?? 0,
					width: nativeEvent.layout.width,
					height: nativeEvent.layout.height,
				}))
			}}
			style={{ height: windowHeight, width: windowWidth }}
		>
			<Pressable
				accessibilityElementsHidden
				collapsable={false}
				onPress={() => dismiss()}
				style={StyleSheet.absoluteFill}
			/>
			<Animated.View
				pointerEvents="box-none"
				style={{
					left: 0,
					maxWidth: viewportWidth,
					opacity: animation,
					position: 'absolute',
					top: placement.top,
					transformOrigin,
					transform: [{ scale }],
					width: viewportWidth,
				}}
			>
				{hasReactionBar ? (
					<ReactionBar
						backgroundColor={theme.surface}
						borderColor={theme.border}
						header={header}
						left={reactionLeft}
						maxWidth={reactionMaxWidth}
						radius={theme.radius}
						onLayout={size => {
							console.log(LOG_PREFIX, 'reaction bar layout', size)
							setReactionSize(size)
						}}
					/>
				) : null}
				<View
					onLayout={({ nativeEvent }) => {
						console.log(LOG_PREFIX, 'menu panel layout', {
							height: nativeEvent.layout.height,
							width: nativeEvent.layout.width,
						})
						setMenuHeight(nativeEvent.layout.height)
					}}
					style={{
						borderRadius: theme.radius,
						marginLeft: placement.left,
						...theme.shadow,
						width: placement.width,
					}}
				>
					<View
						style={{
							backgroundColor: theme.surface,
							borderColor: theme.border,
							borderRadius: theme.radius,
							borderWidth: StyleSheet.hairlineWidth,
							overflow: 'hidden',
						}}
					>
						<ActionGroups
							maxHeight={Math.max(
								0,
								placement.maxMenuHeight - StyleSheet.hairlineWidth * 2,
							)}
							maxWidth={placement.width}
							onContentSizeChange={width => setContentWidth(width)}
						>
							{wrapActionHandlers(
								children,
								action => dismiss(action),
								rowScale,
							)}
						</ActionGroups>
					</View>
				</View>
			</Animated.View>
		</View>
	)
}
