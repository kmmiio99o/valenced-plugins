import { instead } from '@valenced/patcher'
import { createElement } from 'react'
import ExpressionActions from '../components/ExpressionActions'
import type { ExpressionNode } from '../types'

export interface ElementLike {
	type?: unknown
	props?: {
		children?: unknown
		[key: string]: unknown
	}
}

export function patchFunction(
	parent: object,
	key: string,
	mutate: (args: unknown[], result: unknown) => unknown,
) {
	return instead(
		parent as Record<string, (...args: any[]) => any>,
		key,
		function (args, original) {
			return mutate(args, Reflect.apply(original, this, args))
		},
	)
}

export function appendAction(element: unknown, node: ExpressionNode) {
	if (!element || typeof element !== 'object' || !('props' in element)) return
	const parent = element as ElementLike
	if (!parent.props) return

	const action = createElement(ExpressionActions, { node })
	const existing = parent.props.children
	if (existing == null) parent.props.children = [action]
	else if (Array.isArray(existing))
		parent.props.children = [...existing, action]
	else parent.props.children = [existing, action]
}

export function findReactNode(
	root: unknown,
	predicate: (value: ElementLike) => boolean,
	visited = new Set<object>(),
): ElementLike | undefined {
	if (!root || typeof root !== 'object' || visited.has(root)) return
	visited.add(root)

	if (Array.isArray(root)) {
		for (const item of root) {
			const match = findReactNode(item, predicate, visited)
			if (match) return match
		}
		return
	}

	const element = root as ElementLike
	if (predicate(element)) return element
	return findReactNode(element.props?.children, predicate, visited)
}
