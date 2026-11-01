import { getAssetIdByName } from '@valenced/assets'
import { Design } from '@valenced/discord/design'
import { Image } from 'react-native'
import { playPreview, stopPreview } from '../../modules/audio'
import { showMessage } from '../../modules/toasts'
import type { RenderInfoEntryBased } from '@song-spotlight/api/handlers'

const pauseIcon = getAssetIdByName('PauseIcon')!

export default function SongTrackRow({
	entry,
	index,
	activePreview,
}: {
	entry: RenderInfoEntryBased
	index: number
	activePreview: string | null
}) {
	const preview = entry.audio?.previewUrl
	const playing = Boolean(preview && activePreview === preview)

	return (
		<Design.TableRow
			label={entry.label}
			subLabel={entry.sublabel}
			icon={
				playing ? (
					<Image source={pauseIcon} style={{ width: 18, height: 18 }} />
				) : (
					<Design.Text
						variant="text-sm/medium"
						color="text-muted"
						style={{ width: 18, textAlign: 'center' }}
					>
						{index + 1}
					</Design.Text>
				)
			}
			disabled={!preview}
			onPress={() => {
				if (!preview) return
				if (playing) stopPreview()
				else {
					void playPreview(preview, entry.audio?.duration).catch(error =>
						showMessage(error, 'SONG_SPOTLIGHT_TRACK_AUDIO_ERROR', 'critical'),
					)
				}
			}}
			subLabelLineClamp={1}
			labelLineClamp={1}
		/>
	)
}
