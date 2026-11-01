export interface EmojiNode {
	id: string
	src: string
	alt: string
	animated?: boolean
}

export interface StickerNode {
	id: string
	name: string
	format_type: number
	tags?: string
}

export type ExpressionNode =
	| { kind: 'emoji'; emoji: EmojiNode }
	| { kind: 'sticker'; sticker: StickerNode }

export interface Guild {
	id: string
	name: string
	icon?: string | null
}

export const StickerFormat = {
	PNG: 1,
	APNG: 2,
	LOTTIE: 3,
	GIF: 4,
} as const
