import { getModuleWithImportedPath } from '@valenced/discord/utils/modules/finders'
import { onModuleFinishedImporting } from '@valenced/discord/utils/modules/metro/subscriptions'
import { initializeStickerDetailSheet, modules } from '../common'
import { appendAction, findReactNode, patchFunction } from './reactTree'
import type { FC } from 'react'
import type { StickerNode } from '../types'

interface StickerDetailProps {
	renderableSticker?: { id: string; name?: string; format_type?: number }
}

interface StickerPickerProps {
	channel?: unknown
}

type AddCleanup = (cleanup: () => void) => void
type ReportError = (error: unknown) => void

function nodeForSticker(renderable: StickerDetailProps['renderableSticker']) {
	if (!renderable?.id) return
	const sticker = {
		...modules.stickerStore?.getStickerById(renderable.id),
		...renderable,
	}
	if (typeof sticker.format_type !== 'number') return
	return { kind: 'sticker' as const, sticker: sticker as StickerNode }
}

export function installStickerPatches(
	addCleanup: AddCleanup,
	reportError: ReportError,
) {
	addCleanup(
		onModuleFinishedImporting((id, path) => {
			if (path !== 'modules/stickers/native/StickerPicker.tsx') return
			initializeStickerDetailSheet(id)
		}),
	)

	addCleanup(
		getModuleWithImportedPath<{
			default: FC<StickerDetailProps> | { type?: FC<StickerDetailProps> }
		}>('modules/stickers/native/StickerDetailActionSheet.tsx', module => {
			const component = module.default
			const patch = (parent: object, key: string) =>
				addCleanup(
					patchFunction(parent, key, (args, result) => {
						try {
							const renderable = (
								args[0] as {
									renderableSticker?: StickerDetailProps['renderableSticker']
								}
							)?.renderableSticker
							const node = nodeForSticker(renderable)
							if (node)
								appendAction(
									(result as { props?: { children?: unknown } })?.props
										?.children,
									node,
								)
						} catch (error) {
							reportError(`Failed to add sticker actions: ${String(error)}`)
						}
						return result
					}),
				)
			if (typeof component === 'function') patch(module, 'default')
			else if (typeof component?.type === 'function') patch(component, 'type')
		}),
	)

	addCleanup(
		getModuleWithImportedPath<{
			default: FC<StickerPickerProps> | { type?: FC<StickerPickerProps> }
		}>('modules/stickers/native/StickerPicker.tsx', module => {
			const component = module.default
			const patch = (parent: object, key: string) =>
				addCleanup(
					patchFunction(parent, key, (args, result) => {
						const channel = (args[0] as StickerPickerProps | undefined)?.channel
						if (!channel || result == null) return result
						const grid = findReactNode(
							result,
							element =>
								!!element.props && 'onLongPressStickerDetail' in element.props,
						)
						if (grid?.props) {
							grid.props.onLongPressStickerDetail = (
								renderableSticker: unknown,
							) => {
								modules.stickerDetailSheet!.showStickerDetailActionSheet({
									renderableSticker,
									channel,
								})
							}
						}
						return result
					}),
				)
			if (typeof component === 'function') patch(module, 'default')
			else if (typeof component?.type === 'function') patch(component, 'type')
		}),
	)
}
