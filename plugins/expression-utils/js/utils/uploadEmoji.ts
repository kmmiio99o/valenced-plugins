import { uploadGuildEmoji } from './discordEmojiUpload'
import { showToast } from './toasts'
import type { EmojiNode } from '../types'

function toBase64(bytes: Uint8Array) {
	let binary = ''
	for (const byte of bytes) binary += String.fromCharCode(byte)
	if (typeof btoa === 'function') return btoa(binary)
	const BufferModule = (globalThis as { Buffer?: any }).Buffer
	if (BufferModule?.from) return BufferModule.from(bytes).toString('base64')
	throw new Error('Base64 encoding is unavailable.')
}

function uploadError(error: unknown) {
	if (error && typeof error === 'object' && 'body' in error) {
		const body = error.body
		if (
			body &&
			typeof body === 'object' &&
			'name' in body &&
			Array.isArray(body.name)
		) {
			return body.name.join('/')
		}
	}
	return error instanceof Error ? error.message : String(error)
}

export async function uploadEmoji(
	guildId: string,
	node: EmojiNode,
	name: string,
) {
	showToast('EXPRESSION_UTILS_UPLOAD_PROGRESS', 'Uploading emoji...')
	try {
		const response = await fetch(node.src)
		if (!response.ok)
			throw new Error(`Could not download emoji (HTTP ${response.status}).`)

		const bytes = new Uint8Array(await response.arrayBuffer())
		const mimeType =
			node.animated || node.src.includes('.gif') ? 'image/gif' : 'image/png'
		const image = `data:${mimeType};base64,${toBase64(bytes)}`
		await uploadGuildEmoji(guildId, image, name)
		showToast(
			'EXPRESSION_UTILS_UPLOAD_SUCCESS',
			`Uploaded :${name}: successfully.`,
			'success',
		)
	} catch (error) {
		showToast(
			'EXPRESSION_UTILS_UPLOAD_ERROR',
			`Emoji upload failed: ${uploadError(error)}`,
			'critical',
		)
	}
}
