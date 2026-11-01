import type { Song, UserData } from '@song-spotlight/api/structs'

export type { Song, UserData }

export interface AuthToken {
	access: string
	refresh: string
}

export interface SongSpotlightSettings {
	host: string
	clientId: string
	tokens: Record<string, AuthToken>
}

export const DEFAULT_HOST = 'https://dc.songspotlight.nexpid.xyz/'
export const DEFAULT_CLIENT_ID = '1157745434140344321'
export const SONG_LIMIT = 6

export const DEFAULT_SETTINGS: SongSpotlightSettings = {
	host: DEFAULT_HOST,
	clientId: DEFAULT_CLIENT_ID,
	tokens: {},
}
