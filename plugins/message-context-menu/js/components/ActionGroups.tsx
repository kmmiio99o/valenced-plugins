import { BottomSheet as Gorhom } from '@valenced/externals/gorhom'
import { React } from '@valenced/react'
import type { ReactNode } from 'react'

interface Props {
	children: ReactNode
	maxHeight: number
	maxWidth: number
	onContentSizeChange(width: number, height: number): void
}

export default function ActionGroups({
	children,
	maxHeight,
	maxWidth,
	onContentSizeChange,
}: Props) {
	const { BottomSheetScrollView } = Gorhom
	const [contentHeight, setContentHeight] = React.useState<number>()
	const height =
		contentHeight == null ? maxHeight : Math.min(contentHeight, maxHeight)

	return (
		<BottomSheetScrollView
			bounces={false}
			keyboardShouldPersistTaps="always"
			onContentSizeChange={(measuredWidth: number, measuredHeight: number) => {
				console.log('[MessageContextMenu]', 'action content size', {
					measuredWidth,
					measuredHeight,
					maxHeight,
					maxWidth,
				})
				setContentHeight(measuredHeight)
				onContentSizeChange(measuredWidth, measuredHeight)
			}}
			onLayout={({
				nativeEvent,
			}: {
				nativeEvent: { layout: { height: number; width: number } }
			}) => {
				console.log('[MessageContextMenu]', 'action viewport size', {
					height: nativeEvent.layout.height,
					width: nativeEvent.layout.width,
					maxHeight,
				})
			}}
			showsVerticalScrollIndicator={false}
			style={{ height, maxHeight, maxWidth, width: '100%' }}
		>
			{children}
		</BottomSheetScrollView>
	)
}
