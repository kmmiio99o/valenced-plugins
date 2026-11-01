import { Design } from '@valenced/discord/design'
import { useEffect, useState } from 'react'
import { supportsImageClipboard } from '../../utils/native'
import { showToast } from '../../utils/toasts'

export default function ImageClipboardButton({
	onPress,
}: {
	onPress: () => void
}) {
	const [supported, setSupported] = useState(false)

	useEffect(() => {
		let mounted = true
		supportsImageClipboard().then(
			value => {
				if (mounted) setSupported(value)
			},
			error => {
				if (mounted) {
					showToast(
						'EXPRESSION_UTILS_CLIPBOARD',
						`Could not check keyboard image support: ${String(error)}`,
						'critical',
					)
				}
			},
		)
		return () => {
			mounted = false
		}
	}, [])

	return supported ? (
		<Design.Button text="Copy as image" onPress={onPress} />
	) : null
}
