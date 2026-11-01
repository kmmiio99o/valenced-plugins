import { callNativeMethod } from '@valenced/modules/native'
import type {
	CloudSyncSettings,
	PluginBackup,
	RepoEntry,
	SelectiveDomains,
	SyncResult,
	UserData,
} from './types'

export type LogScope =
	| 'plugins'
	| 'themes'
	| 'fonts'
	| 'iconPacks'
	| 'emojiPacks'
	| 'repos'
	| 'settings'
	| 'experiments'
	| 'system'

export type LogCallback = (scope: LogScope, message: string) => void

let currentLogCb: LogCallback | null = null

export function setLogCallback(cb: LogCallback | null) {
	currentLogCb = cb
}

export function logSync(scope: LogScope, message: string) {
	currentLogCb?.(scope, message)
}

const KNOWN_PLUGIN_IDS = [
	'dev.everestmcarthur.you-bar-plus',
	'rosie.auto-quest',
	'rosie.better-devices',
	'rosie.better-inbox',
	'rosie.chat-bubbles',
	'rosie.chatbox-avatar',
	'rosie.checkup',
	'rosie.client-utils',
	'rosie.clyde-editor',
	'rosie.dreamscape',
	'rosie.emoji-packs',
	'rosie.file-uploader',
	'rosie.font-packs',
	'rosie.global-emojis',
	'rosie.icon-packs',
	'rosie.imagestealer',
	'rosie.live-markdown',
	'rosie.markdown-toolbar',
	'rosie.message-tweaks',
	'rosie.more-alts',
	'rosie.plugin-browser',
	'rosie.quote',
	'rosie.roselib',
	'rosie.server-info',
	'rosie.split-messages',
	'rosie.themes',
	'rosie.tilt-physics',
	'rosie.toast-api',
	'rosie.typing-styles',
	'rosie.vencord-tab',
	'rosie.view-raw',
	'rosie.vodka-themes',
]

const CORE_VALENCED_IDS = [
	'valenced.settings',
	'valenced.settings.plugins',
	'valenced.settings.themes',
	'valenced.no-track',
	'valenced.recovery',
	'valenced.staff-settings',
	'valenced.user-badges',
	'valenced.developer-kit',
	'valenced.discord.prevent-ota-updates',
	'valenced.api.hidden',
]

export function toBase64(str: string): string {
	try {
		if (typeof (globalThis as any).btoa === 'function') {
			return (globalThis as any).btoa(str)
		}
	} catch {}
	try {
		const BufferMod = (globalThis as any).Buffer
		if (BufferMod?.from) {
			return BufferMod.from(str, 'binary').toString('base64')
		}
	} catch {}
	let result = ''
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
	let i = 0
	while (i < str.length) {
		const a = str.charCodeAt(i++)
		const b = i < str.length ? str.charCodeAt(i++) : NaN
		const c = i < str.length ? str.charCodeAt(i++) : NaN
		result += chars.charAt(a >> 2)
		result += chars.charAt(((a & 3) << 4) | (isNaN(b) ? 0 : b >> 4))
		result += isNaN(b) ? '=' : chars.charAt(((b & 15) << 2) | (isNaN(c) ? 0 : c >> 6))
		result += isNaN(c) ? '=' : chars.charAt(c & 63)
	}
	return result
}

export function fromBase64(b64: string): string {
	try {
		if (typeof (globalThis as any).atob === 'function') {
			return (globalThis as any).atob(b64)
		}
	} catch {}
	try {
		const BufferMod = (globalThis as any).Buffer
		if (BufferMod?.from) {
			return BufferMod.from(b64, 'base64').toString('binary')
		}
	} catch {}
	let result = ''
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
	let i = 0
	const clean = b64.replace(/[^A-Za-z0-9+/]/g, '')
	while (i < clean.length) {
		const enc1 = chars.indexOf(clean.charAt(i++))
		const enc2 = chars.indexOf(clean.charAt(i++))
		const enc3 = chars.indexOf(clean.charAt(i++))
		const enc4 = chars.indexOf(clean.charAt(i++))
		const chr1 = (enc1 << 2) | (enc2 >> 4)
		const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2)
		const chr3 = ((enc3 & 3) << 6) | enc4
		result += String.fromCharCode(chr1)
		if (enc3 !== 64 && enc3 !== -1) result += String.fromCharCode(chr2)
		if (enc4 !== 64 && enc4 !== -1) result += String.fromCharCode(chr3)
	}
	return result
}

export function detectChannel(plugin: any, manifest: any, versionStr?: string): string {
	if (plugin?.channel) return String(plugin.channel)
	if (manifest?.channel) return String(manifest.channel)
	if (versionStr) {
		if (versionStr.includes('-b') || versionStr.includes('beta')) return 'beta'
		if (versionStr.includes('-a') || versionStr.includes('alpha')) return 'alpha'
	}
	return 'stable'
}

