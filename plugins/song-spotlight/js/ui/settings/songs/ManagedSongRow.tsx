import TableRowAssetIcon from '@valenced/components/TableRowAssetIcon'
import { Design } from '@valenced/discord/design'
import { useEffect, useState } from 'react'
import { Image, Linking } from 'react-native'
import { renderSong, songId } from '../../../modules/api'
import { reportPluginError } from '../../../modules/runtime'
import { showMessage } from '../../../modules/toasts'
import type { RenderSongInfo } from '@song-spotlight/api/handlers'
import type { Song } from '../../../types'

export default function ManagedSongRow({
	song,
	disabled,
	canMoveUp,
	canMoveDown,
	onMoveUp,
	onMoveDown,
	onRemove,
}: {
	song: Song
	disabled: boolean
	canMoveUp: boolean
	canMoveDown: boolean
	onMoveUp(): void
	onMoveDown(): void
	onRemove(): void
}) {
	const [rendered, setRendered] = useState<RenderSongInfo | null>()

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

	return (
		<Design.Card variant="secondary" border="none" style={{ padding: 12 }}>
			<Design.Stack spacing={12}>
				<Design.Stack direction="horizontal" spacing={12} align="center">
					{rendered?.thumbnailUrl ? (
						<Image
							source={{ uri: rendered.thumbnailUrl }}
							style={{ width: 48, height: 48, borderRadius: 8 }}
						/>
					) : (
						<TableRowAssetIcon name="MusicIcon" />
					)}
					<Design.Stack spacing={2} style={{ flex: 1 }}>
						<Design.Text variant="text-md/semibold" lineClamp={1}>
							{rendered?.label ?? `${song.service} · ${song.type}`}
						</Design.Text>
						<Design.Text
							variant="text-sm/medium"
							color="text-muted"
							lineClamp={1}
						>
							{rendered?.sublabel ?? song.id}
						</Design.Text>
					</Design.Stack>
				</Design.Stack>
				<Design.Stack direction="horizontal" spacing={8}>
					<Design.Button
						size="sm"
						variant="secondary"
						text="Up"
						style={{ flex: 1 }}
						accessibilityLabel="Move song up"
						disabled={disabled || !canMoveUp}
						onPress={onMoveUp}
					/>
					<Design.Button
						size="sm"
						variant="secondary"
						text="Down"
						style={{ flex: 1 }}
						accessibilityLabel="Move song down"
						disabled={disabled || !canMoveDown}
						onPress={onMoveDown}
					/>
					<Design.Button
						size="sm"
						variant="destructive"
						text="Remove"
						style={{ flex: 1 }}
						disabled={disabled}
						onPress={onRemove}
					/>
				</Design.Stack>
				{rendered?.link ? (
					<Design.Button
						size="sm"
						variant="tertiary"
						text="Open song"
						disabled={disabled}
						onPress={() =>
							void Linking.openURL(rendered.link).catch(error =>
								showMessage(
									error,
									'SONG_SPOTLIGHT_SETTINGS_LINK_ERROR',
									'critical',
								),
							)
						}
					/>
				) : null}
			</Design.Stack>
		</Design.Card>
	)
}
