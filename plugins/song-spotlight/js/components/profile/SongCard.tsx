import { getAssetIdByName } from '@valenced/assets'
import TableRowAssetIcon from '@valenced/components/TableRowAssetIcon'
import { Design } from '@valenced/discord/design'
import { Clipboard } from '@valenced/externals/react-native-clipboard'
import { Image, Linking, Pressable, View } from 'react-native'
import { showMessage } from '../../modules/toasts'
import { openAlbumTracksSheet } from './AlbumTracksSheet'
import type { RenderSongInfo } from '@song-spotlight/api/handlers'
import type { Song } from '../../types'

const playIcon = getAssetIdByName('PlayIcon')!
const pauseIcon = getAssetIdByName('PauseIcon')!
const copyIcon = getAssetIdByName('CopyIcon')!

export default function SongCard({
	song,
	rendered,
	preview,
	activePreview,
	onTogglePreview,
}: {
	song: Song
	rendered?: RenderSongInfo | null
	preview?: string
	activePreview: string | null
	onTogglePreview(url: string, duration?: number): void
}) {
	const label = rendered?.label ?? `${song.service} ${song.type}`
	const subLabel = rendered?.sublabel ?? song.id
	const playing = Boolean(preview && activePreview === preview)

	return (
		<Design.Card
			variant="secondary"
			border="subtle"
			style={{ borderRadius: 10, overflow: 'hidden', width: '100%' }}
		>
			<Design.Stack
				direction="horizontal"
				spacing={12}
				align="center"
				style={{
					paddingHorizontal: 6,
					paddingVertical: 3,
					alignSelf: 'stretch',
				}}
			>
				<Pressable
					disabled={!rendered?.link}
					onPress={() => {
						if (rendered?.link) {
							void Linking.openURL(rendered.link).catch(error =>
								showMessage(
									error,
									'SONG_SPOTLIGHT_PROFILE_LINK_ERROR',
									'critical',
								),
							)
						}
					}}
				>
					{rendered?.thumbnailUrl ? (
						<Image
							source={{ uri: rendered.thumbnailUrl }}
							style={{ width: 64, height: 64, borderRadius: 8 }}
						/>
					) : (
						<Design.Stack
							align="center"
							justify="center"
							style={{ width: 64, height: 64, borderRadius: 8 }}
						>
							<TableRowAssetIcon name="MusicIcon" />
						</Design.Stack>
					)}
				</Pressable>
				<Design.Stack spacing={2} style={{ flex: 1, flexShrink: 1 }}>
					<Design.Text variant="text-md/semibold" lineClamp={1}>
						{label}
					</Design.Text>
					<Design.Text
						variant="text-sm/medium"
						color="text-muted"
						lineClamp={1}
					>
						{subLabel}
					</Design.Text>
				</Design.Stack>
				<View style={{ marginLeft: 'auto', justifyContent: 'flex-end' }}>
					<Design.Stack spacing={4} align="flex-end">
						{rendered?.link ? (
							<Design.IconButton
								size="sm"
								variant="secondary"
								icon={copyIcon}
								accessibilityLabel="Copy song link"
								onPress={() => {
									try {
										Clipboard.setString(rendered.link)
									} catch (error) {
										showMessage(error, 'SONG_SPOTLIGHT_COPY_ERROR', 'critical')
										return
									}
									showMessage(
										'Song link copied.',
										'SONG_SPOTLIGHT_LINK_COPIED',
										'success',
									)
								}}
							/>
						) : null}
						{preview ? (
							<Design.IconButton
								size="sm"
								variant="secondary"
								icon={playing ? pauseIcon : playIcon}
								accessibilityLabel={
									playing ? 'Pause song preview' : 'Play song preview'
								}
								onPress={() =>
									onTogglePreview(
										preview,
										rendered ? getPreviewDuration(rendered) : undefined,
									)
								}
							/>
						) : null}
					</Design.Stack>
				</View>
			</Design.Stack>
			{rendered?.form === 'list' && rendered.list.length ? (
				<Design.Button
					size="sm"
					variant="secondary"
					text={`View tracks · ${rendered.list.length}`}
					style={{ marginHorizontal: 6, marginBottom: 6 }}
					onPress={() => openAlbumTracksSheet(rendered)}
				/>
			) : null}
		</Design.Card>
	)
}
function getPreviewDuration(rendered: RenderSongInfo) {
	return rendered.form === 'single'
		? rendered.single.audio?.duration
		: rendered.list.find(entry => entry.audio?.previewUrl)?.audio?.duration
}
