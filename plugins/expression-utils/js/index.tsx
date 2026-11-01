import { findExpressionModules, modules } from './common'
import { installEmojiSheetPatch } from './patches/emoji'
import { installReactionPatch } from './patches/reactions'
import { installStickerPatches } from './patches/stickers'
import { findEmojiUploadModules } from './utils/discordEmojiUpload'
import { findEmojiActionSheet } from './utils/openEmojiActionSheet'

export default plugin({
	start({ cleanup, plugin }) {
		cleanup(
			() => {
				modules.stickerActions = undefined
				modules.stickerCreationActions = undefined
				modules.stickerUtils = undefined
				modules.favoriteStickerHooks = undefined
				modules.emojiSlotUtils = undefined
				modules.stickerStore = undefined
				modules.stickerDetailSheet = undefined
			},
			...findExpressionModules(),
			...findEmojiUploadModules(),
			findEmojiActionSheet(),
		)

		const reportError = (error: unknown) => plugin.reportError(error)
		installEmojiSheetPatch(cleanup, reportError)
		installStickerPatches(cleanup, reportError)
		installReactionPatch(cleanup, reportError)
	},
})
