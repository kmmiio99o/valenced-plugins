import { ToastActionCreators } from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import { Stores } from '@valenced/discord/flux'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { getCachedUserData, getData, listData } from '../../modules/api'
import { stopPreview } from '../../modules/audio'
import { startOAuth } from '../../modules/oauth'
import { getRuntimeStorage, reportPluginError } from '../../modules/runtime'
import { DEFAULT_HOST } from '../../types'
import SongRow from './SongRow'
import type { AuthToken, UserData } from '../../types'

const AUTHORIZATION_PROMPT =
	'Authorize Song Spotlight with Discord to view shared songs on profiles.'
const DISCORD_LOGIN_PROMPT =
	'Log in to Discord before authorizing Song Spotlight.'
const AUTHORIZATION_HEADING = 'Connect to Song Spotlight'
const EMPTY_PROFILE_HEADING = 'No songs yet'
const EMPTY_PROFILE_MESSAGE =
	'This profile has not added any songs to Song Spotlight.'

export default function ProfileSongs({ userId }: { userId: string }) {
	const storage = getRuntimeStorage()
	const viewerId = (
		Stores.UserStore as unknown as
			| { getCurrentUser?(): { id?: string } | undefined }
			| undefined
	)?.getCurrentUser?.()?.id
	const host = useSyncExternalStore(
		callback => storage?.subscribe(() => callback()) ?? (() => {}),
		() => storage?.cache?.host ?? DEFAULT_HOST,
		() => DEFAULT_HOST,
	)
	const tokenSnapshot = useSyncExternalStore(
		callback => storage?.subscribe(() => callback()) ?? (() => {}),
		() =>
			JSON.stringify(
				viewerId ? (storage?.cache?.tokens?.[viewerId] ?? null) : null,
			),
		() => 'null',
	)
	const token = JSON.parse(tokenSnapshot) as AuthToken | null
	const profileKey = JSON.stringify([host, userId, viewerId, token?.access])
	const [loadedSongs, setLoadedSongs] = useState<
		{ key: string; data: UserData } | undefined
	>(() => {
		if (!token || !viewerId) return undefined
		const cached = getCachedUserData(host, userId, userId === viewerId, token)
		return cached ? { key: profileKey, data: cached } : undefined
	})
	const [authorizing, setAuthorizing] = useState(false)
	const songs = loadedSongs?.key === profileKey ? loadedSongs.data : undefined

	useEffect(() => () => void stopPreview(), [])

	useEffect(() => {
		if (!userId || !token || !viewerId) {
			setLoadedSongs(undefined)
			return
		}
		let cancelled = false
		const isCurrentUser = userId === viewerId
		const cached = getCachedUserData(host, userId, isCurrentUser, token)
		setLoadedSongs(cached ? { key: profileKey, data: cached } : undefined)
		const updateToken = (updatedToken: AuthToken) => {
			if (!storage) throw new Error('Song Spotlight storage is unavailable.')
			return storage.set({ tokens: { [viewerId]: updatedToken } })
		}
		const request = isCurrentUser
			? getData(host, token, updateToken)
			: listData(host, userId, token, updateToken)
		void request
			.then(data => {
				if (!cancelled) setLoadedSongs({ key: profileKey, data })
			})
			.catch(error => {
				if (!cancelled) reportPluginError(error)
			})
		return () => {
			cancelled = true
		}
	}, [host, userId, tokenSnapshot, viewerId, storage, profileKey])

	async function authorize() {
		if (!viewerId || !storage || authorizing) return
		setAuthorizing(true)
		try {
			await startOAuth(storage.cache ?? {}, token =>
				storage.set({ tokens: { [viewerId]: token } }),
			)
			ToastActionCreators.open('SONG_SPOTLIGHT_AUTH', {
				text: 'Authorization completed.',
				variant: 'success',
			})
		} catch (error) {
			ToastActionCreators.open('SONG_SPOTLIGHT_AUTH_ERROR', {
				text: error instanceof Error ? error.message : String(error),
				variant: 'critical',
			})
		} finally {
			setAuthorizing(false)
		}
	}

	if (!token || !viewerId) {
		return (
			<Design.Stack style={{ paddingHorizontal: 8 }}>
				<Design.TableRowGroup title="Song Spotlight">
					<Design.Stack
						align="center"
						spacing={16}
						style={{ paddingVertical: 32 }}
					>
						<Design.Stack align="center" spacing={8}>
							<Design.Text
								variant="redesign/heading-18/bold"
								color="mobile-text-heading-primary"
								style={{ textAlign: 'center' }}
							>
								{AUTHORIZATION_HEADING}
							</Design.Text>
							<Design.Text
								variant="text-sm/normal"
								style={{ textAlign: 'center' }}
							>
								{viewerId ? AUTHORIZATION_PROMPT : DISCORD_LOGIN_PROMPT}
							</Design.Text>
						</Design.Stack>
						<Design.Button
							size="sm"
							variant="secondary"
							text={authorizing ? 'Authorizing...' : 'Authorize Song Spotlight'}
							onPress={() => void authorize()}
							disabled={!viewerId || !storage || authorizing}
						/>
					</Design.Stack>
				</Design.TableRowGroup>
			</Design.Stack>
		)
	}

	if (!songs) return null

	return (
		<Design.Stack style={{ paddingHorizontal: 8 }}>
			<Design.TableRowGroup title="Song Spotlight">
				{songs.length ? (
					<Design.Stack spacing={8}>
						{songs.map(song => (
							<SongRow
								key={`${song.service}:${song.type}:${song.id}`}
								song={song}
							/>
						))}
					</Design.Stack>
				) : (
					<Design.Stack
						align="center"
						spacing={16}
						style={{ paddingVertical: 32 }}
					>
						<Design.Stack align="center" spacing={8}>
							<Design.Text
								variant="redesign/heading-18/bold"
								color="mobile-text-heading-primary"
								style={{ textAlign: 'center' }}
							>
								{EMPTY_PROFILE_HEADING}
							</Design.Text>
							<Design.Text
								variant="text-sm/normal"
								style={{ textAlign: 'center' }}
							>
								{EMPTY_PROFILE_MESSAGE}
							</Design.Text>
						</Design.Stack>
					</Design.Stack>
				)}
			</Design.TableRowGroup>
		</Design.Stack>
	)
}
