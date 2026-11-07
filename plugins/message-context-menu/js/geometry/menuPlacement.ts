import type { MessageOrigin } from '../types'

export interface MenuPlacement {
	left: number
	top: number
	width: number
	maxMenuHeight: number
	opensBelow: boolean
}

export function getMenuPlacement(
	origin: MessageOrigin | undefined,
	requestedWidth: number,
	menuHeight: number,
	attachedHeight: number,
	viewportWidth: number,
	viewportHeight: number,
	edgeOffset: number,
	anchorOffset: number,
	minWidth: number,
): MenuPlacement {
	const inset = Math.min(
		Math.max(0, edgeOffset),
		viewportWidth / 2,
		viewportHeight / 2,
	)
	const offset = Math.min(Math.max(0, anchorOffset), viewportHeight)
	const maxWidth = Math.max(0, viewportWidth - inset * 2)
	const width = Math.min(Math.max(requestedWidth, minWidth), maxWidth)
	const anchorX = origin?.x ?? viewportWidth / 2
	const anchorY = origin?.y ?? viewportHeight / 2
	const spaceAbove = Math.max(0, anchorY - inset - offset)
	const spaceBelow = Math.max(0, viewportHeight - anchorY - inset - offset)
	const opensBelow = origin
		? menuHeight <= spaceBelow ||
			(menuHeight > spaceAbove && spaceBelow >= spaceAbove)
		: false
	const availableSpace = origin
		? opensBelow
			? spaceBelow
			: spaceAbove
		: Math.max(0, viewportHeight / 2 - inset)
	const maxMenuHeight = Math.max(0, availableSpace - attachedHeight)
	const totalHeight = Math.min(menuHeight, maxMenuHeight) + attachedHeight
	const maxLeft = Math.max(inset, viewportWidth - inset - width)
	const left = Math.max(
		Math.min(anchorX - width / 2, maxLeft),
		Math.min(inset, maxLeft),
	)
	const top = origin
		? opensBelow
			? Math.min(anchorY + offset, viewportHeight - inset - totalHeight)
			: Math.max(inset, anchorY - offset - totalHeight)
		: Math.max(inset, (viewportHeight - totalHeight) / 2)

	return {
		left,
		top,
		width,
		maxMenuHeight,
		opensBelow,
	}
}
