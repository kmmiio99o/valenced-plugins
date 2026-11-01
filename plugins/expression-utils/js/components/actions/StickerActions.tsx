import { Design } from '@valenced/discord/design'
import { modules } from '../../common'
import { StickerFormat } from '../../types'
import { copyStickerAsImage, downloadSticker } from '../../utils/imageActions'
import { showToast } from '../../utils/toasts'
import { openExpressionStealer } from '../ExpressionStealerActionSheet'
import ImageClipboardButton from './ImageClipboardButton'
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
				<>
					<Button
						text="Clone"
						onPress={() => openExpressionStealer({ kind: 'sticker', sticker })}
					/>
					<Button
						text="Download as image"
						onPress={() => void downloadSticker(sticker)}
					/>
					<ImageClipboardButton
						onPress={() => void copyStickerAsImage(sticker)}
					/>
				</>
			)}
		</Stack>
	)
}
