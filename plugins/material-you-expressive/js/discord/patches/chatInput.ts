import { Tokens } from '@valenced/discord/common/tokens'
import { beforeJSX } from '@valenced/react/jsx-runtime'
import {
	cloneElement,
	createElement,
	forwardRef,
	isValidElement,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from 'react'
import { StyleSheet, View } from 'react-native'
import { color, Roles } from '../../components/colors'
import { expressiveChatSendControl } from '../../components/screens'
import type { ReactElement, ReactNode, Ref } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'

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

interface SendControlProps {
	button: ReactElement<SendButtonProps>
	size: number
	measured: boolean
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

function hasText(value: string | undefined) {
	return typeof value === 'string' && value.trim().length > 0
}

const SendControl = forwardRef<SendButtonHandle, SendControlProps>(
	({ button, size, measured }, ref) => {
		const [sendMode, setSendMode] = useState(() =>
			hasText(button.props.defaultValue),
		)
		const innerRef = useRef<SendButtonHandle>(null)

		useEffect(() => {
			setSendMode(hasText(button.props.defaultValue))
		}, [button.props.defaultValue])

		useImperativeHandle(
			ref,
			() => ({
				setHasText(value) {
					innerRef.current?.setHasText(value)
					setSendMode(value)
				},
			}),
			[],
		)

		const showSend =
			sendMode ||
			button.props.hasPendingAttachments === true ||
			button.props.hasPendingEdit === true
		const backgroundColor = showSend
			? color(['CHAT_INPUT_SEND_BUTTON_ACTIVE_BACKGROUND'], Roles.primary())
			: Roles.secondaryContainer()

		return expressiveChatSendControl(
			size,
			createElement(
				View,
				{
					pointerEvents: 'box-none',
					style: [
						styles.sendControl,
						{
							width: size,
							height: size,
							borderRadius: size / 2,
							backgroundColor,
						},
					],
				},
				createElement(
					View,
					{
						pointerEvents: measured ? 'auto' : 'none',
						accessibilityElementsHidden: !measured,
						importantForAccessibility: measured
							? 'auto'
							: 'no-hide-descendants',
						style: { opacity: measured ? 1 : 0 },
					},
					cloneElement(button, { ref: innerRef }),
				),
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
	const [controlSize, setControlSize] = useState<number>(
		Tokens.default.modules.mobile.CHAT_INPUT_SEND_BUTTON_HEIGHT +
			verticalPadding * 2,
	)
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
					setControlSize(current => (current === height ? current : height))
					setHasMeasuredComposer(true)
				}
			},
			style: [
				styles.composer,
				{
					flex: 1,
					minWidth: 0,
					paddingHorizontal: horizontalPadding,
					paddingVertical: verticalPadding,
					borderRadius: controlSize / 2,
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
		size: controlSize,
		measured: hasMeasuredComposer,
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
		unpatchComposer()
	}
}
