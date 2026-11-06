import { onSettingsModulesLoaded } from '@valenced/discord/modules/settings'
import { DEFAULTS } from './constants'
import { applyActivity, clearActivity } from './lib/activity'
import { getSettings, pluginState, setStorage } from './lib/state'
import { maybePromptActivityBlocked } from './ui/components/ActivityVisibilityNotice'
import { registerImagePages } from './ui/routes'
import Settings from './ui/Settings'
import type { CustomRpcStorage } from './types'

export default plugin<{ jsonStorage: CustomRpcStorage }>({
	jsonStorage: {
		load: true,
		default: DEFAULTS,
	},
	start({ cleanup, jsonStorage }) {
		setStorage(jsonStorage)
		pluginState.pluginStopped = false

		cleanup(onSettingsModulesLoaded(() => cleanup(registerImagePages())))

		// Stop showing a stale activity when the plugin is disabled.
		if (!getSettings().enabled) {
			clearActivity()
		} else {
			applyActivity()
		}

		// Surface a filtered activity without requiring the settings page to be
		// opened, since Discord reports success either way.
		maybePromptActivityBlocked()

		cleanup(
			jsonStorage.subscribe(() => {
				if (!getSettings().enabled) {
					clearActivity()
				} else {
					applyActivity()
				}
			}),
		)

		cleanup(() => {
			// Clear first: `sendRequest` refuses to dispatch once the plugin is
			// marked stopped, so raising the flag before this would leave the
			// activity stuck on the profile.
			clearActivity()
			pluginState.pluginStopped = true
		})
	},
	SettingsComponent: Settings,
})
