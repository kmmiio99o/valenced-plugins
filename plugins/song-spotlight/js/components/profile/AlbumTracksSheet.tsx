import { ActionSheetActionCreators } from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import { BottomSheet as Gorhom } from '@valenced/externals/gorhom'
import { useEffect, useState } from 'react'
import { subscribeToAudio } from '../../modules/audio'
import SongTrackRow from './SongTrackRow'
import type { RenderSongInfo } from '@song-spotlight/api/handlers'

type RenderedList = Extract<RenderSongInfo, { form: 'list' }>

function AlbumTracksSheet({ rendered }: { rendered: RenderedList }) {
	const [activePreview, setActivePreview] = useState<string | null>(null)
	const { ActionSheet, BottomSheetTitleHeader } = Design
	const { BottomSheetScrollView } = Gorhom

	useEffect(() => subscribeToAudio(setActivePreview), [])

	return (
		<ActionSheet
			scrollable
			header={
				<BottomSheetTitleHeader
					title={rendered.label}
					subtitle={rendered.sublabel}
				/>
			}
		>
			<BottomSheetScrollView keyboardShouldPersistTaps="handled">
				<Design.TableRowGroup hasIcons>
					{rendered.list.map((entry, index) => (
						<SongTrackRow
							key={entry.link}
							entry={entry}
							index={index}
							activePreview={activePreview}
						/>
					))}
				</Design.TableRowGroup>
			</BottomSheetScrollView>
		</ActionSheet>
	)
}

export function openAlbumTracksSheet(rendered: RenderedList) {
	ActionSheetActionCreators.openLazy(
		Promise.resolve({
			default: () => <AlbumTracksSheet rendered={rendered} />,
		}),
		'song-spotlight-album-tracks',
		{},
		'stack',
	)
}
