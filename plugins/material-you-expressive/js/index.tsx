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
		let avatarShapes = readSettings(jsonStorage.cache).avatarShapes
		const applyAvatarSetting = (enabled: boolean) => {
			void setAvatarShapes(enabled).catch(error => self.reportError(error))
		}
		applyAvatarSetting(avatarShapes)
		cleanup(
			jsonStorage.subscribe(() => {
				const next = readSettings(jsonStorage.cache).avatarShapes
				if (next === avatarShapes) return
				avatarShapes = next
				applyAvatarSetting(next)
			}),
		)
	},
	SettingsComponent: SettingsPage,
})
