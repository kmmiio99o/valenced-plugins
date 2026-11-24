import { ActionSheetActionCreators } from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import { Stores } from '@valenced/discord/flux'
import { getModuleWithImportedPath } from '@valenced/discord/utils/modules/finders'
import { BottomSheet as Gorhom } from '@valenced/externals/gorhom'
import { useEffect, useState } from 'react'
import { Image, View } from 'react-native'
import {
	emojiSrc,
	openEmojiActionSheet,
	openUnicodeEmojiActionSheet,
} from '../utils/openEmojiActionSheet'
import ExpressionActions from './ExpressionActions'
import type { EmojiNode } from '../types'

export interface TypingIndicatorEmoji {
	id?: string | null
	name?: string
	animated?: boolean
}

type ReportError = (error: unknown) => void

interface EmojiStore {
	getCustomEmojiById(
		id: string,
	): { name?: string; animated?: boolean } | undefined
}

interface EmojiSourceData {
	guild?: { emojis?: TypingIndicatorEmoji[] }
	pack?: { previewEmojis?: TypingIndicatorEmoji[] }
}

interface EmojiSourceModule {
	getEmojiSourceData(id: string): Promise<EmojiSourceData | null>
}

interface UnicodeEmojisModule {
	default: {
		convertSurrogateToName(surrogate: string, includeColons: false): string
	}
}

let UnicodeEmojis: UnicodeEmojisModule['default'] | undefined

function resolveEmoji(emoji: TypingIndicatorEmoji) {
	if (!emoji.id || emoji.name) return emoji
	const stored = (
		Stores.EmojiStore as unknown as EmojiStore | undefined
	)?.getCustomEmojiById(emoji.id)
	return {
		...emoji,
		name: stored?.name,
		animated: emoji.animated ?? stored?.animated,
	}
}

function findSourceEmoji(source: EmojiSourceData | null, id: string) {
	return [...(source?.guild?.emojis ?? []), ...(source?.pack?.previewEmojis ?? [])].find(
		emoji => emoji.id === id,
	)
}

function useResolvedEmojis(emojis: TypingIndicatorEmoji[]) {
	const [resolved, setResolved] = useState(() => emojis.map(resolveEmoji))

	useEffect(() => {
		let active = true
		const initial = emojis.map(resolveEmoji)
		setResolved(initial)
		const missing = initial.filter(emoji => emoji.id && !emoji.name)
		if (missing.length === 0) return

		const cancel = getModuleWithImportedPath<EmojiSourceModule>(
			'modules/emojis/records/ExpressionSourceRecord.tsx',
			module => {
				void Promise.all(
					initial.map(async emoji => {
						if (!emoji.id || emoji.name) return emoji
						try {
							const source = await module.getEmojiSourceData(emoji.id)
							const metadata = findSourceEmoji(source, emoji.id)
							return metadata ? { ...emoji, ...metadata } : emoji
						} catch {
							return emoji
						}
					}),
				).then(next => {
					if (active) setResolved(next)
				})
			},
		)

		return () => {
			active = false
			cancel()
		}
	}, [emojis])

	return resolved
}

function customEmojiName(emoji: TypingIndicatorEmoji) {
	return emoji.name?.trim() || undefined
}

function unicodeEmojiName(emoji: TypingIndicatorEmoji) {
	if (emoji.id || !emoji.name) return
	return UnicodeEmojis?.convertSurrogateToName(emoji.name, false) || undefined
}

function EmojiActionsSheet({ emoji }: { emoji: EmojiNode }) {
	const { ActionSheet, BottomSheetTitleHeader, Text } = Design
	const { BottomSheetScrollView } = Gorhom

	return (
		<ActionSheet
			scrollable
			header={<BottomSheetTitleHeader title={`:${emoji.alt}:`} />}
		>
			<BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 16 }}>
				<View style={{ alignItems: 'center', gap: 8, paddingVertical: 16 }}>
					<Image
						source={{ uri: emoji.src }}
						style={{ width: 96, height: 96 }}
					/>
					<Text variant="text-md/bold">:{emoji.alt}:</Text>
				</View>
				<ExpressionActions node={{ kind: 'emoji', emoji }} />
			</BottomSheetScrollView>
		</ActionSheet>
	)
}

function openEmojiActions(
	emoji: TypingIndicatorEmoji,
	reportError: ReportError,
) {
	const { id, animated } = emoji
	if (!id) return
	const name = customEmojiName(emoji)
	if (name && openEmojiActionSheet({ id, name, animated })) return

	if (name) reportError('MessageEmojiActionSheet not found; using local actions.')
	ActionSheetActionCreators.openLazy(
		Promise.resolve({
			default: () => (
				<EmojiActionsSheet
					emoji={{
						id,
						src: emojiSrc(id, animated),
						alt: name ?? id,
						animated,
					}}
				/>
			),
		}),
		'expression-utils-typing-emoji-actions',
		{},
		'stack',
	)
}

function openUnicodeEmojiActions(emoji: TypingIndicatorEmoji) {
	if (!emoji.name) return
	const name = unicodeEmojiName(emoji)
	if (name) openUnicodeEmojiActionSheet(emoji.name, name)
}

function EmojiPreview({ emoji }: { emoji: TypingIndicatorEmoji }) {
	if (emoji.id) {
		return (
			<Image
				source={{ uri: emojiSrc(emoji.id, emoji.animated, 64) }}
				style={{ width: 24, height: 24 }}
			/>
		)
	}
	return (
		<Design.Text style={{ width: 24, fontSize: 22, lineHeight: 24 }}>
			{emoji.name}
		</Design.Text>
	)
}

function TypingIndicatorEmojis({
	emojis,
	reportError,
}: {
	emojis: TypingIndicatorEmoji[]
	reportError: ReportError
}) {
	const { ActionSheet, ActionSheetRow, BottomSheetTitleHeader } = Design
	const resolvedEmojis = useResolvedEmojis(emojis)
	const [, setUnicodeReady] = useState(Boolean(UnicodeEmojis))

	useEffect(
		() =>
			getModuleWithImportedPath<UnicodeEmojisModule>(
				'modules/emojis/UnicodeEmojis.tsx',
				module => {
					UnicodeEmojis = module.default
					setUnicodeReady(true)
				},
			),
		[],
	)

	return (
		<ActionSheet header={<BottomSheetTitleHeader title="Typing emoji" />}>
			<ActionSheetRow.Group>
				{resolvedEmojis.map((emoji, index) => {
					const name = customEmojiName(emoji) ?? unicodeEmojiName(emoji)
					return (
						<ActionSheetRow
							key={emoji.id ?? emoji.name ?? index}
							label={name ? `:${name}:` : `Emoji ${emoji.id ?? index + 1}`}
							icon={<EmojiPreview emoji={emoji} />}
							disabled={!emoji.id && !name}
							onPress={() =>
								emoji.id
									? openEmojiActions(emoji, reportError)
									: openUnicodeEmojiActions(emoji)
							}
						/>
					)
				})}
			</ActionSheetRow.Group>
		</ActionSheet>
	)
}

export function openTypingIndicatorEmojis(
	emojis: TypingIndicatorEmoji[],
	reportError: ReportError,
) {
	ActionSheetActionCreators.openLazy(
		Promise.resolve({
			default: () => (
				<TypingIndicatorEmojis emojis={emojis} reportError={reportError} />
			),
		}),
		'expression-utils-typing-emojis',
		{},
		'stack',
	)
}
