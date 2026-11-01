import EmojiActions from './actions/EmojiActions'
import StickerActions from './actions/StickerActions'
import type { ExpressionNode } from '../types'

export default function ExpressionActions({ node }: { node: ExpressionNode }) {
	return node.kind === 'emoji' ? (
		<EmojiActions emoji={node.emoji} />
	) : (
		<StickerActions sticker={node.sticker} />
	)
}
