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
	const handleWidth = dragging
		? 3
		: SliderMetrics.handle.width

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
									left: x - handleWidth / 2,
									width: handleWidth,
									borderRadius: handleWidth / 2,
									backgroundColor: thumb,
								},
							]}
						/>
					</View>
				) : null}
			</View>
			{endIcon}
		</View>
	)
}
