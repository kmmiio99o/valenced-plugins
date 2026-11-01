import { getExpressionAsset } from './expressionAsset'
import { copyImage, downloadImage } from './native'
import { showToast } from './toasts'
import type { EmojiNode, StickerNode } from '../types'

interface ImageRequest {
	url: string
	fileName: string
}

function errorText(error: unknown) {
	return error instanceof Error ? error.message : String(error)
}

async function copyImageAction(resolve: () => ImageRequest) {
	try {
		const { url, fileName } = resolve()
		await copyImage(url, fileName)
		showToast('EXPRESSION_UTILS_COPY_IMAGE', 'Image copied to clipboard.')
	} catch (error) {
		showToast(
			'EXPRESSION_UTILS_COPY_IMAGE',
			`Failed to copy image: ${errorText(error)}`,
			'critical',
		)
	}
}

export function copyAsImage(url: string, fileName: string) {
	return copyImageAction(() => ({ url, fileName }))
}

export function copyStickerAsImage(sticker: StickerNode) {
	return copyImageAction(() => {
		const asset = getExpressionAsset(sticker)
		return {
			url: asset.url,
			fileName: `sticker-${sticker.id}.${asset.extension}`,
		}
	})
}

async function downloadImageAction(resolve: () => ImageRequest) {
	try {
		const { url, fileName } = resolve()
		await downloadImage(url, fileName)
		showToast('EXPRESSION_UTILS_DOWNLOAD', 'Image saved to Downloads.')
	} catch (error) {
		showToast(
			'EXPRESSION_UTILS_DOWNLOAD',
			`Download failed: ${errorText(error)}`,
			'critical',
		)
	}
}

export function downloadEmoji(emoji: EmojiNode) {
	const extension = emoji.animated || emoji.src.includes('.gif') ? 'gif' : 'png'
	return downloadImageAction(() => ({
		url: emoji.src,
		fileName: `emoji-${emoji.id}.${extension}`,
	}))
}

export function downloadSticker(sticker: StickerNode) {
	return downloadImageAction(() => {
		const asset = getExpressionAsset(sticker)
		return {
			url: asset.url,
			fileName: `sticker-${sticker.id}.${asset.extension}`,
		}
	})
}
