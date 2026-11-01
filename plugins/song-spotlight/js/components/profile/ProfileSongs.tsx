import { Design } from '@valenced/discord/design'
import { Stores } from '@valenced/discord/flux'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { getData, listData } from '../../modules/api'
import { stopPreview } from '../../modules/audio'
import { getRuntimeStorage, reportPluginError } from '../../modules/runtime'
import { DEFAULT_HOST } from '../../types'
import SongRow from './SongRow'
import type { AuthToken, UserData } from '../../types'

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
	const [songs, setSongs] = useState<UserData>()

	useEffect(() => () => void stopPreview(), [])

	useEffect(() => {
		if (!userId || !token || !viewerId) return
		let cancelled = false
		setSongs(undefined)
		const updateToken = (updatedToken: AuthToken) => {
			if (!storage) throw new Error('Song Spotlight storage is unavailable.')
			return storage.set({ tokens: { [viewerId]: updatedToken } })
		}
		const request =
			userId === viewerId
				? getData(host, token, updateToken)
				: listData(host, userId, token, updateToken)
		void request
			.then(data => {
				if (!cancelled) setSongs(data)
			})
			.catch(error => {
				if (!cancelled) reportPluginError(error)
			})
		return () => {
			cancelled = true
		}
	}, [host, userId, tokenSnapshot, viewerId, storage])

	if (!songs?.length) return null

	return (
		<Design.Stack style={{ paddingHorizontal: 8 }}>
			<Design.TableRowGroup title="Song Spotlight">
				<Design.Stack spacing={8}>
					{songs.map(song => (
						<SongRow
							key={`${song.service}:${song.type}:${song.id}`}
							song={song}
						/>
					))}
				</Design.Stack>
			</Design.TableRowGroup>
		</Design.Stack>
	)
}
