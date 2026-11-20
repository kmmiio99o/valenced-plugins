import { modules } from '../common'

export interface StagedStickerImage {
	uri: string
	fileName: string
	mimeType: string
	bytes: number
	cachePath: string
}

const STICKER_FOLDER = 'expression-utils'

const SUPPORTED_STICKER_MIME_TYPES = new Set([
	'image/png',
	'image/apng',
	'image/gif',
])

function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			const result = reader.result
			if (typeof result !== 'string') {
				reject(new Error('Could not read sticker bytes'))
				return
			}
			const separator = result.indexOf(',')
			resolve(separator === -1 ? result : result.slice(separator + 1))
		}
		reader.onerror = () =>
			reject(reader.error ?? new Error('Could not read sticker bytes'))
		reader.readAsDataURL(blob)
	})
}

function base64ByteLength(base64: string): number {
	const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
	return Math.floor((base64.length * 3) / 4) - padding
}

function canonicalImageName(requestedName: string, mimeType: string): string {
	const extension =
		mimeType === 'image/gif' ? 'gif' : mimeType === 'image/apng' ? 'apng' : 'png'
	const dot = requestedName.lastIndexOf('.')
	const base = dot > 0 ? requestedName.slice(0, dot) : requestedName
	return `${base}.${extension}`
}

// The CDN header decides the upload mime; `image/png` breaks animated stickers.
function resolveMimeType(response: Response, fallback: string): string {
	const header = response.headers?.get?.('content-type')
	const mime = header?.split(';')[0]?.trim()?.toLowerCase()
	return mime && SUPPORTED_STICKER_MIME_TYPES.has(mime) ? mime : fallback
}

// Uses Discord's own writeFile, same flow as its poll-GIF uploads.
export async function stageStickerImage(
	url: string,
	requestedName: string,
	fallbackMimeType: string,
): Promise<StagedStickerImage> {
	const fileManager = modules.fileManagerUtils
	if (!fileManager) throw new Error('Discord file manager is unavailable')

	const response = await fetch(url)
	if (!response.ok) {
		throw new Error(`Sticker download failed (HTTP ${response.status})`)
	}
	const mimeType = resolveMimeType(response, fallbackMimeType)
	const blob = await response.blob()
	const base64 = await blobToBase64(blob)

	const fileName = canonicalImageName(requestedName, mimeType)
	const cachePath = `${STICKER_FOLDER}/${fileName}`
	const uri = await fileManager.writeFile('cache', cachePath, base64, 'base64')

	return {
		uri,
		fileName,
		mimeType,
		bytes: base64ByteLength(base64),
		cachePath,
	}
}

export function deleteStagedStickerImage(
	staged: StagedStickerImage,
): Promise<unknown> {
	const fileManager = modules.fileManagerUtils
	if (!fileManager) return Promise.resolve(undefined)
	return fileManager.removeFile('cache', staged.cachePath)
}
