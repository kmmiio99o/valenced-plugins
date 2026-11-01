import type { EmojiNode, StickerNode } from '../../types'

export type CloneableExpression =
	| { kind: 'emoji'; emoji: EmojiNode }
	| { kind: 'sticker'; sticker: StickerNode }

export function expressionName(expression: CloneableExpression) {
	return expression.kind === 'emoji'
		? expression.emoji.alt
		: expression.sticker.name
}
