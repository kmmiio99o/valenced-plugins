import TableRowAssetIcon from '@valenced/components/TableRowAssetIcon'
import {
	AlertActionCreators,
	ToastActionCreators,
} from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import { startOAuth } from '../../../modules/oauth'
import type { AuthToken, SongSpotlightSettings } from '../../../types'

export default function AccountSection({
	userId,
	settings,
	saveToken,
	onLogout,
}: {
	userId?: string
	settings: Partial<SongSpotlightSettings>
	saveToken(token: AuthToken): Promise<void>
	onLogout(): Promise<void>
}) {
	const authorized = Boolean(userId && settings.tokens?.[userId])

	async function authorize() {
		if (!userId) return
		try {
			await startOAuth(settings, saveToken)
			ToastActionCreators.open('SONG_SPOTLIGHT_AUTH', {
				text: 'Authorization completed.',
				variant: 'success',
			})
		} catch (error) {
			ToastActionCreators.open('SONG_SPOTLIGHT_AUTH_ERROR', {
				text: error instanceof Error ? error.message : String(error),
				variant: 'critical',
			})
		}
	}

	function confirmLogout() {
		const key = 'SONG_SPOTLIGHT_DISCONNECT_CONFIRM'
		AlertActionCreators.openAlert(
			key,
			<Design.AlertModal
				title="Disconnect Song Spotlight?"
				content="Your saved songs will remain on the server."
				actions={
					<Design.Stack direction="horizontal" spacing={8}>
						<Design.AlertActionButton
							text="Cancel"
							variant="secondary"
							onPress={() => AlertActionCreators.dismissAlert(key)}
						/>
						<Design.AlertActionButton
							text="Disconnect"
							variant="destructive"
							onPress={() => {
								AlertActionCreators.dismissAlert(key)
								void onLogout()
									.then(() =>
										ToastActionCreators.open('SONG_SPOTLIGHT_LOGOUT', {
											text: 'Disconnected from Song Spotlight.',
											variant: 'success',
										}),
									)
									.catch(error =>
										ToastActionCreators.open('SONG_SPOTLIGHT_LOGOUT_ERROR', {
											text:
												error instanceof Error ? error.message : String(error),
											variant: 'critical',
										}),
									)
							}}
						/>
					</Design.Stack>
				}
			/>,
		)
	}

	return (
		<Design.TableRowGroup title="Account" hasIcons>
			{authorized ? (
				<Design.TableRow
					label="Song Spotlight account"
					subLabel="Connected to your Discord account"
					icon={<TableRowAssetIcon name="CircleCheckIcon" />}
					trailing={
						<Design.Button
							size="sm"
							variant="destructive"
							text="Disconnect"
							onPress={confirmLogout}
						/>
					}
				/>
			) : (
				<Design.TableRow
					label="Connect Song Spotlight"
					icon={<TableRowAssetIcon name="LinkIcon" />}
					subLabel={
						userId
							? 'Authorize Discord to manage your song list.'
							: 'Log in to Discord before connecting.'
					}
					onPress={authorize}
					disabled={!userId}
					arrow
				/>
			)}
		</Design.TableRowGroup>
	)
}
