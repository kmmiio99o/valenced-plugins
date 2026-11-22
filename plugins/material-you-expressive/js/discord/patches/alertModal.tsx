import { Design } from '@valenced/discord/design'
import { getModules } from '@valenced/modules/finders'
import {
	createFilterGenerator,
	withProps,
} from '@valenced/modules/finders/filters'
import {
	getModuleDependencies,
	isModuleExportBad,
} from '@valenced/modules/metro'
import { after } from '@valenced/patcher'
import { afterJSX, beforeJSX } from '@valenced/react/jsx-runtime'
import {
	Children,
	cloneElement,
	createContext,
	Fragment,
	isValidElement,
	useContext,
} from 'react'
import {
	Pressable,
	ScrollView,
	StyleSheet,
	useWindowDimensions,
	View,
} from 'react-native'
import { Roles } from '../../components/colors'
import type {
	ComponentProps,
	ComponentType,
	ReactElement,
	ReactNode,
	Ref,
} from 'react'
import type { StyleProp, TextStyle, ViewStyle } from 'react-native'
import type { Restore } from './exports'

type AlertElementProps = {
	accessibilityElementsHidden?: boolean
	accessibilityRole?: string
	alwaysBounceVertical?: boolean
	'aria-hidden'?: boolean
	children?: ReactNode
	color?: string
	importantForAccessibility?: string
	onLayout?: unknown
	pointerEvents?: string
	ref?: Ref<unknown>
	spacing?: number
	style?: StyleProp<TextStyle | ViewStyle>
	variant?: string
}

type AlertActionsProps = { children?: ReactNode }
type AlertActionProps = ComponentProps<typeof Design.AlertActionButton> & {
	__m3AlertAction?: boolean
	maxFontSizeMultiplier?: number
	pillStyle?: StyleProp<ViewStyle>
	textElement?: ReactNode
}
type AlertModalModule = {
	AlertModal: typeof Design.AlertModal
	AlertModalContainer: ComponentType<any>
	AlertActions: ComponentType<AlertActionsProps>
	AlertActionButton: typeof Design.AlertActionButton
}
type AlertReanimatedModule = {
	default: { View: ComponentType<AlertElementProps> }
	useAnimatedStyle: unknown
	useSharedValue: unknown
}
type AlertSafeAreaModule = {
	default: () => { top: number; bottom: number }
	getSafeAreaInsets: unknown
}
type ButtonColorModule = {
	useForegroundColor: (variant: string) => string
	useButtonPillStyles: unknown
	useButtonTextColorStyles: unknown
}

// https://m3e.language-lit.com/components/Dialog/
const M3Dialog = {
	viewportInset: 24,
	minWidth: 280,
	maxWidth: 560,
	containerPadding: 24,
	shape: 28,
	headlineSpacing: 16,
	supportingTextSpacing: 24,
	actionSpacing: 8,
}

const styles = StyleSheet.create({
	container: {
		margin: 0,
		width: 'auto',
		height: 'auto',
		borderRadius: M3Dialog.shape,
		borderWidth: 0,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
		elevation: 6,
	},
	overflow: {
		height: 'auto',
		padding: M3Dialog.containerPadding,
		borderRadius: M3Dialog.shape,
	},
	scrollViewport: { borderRadius: M3Dialog.shape, overflow: 'hidden' },
	content: { alignItems: 'stretch', gap: 0 },
	header: { alignItems: 'center' },
	headline: {
		fontSize: 24,
		lineHeight: 32,
		fontWeight: '400',
		letterSpacing: 0,
		textAlign: 'left',
	},
	centeredHeadline: { textAlign: 'center' },
	supportingText: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '400',
		letterSpacing: 0.25,
		textAlign: 'left',
	},
	headlineSpacing: { marginBottom: M3Dialog.headlineSpacing },
	supportingTextSpacing: { marginBottom: M3Dialog.supportingTextSpacing },
	actions: { flexWrap: 'wrap', width: 'auto', alignSelf: 'stretch' },
	action: { flexGrow: 0, flexShrink: 1, alignSelf: 'auto', maxWidth: '100%' },
	actionLabel: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '500',
		letterSpacing: 0.1,
		textAlign: 'center',
	},
	actionPill: {
		minHeight: 40,
		minWidth: 40,
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 20,
		borderWidth: 0,
		backgroundColor: 'transparent',
		borderColor: 'transparent',
	},
	scrim: { backgroundColor: 'rgba(0, 0, 0, 0.32)' },
	clearScrim: { backgroundColor: 'transparent' },
})