export function showCloudToast(
	msg: string,
	variant: 'default' | 'success' | 'critical' | 'warning' | 'info' = 'info',
	subtitle?: string,
) {
	try {
		const rev = (globalThis as any).valenced
		const toastApi =
			rev?.unscoped?.toasts ??
			(globalThis as any).toasts ??
			rev?.plugins?.getPlugin?.('rosie.toast-api')?.api?.toasts
		if (typeof toastApi?.show === 'function') {
			toastApi.show({
				content: msg,
				variant,
				subtitle,
			})
			return
		}
		const ToastActionCreators = rev?.discord?.actions?.ToastActionCreators
		if (typeof ToastActionCreators?.open === 'function') {
			ToastActionCreators.open(
				{ key: `cloudsync-${Date.now()}`, content: msg, variant },
				{ text: msg, variant },
			)
			return
		}
		const { filters, lookupModule } = rev?.modules?.finders ?? {}
		if (typeof lookupModule === 'function') {
			const res = lookupModule(filters?.withProps?.('showToast'))
			const toastMod = Array.isArray(res) ? res[0] : (res?.[0] ?? res)
			if (typeof toastMod?.showToast === 'function') {
				toastMod.showToast(msg)
				return
			}
		}
	} catch {}
}

export async function callNativeSafe(name: string, args: unknown[] = []): Promise<any> {
	try {
		const reply = await (callNativeMethod as any)(name, args)
		const keys = reply && typeof reply === 'object' && !Array.isArray(reply) ? Object.keys(reply) : []
		if (keys.length === 1 && keys[0] === 'result') {
			return reply.result
		}
		if (keys.length === 1 && keys[0] === 'error') {
			const { message, code } = reply.error ?? {}
			throw new Error(message ?? code ?? 'Native call error')
		}
		return reply
	} catch {
		return null
	}
}

export function readStorageFile(pluginId: string): any {
	try {
		const rev = (globalThis as any).valenced
		const fs = rev?.modules?.native?.fs
		const js = rev?.jsonStorage
		if (js?.getJsonStorage) {
			const store = js.getJsonStorage(pluginId)
			if (store?.cache && Object.keys(store.cache).length > 0) {
				return store.cache
			}
		}
		if (js?.pluginStoragePathFor && fs?.existsSync && fs?.readFileSync) {
			const candidates = ['storage.json', 'settings.json', 'config.json', '']
			for (const file of candidates) {
				try {
					const p = file ? js.pluginStoragePathFor(pluginId, file) : js.pluginStoragePathFor(pluginId)
					if (p && fs.existsSync(p)) {
						const content = fs.readFileSync(p)
						if (content && typeof content === 'string') {
							const parsed = JSON.parse(content)
							if (parsed && typeof parsed === 'object') return parsed
						}
					}
				} catch {}
			}
		}
		const fallbackPaths = [
			`/data/user/0/app.valenced/files/valenced/plugins/storage/primary/${pluginId}/storage.json`,
			`/data/user/0/app.valenced/files/valenced/plugins/storage/primary/${pluginId}/settings.json`,
			`/data/user/0/com.discord/files/valenced/plugins/storage/primary/${pluginId}/storage.json`,
			`/data/user/0/com.discord/files/valenced/plugins/storage/primary/${pluginId}/settings.json`,
			`/data/data/com.discord/files/valenced/plugins/storage/primary/${pluginId}/storage.json`,
			`/data/data/com.discord/files/valenced/plugins/storage/primary/${pluginId}/settings.json`,
		]
		if (fs?.existsSync && fs?.readFileSync) {
			for (const p of fallbackPaths) {
				try {
					if (fs.existsSync(p)) {
						const content = fs.readFileSync(p)
						if (content && typeof content === 'string') {
							const parsed = JSON.parse(content)
							if (parsed && typeof parsed === 'object') return parsed
						}
					}
				} catch {}
			}
		}
	} catch {}
	return null
}

export function writeStorageFile(pluginId: string, data: any) {
	try {
		if (data === undefined || data === null) return
		const rev = (globalThis as any).valenced
		const fs = rev?.modules?.native?.fs
		const js = rev?.jsonStorage
		if (js?.getJsonStorage) {
			try {
				const store = js.getJsonStorage(pluginId)
				if (typeof store?.set === 'function') {
					store.set(data)
				}
			} catch {}
		}
		const jsonStr = JSON.stringify(data, null, 2)
		if (js?.pluginStoragePathFor && fs?.writeFileSync) {
			const candidates = ['storage.json', 'settings.json']
			for (const file of candidates) {
				try {
					const p = js.pluginStoragePathFor(pluginId, file)
					if (p) fs.writeFileSync(p, jsonStr)
				} catch {}
			}
		}
		const fallbackPaths = [
			`/data/user/0/app.valenced/files/valenced/plugins/storage/primary/${pluginId}/storage.json`,
			`/data/user/0/app.valenced/files/valenced/plugins/storage/primary/${pluginId}/settings.json`,
			`/data/user/0/com.discord/files/valenced/plugins/storage/primary/${pluginId}/storage.json`,
			`/data/user/0/com.discord/files/valenced/plugins/storage/primary/${pluginId}/settings.json`,
			`/data/data/com.discord/files/valenced/plugins/storage/primary/${pluginId}/storage.json`,
			`/data/data/com.discord/files/valenced/plugins/storage/primary/${pluginId}/settings.json`,
		]
		if (fs?.writeFileSync && fs?.existsSync) {
			for (const p of fallbackPaths) {
				try {
					const dir = p.substring(0, p.lastIndexOf('/'))
					if (fs.existsSync(dir)) {
						fs.writeFileSync(p, jsonStr)
					}
				} catch {}
			}
		}
	} catch {}
}

