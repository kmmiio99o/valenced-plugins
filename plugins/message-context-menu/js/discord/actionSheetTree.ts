import { lookupModuleWithImportedPath } from '@valenced/discord/utils/modules/finders'
import { React } from '@valenced/react'
import MessageContextMenu from '../components/MessageContextMenu'
import { getLongPressOrigin } from './patches/longPressOrigin'
import type { ComponentType, ReactElement, ReactNode } from 'react'
import type {
	ActionSheetModule,
	ActionSheetProps,
	ElementProps,
	MessageContextMenuProps,
	SheetExpansionSignal,
} from '../types'

const ACTION_SHEET_PATH =
	'design/components/Sheet/native/ActionSheet.native.tsx'
const LOG_PREFIX = '[MessageContextMenu]'

function describeNodeType(node: ReactNode): string {
	if (!React.isValidElement(node)) return node == null ? 'empty' : typeof node
	if (typeof node.type === 'string') return node.type
	if (typeof node.type === 'function') return node.type.name || 'component'
	return 'component'
}

function describeChildren(children: ReactNode) {
	const nodes = Array.isArray(children) ? children : [children]
	const presentNodes = nodes.filter(node => node != null)
	return {
		count: presentNodes.length,
		types: presentNodes.slice(0, 8).map(describeNodeType),
	}
}

function createSheetExpansionSignal(): SheetExpansionSignal {
	let expanded = false
	const listeners = new Set<() => void>()

	return {
		subscribe(listener) {
			if (expanded) {
				listener()
				return () => {}
			}
			listeners.add(listener)
			return () => listeners.delete(listener)
		},
		expand() {
			if (expanded) return
			expanded = true
			listeners.forEach(listener => listener())
		},
		reset() {
			expanded = false
		},
	}
}

const sheetExpansion = createSheetExpansionSignal()

function replaceInTree(
	node: ReactNode,
	actionSheetType: ComponentType<ActionSheetProps>,
	props: Omit<
		MessageContextMenuProps,
		'children' | 'header' | 'sheetExpansion'
	>,
	onMatch: () => void,
): ReactNode {
	if (Array.isArray(node))
		return node.map(child =>
			replaceInTree(child, actionSheetType, props, onMatch),
		)
	if (!React.isValidElement<ElementProps>(node)) return node

	if (node.type === actionSheetType) {
		onMatch()
		const sheet = node as ReactElement<ActionSheetProps>
		console.log(LOG_PREFIX, 'action sheet matched', {
			headerPresent: sheet.props.header != null,
			children: describeChildren(sheet.props.children),
		})
		const menu = React.createElement(MessageContextMenu, {
			...props,
			children: sheet.props.children,
			header: sheet.props.header,
			sheetExpansion,
		})
		return React.cloneElement(sheet, {
			...sheet.props,
			backdropOpacity: 0,
			backgroundStyles: { backgroundColor: 'transparent' },
			bodyStyles: { flex: 1 },
			contentStyles: { flex: 1, paddingHorizontal: 0 },
			handleDisabled: true,
			header: null,
			onExpand: () => {
				sheet.props.onExpand?.()
				sheetExpansion.expand()
			},
			scrollable: true,
			showGradient: false,
			startExpanded: true,
			children: menu,
		})
	}

	if (node.props.children == null) return node
	return React.cloneElement(node, {
		...node.props,
		children: replaceInTree(
			node.props.children,
			actionSheetType,
			props,
			onMatch,
		),
	})
}

export function replaceActionSheetTree(
	result: unknown,
	originalProps: unknown,
	actionSheetActionCreators: MessageContextMenuProps['actionSheetActionCreators'],
) {
	const [actionSheetModule] =
		lookupModuleWithImportedPath<ActionSheetModule>(ACTION_SHEET_PATH)
	if (!actionSheetModule?.ActionSheet) {
		console.warn(LOG_PREFIX, 'ActionSheet module not found')
		return result
	}

	const longPressProps = originalProps as {
		message?: { id?: string }
		analyticsLocation?: { message?: { id?: string } }
	}
	const messageId =
		longPressProps.message?.id ?? longPressProps.analyticsLocation?.message?.id
	const origin = getLongPressOrigin(messageId)
	let matchCount = 0
	const replaced = replaceInTree(
		result as ReactNode,
		actionSheetModule.ActionSheet,
		{ origin, actionSheetActionCreators },
		() => {
			matchCount++
		},
	)
	if (matchCount === 0)
		console.warn(LOG_PREFIX, 'ActionSheet element not found in rendered tree', {
			messageIdAvailable: typeof messageId === 'string',
		})
	return replaced
}