const withAlertModalSource = createFilterGenerator<[]>(
	(_args, _id, exports) => {
		if (!exports || typeof exports !== 'object' || isModuleExportBad(exports))
			return false
		const module = exports as AlertModalModule
		return (
			module.AlertModal === Design.AlertModal &&
			module.AlertActionButton === Design.AlertActionButton
		)
	},
	() => 'material-you-expressive.alertModal.source.v2',
)

function containsStyle(style: unknown, target: unknown): boolean {
	return Array.isArray(style)
		? style.some(item => containsStyle(item, target))
		: style === target
}

function hasRegion(node: ReactNode, groups: readonly unknown[] = []): boolean {
	if (Array.isArray(node)) return node.some(child => hasRegion(child, groups))
	if (
		isValidElement<AlertElementProps>(node) &&
		(node.type === Fragment || groups.includes(node.type))
	)
		return hasRegion(node.props.children, groups)
	return node != null && node !== false && node !== true && node !== ''
}

function patchAlertContent(
	element: ReactElement<AlertElementProps>,
	actionGroups: readonly ComponentType<AlertActionsProps>[],
) {
	const regions = element.props.children
	if (
		element.type !== Design.Stack ||
		!Array.isArray(regions) ||
		regions.length !== 4
	)
		return
	const [header, body, extraContent, actions] = regions
	if (!isValidElement<AlertElementProps>(body) || body.type !== Design.Stack)
		return
	const bodyChildren = body.props.children
	if (!Array.isArray(bodyChildren) || bodyChildren.length !== 2) return
	const [title, content] = bodyChildren
	if (
		!isValidElement<AlertElementProps>(title) ||
		title.type !== Design.Text ||
		title.props.accessibilityRole !== 'header' ||
		title.props.variant !== 'heading-lg/bold' ||
		title.props.color !== 'mobile-text-heading-primary'
	)
		return

	const hasHeader = hasRegion(header)
	const hasTitle = hasRegion(title.props.children)
	const hasContent =
		isValidElement<AlertElementProps>(content) && content.type === Design.Text
	const hasExtraContent = hasRegion(extraContent)
	const hasActions = hasRegion(actions, actionGroups)
	const children: ReactNode[] = []
	if (hasHeader)
		children.push(
			<View
				key="header"
				style={[
					styles.header,
					hasTitle || hasContent || hasExtraContent || hasActions
						? styles.headlineSpacing
						: undefined,
				]}
			>
				{header}
			</View>,
		)
	if (hasTitle)
		children.push(
			cloneElement(title, {
				key: 'title',
				variant: 'heading-xl/normal',
				color: 'text-strong',
				style: [
					title.props.style,
					styles.headline,
					hasHeader ? styles.centeredHeadline : undefined,
					hasContent || hasExtraContent || hasActions
						? styles.headlineSpacing
						: undefined,
				],
			}),
		)
	if (hasContent)
		children.push(
			cloneElement(content, {
				key: 'content',
				ref: hasTitle ? content.props.ref : title.props.ref,
				variant: 'text-sm/normal',
				color: 'text-muted',
				style: [
					content.props.style,
					styles.supportingText,
					hasExtraContent || hasActions
						? styles.supportingTextSpacing
						: undefined,
				],
			}),
		)
	if (hasExtraContent)
		children.push(
			<View
				key="extra"
				style={hasActions ? styles.supportingTextSpacing : undefined}
			>
				{extraContent}
			</View>,
		)
	if (hasActions) children.push(<Fragment key="actions">{actions}</Fragment>)
	return cloneElement(element, {
		spacing: 0,
		style: [element.props.style, styles.content],
		children,
	})
}