export async function grabEverything(settings: CloudSyncSettings): Promise<UserData> {
	const rev = (globalThis as any).valenced
	const fs = rev?.modules?.native?.fs
	const internal = rev?.hidden?.plugins?.internal
	const reposApi = rev?.hidden?.plugins?.repositories
	const distRoot = internal?.distRootPath

	const data: UserData = {
		version: 3,
		repos: [],
		plugins: {},
		themes: {},
		fonts: {},
		iconPacks: {},
		emojiPacks: {},
		settings: {},
		experiments: {},
		sideloadZips: {},
		syncedAt: new Date().toISOString(),
	}

	const knownRepoPluginIds = new Set<string>()

	if (settings.syncRepos) {
		try {
			logSync('repos', 'Gathering configured repositories...')
			let repoList = await callNativeSafe('valenced.plugins.repos.list')
			if (!Array.isArray(repoList) && typeof reposApi?.listRepos === 'function') {
				repoList = await reposApi.listRepos()
			}
			if (Array.isArray(repoList)) {
				data.repos = repoList
					.filter((r: any) => !r.internal && r.url && r.url.startsWith('http'))
					.map((r: any) => ({
						url: r.url,
						name: r.name,
						description: r.description,
						enabled: r.enabled !== false,
					}))
				logSync('repos', `Collected ${data.repos.length} repositories`)

				for (const r of repoList) {
					if (r.internal || !r.enabled) continue
					try {
						if (typeof reposApi?.listRepoPlugins === 'function') {
							const plugs = await reposApi.listRepoPlugins(r.url)
							if (Array.isArray(plugs)) {
								for (const p of plugs) {
									if (p?.id) knownRepoPluginIds.add(p.id)
								}
							}
						}
					} catch {}
				}
			}
		} catch (err: any) {
			logSync('repos', `Repository capture error: ${err?.message || err}`)
		}
	}

	if (settings.syncPlugins) {
		logSync('plugins', 'Scanning installed plugins, states, channels, and sideloaded files/zips...')
		const ignored = new Set(settings.ignoredPlugins || [])
		const skipPrefixes = [
			'valenced.api',
			'valenced.settings',
			'valenced.recovery',
			'valenced.staff-settings',
			'valenced.user-badges',
			'valenced.no-track',
			'valenced.developer-kit',
			'valenced.discord.prevent-ota-updates',
			'discord',
			'rosie.cloud-sync',
		]

		const candidatePluginIds = new Set<string>(KNOWN_PLUGIN_IDS)

		const nativePlugins = await callNativeSafe('valenced.plugins.list')
		const nativeStates = await callNativeSafe('valenced.plugins.states.read')
		const stateMap: Record<string, boolean> = {}

		if (nativeStates) {
			const rawStates = nativeStates?.states ?? nativeStates
			if (rawStates && typeof rawStates === 'object') {
				for (const [k, v] of Object.entries(rawStates)) {
					stateMap[k] = Boolean((v as any)?.enabled ?? v)
				}
			}
		}

		if (Array.isArray(nativePlugins)) {
			for (const p of nativePlugins) {
				const id = p?.manifest?.id ?? p?.id
				if (id) {
					candidatePluginIds.add(id)
					if (typeof p?.enabled === 'boolean' && stateMap[id] === undefined) {
						stateMap[id] = p.enabled
					}
				}
			}
		}

		if (internal?.pList instanceof Map) {
			for (const [id, plugin] of internal.pList.entries()) {
				candidatePluginIds.add(id)
				if (stateMap[id] === undefined) {
					stateMap[id] = Boolean(internal.isPluginEnabledInActiveSlot?.(plugin))
				}
			}
		}

		for (const id of candidatePluginIds) {
			if (ignored.has(id)) continue
			if (skipPrefixes.some(pref => id === pref || id.startsWith(pref + '.'))) continue

			const pluginDist = distRoot ? `${distRoot}/${id}` : null
			const isRepo = knownRepoPluginIds.has(id)
			const hasDist = Boolean(pluginDist && fs?.existsSync?.(`${pluginDist}/manifest.json`))
			const isSideloaded = !isRepo && hasDist
			let files: PluginBackup['files'] = undefined

			if (pluginDist && fs?.existsSync) {
				try {
					let manifestStr: string | undefined = undefined
					let indexStr: string | undefined = undefined
					let jarBase64: string | undefined = undefined
					let zipBase64: string | undefined = undefined

					if (fs.existsSync(`${pluginDist}/manifest.json`)) {
						manifestStr = fs.readFileSync(`${pluginDist}/manifest.json`)
					}
					if (fs.existsSync(`${pluginDist}/index.js`)) {
						const readIdx = fs.readFileSync(`${pluginDist}/index.js`)
						if (readIdx && readIdx.length < 5000000) {
							indexStr = readIdx
						}
					}

					const jarCandidates = [
						`${pluginDist}/plugin.jar`,
						`${pluginDist}/${id}.jar`,
					]
					for (const jarPath of jarCandidates) {
						if (fs.existsSync(jarPath)) {
							try {
								const jarData = fs.readFileSync(jarPath)
								if (jarData && jarData.length < 15000000) {
									jarBase64 = toBase64(jarData)
									break
								}
							} catch {}
						}
					}

					const zipCandidates = [
						`${pluginDist}/${id}.zip`,
						`${pluginDist}/plugin.zip`,
						`${pluginDist}/package.zip`,
						`${distRoot}/zips/${id}.zip`,
						`${distRoot}/sideload/${id}.zip`,
						`/data/user/0/app.valenced/files/valenced/plugins/sideload/${id}.zip`,
						`/data/user/0/com.discord/files/valenced/plugins/sideload/${id}.zip`,
					]
					for (const zipPath of zipCandidates) {
						if (fs.existsSync(zipPath)) {
							try {
								const zipData = fs.readFileSync(zipPath)
								if (zipData && zipData.length < 25000000) {
									zipBase64 = toBase64(zipData)
									break
								}
							} catch {}
						}
					}

					if (manifestStr || indexStr || jarBase64 || zipBase64) {
						files = {
							manifest: manifestStr,
							index: indexStr,
							jar: jarBase64,
							zip: zipBase64,
						}
					}
				} catch {}
			}

			const storage = readStorageFile(id)
			const enabled = stateMap[id] ?? false

			let version: string | undefined = undefined
			let name: string | undefined = undefined
			let author: string | undefined = undefined
			let description: string | undefined = undefined
			let manifestObj: any = undefined

			const nativeMatch = Array.isArray(nativePlugins)
				? nativePlugins.find(p => (p?.manifest?.id ?? p?.id) === id)
				: null
			if (nativeMatch?.manifest) {
				manifestObj = nativeMatch.manifest
				name = nativeMatch.manifest.name
				author = nativeMatch.manifest.author
				description = nativeMatch.manifest.description
				version = typeof nativeMatch.manifest.version === 'string'
					? nativeMatch.manifest.version
					: nativeMatch.manifest?.version?.nums?.join('.')
			}

			if (!name && internal?.pList instanceof Map) {
				const p = internal.pList.get(id)
				if (p?.manifest) {
					manifestObj = p.manifest
					name = p.manifest.name
					author = p.manifest.author
					description = p.manifest.description
					version = typeof p.manifest.version === 'string'
						? p.manifest.version
						: p.manifest?.version?.nums?.join('.')
				}
			}

			if (!manifestObj && files?.manifest) {
				try {
					manifestObj = JSON.parse(files.manifest)
					if (!name) name = manifestObj.name
					if (!version) version = manifestObj.version
					if (!author) author = manifestObj.author
					if (!description) description = manifestObj.description
				} catch {}
			}

			const channel = detectChannel(nativeMatch, manifestObj, version)

			if (storage || enabled || isSideloaded || files || nativeMatch || (internal?.pList instanceof Map && internal.pList.has(id))) {
				data.plugins[id] = {
					enabled,
					version,
					channel,
					name,
					author,
					description,
					manifest: manifestObj,
					storage,
					isSideloaded,
					files,
				}
			}
		}

		if (fs?.existsSync && distRoot) {
			const sideloadDirs = [
				`${distRoot}/sideload`,
				`/data/user/0/app.valenced/files/valenced/plugins/sideload`,
				`/data/user/0/com.discord/files/valenced/plugins/sideload`,
			]
			for (const sDir of sideloadDirs) {
				for (const id of candidatePluginIds) {
					const zPath = `${sDir}/${id}.zip`
					if (fs.existsSync(zPath) && !data.plugins[id]?.files?.zip) {
						try {
							const zData = fs.readFileSync(zPath)
							if (zData) {
								const b64 = toBase64(zData)
								if (!data.sideloadZips) data.sideloadZips = {}
								data.sideloadZips[`${id}.zip`] = b64
								if (data.plugins[id]) {
									if (!data.plugins[id].files) data.plugins[id].files = {}
									data.plugins[id].files!.zip = b64
								}
							}
						} catch {}
					}
				}
			}
		}

		logSync('plugins', `Captured ${Object.keys(data.plugins).length} plugins with states, channels, and sideload files`)
	}

	if (settings.syncThemes) {
		try {
			logSync('themes', 'Backing up all themes, custom backgrounds, and configurations...')
			const rosieThemesStorage = readStorageFile('rosie.themes') ?? {}
			const installedThemes = Array.isArray(rosieThemesStorage.themes) ? rosieThemesStorage.themes : []
			const selectedThemeId = rosieThemesStorage.selected ?? ''

			data.themes['rosie.themes'] = rosieThemesStorage
			data.themes._config = {
				selected: selectedThemeId,
				typeOverride: rosieThemesStorage.typeOverride ?? 'auto',
				showBackground: rosieThemesStorage.showBackground ?? true,
				customBackground: rosieThemesStorage.customBackground ?? null,
				chatInputFade: rosieThemesStorage.chatInputFade ?? false,
				translateLegacy: rosieThemesStorage.translateLegacy ?? true,
				completePalette: rosieThemesStorage.completePalette ?? true,
				themesPlus: rosieThemesStorage.themesPlus ?? true,
				aliucordThemes: rosieThemesStorage.aliucordThemes ?? true,
				matchNavBar: rosieThemesStorage.matchNavBar ?? false,
			}

			for (const theme of installedThemes) {
				if (theme?.id) {
					data.themes[theme.id] = {
						enabled: theme.id === selectedThemeId,
						manifest: theme.manifest,
						id: theme.id,
					}
				}
			}

			const extraThemeKeys = [
				'valenced.settings.themes',
				'valenced.themes.legacy',
				'rosie.vodka-themes',
			]
			for (const key of extraThemeKeys) {
				const st = readStorageFile(key)
				if (st) data.themes[key] = st
			}

			const count = installedThemes.length > 0 ? installedThemes.length : Object.keys(data.themes).length
			logSync('themes', `Successfully captured ${count} theme(s) and full palette settings`)
		} catch (err: any) {
			logSync('themes', `Themes capture failed: ${err?.message || err}`)
		}
	}

	if (settings.syncIconPacks) {
		try {
			logSync('iconPacks', 'Backing up icon packs and configurations...')
			const iconStorage = readStorageFile('rosie.icon-packs')
			if (iconStorage) data.iconPacks['rosie.icon-packs'] = iconStorage
			const rosieThemesStorage = readStorageFile('rosie.themes')
			if (rosieThemesStorage) {
				data.iconPacks.themeIconPacks = {
					iconPack: rosieThemesStorage.iconPack,
					selectedIconPack: rosieThemesStorage.selectedIconPack,
					iconPacks: rosieThemesStorage.iconPacks,
					iconPackList: rosieThemesStorage.iconPackList,
					includedPackList: rosieThemesStorage.includedPackList,
					iconScale: rosieThemesStorage.iconScale,
					iconTree: rosieThemesStorage.iconTree,
					iconPackFromTheme: rosieThemesStorage.iconPackFromTheme,
					iconPackBeforeTheme: rosieThemesStorage.iconPackBeforeTheme,
				}
			}
			logSync('iconPacks', 'Icon packs captured')
		} catch (err: any) {
			logSync('iconPacks', `Icon packs capture failed: ${err?.message || err}`)
		}
	}

	if (settings.syncEmojiPacks) {
		try {
			logSync('emojiPacks', 'Backing up emoji configurations...')
			const emojiStorage = readStorageFile('rosie.emoji-packs')
			if (emojiStorage) data.emojiPacks['rosie.emoji-packs'] = emojiStorage
			const globalEmojisStorage = readStorageFile('rosie.global-emojis')
			if (globalEmojisStorage) data.emojiPacks['rosie.global-emojis'] = globalEmojisStorage
			const rosieThemesStorage = readStorageFile('rosie.themes')
			if (rosieThemesStorage) {
				data.emojiPacks.themeEmojiPacks = {
					emojiPacks: rosieThemesStorage.emojiPacks,
					selectedEmojiPack: rosieThemesStorage.selectedEmojiPack,
					emojiShown: rosieThemesStorage.emojiShown,
					emojiKnown: rosieThemesStorage.emojiKnown,
				}
			}
			logSync('emojiPacks', 'Emoji configurations captured')
		} catch (err: any) {
			logSync('emojiPacks', `Emoji packs capture failed: ${err?.message || err}`)
		}
	}

	if (settings.syncFonts) {
		try {
			logSync('fonts', 'Backing up font configurations...')
			const fontPacksStorage = readStorageFile('rosie.font-packs')
			if (fontPacksStorage) data.fonts['rosie.font-packs'] = fontPacksStorage
			const rosieThemesStorage = readStorageFile('rosie.themes')
			if (rosieThemesStorage?.fonts || rosieThemesStorage?.selectedFont) {
				data.fonts.themeFonts = {
					fonts: rosieThemesStorage.fonts,
					selectedFont: rosieThemesStorage.selectedFont,
				}
			}
			const legacyStorage = readStorageFile('valenced.themes.legacy')
			if (legacyStorage?.fonts) {
				data.fonts.legacyFonts = legacyStorage.fonts
			}
			logSync('fonts', 'Font configurations captured')
		} catch (err: any) {
			logSync('fonts', `Font capture failed: ${err?.message || err}`)
		}
	}

	if (settings.syncSettings) {
		try {
			logSync('settings', 'Backing up all Valenced settings and injected extensions...')
			for (const key of CORE_VALENCED_IDS) {
				const st = readStorageFile(key)
				if (st) data.settings[key] = st
			}
			const allPotentialIds = new Set<string>([
				...KNOWN_PLUGIN_IDS,
				...Object.keys(data.plugins),
			])
			for (const id of allPotentialIds) {
				if (data.settings[id] || data.plugins[id]?.storage || id === 'rosie.cloud-sync') continue
				const st = readStorageFile(id)
				if (st) data.settings[id] = st
			}
			logSync('settings', `Captured ${Object.keys(data.settings).length} settings modules`)
		} catch (err: any) {
			logSync('settings', `Settings capture error: ${err?.message || err}`)
		}
	}

	if (settings.syncExperiments) {
		try {
			logSync('experiments', 'Backing up Discord experiments...')
			const expStore = rev?.discord?.flux?.Stores?.ExperimentStore
			if (typeof expStore?.getAllExperimentOverrideDescriptors === 'function') {
				const overrides = expStore.getAllExperimentOverrideDescriptors()
				if (overrides && typeof overrides === 'object') {
					data.experiments = overrides
					logSync('experiments', `Captured ${Object.keys(overrides).length} experiment overrides`)
				}
			}
		} catch (err: any) {
			logSync('experiments', `Experiments capture failed: ${err?.message || err}`)
		}
	}

	return data
}

