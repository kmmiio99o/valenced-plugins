import { Tokens } from '@valenced/discord/common/tokens'
import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { beforeJSX } from '@valenced/react/jsx-runtime'
import {
	cloneElement,
	createElement,
	forwardRef,
	isValidElement,
	useImperativeHandle,
	useRef,
	useState,
} from 'react'
import { StyleSheet, View } from 'react-native'
import type { ComponentType, ReactElement, ReactNode, Ref } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'

type PressableOpacityModule = {
	PressableOpacity: ComponentType<any>
}

interface ComposerProps {
	children?: ReactNode
	style?: StyleProp<ViewStyle>
}

interface SendButtonProps extends ComposerProps {
	canSendVoiceMessage?: boolean
	defaultValue?: string
	hasPendingAttachments?: boolean
	hasPendingEdit?: boolean
	ref?: Ref<SendButtonHandle>
}

interface SendButtonHandle {
	setHasText(value: boolean): void
}

let measuredSingleLineChatInputHeight: number | undefined

function getSendControlSize(verticalPadding: number) {
	return (
		measuredSingleLineChatInputHeight ??
		Tokens.default.modules.mobile.CHAT_INPUT_SEND_BUTTON_HEIGHT +
			verticalPadding * 2
	)
}

interface SendControlProps {
	button: ReactElement<SendButtonProps>
	size: number
	measured: boolean
	backgroundColor: ViewStyle['backgroundColor']
}

const styles = StyleSheet.create({
	composer: {
		borderWidth: 0,
		overflow: 'visible',
	},
	composerRow: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		gap: 8,
	},
	outer: {
		backgroundColor: 'transparent',
		borderColor: 'transparent',
		borderRadius: 0,
		borderWidth: 0,
		overflow: 'visible',
	},
	sendControl: {
		position: 'relative',
		alignItems: 'center',
		justifyContent: 'center',
		flexGrow: 0,
		flexShrink: 0,
	},
})

interface ComposerRowProps {
	node: ReactElement<ComposerProps>
	sendButton: ReactElement<SendButtonProps>
	sendIndex: number
	backgroundColor: ViewStyle['backgroundColor']
	horizontalPadding: number
	verticalPadding: number
}

const SendControl = forwardRef<SendButtonHandle, SendControlProps>(
	({ button, size, measured, backgroundColor }, ref) => {
		const innerRef = useRef<SendButtonHandle>(null)

		useImperativeHandle(
			ref,
			() => ({
				setHasText(value) {
					innerRef.current?.setHasText(value)
				},
			}),
			[],
		)

		return createElement(
			View,
			{
				pointerEvents: 'box-none',
				style: [styles.sendControl, { width: size, height: size }],
			},
			createElement(View, {
				pointerEvents: 'none',
				style: [
					StyleSheet.absoluteFill,
					{
						borderRadius: size / 2,
						overflow: 'hidden',
						backgroundColor,
					},
				],
			}),
			createElement(
				View,
				{
					pointerEvents: measured ? 'auto' : 'none',
					accessibilityElementsHidden: !measured,
					importantForAccessibility: measured ? 'auto' : 'no-hide-descendants',
					style: {
						width: size,
						height: size,
						alignItems: 'center',
						justifyContent: 'center',
						opacity: measured ? 1 : 0,
					},
				},
				cloneElement(button, {
					ref: innerRef,
				}),
			),
		)
	},
)

function ComposerRow({
	node,
	sendButton,
	sendIndex,
	backgroundColor,
	horizontalPadding,
	verticalPadding,
}: ComposerRowProps) {
	const sendControlSize = getSendControlSize(verticalPadding)
	const [hasMeasuredComposer, setHasMeasuredComposer] = useState(false)
	const children = (node.props.children as ReactNode[]).filter(
		(_, index) => index !== sendIndex,
	)
	const contents = cloneElement(node, {
		style: [
			node.props.style,
			{
				paddingHorizontal: 0,
				paddingVertical: 0,
				backgroundColor: 'transparent',
			},
		],
		children,
	})
	const composer = createElement(
		View,
		{
			onLayout: ({ nativeEvent }) => {
				const { height } = nativeEvent.layout
				if (height > 0) {
					measuredSingleLineChatInputHeight ??= height
					if (!hasMeasuredComposer) setHasMeasuredComposer(true)
				}
			},
			style: [
				styles.composer,
				{
					flex: 1,
					minWidth: 0,
					paddingHorizontal: horizontalPadding,
					paddingVertical: verticalPadding,
					borderRadius: sendControlSize / 2,
					backgroundColor,
				},
			],
		},
		contents,
	)
	const control = createElement(SendControl, {
		key: sendButton.key ?? 'expressive-chat-send-control',
		ref: sendButton.props.ref,
		button: sendButton,
		size: sendControlSize,
		measured: hasMeasuredComposer,
		backgroundColor,
	})

	return createElement(
		View,
		{
			key: node.key ?? undefined,
			pointerEvents: 'box-none',
			style: styles.composerRow,
		},
		composer,
		control,
	)
}

