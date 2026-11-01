import { modules } from '../common'
import { StickerFormat } from '../types'
import { getExpressionAsset } from './expressionAsset'
import { deleteStagedStickerImage, stageStickerImage } from './native'
import { showToast } from './toasts'
import type { StickerNode } from '../types'

function uploadError(error: unknown) {
	if (error && typeof error === 'object' && 'body' in error) {
		const body = error.body
		if (body && typeof body === 'object') {
			if ('name' in body && Array.isArray(body.name)) return body.name.join('/')
			if ('message' in body && typeof body.message === 'string')
				return body.message
		}
	}
	return error instanceof Error ? error.message : String(error)
}

export async function uploadSticker(
	guildId: string,
	sticker: StickerNode,
	name: string,
) {
	const actions = modules.stickerCreationActions
	if (typeof actions?.createGuildSticker !== 'function') {
		showToast(
			'EXPRESSION_UTILS_UPLOAD_STICKER_UNAVAILABLE',
			'Discord sticker upload is unavailable.',
			'critical',
		)
		return
	}

	let staged: Awaited<ReturnType<typeof stageStickerImage>> | undefined
	showToast('EXPRESSION_UTILS_STICKER_PREPARING', 'Preparing sticker...')
	try {
		const asset = getExpressionAsset(sticker)
		if (
			![StickerFormat.PNG, StickerFormat.APNG, StickerFormat.GIF].includes(
				sticker.format_type as 1 | 2 | 4,
			)
		) {
			throw new Error('This sticker format cannot be cloned.')
		}
		staged = await stageStickerImage(
			asset.url,
			`sticker-${sticker.id}.${asset.extension}`,
		)
		showToast('EXPRESSION_UTILS_STICKER_UPLOADING', 'Uploading sticker...')
		await actions.createGuildSticker({
			guildId,
			name: name.trim() || sticker.name,
			tags: sticker.tags?.trim().slice(0, 200) || '✨',
			description: '',
			uri: staged.uri,
			mimeType: staged.mimeType,
			platform: 'mobile',
			originalMd5: null,
		})
		showToast(
			'EXPRESSION_UTILS_STICKER_SUCCESS',
			`Cloned sticker "${name.trim() || sticker.name}" successfully.`,
			'success',
		)
	} catch (error) {
		showToast(
			'EXPRESSION_UTILS_STICKER_ERROR',
			`Sticker clone failed: ${uploadError(error)}`,
			'critical',
		)
	} finally {
		if (staged) {
			try {
				await deleteStagedStickerImage(staged.uri)
			} catch (error) {
				showToast(
					'EXPRESSION_UTILS_UPLOAD_STICKER_CLEANUP',
					`Could not remove the temporary sticker file: ${uploadError(error)}`,
					'critical',
				)
			}
		}
	}
}
