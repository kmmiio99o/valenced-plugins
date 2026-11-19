import { ActionSheetActionCreators } from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import { Clipboard } from '@valenced/externals/react-native-clipboard'
import { Platform } from 'react-native'
import { modules } from '../../common'
import { StickerFormat } from '../../types'
import { copyStickerAsImage, downloadSticker } from '../../utils/imageActions'
import { showToast } from '../../utils/toasts'
import { openExpressionStealer } from '../ExpressionStealerActionSheet'
import type { StickerNode } from '../../types'

function useFavoriteSticker(stickerId: string) {
	return (
		modules.favoriteStickerHooks?.useFavoriteStickerIds?.() ?? []
	).includes(stickerId)
}

export default function StickerActions({ sticker }: { sticker: StickerNode }) {
	const { Button, Stack } = Design
	const isFavorite = useFavoriteSticker(sticker.id)
	const { stickerActions } = modules
	const imageSticker = [
		StickerFormat.PNG,
		StickerFormat.APNG,
		StickerFormat.GIF,
	].includes(sticker.format_type as 1 | 2 | 4)

	return (
		<Stack spacing={8} style={{ marginTop: 16 }}>
			<Button
				text={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
				variant={isFavorite ? 'destructive' : undefined}
				onPress={() => {
					if (!stickerActions) {
						showToast(
							'EXPRESSION_UTILS_FAVORITE',
							'Sticker favorites are unavailable.',
							'critical',
						)
						return
					}
					if (isFavorite) {
						stickerActions.unfavoriteSticker(sticker.id)
						showToast('EXPRESSION_UTILS_FAVORITE', 'Removed from favorites')
					} else {
						stickerActions.favoriteSticker(sticker.id)
						showToast(
							'EXPRESSION_UTILS_FAVORITE',
							'Added to favorites',
							'success',
						)
					}
				}}
			/>
			{imageSticker && (
				<Button
					text="Clone"
					onPress={() => openExpressionStealer({ kind: 'sticker', sticker })}
				/>
			)}
			<Button
				text="Copy URL"
				onPress={() => {
					const url = modules.stickerUtils?.getStickerAssetUrl(sticker)
					if (!url) {
						showToast(
							'EXPRESSION_UTILS_COPY_URL',
							'Sticker URL is unavailable.',
							'critical',
						)
						return
					}
					Clipboard.setString(url)
					showToast('EXPRESSION_UTILS_COPY_URL', 'URL copied.')
				}}
			/>
			{imageSticker && (
				<>
					<Button
						text="Download as image"
						onPress={() => {
							// Dismiss the sheet so it doesn't cover the share sheet.
							if (Platform.OS === 'ios') ActionSheetActionCreators.hideActionSheet()
							void downloadSticker(sticker)
						}}
					/>
					<Button
						text="Copy as image"
						onPress={() => void copyStickerAsImage(sticker)}
					/>
				</>
			)}
		</Stack>
	)
}
