import { callNativeMethod } from '@valenced/modules/native'

export function supportsImageClipboard() {
	return callNativeMethod(
		'dev.kmmiio99o.expression-utils.supportsImageClipboard',
		[],
	)
}

export function copyImage(url: string, fileName: string) {
	return callNativeMethod('dev.kmmiio99o.expression-utils.copyImage', [
		url,
		fileName,
	])
}

export function downloadImage(url: string, fileName: string) {
	return callNativeMethod('dev.kmmiio99o.expression-utils.downloadImage', [
		url,
		fileName,
	])
}

export function stageStickerImage(url: string, fileName: string) {
	return callNativeMethod('dev.kmmiio99o.expression-utils.stageStickerImage', [
		url,
		fileName,
	])
}

export function deleteStagedStickerImage(uri: string) {
	return callNativeMethod(
		'dev.kmmiio99o.expression-utils.deleteStagedStickerImage',
		[uri],
	)
}

declare module '@valenced/modules/native' {
	interface NativeMethods {
		'dev.kmmiio99o.expression-utils.supportsImageClipboard': [[], boolean]
		'dev.kmmiio99o.expression-utils.copyImage': [
			[url: string, fileName: string],
			{ uri: string; bytes: number },
		]
		'dev.kmmiio99o.expression-utils.downloadImage': [
			[url: string, fileName: string],
			{ uri: string; bytes: number },
		]
		'dev.kmmiio99o.expression-utils.stageStickerImage': [
			[url: string, fileName: string],
			{ uri: string; fileName: string; mimeType: string; bytes: number },
		]
		'dev.kmmiio99o.expression-utils.deleteStagedStickerImage': [
			[uri: string],
			boolean,
		]
	}
}
