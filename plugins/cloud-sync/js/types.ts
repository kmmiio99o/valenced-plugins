export interface RepoEntry {
	url: string
	name?: string
	description?: string
	enabled: boolean
}

export interface PluginBackup {
	enabled: boolean
	version?: string
	name?: string
	author?: string
	description?: string
	channel?: string
	repo?: string
	isSideloaded?: boolean
	manifest?: any
	files?: {
		manifest?: string
		index?: string
		jar?: string
		zip?: string
	}
	storage?: any
}

export interface UserData {
	version: number
	repos: RepoEntry[]
	plugins: Record<string, PluginBackup>
	themes: Record<string, any>
	fonts: Record<string, any>
	iconPacks: Record<string, any>
	emojiPacks: Record<string, any>
	settings: Record<string, any>
	experiments: Record<string, any>
	sideloadZips?: Record<string, string>
	syncedAt?: string
}

export interface SyncResult {
	repos: number
	plugins: number
	themes: number
	fonts: number
	iconPacks: number
	emojiPacks: number
	settings: number
	experiments: number
}

export interface SelectiveDomains {
	repos?: boolean
	plugins?: boolean
	themes?: boolean
	fonts?: boolean
	iconPacks?: boolean
	emojiPacks?: boolean
	settings?: boolean
	experiments?: boolean
}

export interface CloudSyncSettings {
	syncPlugins: boolean
	syncThemes: boolean
	syncRepos: boolean
	syncFonts: boolean
	syncIconPacks: boolean
	syncEmojiPacks: boolean
	syncSettings: boolean
	syncExperiments: boolean
	serverUrl: string
	authToken: string
	lastSyncedAt: string | null
	autoSync: boolean
	ignoredPlugins: string[]
}

export const DEFAULT_SETTINGS: CloudSyncSettings = {
	autoSync: false,
	syncPlugins: true,
	syncThemes: true,
	syncRepos: true,
	syncFonts: true,
	syncIconPacks: true,
	syncEmojiPacks: true,
	syncSettings: true,
	syncExperiments: true,
	serverUrl: 'https://next.jarviscli.dev/',
	authToken: '',
	lastSyncedAt: null,
	ignoredPlugins: [],
}
