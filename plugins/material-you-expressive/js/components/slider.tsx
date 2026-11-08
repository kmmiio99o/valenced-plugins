import { Design } from '@valenced/discord/design'
import { StyleSheet, View } from 'react-native'
import { Roles } from './colors'
import { SliderMetrics, SliderStyles } from './sliderStyles'
import { useSlider } from './useSlider'
import type { SliderProps } from './useSlider'

export function M3Slider(props: SliderProps) {
	const { startIcon, endIcon, disabled } = props
	const {
		current,
		dragging,
		maximumValue,
		minimumValue,
		nudge,
		onLayout,
		panHandlers,
		width,
		x,
	} = useSlider(props)
	const primary = Roles.primary()
	const active = props.minimumTrackTintColor ?? primary
	const inactive = props.maximumTrackTintColor ?? Roles.secondaryContainer()
	const thumb =
		props.thumbTintColor && props.thumbTintColor !== 'transparent'
			? props.thumbTintColor
			: props.minimumTrackTintColor &&
					props.minimumTrackTintColor !== 'transparent'
				? props.minimumTrackTintColor
				: primary
	const label =
		props.formatValue?.(current) ?? Number(current.toFixed(2)).toString()
	const labelWidth = Math.max(
		SliderMetrics.valueIndicator.width,
		label.length * 9 + 16,
	)
	const labelLeft = Math.min(
		Math.max(x - labelWidth / 2, 0),
		Math.max(width - labelWidth, 0),
	)

	return (
		<View style={[SliderStyles.row, props.style]}>
			{startIcon}
			<View
				accessible
				accessibilityRole="adjustable"
				accessibilityLabel={props.accessibilityLabel}
				accessibilityHint={props.accessibilityHint}
				accessibilityState={{ disabled }}
				testID={props.testID}
				accessibilityValue={{
					min: minimumValue,
					max: maximumValue,
					now: current,
				}}
				accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
				onAccessibilityAction={event =>
					nudge(event.nativeEvent.actionName === 'increment' ? 1 : -1)
				}
				hitSlop={{ top: 8, bottom: 8 }}
				onLayout={onLayout}
				style={[SliderStyles.container, { opacity: disabled ? 0.38 : 1 }]}
				{...panHandlers}
			>
				{width > 0 ? (
					<View pointerEvents="none" style={StyleSheet.absoluteFill}>
						<View
							style={[
								SliderStyles.track,
								SliderStyles.active,
								{
									width: Math.max(x - SliderMetrics.gap, 0),
									backgroundColor: active,
								},
							]}
						/>
						<View
							style={[
								SliderStyles.track,
								SliderStyles.inactive,
								{
									left: Math.min(x + SliderMetrics.gap, width),
									backgroundColor: inactive,
								},
							]}
						/>
						<View style={[SliderStyles.stop, { backgroundColor: inactive }]} />
						<View
							style={[
								SliderStyles.handle,
								{
									left: x - SliderMetrics.handle.width / 2,
									backgroundColor: thumb,
								},
							]}
						/>
						{dragging ? (
							<View
								pointerEvents="none"
								style={[
									SliderStyles.valueIndicator,
									{
										left: labelLeft,
										width: labelWidth,
										top:
											(SliderMetrics.handle.height - SliderMetrics.track) / 2 -
											SliderMetrics.valueIndicator.bottomSpace -
											SliderMetrics.valueIndicator.height,
										backgroundColor: Roles.surfaceHighest(),
									},
								]}
							>
								<Design.Text variant="text-sm/medium" numberOfLines={1}>
									{label}
								</Design.Text>
							</View>
						) : null}
					</View>
				) : null}
			</View>
			{endIcon}
		</View>
	)
}
