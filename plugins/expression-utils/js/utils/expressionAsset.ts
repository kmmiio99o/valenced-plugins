import { modules } from '../common'
import { StickerFormat } from '../types'
import type { StickerNode } from '../types'

const extensionByFormat: Record<number, string> = {
	[StickerFormat.PNG]: 'png',
	[StickerFormat.APNG]: 'apng',
	[StickerFormat.GIF]: 'gif',
}

const mimeByExtension: Record<string, string> = {
	png: 'image/png',
	apng: 'image/png',
	gif: 'image/gif',
}

export function getExpressionAsset(sticker: StickerNode) {
	const extension = extensionByFormat[sticker.format_type]
	const url = modules.stickerUtils?.getStickerAssetUrl(sticker)
	if (!url || !extension) throw new Error('Unsupported sticker asset.')

	return {
		url: extension === 'png' ? url.replace(/\.webp\?/i, '.png?') : url,
		extension,
		mimeType: mimeByExtension[extension]!,
	}
}
