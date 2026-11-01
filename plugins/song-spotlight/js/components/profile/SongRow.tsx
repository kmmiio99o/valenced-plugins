import { ToastActionCreators } from '@valenced/discord/actions'
import { useEffect, useState } from 'react'
import { renderSong, songId } from '../../modules/api'
import { playPreview, stopPreview, subscribeToAudio } from '../../modules/audio'
import { reportPluginError } from '../../modules/runtime'
import SongCard from './SongCard'
import type { RenderSongInfo } from '@song-spotlight/api/handlers'
import type { Song } from '../../types'

export default function SongRow({ song }: { song: Song }) {
	const [rendered, setRendered] = useState<RenderSongInfo | null>()
	const [activePreview, setActivePreview] = useState<string | null>(null)

	useEffect(() => {
		let cancelled = false
		void renderSong(song)
			.then(value => {
				if (!cancelled) setRendered(value ?? null)
			})
			.catch(error => {
				if (!cancelled) {
					setRendered(null)
					reportPluginError(error)
				}
			})
		return () => {
			cancelled = true
		}
	}, [songId(song)])

	useEffect(() => subscribeToAudio(setActivePreview), [])

	const preview = getPreview(rendered)

	return (
		<SongCard
			song={song}
			rendered={rendered}
			preview={preview}
			activePreview={activePreview}
			onTogglePreview={togglePreview}
		/>
	)

	async function togglePreview(url: string, duration?: number) {
		if (activePreview === url) {
			stopPreview()
			return
		}
		try {
			await playPreview(url, duration)
		} catch (error) {
			ToastActionCreators.open('SONG_SPOTLIGHT_PROFILE_AUDIO_ERROR', {
				text: error instanceof Error ? error.message : String(error),
				variant: 'critical',
			})
		}
	}
}

function getPreview(rendered?: RenderSongInfo | null) {
	if (!rendered) return undefined
	return rendered.form === 'single'
		? rendered.single.audio?.previewUrl
		: rendered.list.find(entry => entry.audio?.previewUrl)?.audio?.previewUrl
}