export function patchAlertModal(
	restores: Restore[],
	reportError: (error: unknown) => void,
) {
	const cleanups: Restore[] = []
	const unsubscribe = getModules(
		withProps<AlertModalModule>(
			'AlertModal',
			'AlertModalContainer',
			'AlertActions',
			'AlertActionButton',
		).and(withAlertModalSource()),
		(module, id) => {
			let reanimated: AlertReanimatedModule | undefined
			let safeArea: AlertSafeAreaModule | undefined
			for (const dependencyId of getModuleDependencies(id) ?? []) {
				const dependency = __r(dependencyId)
				if (
					!dependency ||
					typeof dependency !== 'object' ||
					isModuleExportBad(dependency)
				)
					continue
				if (
					typeof dependency.useAnimatedStyle === 'function' &&
					typeof dependency.useSharedValue === 'function' &&
					dependency.default?.View != null
				)
					reanimated = dependency as AlertReanimatedModule
				if (
					typeof dependency.default === 'function' &&
					typeof dependency.getSafeAreaInsets === 'function'
				)
					safeArea = dependency as AlertSafeAreaModule
			}
			if (!reanimated || !safeArea) {
				reportError(
					new Error('Cannot resolve alert animation and safe-area modules.'),
				)
				return
			}

			const AnimatedView = reanimated.default.View
			const useSafeAreaInsets = safeArea.default
			const { AlertActionButton, AlertActions, AlertModalContainer } = module
			const { Backdrop } = Design as unknown as { Backdrop: ComponentType<any> }
			const AlertScope = createContext(false)
			const AlertActionColor = createContext<'tertiary' | 'destructive' | null>(
				null,
			)

			function ScopedBackdrop({ element }: { element: ReactElement<any> }) {
				const scoped = useContext(AlertScope)
				return scoped &&
					element.props.blur === 'strong' &&
					element.props.style != null
					? cloneElement(element, {
							blur: 'none',
							opaque: false,
							style: [element.props.style, styles.scrim],
						})
					: element
			}

			function markActions(children: ReactNode): ReactNode {
				return Children.map(children, child => {
					if (!isValidElement<AlertElementProps>(child)) return child
					if (child.type === AlertActionButton)
						return cloneElement(child as ReactElement<AlertActionProps>, {
							__m3AlertAction: true,
						})
					if (
						child.type === Fragment ||
						child.type === AlertActions ||
						child.type === ExpressiveAlertActions
					)
						return markActions(child.props.children)
					return child
				})
			}

			function ExpressiveAlertActions({ children }: AlertActionsProps) {
				let actions = Children.toArray(markActions(children))
				const [confirm, cancel] = actions
				if (
					actions.length === 2 &&
					isValidElement<AlertActionProps>(confirm) &&
					isValidElement<AlertActionProps>(cancel) &&
					confirm.type === AlertActionButton &&
					cancel.type === AlertActionButton &&
					(confirm.props.variant == null ||
						confirm.props.variant === 'primary' ||
						confirm.props.variant === 'destructive') &&
					cancel.props.variant === 'secondary'
				)
					actions = [cancel, confirm]
				return (
					<Design.Stack
						direction="horizontal"
						spacing={M3Dialog.actionSpacing}
						justify="flex-end"
						align="center"
						style={styles.actions}
					>
						{actions.map(action =>
							isValidElement<AlertActionProps>(action) &&
							action.type === AlertActionButton ? (
								<AlertActionColor.Provider
									key={action.key}
									value={
										action.props.variant === 'destructive'
											? 'destructive'
											: 'tertiary'
									}
								>
									{action}
								</AlertActionColor.Provider>
							) : (
								action
							),
						)}
					</Design.Stack>
				)
			}

			function AlertCard({
				element,
			}: {
				element: ReactElement<AlertElementProps>
			}) {
				const { width, height } = useWindowDimensions()
				const { top, bottom } = useSafeAreaInsets()
				const maxWidth = Math.max(
					0,
					Math.min(M3Dialog.maxWidth, width - M3Dialog.viewportInset * 2),
				)
				const maxHeight = Math.max(
					0,
					height - (Math.max(top, bottom) + M3Dialog.viewportInset) * 2,
				)
				const children = element.props.children as ReactNode[]
				const scrollView = children[1] as ReactElement<AlertElementProps>
				const sourceStyle = element.props.style as StyleProp<ViewStyle>[]
				return cloneElement(element, {
					style: [
						sourceStyle[0],
						styles.container,
						{
							minWidth: Math.min(M3Dialog.minWidth, maxWidth),
							maxWidth,
							backgroundColor: Roles.surfaceHigh(),
						},
						...sourceStyle.slice(1),
					],
					children: [
						children[0],
						cloneElement(scrollView, {
							style: [
								scrollView.props.style,
								styles.scrollViewport,
								{ maxHeight },
							],
						}),
					],
				})
			}

			function patchAnimatedView(element: ReactElement<AlertElementProps>) {
				if (containsStyle(element.props.style, styles.actionPill))
					// Native animated colors override static pill colors.
					return cloneElement(element, {
						style: (element.props.style as StyleProp<ViewStyle>[])[0],
					})
				if (containsStyle(element.props.style, styles.scrim))
					return cloneElement(element, {
						children: Children.map(element.props.children, child =>
							isValidElement<AlertElementProps>(child) &&
							child.type === Pressable &&
							child.props['aria-hidden'] === true
								? cloneElement(child, {
										style: [child.props.style, styles.clearScrim],
									})
								: child,
						),
					})
				const children = element.props.children
				if (
					!Array.isArray(children) ||
					children.length !== 2 ||
					!Array.isArray(element.props.style) ||
					typeof element.props.onLayout !== 'function' ||
					typeof element.props.accessibilityElementsHidden !== 'boolean' ||
					(element.props.importantForAccessibility !== 'auto' &&
						element.props.importantForAccessibility !== 'no-hide-descendants')
				)
					return element
				const scrollView = children[1]
				if (
					!isValidElement<AlertElementProps>(scrollView) ||
					scrollView.type !== ScrollView ||
					scrollView.props.alwaysBounceVertical !== false
				)
					return element
				const overflow = scrollView.props.children
				if (
					!isValidElement<AlertElementProps>(overflow) ||
					overflow.type !== View
				)
					return element
				const content = overflow.props.children
				if (!isValidElement<AlertElementProps>(content)) return element
				const nextContent = patchAlertContent(content, [
					AlertActions,
					ExpressiveAlertActions,
				])
				if (!nextContent) return element
				const nextElement = cloneElement(element, {
					children: [
						children[0],
						cloneElement(scrollView, {
							children: cloneElement(overflow, {
								style: [overflow.props.style, styles.overflow],
								children: nextContent,
							}),
						}),
					],
				})
				return <AlertCard key={element.key} element={nextElement} />
			}

			restores.push(
				afterJSX(AlertModalContainer, element => (
					<AlertScope.Provider key={element.key} value>
						{element}
					</AlertScope.Provider>
				)),
				afterJSX(Backdrop, element => (
					<ScopedBackdrop key={element.key} element={element} />
				)),
				afterJSX(AnimatedView, patchAnimatedView),
				beforeJSX(AlertActions, ([, props, key]) => [
					ExpressiveAlertActions,
					props,
					key,
				]),
				beforeJSX(Design.Button, args => {
					const [type, props, key] = args
					const actionProps = props as AlertActionProps
					if (actionProps.__m3AlertAction !== true) return args
					const { __m3AlertAction: _marker, ...nextProps } = actionProps
					const destructive = props.variant === 'destructive'
					return [
						type,
						{
							...nextProps,
							grow: false,
							size: 'md',
							textVariant: 'text-sm/medium',
							textElement: actionProps.textElement ?? (
								<Design.Text
									variant="text-sm/medium"
									color="none"
									maxFontSizeMultiplier={actionProps.maxFontSizeMultiplier}
									style={[
										styles.actionLabel,
										{
											color: destructive ? Roles.danger() : Roles.primaryText(),
										},
									]}
								>
									{props.text}
								</Design.Text>
							),
							pillStyle: [actionProps.pillStyle, styles.actionPill],
							variant: destructive ? 'destructive' : 'tertiary',
							style: [props.style, styles.action],
						},
						key,
					]
				}),
			)
			cleanups.push(
				getModules(
					withProps<ButtonColorModule>(
						'useForegroundColor',
						'useButtonPillStyles',
						'useButtonTextColorStyles',
					),
					buttonColors => {
						restores.push(
							after(buttonColors, 'useForegroundColor', color => {
								const variant = useContext(AlertActionColor)
								if (variant == null) return color
								return variant === 'destructive'
									? Roles.danger()
									: Roles.primaryText()
							}),
						)
					},
					{ max: 1 },
				),
			)
		},
		{ max: 1, returnNamespace: true },
	)
	return () => {
		unsubscribe()
		for (const cleanup of cleanups.splice(0)) cleanup()
	}
}
