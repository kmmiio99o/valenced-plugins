import { cdnAppAssetByIdUrl, cdnAppAssetUrl, DEFAULTS } from '../constants'
import type { PluginApi } from '@valenced/plugins/types'
import type { CustomRpcStorage } from '../types'

type StorageApi = PluginApi<{ jsonStorage: CustomRpcStorage }>['jsonStorage']

let storage: StorageApi | undefined

export function setStorage(handle: StorageApi) {
	storage = handle
}

export function getStorage() {
	return storage
}

export function getSettings(): CustomRpcStorage {
	return { ...DEFAULTS, ...(storage?.cache ?? {}) }
}

export function setSettings(patch: Partial<CustomRpcStorage>): void {
	if (!storage) throw new Error('Custom RPC storage has not been initialized.')
	void storage.set({ ...getSettings(), ...patch })
}

export const pluginState = {
	pluginStopped: false,
} as {
	pluginStopped: boolean
}

export function getImagePreviewUri(
	config: {
		source: 'none' | 'key' | 'url'
		value: string
		assetId?: string
	},
	clientId: string,
): string | undefined {
	if (!config.value) return undefined
	if (config.source === 'url') return config.value
	if (config.source === 'key' && clientId) {
		// Must match what `getAssetImage` resolves against the CDN, which serves
		// application assets by numeric id: `app-assets/{app_id}/{id}.png`.
		if (config.assetId) return cdnAppAssetByIdUrl(clientId, config.assetId)
		return cdnAppAssetUrl(clientId, config.value)
	}
	return undefined
}
