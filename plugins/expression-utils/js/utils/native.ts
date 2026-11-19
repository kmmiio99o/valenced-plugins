import { callNativeMethod } from '@valenced/modules/native'

/** Android only: places the image on the clipboard using MediaStore. */
export function copyImage(url: string, fileName: string) {
	return callNativeMethod('dev.kmmiio99o.expression-utils.copyImage', [
		url,
		fileName,
	])
}

/** Android only: saves the image into Downloads using MediaStore. */
export function downloadImage(url: string, fileName: string) {
	return callNativeMethod('dev.kmmiio99o.expression-utils.downloadImage', [
		url,
		fileName,
	])
}

declare module '@valenced/modules/native' {
	interface NativeMethods {
		'dev.kmmiio99o.expression-utils.copyImage': [
			[url: string, fileName: string],
			{ uri: string; bytes: number },
		]
		'dev.kmmiio99o.expression-utils.downloadImage': [
			[url: string, fileName: string],
			{ uri: string; bytes: number },
		]
	}
}
