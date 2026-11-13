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
}

const voiceControlSize = 56
const voiceControlGap = 8
const voiceControlSpace = voiceControlSize + voiceControlGap

const styles = StyleSheet.create({
	composer: {
		position: 'relative',
		borderRadius: 28,
		borderWidth: 0,
		overflow: 'visible',
	},
	outer: {
		backgroundColor: 'transparent',
		borderColor: 'transparent',
		borderRadius: 0,
		borderWidth: 0,
		overflow: 'visible',
	},
	sendControl: {
		position: 'absolute',
		right: -voiceControlSpace,
		bottom: 0,
		width: voiceControlSize,
		height: voiceControlSize,
		borderRadius: voiceControlSize / 2,
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 1,
	},
})

function hasText(value: string | undefined) {
	return typeof value === 'string' && value.trim().length > 0
}

const SendControl = forwardRef<SendButtonHandle, SendControlProps>(
	({ button }, ref) => {
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

		return createElement(
			View,
			{
				pointerEvents: 'box-none',
				style: [styles.sendControl, { backgroundColor }],
			},
			cloneElement(button, { ref: innerRef }),
		)
	},
)

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
	const originalRef = sendButton.props.ref
	const children = [...node.props.children]
	children[sendIndex] = createElement(SendControl, {
		key: sendButton.key ?? 'expressive-chat-send-control',
		ref: originalRef,
		button: sendButton,
	})

	return cloneElement(node, {
		style: [
			node.props.style,
			styles.composer,
			{
				backgroundColor,
				marginRight: voiceControlSpace,
			},
		],
		children,
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
