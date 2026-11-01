import TableRowAssetIcon from '@valenced/components/TableRowAssetIcon'
import {
	AlertActionCreators,
	ToastActionCreators,
} from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import { lookupGeneratedIconComponent } from '@valenced/utils/discord'
import { useState } from 'react'
import { deleteData } from '../../../modules/api'
import type { AuthToken } from '../../../types'

export default function DeleteSongsRow({
	host,
	token,
	updateToken,
	onDeleted,
}: {
	host: string
	token: AuthToken
	updateToken(token: AuthToken): Promise<void>
	onDeleted(): void
}) {
	const [busy, setBusy] = useState(false)
	const TrashIcon = lookupGeneratedIconComponent('TrashIcon')!

	function confirmDelete() {
		const key = 'SONG_SPOTLIGHT_DELETE_CONFIRM'
		AlertActionCreators.openAlert(
			key,
			<Design.AlertModal
				title="Delete saved songs?"
				content="This permanently removes the song list from your Song Spotlight account."
				actions={
					<Design.Stack direction="horizontal" spacing={8}>
						<Design.AlertActionButton
							text="Cancel"
							variant="secondary"
							onPress={() => AlertActionCreators.dismissAlert(key)}
						/>
						<Design.AlertActionButton
							text="Delete"
							variant="destructive"
							loading={busy}
							onPress={() => {
								AlertActionCreators.dismissAlert(key)
								void deleteSongs()
							}}
						/>
					</Design.Stack>
				}
			/>,
		)
	}

	async function deleteSongs() {
		setBusy(true)
		try {
			await deleteData(host, token, updateToken)
			onDeleted()
			ToastActionCreators.open('SONG_SPOTLIGHT_DELETE', {
				text: 'Saved songs deleted.',
				variant: 'success',
			})
		} catch (error) {
			ToastActionCreators.open('SONG_SPOTLIGHT_DELETE_ERROR', {
				text: error instanceof Error ? error.message : String(error),
				variant: 'critical',
			})
		} finally {
			setBusy(false)
		}
	}

	return (
		<Design.TableRow
			label="Delete saved songs"
			subLabel="Remove your songs from the Song Spotlight server."
			variant="danger"
			icon={<TableRowAssetIcon IconComponent={TrashIcon} variant="danger" />}
			disabled={busy}
			onPress={confirmDelete}
		/>
	)
}
