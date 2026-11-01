import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import type { Guild, StickerNode } from './types'

interface StickerActions {
	favoriteSticker(id: string): void
	unfavoriteSticker(id: string): void
}

interface StickerCreationActions {
	createGuildSticker(options: {
		guildId: string
		name: string
		tags: string
		description: string
		uri: string
		mimeType: string
		platform: 'mobile'
		originalMd5: null
	}): Promise<unknown>
}

interface StickerUtils {
	getStickerAssetUrl(sticker: { id: string; format_type: number }): string
}

interface FavoriteStickerHooks {
	useFavoriteStickerIds(): string[]
	useFavoriteStickers(): string[]
}

interface EmojiSlotUtils {
	getMaxEmojiSlots(guild: Guild): number
	getTotalStickerCountForTier(guild: Guild): number
}

interface StickerDetailSheet {
	showStickerDetailActionSheet(options: {
		renderableSticker: unknown
		channel: unknown
	}): void
	hideStickerDetailActionSheet(): void
}

export const modules: {
	stickerActions?: StickerActions
	stickerCreationActions?: StickerCreationActions
	stickerUtils?: StickerUtils
	favoriteStickerHooks?: FavoriteStickerHooks
	emojiSlotUtils?: EmojiSlotUtils
	stickerStore?: {
		getStickerById(id: string): Partial<StickerNode> | undefined
	}
	stickerDetailSheet?: StickerDetailSheet
} = {}

export function findExpressionModules() {
	return [
		getModules(
			withProps<StickerActions>('favoriteSticker', 'unfavoriteSticker'),
			value => {
				modules.stickerActions = value
			},
		),
		getModules(
			withProps<StickerCreationActions>('createGuildSticker'),
			value => {
				modules.stickerCreationActions = value
			},
		),
		getModules(withProps<StickerUtils>('getStickerAssetUrl'), value => {
			modules.stickerUtils = value
		}),
		getModules(
			withProps<FavoriteStickerHooks>(
				'useFavoriteStickerIds',
				'useFavoriteStickers',
			),
			value => {
				modules.favoriteStickerHooks = value
			},
		),
		getModules(
			withProps<EmojiSlotUtils>(
				'getMaxEmojiSlots',
				'getTotalStickerCountForTier',
			),
			value => {
				modules.emojiSlotUtils = value
			},
		),
		getModules(
			withProps<{ getStickerById(id: string): Partial<StickerNode> }>(
				'getStickerById',
			),
			value => {
				modules.stickerStore = value
			},
		),
		getModules(
			withProps<StickerDetailSheet>(
				'showStickerDetailActionSheet',
				'hideStickerDetailActionSheet',
			),
			value => {
				modules.stickerDetailSheet = value
			},
		),
	]
}
