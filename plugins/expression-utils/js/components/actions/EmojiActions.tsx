import { Design } from '@valenced/discord/design'
import { Clipboard } from '@valenced/externals/react-native-clipboard'
import { copyAsImage, downloadEmoji } from '../../utils/imageActions'
import { showToast } from '../../utils/toasts'
import { openExpressionStealer } from '../ExpressionStealerActionSheet'
import ImageClipboardButton from './ImageClipboardButton'
import type { EmojiNode } from '../../types'

export default function EmojiActions({ emoji }: { emoji: EmojiNode }) {
	const { Button, Stack } = Design
	const animated = emoji.animated || emoji.src.includes('.gif')

	return (
		<Stack spacing={8} style={{ marginTop: 16 }}>
			<Button
				text="Clone"
				onPress={() => openExpressionStealer({ kind: 'emoji', emoji })}
			/>
			<Button
				text="Copy markdown"
				onPress={() => {
					Clipboard.setString(
						`<${animated ? 'a' : ''}:${emoji.alt}:${emoji.id}>`,
					)
					showToast('EXPRESSION_UTILS_COPY_MARKDOWN', 'Emoji markdown copied.')
				}}
			/>
			<Button
				text="Copy URL"
				onPress={() => {
					Clipboard.setString(emoji.src)
					showToast('EXPRESSION_UTILS_COPY_URL', 'URL copied.')
				}}
			/>
			<Button
				text="Download as image"
				onPress={() => void downloadEmoji(emoji)}
			/>
			<ImageClipboardButton
				onPress={() =>
					void copyAsImage(
						emoji.src,
						`emoji-${emoji.id}.${animated ? 'gif' : 'png'}`,
					)
				}
			/>
		</Stack>
	)
}
