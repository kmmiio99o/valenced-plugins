import { ReactNative } from '@valenced/react'
import type { ReactNode } from 'react'

interface Props {
	header: ReactNode
	onLayout(size: { width: number; height: number }): void
	backgroundColor: string
	borderColor: string
	left: number
	maxWidth: number
	radius: number
}

export default function ReactionBar({
	header,
	onLayout,
	backgroundColor,
	borderColor,
	left,
	maxWidth,
	radius,
}: Props) {
	const { View } = ReactNative

	return (
		<View
			onLayout={({ nativeEvent }) =>
				onLayout({
					width: nativeEvent.layout.width,
					height: nativeEvent.layout.height,
				})
			}
			style={{
				alignSelf: 'flex-start',
				backgroundColor,
				borderColor,
				borderRadius: radius,
				borderWidth: ReactNative.StyleSheet.hairlineWidth,
				marginLeft: left,
				maxWidth,
				overflow: 'hidden',
			}}
		>
			<View style={{ alignItems: 'center', flexDirection: 'row' }}>
				{header}
			</View>
		</View>
	)
}
