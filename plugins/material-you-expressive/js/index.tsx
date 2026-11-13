import { setGuildShapesEnabled } from './components/screens'
import { patchComponents } from './discord/patches/components'
import { patchRadii } from './discord/patches/radii'
import { setAvatarShapes } from './native/avatarShapes'
import SettingsPage from './settings'
import { readSettings } from './settings/types'
import type { Settings } from './settings/types'

export default plugin<{ jsonStorage: Settings }>({
	jsonStorage: { load: true, default: readSettings({}) },
	preInit({ plugin: self }) {
		if (self.startedLate) self.requireReload()
	},
	init({ cleanup, jsonStorage }) {
		const settings = readSettings(jsonStorage.cache)
		if (settings.expressiveCorners) patchRadii(cleanup)
		cleanup(patchComponents(settings))
	},
	start({ cleanup, jsonStorage, plugin: self }) {
		const initialSettings = readSettings(jsonStorage.cache)
		let avatarShapes = initialSettings.avatarShapes
		let guildShapes = initialSettings.expressiveGuilds
		setGuildShapesEnabled(guildShapes)
		const applyAvatarSetting = (enabled: boolean) => {
			void setAvatarShapes(enabled).catch(error => self.reportError(error))
		}
		applyAvatarSetting(avatarShapes)
		cleanup(
			jsonStorage.subscribe(() => {
				const settings = readSettings(jsonStorage.cache)
				if (settings.avatarShapes !== avatarShapes) {
					avatarShapes = settings.avatarShapes
					applyAvatarSetting(avatarShapes)
				}
				if (settings.expressiveGuilds !== guildShapes) {
					guildShapes = settings.expressiveGuilds
					setGuildShapesEnabled(guildShapes)
				}
			}),
		)
	},
	SettingsComponent: SettingsPage,
})
