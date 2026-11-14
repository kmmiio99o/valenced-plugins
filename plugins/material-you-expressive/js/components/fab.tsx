import {
	cloneElement,
	isValidElement,
	useEffect,
	useRef,
	useState,
} from 'react'
import {
	Animated,
	Easing,
	Image,
	Pressable,
	StyleSheet,
	Text,
	View,
} from 'react-native'
import { Roles } from './colors'
import type { ReactElement } from 'react'
import type { ImageSourcePropType } from 'react-native'

interface FabProps {
	icon: ImageSourcePropType | ReactElement<Record<string, any>>
	onPress?(): void
	onPressDisabled?(): void
	disabled?: boolean
	positionBottom?: number
	positionRight?: number
	accessibilityLabel?: string
	accessibilityHint?: string
}

const Size = 56
const Margin = 16
const AnimatedView = Animated.createAnimatedComponent(View)

/** M3 FabMenu mapped to Discord's existing single FAB action. */
export function M3Fab({
	icon,
	onPress,
	onPressDisabled,
	disabled,
	positionBottom,
	positionRight,
	accessibilityLabel,
	accessibilityHint,
}: FabProps) {
	const [expanded, setExpanded] = useState(false)
	const progress = useRef(new Animated.Value(0)).current
	const isDisabled = disabled === true && onPressDisabled == null
	const onPrimary = Roles.onPrimary()
	const onSurfaceVariant = Roles.onSurfaceVariant()
	const itemColor = Roles.secondaryContainer()
	const idleColor = Roles.primary()
	const expandedColor = itemColor
	const triggerColor = progress.interpolate({
		inputRange: [0, 1],
		outputRange: [idleColor, expandedColor],
	})
	const triggerShape = progress.interpolate({
		inputRange: [0, 1],
		outputRange: [16, Size / 2],
	})
	const actionIconOpacity = progress.interpolate({
		inputRange: [0, 0.65, 1],
		outputRange: [1, 0, 0],
	})
	const closeIconOpacity = progress.interpolate({
		inputRange: [0, 0.35, 1],
		outputRange: [0, 0, 1],
	})
	const itemTranslateY = progress.interpolate({
		inputRange: [0, 1],
		outputRange: [12, 0],
	})

	useEffect(() => {
		const animation = Animated.timing(progress, {
			toValue: expanded ? 1 : 0,
			duration: 250,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: false,
		})
		animation.start()
		return () => animation.stop()
	}, [expanded, progress])

	function renderActionIcon(color: string) {
		return isValidElement(icon) ? (
			cloneElement(icon, { color })
		) : (
			<Image source={icon} style={[styles.icon, { tintColor: color }]} />
		)
	}

	function activateAction() {
		if (disabled) onPressDisabled?.()
		else onPress?.()
		setExpanded(false)
	}

	return (
		<View
			pointerEvents="box-none"
			style={[
				styles.container,
				{
					bottom: positionBottom ?? Margin,
					right: positionRight ?? Margin,
				},
			]}
		>
			<AnimatedView
				accessibilityRole="menu"
				pointerEvents={expanded ? 'auto' : 'none'}
				accessibilityElementsHidden={!expanded}
				importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
				style={[
					styles.itemWrap,
					{
						opacity: progress,
						transform: [{ translateY: itemTranslateY }],
					},
				]}
			>
				<Pressable
					accessibilityRole="menuitem"
					accessibilityLabel={accessibilityLabel}
					accessibilityHint={accessibilityHint}
					accessibilityState={{ disabled: isDisabled }}
					disabled={isDisabled}
					onPress={activateAction}
					style={[
						styles.item,
						{
							backgroundColor: itemColor,
							opacity: isDisabled ? 0.38 : 1,
						},
					]}
				>
					{renderActionIcon(onSurfaceVariant)}
					<Text style={[styles.label, { color: onSurfaceVariant }]}>
						{accessibilityLabel}
					</Text>
				</Pressable>
			</AnimatedView>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={accessibilityLabel}
				accessibilityState={{ expanded }}
				onPress={() => setExpanded(value => !value)}
				style={({ pressed }) => [
					styles.trigger,
					{
						transform: [{ scale: pressed ? 0.94 : 1 }],
					},
				]}
			>
				<AnimatedView
					pointerEvents="none"
					style={[
						styles.triggerSurface,
						{
							backgroundColor: triggerColor,
							borderRadius: triggerShape,
						},
					]}
				/>
				<AnimatedView
					style={[styles.triggerIcon, { opacity: actionIconOpacity }]}
				>
					{renderActionIcon(expanded ? onSurfaceVariant : onPrimary)}
				</AnimatedView>
				<AnimatedView style={[styles.closeIcon, { opacity: closeIconOpacity }]}>
					<View
						style={[
							styles.closeLine,
							styles.closeLineFirst,
							{ backgroundColor: onSurfaceVariant },
						]}
					/>
					<View
						style={[
							styles.closeLine,
							styles.closeLineSecond,
							{ backgroundColor: onSurfaceVariant },
						]}
					/>
				</AnimatedView>
			</Pressable>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		width: 240,
		height: Size * 2 + 16,
		overflow: 'visible',
	},
	itemWrap: {
		position: 'absolute',
		right: 0,
		bottom: Size + 8,
	},
	item: {
		minHeight: Size,
		borderRadius: Size / 2,
		paddingHorizontal: 24,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		elevation: 6,
	},
	label: {
		flexShrink: 1,
		fontSize: 14,
	},
	trigger: {
		position: 'absolute',
		right: 0,
		bottom: 0,
		width: Size,
		height: Size,
		alignItems: 'center',
		justifyContent: 'center',
	},
	triggerSurface: {
		position: 'absolute',
		width: Size,
		height: Size,
		elevation: 6,
	},
	triggerIcon: {
		position: 'absolute',
		alignItems: 'center',
		justifyContent: 'center',
	},
	closeIcon: {
		position: 'absolute',
		width: 20,
		height: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	closeLine: {
		position: 'absolute',
		width: 18,
		height: 2,
		borderRadius: 1,
	},
	closeLineFirst: { transform: [{ rotate: '45deg' }] },
	closeLineSecond: { transform: [{ rotate: '-45deg' }] },
	icon: { width: 24, height: 24 },
})
