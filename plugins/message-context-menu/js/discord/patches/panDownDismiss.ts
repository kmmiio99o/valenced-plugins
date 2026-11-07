import { BottomSheet as Gorhom } from '@valenced/externals/gorhom'
import { instead } from '@valenced/patcher'
import { React } from '@valenced/react'
import MessageContextMenu from '../../components/MessageContextMenu'
import type { ReactNode } from 'react'

interface BottomSheetProps {
	children?: ReactNode
	enablePanDownToClose?: boolean
	[key: string]: unknown
}

interface ForwardRefComponent {
	type?: {
		render?: (...args: unknown[]) => ReactNode
	}
}

function containsMessageContextMenu(node: ReactNode): boolean {
	if (Array.isArray(node)) return node.some(containsMessageContextMenu)
	if (!React.isValidElement<{ children?: ReactNode }>(node)) return false
	return (
		node.type === MessageContextMenu ||
		containsMessageContextMenu(node.props.children)
	)
}

export function installPanDownDismissProtection(
	addCleanup: (cleanup: () => void) => void,
) {
	const inner = (Gorhom.default as unknown as ForwardRefComponent).type
	if (!inner || typeof inner.render !== 'function')
		throw new Error('Gorhom BottomSheet render function is unavailable')

	const renderTarget = inner as {
		render: (...args: unknown[]) => ReactNode
	}
	addCleanup(
		instead(renderTarget, 'render', function (args, original) {
			const props = args[0]
			if (
				props == null ||
				typeof props !== 'object' ||
				!containsMessageContextMenu((props as BottomSheetProps).children)
			)
				return Reflect.apply(original, this, args)

			return Reflect.apply(original, this, [
				{
					...(props as BottomSheetProps),
					enablePanDownToClose: false,
				},
				args[1],
			])
		}),
	)
}