export async function restoreEverything(
	data: UserData,
	settings: CloudSyncSettings,
	selective?: SelectiveDomains,
): Promise<SyncResult> {
	const rev = (globalThis as any).valenced
	const fs = rev?.modules?.native?.fs
	const internal = rev?.hidden?.plugins?.internal
	const reposApi = rev?.hidden?.plugins?.repositories
	const externalApi = rev?.hidden?.plugins?.externalPlugins
	const distRoot = internal?.distRootPath

	const canSync = (domain: keyof SelectiveDomains, settingKey: keyof CloudSyncSettings): boolean => {
		if (selective && typeof selective[domain] === 'boolean') {
			return Boolean(selective[domain])
		}
		return Boolean(settings[settingKey])
	}

	const result: SyncResult = {
		repos: 0,
		plugins: 0,
		themes: 0,
		fonts: 0,
		iconPacks: 0,
		emojiPacks: 0,
		settings: 0,
		experiments: 0,
	}

	if (
		canSync('repos', 'syncRepos') &&
		Array.isArray(data.repos) &&
		data.repos.length > 0
	) {
		try {
			logSync('repos', `Restoring ${data.repos.length} repositories...`)
			let existing = await callNativeSafe('valenced.plugins.repos.list')
			if (!Array.isArray(existing) && typeof reposApi?.listRepos === 'function') {
				existing = await reposApi.listRepos()
			}
			const existingList: any[] = Array.isArray(existing) ? existing : []
			const existingUrls = new Set(existingList.map((r: any) => r.url))
			const combined = [...existingList.filter((r: any) => !r.internal && r.url?.startsWith('http'))]

			for (const r of data.repos) {
				if (!r.url || !r.url.startsWith('http') || existingUrls.has(r.url)) continue
				combined.push({
					url: r.url,
					name: r.name,
					description: r.description,
					enabled: r.enabled !== false,
				})
				existingUrls.add(r.url)
				result.repos++
			}

			if (result.repos > 0) {
				await callNativeSafe('valenced.plugins.repos.set', [combined])
				if (typeof reposApi?.setRepos === 'function') {
					await reposApi.setRepos(combined).catch(() => {})
				}
				for (const r of data.repos) {
					if (r.url && r.enabled !== false) {
						await callNativeSafe('valenced.plugins.repos.refresh', [r.url]).catch(() => {})
					}
				}
				if (typeof reposApi?.refreshAllRepos === 'function') {
					await reposApi.refreshAllRepos().catch(() => {})
				}
			}
			logSync('repos', `Configured ${result.repos} new repositories`)
		} catch (err: any) {
			logSync('repos', `Repository restore error: ${err?.message || err}`)
		}
	}

	if (canSync('plugins', 'syncPlugins') && data.sideloadZips && typeof data.sideloadZips === 'object' && fs?.writeFileSync) {
		try {
			const sideloadDir = distRoot ? `${distRoot}/sideload` : `/data/user/0/app.valenced/files/valenced/plugins/sideload`
			for (const [zName, zB64] of Object.entries(data.sideloadZips)) {
				try {
					const bin = fromBase64(zB64)
					fs.writeFileSync(`${sideloadDir}/${zName}`, bin)
					logSync('plugins', `Restored sideload package archive: ${zName}`)
				} catch {}
			}
		} catch {}
	}

	if (canSync('plugins', 'syncPlugins') && data.plugins && typeof data.plugins === 'object') {
		logSync('plugins', `Restoring ${Object.keys(data.plugins).length} plugins with exact versions, channels, and files...`)
		for (const [id, item] of Object.entries(data.plugins)) {
			if (id.includes('cloud-sync')) continue
			try {
				if (distRoot && fs?.writeFileSync) {
					const pluginDist = `${distRoot}/${id}`

					if (item.files?.manifest) {
						fs.writeFileSync(`${pluginDist}/manifest.json`, item.files.manifest)
					} else if (item.manifest) {
						fs.writeFileSync(`${pluginDist}/manifest.json`, JSON.stringify(item.manifest, null, 2))
					}

					if (item.files?.index) {
						fs.writeFileSync(`${pluginDist}/index.js`, item.files.index)
					}

					if (item.files?.jar) {
						try {
							const jarBin = fromBase64(item.files.jar)
							fs.writeFileSync(`${pluginDist}/plugin.jar`, jarBin)
						} catch {}
					}

					if (item.files?.zip) {
						try {
							const zipBin = fromBase64(item.files.zip)
							fs.writeFileSync(`${pluginDist}/${id}.zip`, zipBin)
							fs.writeFileSync(`${distRoot}/sideload/${id}.zip`, zipBin)
						} catch {}
					}

					if (item.files || item.isSideloaded) {
						if (typeof externalApi?.registerExternalPlugin === 'function') {
							try {
								await externalApi.registerExternalPlugin(id)
							} catch {}
						}
					}
				}

				if (item.storage) {
					writeStorageFile(id, item.storage)
				}

				let p = internal?.pList?.get(id)
				if (!p && !item.isSideloaded) {
					const targetChannel = item.channel || 'stable'
					const targetVersion = item.version || null
					try {
						const plan = await callNativeSafe('valenced.plugins.planInstall', [
							id,
							{
								version: targetVersion,
								channel: targetChannel,
								skipMissingOptionals: true,
								repos: item.repo ? [item.repo] : undefined,
							},
						])
						if (plan) {
							await callNativeSafe('valenced.plugins.install', [plan])
							p = internal?.pList?.get(id)
						}
					} catch {}

					if (!p) {
						try {
							const planDirect = await callNativeSafe('valenced.plugins.planInstall', [
								id,
								targetVersion,
								targetChannel,
								item.repo ? [item.repo] : null,
							])
							if (planDirect) {
								await callNativeSafe('valenced.plugins.install', [planDirect])
								p = internal?.pList?.get(id)
							}
						} catch {}
					}
				}

				if (!p && typeof reposApi?.planInstall === 'function' && typeof reposApi?.installFromRepo === 'function') {
					try {
						const plan = await reposApi.planInstall(id, null)
						if (plan) {
							await reposApi.installFromRepo(plan)
							p = internal?.pList?.get(id)
						}
					} catch {}
				}

				if (typeof item.enabled === 'boolean') {
					await callNativeSafe('valenced.plugins.setEnabled', [id, item.enabled, item.enabled])
					if (p && typeof internal?.writePluginEnabledState === 'function') {
						await internal.writePluginEnabledState(p, item.enabled, item.enabled).catch(() => {})
					}
					if (item.enabled && typeof internal?.startPlugin === 'function' && !internal.isPluginStarted?.(p)) {
						await internal.startPlugin(p).catch(() => {})
					} else if (!item.enabled && typeof internal?.stopPlugin === 'function' && internal.isPluginStarted?.(p)) {
						await internal.stopPlugin(p).catch(() => {})
					}
				}

				result.plugins++
				logSync('plugins', `Restored plugin: ${id} (${item.channel || 'stable'} / ${item.version || 'installed'})`)
			} catch (err: any) {
				logSync('plugins', `Failed to restore plugin ${id}: ${err?.message || err}`)
			}
		}
	}

	if (canSync('themes', 'syncThemes') && data.themes && typeof data.themes === 'object') {
		logSync('themes', 'Restoring theme configurations, installed themes, and background...')
		try {
			const currentStorage = readStorageFile('rosie.themes') ?? {}
			const currentThemesList: any[] = Array.isArray(currentStorage.themes) ? [...currentStorage.themes] : []
			const themeMap = new Map<string, any>(currentThemesList.map(t => [t.id, t]))

			const rawRestoredRosie = data.themes['rosie.themes']
			if (rawRestoredRosie && Array.isArray(rawRestoredRosie.themes)) {
				for (const t of rawRestoredRosie.themes) {
					if (t?.id) themeMap.set(t.id, t)
				}
			}

			let targetSelected = data.themes._config?.selected ?? rawRestoredRosie?.selected ?? currentStorage?.selected ?? ''

			for (const [k, v] of Object.entries(data.themes)) {
				if (k === '_config' || k === 'rosie.themes' || k === 'rosie.vodka-themes' || k.startsWith('valenced.')) continue
				if (v?.manifest) {
					themeMap.set(k, { id: k, manifest: v.manifest })
				} else if (k.startsWith('http') || k.startsWith('file:')) {
					themeMap.set(k, { id: k, manifest: v })
				}
				if (v?.enabled && !targetSelected) {
					targetSelected = k
				}
			}

			const mergedStorage = {
				...currentStorage,
				...(rawRestoredRosie ?? {}),
				...(data.themes._config ?? {}),
				themes: Array.from(themeMap.values()),
				selected: targetSelected,
			}

			writeStorageFile('rosie.themes', mergedStorage)
			result.themes = themeMap.size

			const extraThemeKeys = [
				'valenced.settings.themes',
				'valenced.themes.legacy',
				'rosie.vodka-themes',
			]
			for (const key of extraThemeKeys) {
				if (data.themes[key]) {
					writeStorageFile(key, data.themes[key])
				}
			}

			const bridge = (globalThis as any).__bleelblepThemes
			if (bridge && typeof bridge.setTheme === 'function' && targetSelected) {
				try {
					await bridge.setTheme(targetSelected)
					logSync('themes', `Live applied theme: ${targetSelected}`)
				} catch {}
			}

			logSync('themes', `Restored ${themeMap.size} theme(s); selected: ${targetSelected || 'none'}`)
		} catch (err: any) {
			logSync('themes', `Theme restore error: ${err?.message || err}`)
		}
	}

	if (canSync('iconPacks', 'syncIconPacks') && data.iconPacks && typeof data.iconPacks === 'object') {
		logSync('iconPacks', 'Restoring icon packs and icon bindings...')
		try {
			const currentThemesStorage = readStorageFile('rosie.themes') ?? {}
			let selectedIconPack = currentThemesStorage.selectedIconPack ?? ''
			let mergedThemeIcons: any = {}

			for (const [key, val] of Object.entries(data.iconPacks)) {
				if (key === 'themeIconPacks') {
					mergedThemeIcons = { ...mergedThemeIcons, ...val }
					if (val?.selectedIconPack) selectedIconPack = val.selectedIconPack
				} else {
					writeStorageFile(key, val)
				}
				result.iconPacks++
			}

			writeStorageFile('rosie.themes', {
				...currentThemesStorage,
				...mergedThemeIcons,
				selectedIconPack,
			})

			const bridge = (globalThis as any).__bleelblepThemes
			if (bridge && typeof bridge.setIconPack === 'function' && selectedIconPack) {
				try {
					await bridge.setIconPack(selectedIconPack)
				} catch {}
			}

			logSync('iconPacks', `Applied icon packs; active pack: ${selectedIconPack || 'default'}`)
		} catch (err: any) {
			logSync('iconPacks', `Icon pack restore error: ${err?.message || err}`)
		}
	}

	if (canSync('emojiPacks', 'syncEmojiPacks') && data.emojiPacks && typeof data.emojiPacks === 'object') {
		logSync('emojiPacks', 'Restoring emoji packs...')
		try {
			const currentThemesStorage = readStorageFile('rosie.themes') ?? {}
			let mergedThemeEmojis: any = {}

			for (const [key, val] of Object.entries(data.emojiPacks)) {
				if (key === 'themeEmojiPacks') {
					mergedThemeEmojis = { ...mergedThemeEmojis, ...val }
				} else {
					writeStorageFile(key, val)
				}
				result.emojiPacks++
			}

			writeStorageFile('rosie.themes', {
				...currentThemesStorage,
				...mergedThemeEmojis,
			})

			logSync('emojiPacks', `Applied emoji pack configurations`)
		} catch (err: any) {
			logSync('emojiPacks', `Emoji pack restore error: ${err?.message || err}`)
		}
	}

	if (canSync('fonts', 'syncFonts') && data.fonts && typeof data.fonts === 'object') {
		logSync('fonts', 'Restoring font packs and typography preferences...')
		try {
			const currentThemesStorage = readStorageFile('rosie.themes') ?? {}
			const currentFonts = Array.isArray(currentThemesStorage.fonts) ? [...currentThemesStorage.fonts] : []
			const fontMap = new Map<string, any>(currentFonts.map(f => [f.id, f]))

			let selectedFont = currentThemesStorage.selectedFont ?? ''

			for (const [key, val] of Object.entries(data.fonts)) {
				if (key === 'themeFonts') {
					if (Array.isArray(val?.fonts)) {
						for (const f of val.fonts) if (f?.id) fontMap.set(f.id, f)
					}
					if (val?.selectedFont) selectedFont = val.selectedFont
				} else if (key === 'legacyFonts') {
					const cur = readStorageFile('valenced.themes.legacy') ?? {}
					writeStorageFile('valenced.themes.legacy', { ...cur, fonts: val })
				} else {
					writeStorageFile(key, val)
				}
				result.fonts++
			}

			writeStorageFile('rosie.themes', {
				...currentThemesStorage,
				fonts: Array.from(fontMap.values()),
				selectedFont,
			})

			const bridge = (globalThis as any).__bleelblepThemes
			if (bridge && typeof bridge.setFont === 'function' && selectedFont) {
				try {
					await bridge.setFont(selectedFont)
				} catch {}
			}

			logSync('fonts', `Applied font configuration; selected font: ${selectedFont || 'default'}`)
		} catch (err: any) {
			logSync('fonts', `Font restore error: ${err?.message || err}`)
		}
	}

	if (canSync('settings', 'syncSettings') && data.settings && typeof data.settings === 'object') {
		logSync('settings', 'Restoring Valenced settings and preferences...')
		for (const [key, val] of Object.entries(data.settings)) {
			try {
				writeStorageFile(key, val)
				result.settings++
				logSync('settings', `Restored setting: ${key}`)
			} catch {}
		}
	}

	if (canSync('experiments', 'syncExperiments') && data.experiments && typeof data.experiments === 'object') {
		try {
			logSync('experiments', 'Restoring experiment overrides...')
			const { filters, lookupModule } = rev?.modules?.finders ?? {}
			const mods = typeof lookupModule === 'function' ? lookupModule(filters?.withProps?.('dispatch', 'subscribe')) : null
			const dispatcher = Array.isArray(mods) ? mods.find(m => typeof m?.dispatch === 'function') : null
			if (dispatcher?.dispatch) {
				for (const [expId, desc] of Object.entries(data.experiments)) {
					try {
						dispatcher.dispatch({
							type: 'EXPERIMENT_OVERRIDE_BUCKET',
							experimentId: expId,
							experimentBucket: (desc as any)?.bucket ?? 1,
						})
						result.experiments++
					} catch {}
				}
				logSync('experiments', `Restored ${result.experiments} experiment overrides`)
			}
		} catch (err: any) {
			logSync('experiments', `Experiment restore error: ${err?.message || err}`)
		}
	}

	logSync('system', 'Restore operation finished successfully')
	return result
}
