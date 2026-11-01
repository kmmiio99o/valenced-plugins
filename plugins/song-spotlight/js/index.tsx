import { findAudioModule, stopPreview } from './modules/audio'
import { setRuntime } from './modules/runtime'
import { installProfileTabs } from './patches/profileTabs'
import Settings from './settings'
import { DEFAULT_SETTINGS } from './types'
import { registerSettingsRoutes } from './ui/routes/SettingsRoutes'
import type { SongSpotlightSettings } from './types'

export default plugin<{ jsonStorage: SongSpotlightSettings }>({
	jsonStorage: {
		load: true,
		default: DEFAULT_SETTINGS,
	},

	start({ cleanup, jsonStorage, plugin }) {
		setRuntime(jsonStorage, error => plugin.reportError(error))
		cleanup(findAudioModule(), stopPreview)
		registerSettingsRoutes(cleanup)
		installProfileTabs(cleanup)
	},

	SettingsComponent: Settings,
})