function isNodeArray(node: ReactNode): node is ReactNode[] {
	return Array.isArray(node)
}

function isSendButton(node: ReactNode): node is ReactElement<SendButtonProps> {
	return (
		isValidElement<SendButtonProps>(node) && 'canSendVoiceMessage' in node.props
	)
}

function elementTypeName(node: unknown): string | undefined {
	if (!isValidElement(node)) return
	const type = node.type as {
		displayName?: string
		name?: string
		type?: { displayName?: string; name?: string }
	}
	return (
		type.displayName ?? type.name ?? type.type?.displayName ?? type.type?.name
	)
}

function restyleMainContents(
	node: ReactNode,
	backgroundColor: ViewStyle['backgroundColor'],
): ReactNode {
	if (!isValidElement<ComposerProps>(node) || !isNodeArray(node.props.children))
		return node

	const nativeStyle = StyleSheet.flatten(node.props.style)
	const sendIndex = node.props.children.findIndex(isSendButton)
	if (
		nativeStyle?.flexDirection !== 'row' ||
		nativeStyle?.alignItems !== 'flex-end' ||
		sendIndex < 0
	)
		return node

	if (!isSendButton(node.props.children[sendIndex])) return node

	const sendButton = node.props.children[sendIndex]
	if (!isSendButton(sendButton)) return node
	const verticalPadding =
		typeof nativeStyle.paddingVertical === 'number'
			? nativeStyle.paddingVertical
			: 0
	const horizontalPadding =
		typeof nativeStyle.paddingHorizontal === 'number'
			? nativeStyle.paddingHorizontal
			: 0
	return createElement(ComposerRow, {
		key: node.key ?? undefined,
		node,
		sendButton,
		sendIndex,
		backgroundColor,
		horizontalPadding,
		verticalPadding,
	})
}

export function patchChatInput() {
	const verticalPadding =
		Tokens.default.modules.mobile.CHAT_INPUT_FLOATING_CONTENT_PADDING_VERTICAL
	const sendButtonRestores: Array<() => void> = []
	const unpatchSendButton = getModules(
		withProps<PressableOpacityModule>('PressableOpacity'),
		exports => {
			const { PressableOpacity } = exports as PressableOpacityModule
			sendButtonRestores.push(
				beforeJSX(PressableOpacity, args => {
					const [type, props, key] = args
					const iconName = elementTypeName(props.children)
					if (iconName !== 'SendMessageIcon' && iconName !== 'MicrophoneIcon')
						return args
					const size = getSendControlSize(verticalPadding)
					const controlStyle = {
						width: size,
						height: size,
						borderRadius: size / 2,
					}
					return [type, { ...props, style: [props.style, controlStyle] }, key]
				}),
			)
		},
		{ max: 1, returnNamespace: true },
	)
	const unpatchComposer = beforeJSX(View, args => {
		const [type, props, key] = args
		const nativeStyle = StyleSheet.flatten(props.style)
		if (
			!nativeStyle ||
			typeof props.onStartShouldSetResponder !== 'function' ||
			nativeStyle.flexDirection !== 'column' ||
			nativeStyle.overflow !== 'hidden' ||
			nativeStyle.borderWidth == null ||
			nativeStyle.backgroundColor == null ||
			!isNodeArray(props.children)
		)
			return args

		let foundComposer = false
		const children = props.children.map(child => {
			const restyled = restyleMainContents(child, nativeStyle.backgroundColor)
			foundComposer ||= restyled !== child
			return restyled
		})
		if (!foundComposer) return args

		return [
			type,
			{ ...props, style: [props.style, styles.outer], children },
			key,
		]
	})

	return () => {
		unpatchSendButton()
		sendButtonRestores.forEach(restore => restore())
		unpatchComposer()
	}
}
