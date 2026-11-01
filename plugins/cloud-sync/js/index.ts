import Settings from './ui/Settings'
import type { CloudSyncSettings } from './types'
import { DEFAULT_SETTINGS } from './types'
import { getData, loginWithUserId, saveData } from './api'
import { grabEverything, readStorageFile, restoreEverything, showCloudToast } from './sync'

declare const plugin: <T = any>(def: any) => any
declare const valenced: any

export default plugin<{ jsonStorage: CloudSyncSettings }>({
	jsonStorage: {
		load: true,
		default: DEFAULT_SETTINGS,
	},

	start(api) {
		const getSettings = (): CloudSyncSettings => ({
			...DEFAULT_SETTINGS,
			...(readStorageFile('rosie.cloud-sync') ?? {}),
			...(api.jsonStorage.cache ?? {}),
		})

		const runAutoSync = async () => {
			const settings = getSettings()
			if (!settings.autoSync) return
			try {
				const rev = typeof valenced !== 'undefined' ? valenced : (globalThis as any).valenced
				const user = rev?.discord?.flux?.Stores?.UserStore?.getCurrentUser?.()
				if (!user?.id) return
				let token = settings.authToken
				if (!token) {
					token = await loginWithUserId(settings.serverUrl, user.id)
					api.jsonStorage.set({ authToken: token })
				}
				const data = await grabEverything(settings)
				await saveData(settings.serverUrl, token, data)
				api.jsonStorage.set({ lastSyncedAt: new Date().toISOString() })
			} catch {}
		}

		runAutoSync()

		let cmdCleanup: (() => void) | null = null
		let checkInterval: any = null

		const registerCloudCommand = () => {
			const clientUtils =
				(globalThis as any).__c_utils ??
				(typeof valenced !== 'undefined' ? (valenced?.plugins as any)?.clientUtils : null)

			if (clientUtils?.registerCommand && !cmdCleanup) {
				if (checkInterval) {
					clearInterval(checkInterval)
					checkInterval = null
				}
				cmdCleanup = clientUtils.registerCommand(
					{
						name: 'cloudsync',
						displayName: 'cloudsync',
						serverLocalizedName: 'cloudsync',
						untranslatedName: 'cloudsync',
						description: 'Synchronize plugins, themes, and settings with CloudSync.',
						displayDescription: 'Synchronize plugins, themes, and settings with CloudSync.',
						serverLocalizedDescription: 'Synchronize plugins, themes, and settings with CloudSync.',
						untranslatedDescription: 'Synchronize plugins, themes, and settings with CloudSync.',
						_pluginMeta: {
							id: 'rosie.cloud-sync',
							name: 'CloudSync',
							description: 'CloudSync utilities',
							icon: 'https://raw.githubusercontent.com/everestmcarthur/valenced-next-plugs/main/assets/cloud.png',
						},
						options: [
							{
								name: 'action',
								displayName: 'action',
								serverLocalizedName: 'action',
								untranslatedName: 'action',
								description: 'Select action to perform (upload, restore, status)',
								displayDescription: 'Select action to perform (upload, restore, status)',
								serverLocalizedDescription: 'Select action to perform (upload, restore, status)',
								untranslatedDescription: 'Select action to perform (upload, restore, status)',
								type: 3,
								required: false,
								choices: [
									{
										name: 'upload',
										displayName: 'Upload to Cloud',
										serverLocalizedName: 'Upload to Cloud',
										untranslatedName: 'Upload to Cloud',
										label: 'Upload to Cloud',
										value: 'upload',
									},
									{
										name: 'restore',
										displayName: 'Restore from Cloud',
										serverLocalizedName: 'Restore from Cloud',
										untranslatedName: 'Restore from Cloud',
										label: 'Restore from Cloud',
										value: 'restore',
									},
									{
										name: 'status',
										displayName: 'Status',
										serverLocalizedName: 'Status',
										untranslatedName: 'Status',
										label: 'Status',
										value: 'status',
									},
								],
							},
						],
						execute: async (args: any) => {
							const action =
								args?.find?.((a: any) => a.name === 'action')?.value ??
								args?.[0]?.value ??
								'status'
							const settings = getSettings()
							const rev = typeof valenced !== 'undefined' ? valenced : (globalThis as any).valenced
							const user = rev?.discord?.flux?.Stores?.UserStore?.getCurrentUser?.()

							if (action === 'status') {
								const last = settings.lastSyncedAt
									? new Date(settings.lastSyncedAt).toLocaleString()
									: 'Never'
								return {
									content: `**CloudSync Status**\nUser: \`${user?.username ?? 'Unknown'}\`\nServer: \`${settings.serverUrl}\`\nLast Sync: \`${last}\`\nAuto-Sync: \`${settings.autoSync ? 'Enabled' : 'Disabled'}\``,
								}
							}

							if (action === 'upload') {
								if (!user?.id) return { content: 'CloudSync error: No logged-in user.' }
								try {
									let token = settings.authToken
									if (!token) {
										token = await loginWithUserId(settings.serverUrl, user.id)
										api.jsonStorage.set({ authToken: token })
									}
									const data = await grabEverything(settings)
									await saveData(settings.serverUrl, token, data)
									const now = new Date().toISOString()
									api.jsonStorage.set({ lastSyncedAt: now })
									showCloudToast('CloudSync: Backup complete!', 'success', 'All 8 domains uploaded')
									return {
										content: `**CloudSync**: Successfully backed up data to cloud at \`${new Date(now).toLocaleString()}\`.`,
									}
								} catch (e: any) {
									return { content: `**CloudSync**: Backup failed: ${e?.message || e}` }
								}
							}

							if (action === 'restore') {
								if (!user?.id) return { content: 'CloudSync error: No logged-in user.' }
								try {
									let token = settings.authToken
									if (!token) {
										token = await loginWithUserId(settings.serverUrl, user.id)
										api.jsonStorage.set({ authToken: token })
									}
									const data = await getData(settings.serverUrl, token)
									const res = await restoreEverything(data, settings)
									const total =
										res.repos +
										res.plugins +
										res.themes +
										res.fonts +
										res.iconPacks +
										res.emojiPacks +
										res.settings +
										res.experiments
									const now = new Date().toISOString()
									api.jsonStorage.set({ lastSyncedAt: now })
									showCloudToast(`CloudSync: Restored ${total} items!`, 'success')
									return { content: `**CloudSync**: Successfully restored ${total} items from cloud.` }
								} catch (e: any) {
									return { content: `**CloudSync**: Restore failed: ${e?.message || e}` }
								}
							}

							return { content: 'Invalid CloudSync command action.' }
						},
					},
					'CloudSync',
				)

				if (typeof cmdCleanup === 'function') {
					api.cleanup(cmdCleanup)
				}
			}
		}

		registerCloudCommand()

		if (!cmdCleanup) {
			checkInterval = setInterval(registerCloudCommand, 500)
			api.cleanup(() => {
				if (checkInterval) {
					clearInterval(checkInterval)
					checkInterval = null
				}
			})
		}
	},

	SettingsComponent: Settings,
})
