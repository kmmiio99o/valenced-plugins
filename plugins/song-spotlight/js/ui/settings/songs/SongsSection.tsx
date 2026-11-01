import { Design } from '@valenced/discord/design'
import DeleteSongsRow from './DeleteSongsRow'
import SongListEditor from './SongListEditor'
import type { AuthToken, UserData } from '../../../types'

export default function SongsSection({
	loading,
	saveState,
	songs,
	onChange,
	host,
	token,
	updateToken,
	onDeleted,
}: {
	loading: boolean
	saveState: 'idle' | 'pending' | 'saving' | 'saved' | 'error'
	songs: UserData
	onChange(data: UserData): void
	host: string
	token: AuthToken
	updateToken(token: AuthToken): Promise<void>
	onDeleted(): void
}) {
	if (loading)
		return <Design.Text color="text-muted">{LOADING_SONGS_TEXT}</Design.Text>

	return (
		<>
			<SongListEditor data={songs} onChange={onChange} />
			{saveState !== 'idle' ? (
				<Design.Text color="text-muted">{SAVE_LABELS[saveState]}</Design.Text>
			) : null}
			<Design.TableRowGroup title="Data" hasIcons>
				<DeleteSongsRow
					host={host}
					token={token}
					updateToken={updateToken}
					onDeleted={onDeleted}
				/>
			</Design.TableRowGroup>
		</>
	)
}

const LOADING_SONGS_TEXT = 'Loading your songs…'
const SAVE_LABELS = {
	idle: '',
	pending: 'Changes will save automatically.',
	saving: 'Saving changes…',
	saved: 'Changes saved.',
	error: 'Could not save changes. Your edits are kept; edit again to retry.',
}
