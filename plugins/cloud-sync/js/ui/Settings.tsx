import { AlertActionCreators } from '@valenced/discord/actions'
import { Tokens } from '@valenced/discord/common/tokens'
import { Design } from '@valenced/discord/design'
import { getStore } from '@valenced/discord/flux'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Image, ScrollView, View } from 'react-native'
import { deleteData, getData, loginWithUserId, saveData } from '../api'
import { pickJsonFile, saveJsonFile } from '../native'
import {
	callNativeSafe,
	grabEverything,
	readStorageFile,
	restoreEverything,
	setLogCallback,
	showCloudToast,
} from '../sync'
import { DEFAULT_SETTINGS } from '../types'
import DataStat from './DataStat'
import { openIgnoredPluginsSheet } from './IgnoredPluginsSheet'
import { openImportActionSheet } from './ImportActionSheet'
import { openImportLogsSheet } from './ImportLogsSheet'
import type { CloudSyncSettings, SelectiveDomains, UserData } from '../types'
import type { LogEntry } from './ImportLogsSheet'

type CurrentUser = {
	id: string
	username?: string
	getAvatarURL?(guildId?: string | null, size?: number): string
}

type UserStore = {
	getCurrentUser(): CurrentUser | undefined
}

export default function Settings({ api }: { api: any }) {
	const {
		Stack,
		Text,
		Card,
		TableRowGroup,
		TableSwitchRow,
		TableRow,
		Button,
		TextInput,
		AlertModal,
		AlertActionButton,
	} = Design

	const rawSettings = api.jsonStorage.use() as CloudSyncSettings | undefined
	const settings: CloudSyncSettings = {
		...DEFAULT_SETTINGS,
		...(rawSettings ?? {}),
	}

	const [isSyncing, setIsSyncing] = useState(false)
	const [statusText, setStatusText] = useState<string | null>(null)
	const [cloudDataCache, setCloudDataCache] = useState<UserData | null>(null)
	const [logs, setLogs] = useState<LogEntry[]>([])
	const [currentUser, setCurrentUser] = useState<CurrentUser>()
	const [localPluginsCount, setLocalPluginsCount] = useState(0)
	const logsRef = useRef<LogEntry[]>([])
	logsRef.current = logs

	const appendLog = (scope: any, message: string) => {
		const now = new Date()
		const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
		const entry: LogEntry = {
			id: `${Date.now()}-${Math.random()}`,
			time,
			scope,
			message,
		}
		setLogs(prev => [...prev, entry])
	}

	useEffect(() => {
		setLogCallback(appendLog)
		return () => {
			setLogCallback(null)
		}
	}, [])

	useEffect(
		() =>
			getStore<UserStore>('UserStore', store => {
				setCurrentUser(store.getCurrentUser())
			}),
		[],
	)

	useEffect(() => {
		let cancelled = false
		void callNativeSafe('valenced.plugins.list').then(plugins => {
			if (cancelled || !Array.isArray(plugins)) return
			setLocalPluginsCount(
				plugins.filter(plugin => {
					const id = plugin?.manifest?.id ?? plugin?.id
					return (
						typeof id === 'string' &&
						!id.startsWith('valenced.api') &&
						id !== 'dev.kmmiio99o.cloud.sync' &&
						id !== 'rosie.cloud-sync' &&
						!id.includes('cloud-sync')
					)
				}).length,
			)
		})
		return () => {
			cancelled = true
		}
	}, [])

	const avatarUrl = currentUser?.getAvatarURL?.(null, 120)

	const ensureAuth = async (): Promise<string> => {
		if (settings.authToken) return settings.authToken
		if (!currentUser?.id) throw new Error('No logged in Discord account found.')
		const token = await loginWithUserId(settings.serverUrl, currentUser.id)
		api.jsonStorage.set({ authToken: token })
		return token
	}

	const handleUpload = async () => {
		if (isSyncing) return
		setIsSyncing(true)
		setStatusText('Backing up data...')
		appendLog('system', 'Starting backup process to Ally Cloud...')
		try {
			const token = await ensureAuth()
			const data = await grabEverything(settings)
			await saveData(settings.serverUrl, token, data)
			const now = new Date().toISOString()
			api.jsonStorage.set({ lastSyncedAt: now })
			setCloudDataCache(data)
			setStatusText('Backup completed!')
			appendLog('system', 'Cloud backup completed successfully!')
			showCloudToast(
				'CloudSync: Backup successful!',
				'success',
				'All 8 domains uploaded',
			)
		} catch (err: any) {
			const msg = err?.message || String(err)
			setStatusText(`Backup failed: ${msg}`)
			appendLog('system', `Backup error: ${msg}`)
			showCloudToast(`Backup failed: ${msg}`, 'critical')
		} finally {
			setIsSyncing(false)
		}
	}

	const handleFetchCloudForImport = async () => {
		if (isSyncing) return
		setIsSyncing(true)
		setStatusText('Fetching cloud data...')
		appendLog('system', 'Fetching latest backup from Ally Cloud...')
		try {
			const token = await ensureAuth()
			const data = await getData(settings.serverUrl, token)
			setCloudDataCache(data)
			setStatusText('Data loaded!')
			appendLog('system', 'Backup payload received from cloud')
			openImportActionSheet({
				cloudData: data,
				onConfirmImport: selected => handleExecuteImport(selected, data),
			})
		} catch (err: any) {
			const msg = err?.message || String(err)
			setStatusText(`Fetch failed: ${msg}`)
			appendLog('system', `Fetch error: ${msg}`)
			showCloudToast(`Could not fetch data: ${msg}`, 'critical')
		} finally {
			setIsSyncing(false)
		}
	}

	const handleExecuteImport = async (
		selected: SelectiveDomains,
		data: UserData | null = cloudDataCache,
	) => {
		if (!data) return
		setIsSyncing(true)
		setStatusText('Restoring selected items...')
		appendLog('system', 'Beginning selective restoration...')
		try {
			const res = await restoreEverything(data, settings, selected)
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
			setStatusText(`Restored ${total} items!`)
			appendLog('system', `Restoration finished: ${total} total items applied`)
			showCloudToast(`CloudSync: Restored ${total} items!`, 'success')
		} catch (err: any) {
			const msg = err?.message || String(err)
			setStatusText(`Restore failed: ${msg}`)
			appendLog('system', `Restore error: ${msg}`)
			showCloudToast(`Restore failed: ${msg}`, 'critical')
		} finally {
			setIsSyncing(false)
		}
	}

	const handleExportFile = async () => {
		if (isSyncing) return
		setIsSyncing(true)
		setStatusText('Preparing local backup...')
		try {
			const data = await grabEverything({
				...settings,
				syncPlugins: true,
				syncThemes: true,
				syncRepos: true,
				syncFonts: true,
				syncIconPacks: true,
				syncEmojiPacks: true,
				syncSettings: true,
				syncExperiments: true,
				ignoredPlugins: [],
			})
			const jsonStr = JSON.stringify(data, null, 2)
			const saved = await saveJsonFile('cloudsync-backup.json', jsonStr)
			if (!saved) {
				setStatusText('Local backup export cancelled.')
				return
			}
			appendLog('system', 'Backup exported using Android’s file picker')
			setStatusText('Local backup exported!')
			showCloudToast('CloudSync backup saved.', 'success')
		} catch (err: any) {
			const msg = err?.message || String(err)
			appendLog('system', `Export error: ${msg}`)
			setStatusText(`Export failed: ${msg}`)
			showCloudToast(`Export failed: ${msg}`, 'critical')
		} finally {
			setIsSyncing(false)
		}
	}

	const handleImportFile = async () => {
		if (isSyncing) return
		setIsSyncing(true)
		setStatusText('Choose a local backup file...')
		try {
			const content = await pickJsonFile()
			if (content === null) {
				setStatusText('Local backup import cancelled.')
				return
			}
			const data = JSON.parse(content) as UserData
			if (
				!data ||
				typeof data !== 'object' ||
				typeof data.version !== 'number' ||
				!data.repos ||
				!Array.isArray(data.repos) ||
				!data.plugins ||
				typeof data.plugins !== 'object' ||
				Array.isArray(data.plugins) ||
				!data.themes ||
				typeof data.themes !== 'object' ||
				Array.isArray(data.themes)
			) {
				throw new Error('This file is not a valid CloudSync backup.')
			}
			setCloudDataCache(data)
			setStatusText('Local backup loaded.')
			openImportActionSheet({
				cloudData: data,
				onConfirmImport: selected => handleExecuteImport(selected, data),
			})
		} catch (err: any) {
			const msg = err?.message || String(err)
			appendLog('system', `Local import error: ${msg}`)
			setStatusText(`Local import failed: ${msg}`)
			showCloudToast(`Local import failed: ${msg}`, 'critical')
		} finally {
			setIsSyncing(false)
		}
	}

	const handleReauth = async () => {
		if (!currentUser?.id) return
		setIsSyncing(true)
		setStatusText('Refreshing authentication...')
		try {
			const token = await loginWithUserId(settings.serverUrl, currentUser.id)
			api.jsonStorage.set({ authToken: token })
			setStatusText('Authentication refreshed!')
			showCloudToast('CloudSync: Token refreshed!', 'success')
		} catch (err: any) {
			const msg = err?.message || String(err)
			setStatusText(`Auth error: ${msg}`)
			showCloudToast(`Auth error: ${msg}`, 'critical')
		} finally {
			setIsSyncing(false)
		}
	}

	const handleDeleteCloud = () => {
		const key = `cloudsync-delete-${Date.now()}`
		AlertActionCreators.openAlert(
			key,
			<AlertModal
				title="Delete Cloud Data"
				content="Are you sure you want to permanently erase your synced data from the cloud server? This action cannot be undone."
				actions={
					<>
						<AlertActionButton
							variant="destructive"
							text="Delete Data"
							onPress={async () => {
								AlertActionCreators.dismissAlert(key)
								setIsSyncing(true)
								setStatusText('Deleting cloud data...')
								try {
									const token = await ensureAuth()
									await deleteData(settings.serverUrl, token)
									api.jsonStorage.set({ lastSyncedAt: null })
									setCloudDataCache(null)
									setStatusText('Cloud data deleted.')
									showCloudToast('CloudSync: Remote data deleted.', 'info')
								} catch (err: any) {
									setStatusText(`Delete failed: ${err?.message || err}`)
									showCloudToast(
										`Delete failed: ${err?.message || err}`,
										'critical',
									)
								} finally {
									setIsSyncing(false)
								}
							}}
						/>
						<AlertActionButton
							variant="secondary"
							text="Cancel"
							onPress={() => AlertActionCreators.dismissAlert(key)}
						/>
					</>
				}
			/>,
		)
	}

	const statPlugins = cloudDataCache
		? Object.keys(cloudDataCache.plugins || {}).length
		: localPluginsCount
	const statThemes = cloudDataCache
		? (cloudDataCache.themes?.['rosie.themes']?.themes?.length ??
			Object.keys(cloudDataCache.themes || {}).filter(k => !k.startsWith('_'))
				.length)
		: (readStorageFile('rosie.themes')?.themes?.length ??
			(readStorageFile('rosie.themes') ? 1 : 0))
	const statRepos = cloudDataCache
		? (cloudDataCache.repos?.length ?? 0)
		: settings.syncRepos
			? 1
			: 0
	const statIcons = cloudDataCache
		? Object.keys(cloudDataCache.iconPacks || {}).length
		: readStorageFile('rosie.icon-packs')
			? 1
			: 0
	const statEmojis = cloudDataCache
		? Object.keys(cloudDataCache.emojiPacks || {}).length
		: readStorageFile('rosie.emoji-packs') ||
				readStorageFile('rosie.global-emojis')
			? 1
			: 0
	const statFonts = cloudDataCache
		? Object.keys(cloudDataCache.fonts || {}).length
		: readStorageFile('rosie.font-packs')
			? 1
			: 0
	const statSettings = cloudDataCache
		? Object.keys(cloudDataCache.settings || {}).length
		: 12
	const statExperiments = cloudDataCache
		? Object.keys(cloudDataCache.experiments || {}).length
		: 0

	return (
		<ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 64 }}>
			<Stack spacing={16}>
				<Card
					variant="secondary"
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						padding: 16,
					}}
				>
					{avatarUrl ? (
						<Image
							source={{ uri: avatarUrl }}
							style={{
								width: 52,
								height: 52,
								borderRadius: 26,
								marginRight: 14,
							}}
						/>
					) : (
						<View
							style={{
								width: 52,
								height: 52,
								marginRight: 14,
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<Text variant="heading-lg/bold">
								{(currentUser?.username || 'U')[0].toUpperCase()}
							</Text>
						</View>
					)}
					<View style={{ flex: 1 }}>
						<Text variant="heading-md/bold">
							{currentUser?.username || 'Discord User'}
						</Text>
						<Text variant="text-xs/normal" style={{ marginTop: 2 }}>
							{settings.lastSyncedAt
								? `Last synced: ${new Date(settings.lastSyncedAt).toLocaleString()}`
								: 'Never backed up yet'}
						</Text>
					</View>
					<Button
						variant="secondary"
						text={`Logs (${logs.length})`}
						onPress={() =>
							openImportLogsSheet({
								getLogs: () => logsRef.current,
								onClearLogs: () => {
									logsRef.current = []
									setLogs([])
								},
							})
						}
					/>
				</Card>

				<View
					style={{
						flexDirection: 'row',
						justifyContent: 'space-between',
						alignItems: 'center',
					}}
				>
					<DataStat count={statPlugins} label="Plugins" />
					<DataStat count={statThemes} label="Themes" />
					<DataStat count={statRepos} label="Repos" />
					<DataStat count={statIcons} label="Icons" />
				</View>

				<View
					style={{
						flexDirection: 'row',
						justifyContent: 'space-between',
						alignItems: 'center',
					}}
				>
					<DataStat count={statEmojis} label="Emojis" />
					<DataStat count={statFonts} label="Fonts" />
					<DataStat count={statSettings} label="Settings" />
					<DataStat count={statExperiments} label="Experiments" />
				</View>

				<View style={{ flexDirection: 'row', gap: 10 }}>
					<Button
						variant="secondary"
						text="Backup Now"
						disabled={isSyncing}
						onPress={handleUpload}
						style={{ flex: 1 }}
					/>
					<Button
						variant="secondary"
						text="Import"
						disabled={isSyncing}
						onPress={handleFetchCloudForImport}
						style={{ flex: 1 }}
					/>
				</View>

				{isSyncing && (
					<Card
						variant="secondary"
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							justifyContent: 'center',
							padding: 12,
						}}
					>
						<ActivityIndicator
							size="small"
							color={Tokens.default.colors.BACKGROUND_BRAND}
							style={{ marginRight: 10 }}
						/>
						<Text variant="text-sm/medium">{statusText || 'Syncing...'}</Text>
					</Card>
				)}

				<TableRowGroup title="SYNCHRONIZATION DOMAINS">
					<TableSwitchRow
						label="Plugins & Sideloads"
						subLabel="Installed plugins, custom settings, and sideloaded scripts"
						value={settings.syncPlugins}
						onValueChange={(val: boolean) =>
							api.jsonStorage.set({ syncPlugins: val })
						}
					/>
					<TableSwitchRow
						label="Themes"
						subLabel="Theme selections, custom colors, backgrounds, and palette overrides"
						value={settings.syncThemes}
						onValueChange={(val: boolean) =>
							api.jsonStorage.set({ syncThemes: val })
						}
					/>
					<TableSwitchRow
						label="Repositories"
						subLabel="Third-party plugin and theme repository sources"
						value={settings.syncRepos}
						onValueChange={(val: boolean) =>
							api.jsonStorage.set({ syncRepos: val })
						}
					/>
					<TableSwitchRow
						label="Icon Packs"
						subLabel="Custom icon packs, active icon theme, and scaling configuration"
						value={settings.syncIconPacks}
						onValueChange={(val: boolean) =>
							api.jsonStorage.set({ syncIconPacks: val })
						}
					/>
					<TableSwitchRow
						label="Emoji Packs"
						subLabel="Custom emoji packs, global emoji cache, and emoji render preferences"
						value={settings.syncEmojiPacks}
						onValueChange={(val: boolean) =>
							api.jsonStorage.set({ syncEmojiPacks: val })
						}
					/>
					<TableSwitchRow
						label="Font Packs"
						subLabel="Custom font packs, font specs, and typography preferences"
						value={settings.syncFonts}
						onValueChange={(val: boolean) =>
							api.jsonStorage.set({ syncFonts: val })
						}
					/>
					<TableSwitchRow
						label="All Valenced Settings"
						subLabel="Core Valenced settings, DevTools, recovery mode, and all injected extension storage"
						value={settings.syncSettings}
						onValueChange={(val: boolean) =>
							api.jsonStorage.set({ syncSettings: val })
						}
					/>
					<TableSwitchRow
						label="Discord Experiments"
						subLabel="Discord experiment overrides, bucket assignments, and developer options"
						value={settings.syncExperiments}
						onValueChange={(val: boolean) =>
							api.jsonStorage.set({ syncExperiments: val })
						}
					/>
				</TableRowGroup>

				<TableRowGroup title="EXCLUSIONS & AUTOMATION">
					<TableRow
						label="Ignored Plugins"
						subLabel={`${settings.ignoredPlugins?.length ?? 0} plugin(s) excluded from cloud sync`}
						onPress={() =>
							openIgnoredPluginsSheet({
								ignoredPlugins: settings.ignoredPlugins || [],
								onUpdateIgnored: (newList: string[]) =>
									api.jsonStorage.set({ ignoredPlugins: newList }),
							})
						}
					/>
					<TableSwitchRow
						label="Auto Sync on Startup"
						subLabel="Automatically backup your setup when Discord launches"
						value={settings.autoSync}
						onValueChange={(val: boolean) =>
							api.jsonStorage.set({ autoSync: val })
						}
					/>
				</TableRowGroup>

				<TableRowGroup title="BACKEND CONFIGURATION">
					<TableRow
						label={
							<TextInput
								value={settings.serverUrl}
								onChange={(val: string) =>
									api.jsonStorage.set({ serverUrl: val })
								}
								placeholder="https://next.jarviscli.dev/"
								style={{ width: '100%' }}
							/>
						}
					/>
					<TableRow
						label="Refresh Token"
						subLabel="Re-authenticate with Discord account on server"
						onPress={handleReauth}
					/>
					<TableRow
						label="Delete Cloud Data"
						subLabel="Permanently purge your backup from the server"
						onPress={handleDeleteCloud}
					/>
				</TableRowGroup>

				<TableRowGroup title="LOCAL BACKUP">
					<TableRow
						label="Export JSON Backup"
						subLabel="Choose where to save a complete JSON backup"
						disabled={isSyncing}
						onPress={handleExportFile}
					/>
					<TableRow
						label="Import JSON Backup"
						subLabel="Choose a local CloudSync backup to restore"
						disabled={isSyncing}
						onPress={handleImportFile}
					/>
				</TableRowGroup>
			</Stack>
		</ScrollView>
	)
}
