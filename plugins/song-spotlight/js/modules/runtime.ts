import type { JsonStorage } from '@valenced/json-storage'
import type { SongSpotlightSettings } from '../types'

let storage: JsonStorage<SongSpotlightSettings> | undefined
let reportError: (error: unknown) => void = console.error

export function setRuntime(
	value: JsonStorage<SongSpotlightSettings>,
	onError: (error: unknown) => void,
) {
	storage = value
	reportError = onError
}

export function getRuntimeStorage() {
	return storage
}

export function reportPluginError(error: unknown) {
	reportError(error)
}
