import { Clipboard } from '@valenced/externals/react-native-clipboard'
import { Share } from 'react-native'
import { modules } from '../common'

interface FetchedImage {
	base64: string
	mimeType: string
}

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
	'image/png',
	'image/apng',
	'image/gif',
	'image/jpeg',
	'image/webp',
])

function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			const result = reader.result
			if (typeof result !== 'string') {
				reject(new Error('Could not read image bytes'))
				return
			}
			const separator = result.indexOf(',')
			resolve(separator === -1 ? result : result.slice(separator + 1))
		}
		reader.onerror = () =>
			reject(reader.error ?? new Error('Could not read image bytes'))
		reader.readAsDataURL(blob)
	})
}

async function fetchImageAsBase64(url: string): Promise<FetchedImage> {
	const response = await fetch(url)
	if (!response.ok) {
		throw new Error(`Image download failed (HTTP ${response.status})`)
	}
	const header = response.headers?.get?.('content-type')
	const mime = header?.split(';')[0]?.trim()?.toLowerCase()
	const mimeType = mime && SUPPORTED_IMAGE_MIME_TYPES.has(mime) ? mime : 'image/png'
	return { base64: await blobToBase64(await response.blob()), mimeType }
}

function canonicalName(requestedName: string, mimeType: string): string {
	const extension =
		mimeType === 'image/gif'
			? 'gif'
			: mimeType === 'image/apng'
				? 'apng'
				: mimeType === 'image/jpeg'
					? 'jpg'
					: mimeType === 'image/webp'
						? 'webp'
						: 'png'
	const dot = requestedName.lastIndexOf('.')
	const base = dot > 0 ? requestedName.slice(0, dot) : requestedName
	return `${base}.${extension}`
}

// pasteboard can hold animated images but Clipboard.setImage cant copy them as animated
export async function copyImageIos(url: string): Promise<void> {
	const { base64 } = await fetchImageAsBase64(url)
	Clipboard.setImage(base64)
}

// Share sheet for a js only route to download Photos on ios
export async function downloadImageIos(
	url: string,
	fileName: string,
): Promise<void> {
	const fileManager = modules.fileManagerUtils
	if (!fileManager) throw new Error('Discord file manager is unavailable')

	const { base64, mimeType } = await fetchImageAsBase64(url)
	const path = `expression-utils/${canonicalName(fileName, mimeType)}`
	const uri = await fileManager.writeFile('cache', path, base64, 'base64')
	const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`

	try {
		await Share.share({ url: fileUri })
	} finally {
		await fileManager.removeFile('cache', path)
	}
}
