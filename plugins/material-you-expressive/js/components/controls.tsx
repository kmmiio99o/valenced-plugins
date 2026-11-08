import { getAssetIdByName } from '@valenced/assets'
import { useEffect, useRef } from 'react'
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native'
import { Roles } from './colors'
import type { ViewProps } from 'react-native'

interface SwitchProps extends ViewProps {
	value: boolean
	onValueChange?(value: boolean): void
	disabled?: boolean
}

// not Animated.View: the plugin bundler rewrites `View` there too, since it's also imported
const AnimatedView = Animated.createAnimatedComponent(View)

const Track = { width: 52, height: 32, border: 2 }
// inside the border
const Thumb = { off: 16, on: 24 }

export function M3Switch({
	value,
	onValueChange,
	disabled,
	style,
	...rest
}: SwitchProps) {
	const progress = useRef(new Animated.Value(value ? 1 : 0)).current

	useEffect(() => {
		Animated.spring(progress, {
			toValue: value ? 1 : 0,
			useNativeDriver: true,
			speed: 18,
			bounciness: 7,
		}).start()
	}, [value, progress])

	const primary = Roles.primary()
	const onPrimary = Roles.onPrimary()
	const outline = Roles.outline()
	const surface = Roles.surfaceHighest()
	const innerWidth = Track.width - Track.border * 2

	const translateX = progress.interpolate({
		inputRange: [0, 1],
		outputRange: [0, innerWidth - Thumb.on - 4],
	})
	const scale = progress.interpolate({
		inputRange: [0, 1],
		outputRange: [Thumb.off / Thumb.on, 1],
	})
	return (
		<Pressable
			{...rest}
			accessibilityRole="switch"
			accessibilityState={{ checked: value, disabled }}
			disabled={disabled}
			hitSlop={8}
			onPress={() => onValueChange?.(!value)}
			style={[{ opacity: disabled ? 0.38 : 1 }, style]}
		>
			<AnimatedView
				style={[
					styles.track,
					{
						backgroundColor: value ? primary : surface,
						borderColor: value ? primary : outline,
					},
				]}
			>
				<AnimatedView
					style={[
						styles.thumb,
						{
							transform: [{ translateX }, { scale }],
							backgroundColor: value ? onPrimary : outline,
						},
					]}
				>
					<AnimatedView style={{ opacity: progress }}>
						<Image
							source={getAssetIdByName('CheckmarkSmallIcon')}
							style={[styles.check, { tintColor: primary }]}
						/>
					</AnimatedView>
				</AnimatedView>
			</AnimatedView>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	track: {
		width: Track.width,
		height: Track.height,
		borderRadius: Track.height / 2,
		borderWidth: Track.border,
	},
	thumb: {
		position: 'absolute',
		left: 2,
		top: 2,
		width: Thumb.on,
		height: Thumb.on,
		borderRadius: Thumb.on,
		alignItems: 'center',
		justifyContent: 'center',
	},
	check: { width: 16, height: 16 },
})
