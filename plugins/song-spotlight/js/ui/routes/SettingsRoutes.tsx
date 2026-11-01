import {
	onSettingsModulesLoaded,
	refreshSettings,
	registerSettingsItem,
} from '@valenced/discord/modules/settings'
import ServerSettings from '../settings/server/ServerSettings'
import type { PluginApi } from '@valenced/plugins/types'
import type { SongSpotlightSettings } from '../../types'

export const SERVER_SETTINGS_ROUTE = 'dev.kmmiio99o.song-spotlight.server'

export function registerSettingsRoutes(
	cleanup: PluginApi<{ jsonStorage: SongSpotlightSettings }>['cleanup'],
) {
	cleanup(
		onSettingsModulesLoaded(() => {
			const unregister = registerSettingsItem(SERVER_SETTINGS_ROUTE, {
				parent: null,
				type: 'route',
				useTitle: () => 'Song Spotlight server',
				screen: {
					route: SERVER_SETTINGS_ROUTE,
					getComponent: () => ServerSettings,
				},
			})
			refreshSettings()
			cleanup(() => {
				unregister()
				refreshSettings()
			})
		}),
	)
}
