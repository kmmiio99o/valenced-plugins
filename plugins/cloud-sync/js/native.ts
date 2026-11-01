import { callNativeMethod } from '@valenced/modules/native'

export function saveJsonFile(fileName: string, contents: string) {
	return callNativeMethod('dev.kmmiio99o.cloud.sync.saveJsonFile', [
		fileName,
		contents,
	])
}

export function pickJsonFile() {
	return callNativeMethod('dev.kmmiio99o.cloud.sync.pickJsonFile', [])
}

declare module '@valenced/modules/native' {
	interface NativeMethods {
		'dev.kmmiio99o.cloud.sync.saveJsonFile': [
			[fileName: string, contents: string],
			boolean,
		]
		'dev.kmmiio99o.cloud.sync.pickJsonFile': [[], string | null]
	}
}
