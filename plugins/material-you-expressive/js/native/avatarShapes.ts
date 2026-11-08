import { callNativeMethod } from '@valenced/modules/native'

export function setAvatarShapes(enabled: boolean) {
	return callNativeMethod('dev.kmmiio99o.expressive.setAvatarShapes', [enabled])
}

declare module '@valenced/modules/native' {
	interface NativeMethods {
		'dev.kmmiio99o.expressive.setAvatarShapes': [[enabled: boolean], null]
	}
}
