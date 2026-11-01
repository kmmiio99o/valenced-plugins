import { useEffect, useRef, useState } from 'react'
import { getData, saveData } from '../../modules/api'
import { showMessage } from '../../modules/toasts'
import type { AuthToken, UserData } from '../../types'

const drafts = new Map<string, UserData>()
type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export default function useSongData(
	host: string,
	userId: string | undefined,
	token: AuthToken | undefined,
	updateToken: (token: AuthToken) => Promise<void>,
) {
	const key = JSON.stringify([host, userId])
	const [songs, setSongs] = useState<UserData>(() => drafts.get(key) ?? [])
	const [loading, setLoading] = useState(false)
	const [saveState, setSaveState] = useState<SaveState>(
		drafts.has(key) ? 'pending' : 'idle',
	)
	const version = useRef(0)
	const edited = useRef(drafts.has(key))
	const loadedKey = useRef(key)
	const songsRef = useRef(songs)
	const saving = useRef(false)
	const saveLatest = useRef<() => Promise<void>>(async () => {})
	songsRef.current = songs

	useEffect(() => {
		if (loadedKey.current !== key) {
			loadedKey.current = key
			version.current++
			const draft = drafts.get(key)
			edited.current = Boolean(draft)
			setSongs(draft ?? [])
			setSaveState(draft ? 'pending' : 'idle')
		}
		if (!token) {
			version.current++
			setLoading(false)
			return
		}

		let cancelled = false
		const requestVersion = version.current
		if (!edited.current) setLoading(true)
		void getData(host, token, updateToken)
			.then(data => {
				if (!cancelled && requestVersion === version.current && !edited.current)
					setSongs(data)
			})
			.catch(error => {
				if (!cancelled) showMessage(error, 'SONG_SPOTLIGHT_LOAD')
			})
			.finally(() => {
				if (!cancelled && requestVersion === version.current) setLoading(false)
			})
		return () => {
			cancelled = true
		}
	}, [host, token, userId])

	async function persistLatest() {
		if (!edited.current || !token || saving.current) return
		saving.current = true
		const savedVersion = version.current
		setSaveState('saving')
		try {
			await saveData(host, token, songsRef.current, updateToken)
			if (savedVersion === version.current) {
				edited.current = false
				drafts.delete(key)
				setSaveState('saved')
			} else {
				setSaveState('pending')
			}
		} catch (error) {
			setSaveState('error')
			showMessage(error, 'SONG_SPOTLIGHT_AUTOSAVE')
		} finally {
			saving.current = false
			if (edited.current && savedVersion !== version.current)
				void saveLatest.current()
		}
	}
	saveLatest.current = persistLatest

	useEffect(() => {
		if (!edited.current || !token) return
		const timeout = setTimeout(() => void saveLatest.current(), 700)
		return () => clearTimeout(timeout)
	}, [host, key, songs, token])

	function changeSongs(data: UserData) {
		version.current++
		edited.current = true
		songsRef.current = data
		drafts.set(key, data)
		setSongs(data)
		setSaveState('pending')
	}

	function clearSongs() {
		version.current++
		edited.current = false
		drafts.delete(key)
		setLoading(false)
		setSongs([])
		setSaveState('idle')
	}

	return { songs, loading, saveState, changeSongs, clearSongs }
}
