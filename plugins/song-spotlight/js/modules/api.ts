import {
	parseLink,
	renderSong,
	services,
	validateSong,
} from '@song-spotlight/api/handlers'
import { DEFAULT_HOST } from '../types'
import type { AuthToken, Song, SongSpotlightSettings, UserData } from '../types'

export { parseLink, renderSong, validateSong }

interface CachedUserData {
	data: UserData
	lastModified?: string
}

const userDataCache = new Map<string, CachedUserData>()
const userDataRequests = new Map<string, Promise<UserData>>()

export function getHost(settings?: Partial<SongSpotlightSettings>) {
	const host = settings?.host?.trim() || DEFAULT_HOST
	const url = new URL(host)
	const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
	if (url.username || url.password || url.search || url.hash)
		throw new Error(
			'The server URL cannot include credentials or query values.',
		)
	if (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))
		throw new Error('The server URL must use HTTPS.')
	return `${url.href.replace(/\/+$/, '')}/`
}

function userDataCacheKey(host: string, path: string, token: AuthToken) {
	return `${host}${path}${token.refresh}`
}

export function getCachedUserData(
	hostValue: string,
	userId: string,
	isCurrentUser: boolean,
	token: AuthToken,
) {
	const host = getHost({ host: hostValue })
	const path = isCurrentUser
		? 'api/data'
		: `api/data/${encodeURIComponent(userId)}`
	return userDataCache.get(userDataCacheKey(host, path, token))?.data
}

async function responseError(response: Response) {
	const message = await response.text()
	return new Error(
		`Song Spotlight server returned ${response.status}${message ? `: ${message.slice(0, 300)}` : ''}`,
	)
}

async function refreshAccessToken(host: string, token: AuthToken) {
	if (!token.refresh) return undefined
	const response = await fetch(`${host}api/auth/refresh`, {
		method: 'POST',
		headers: { 'X-Refresh-Token': token.refresh },
		body: token.access,
	})
	if (!response.ok) return undefined
	const access = await response.text()
	return access ? { access, refresh: token.refresh } : undefined
}

async function authorizedFetch(
	host: string,
	path: string,
	token: AuthToken,
	updateToken: (token: AuthToken) => void | Promise<void>,
	options: RequestInit = {},
	retried = false,
) {
	const response = await fetch(new URL(path, host), {
		...options,
		headers: {
			...options.headers,
			authorization: token.access,
		},
	})
	if (response.status !== 401) return response
	if (retried) throw new Error('Song Spotlight authorization expired.')
	const refreshed = await refreshAccessToken(host, token)
	if (!refreshed) throw new Error('Song Spotlight authorization expired.')
	await updateToken(refreshed)
	return authorizedFetch(host, path, refreshed, updateToken, options, true)
}

export async function listData(
	hostValue: string,
	userId: string,
	token: AuthToken,
	updateToken: (token: AuthToken) => void | Promise<void>,
): Promise<UserData> {
	const host = getHost({ host: hostValue })
	return fetchUserData(
		host,
		`api/data/${encodeURIComponent(userId)}`,
		token,
		updateToken,
	)
}

export async function getData(
	hostValue: string,
	token: AuthToken,
	updateToken: (token: AuthToken) => void | Promise<void>,
): Promise<UserData> {
	const host = getHost({ host: hostValue })
	return fetchUserData(host, 'api/data', token, updateToken)
}

async function fetchUserData(
	host: string,
	path: string,
	token: AuthToken,
	updateToken: (token: AuthToken) => void | Promise<void>,
) {
	const key = userDataCacheKey(host, path, token)
	const pending = userDataRequests.get(key)
	if (pending) return pending

	const request = (async () => {
		const cached = userDataCache.get(key)
		const response = await authorizedFetch(
			host,
			path,
			token,
			updateToken,
			cached?.lastModified
				? { headers: { 'if-modified-since': cached.lastModified } }
				: undefined,
		)
		if (response.status === 304 && cached) return cached.data
		if (!response.ok) throw await responseError(response)

		const data = (await response.json()) as UserData
		userDataCache.set(key, {
			data,
			lastModified: response.headers.get('last-modified') ?? undefined,
		})
		return data
	})()
	userDataRequests.set(key, request)
	try {
		return await request
	} finally {
		userDataRequests.delete(key)
	}
}

export async function saveData(
	hostValue: string,
	token: AuthToken,
	data: UserData,
	updateToken: (token: AuthToken) => void | Promise<void>,
) {
	const host = getHost({ host: hostValue })
	const response = await authorizedFetch(host, 'api/data', token, updateToken, {
		method: 'PUT',
		headers: {
			'content-type': 'application/json',
		},
		body: JSON.stringify(data),
	})
	if (!response.ok) throw await responseError(response)
	userDataCache.set(userDataCacheKey(host, 'api/data', token), {
		data,
		lastModified: response.headers.get('last-modified') ?? undefined,
	})
}

export async function deleteData(
	hostValue: string,
	token: AuthToken,
	updateToken: (token: AuthToken) => void | Promise<void>,
) {
	const host = getHost({ host: hostValue })
	const response = await authorizedFetch(host, 'api/data', token, updateToken, {
		method: 'DELETE',
	})
	if (!response.ok) throw await responseError(response)
	userDataCache.delete(userDataCacheKey(host, 'api/data', token))
}

export function songId(song: Song) {
	return `${song.service}:${song.type}:${song.id}`
}

export function normalizeSongs(value: unknown): UserData {
	if (!Array.isArray(value) || value.length > 6)
		throw new Error('Expected a song list of up to six items.')
	return value.map(item => {
		if (
			!item ||
			typeof item !== 'object' ||
			!('service' in item) ||
			!('type' in item) ||
			!('id' in item) ||
			typeof item.service !== 'string' ||
			typeof item.type !== 'string' ||
			typeof item.id !== 'string'
		)
			throw new Error('The imported song list is invalid.')
		const service = services.find(entry => entry.name === item.service)
		if (!service?.types.includes(item.type))
			throw new Error('The imported song list contains an unsupported service.')
		return { service: item.service, type: item.type, id: item.id }
	})
}
