import { Design } from '@valenced/discord/design'
import { Clipboard } from '@valenced/externals/react-native-clipboard'
import { useState } from 'react'
import {
	normalizeSongs,
	parseLink,
	songId,
	validateSong,
} from '../../../modules/api'
import { SONG_LIMIT } from '../../../types'
import ManagedSongRow from './ManagedSongRow'
import type { UserData } from '../../../types'

export default function SongListEditor({
	data,
	onChange,
}: {
	data: UserData
	onChange(data: UserData): void
}) {
	const { Button, Stack, TableRowGroup, TextInput } = Design
	const [link, setLink] = useState('')
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState('')

	async function addSong() {
		setBusy(true)
		setError('')
		try {
			const song = await parseLink(link.trim())
			if (!song) throw new Error('That link is not supported.')
			if (data.some(item => songId(item) === songId(song)))
				throw new Error('That song is already in your list.')
			if (data.length >= SONG_LIMIT)
				throw new Error(`Your profile can show up to ${SONG_LIMIT} songs.`)
			onChange([...data, song])
			setLink('')
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause))
		} finally {
			setBusy(false)
		}
	}

	async function importSongs() {
		setBusy(true)
		setError('')
		try {
			const parsed: unknown = JSON.parse(await Clipboard.getString())
			const imported = normalizeSongs(parsed)
			const valid = await Promise.all(imported.map(validateSong))
			if (valid.some(value => !value))
				throw new Error('The imported list contains unavailable songs.')
			onChange(imported)
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause))
		} finally {
			setBusy(false)
		}
	}

	function copySongs() {
		setError('')
		try {
			Clipboard.setString(JSON.stringify(data))
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause))
		}
	}

	return (
		<TableRowGroup
			hasIcons
			title={`Your songs (${data.length}/${SONG_LIMIT})`}
			description="Add supported music links to show on your profile."
		>
			<Stack spacing={8} style={{ paddingVertical: 12 }}>
				<TextInput
					label="Song link"
					placeholder="Paste a Spotify, Apple Music, SoundCloud, or Tidal link"
					value={link}
					onChange={setLink}
					returnKeyType="done"
					status={error ? 'error' : 'default'}
					errorMessage={error || undefined}
				/>
				<Button
					text="Add song"
					loading={busy}
					disabled={busy || !link.trim() || data.length >= SONG_LIMIT}
					onPress={() => void addSong()}
				/>
				<Stack direction="horizontal" spacing={8}>
					<Button
						variant="secondary"
						text="Import from clipboard"
						style={{ flex: 1.5 }}
						disabled={busy}
						onPress={() => void importSongs()}
					/>
					<Button
						variant="secondary"
						text="Copy list"
						style={{ flex: 1 }}
						disabled={busy || !data.length}
						onPress={() => void copySongs()}
					/>
				</Stack>
				{data.map((song, index) => (
					<ManagedSongRow
						key={songId(song)}
						song={song}
						disabled={busy}
						canMoveUp={index > 0}
						canMoveDown={index < data.length - 1}
						onMoveUp={() => onChange(move(data, index, index - 1))}
						onMoveDown={() => onChange(move(data, index, index + 1))}
						onRemove={() =>
							onChange(data.filter((_, position) => position !== index))
						}
					/>
				))}
			</Stack>
		</TableRowGroup>
	)
}

function move<T>(items: T[], from: number, to: number) {
	const next = [...items]
	const [item] = next.splice(from, 1)
	next.splice(to, 0, item)
	return next
}
