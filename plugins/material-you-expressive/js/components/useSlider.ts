import { useEffect, useMemo, useRef, useState } from 'react'
import { PanResponder } from 'react-native'
import type { ReactNode } from 'react'
import type { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native'

export interface SliderProps {
	value?: number
	defaultValue?: number
	minValue?: number
	maxValue?: number
	minimumValue?: number
	maximumValue?: number
	step?: number
	onValueChange?(value: number): void
	onChange?(value: number): void
	onSlidingStart?(): void
	onSlidingComplete?(value: number): void
	onChangeEnd?(value: number): void
	startIcon?: ReactNode
	endIcon?: ReactNode
	formatValue?(value: number): string
	disabled?: boolean
	inverted?: boolean
	accessibilityLabel?: string
	accessibilityHint?: string
	testID?: string
	minimumTrackTintColor?: string
	maximumTrackTintColor?: string
	thumbTintColor?: string
	style?: StyleProp<ViewStyle>
}

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max)

export function useSlider(props: SliderProps) {
	const minimumValue = props.minValue ?? props.minimumValue ?? 0
	const maximumValue =
		props.maxValue ??
		props.maximumValue ??
		(props.minValue === undefined ? 1 : 100)
	const value = props.value ?? props.defaultValue ?? minimumValue
	const step = props.step ?? 0
	const [width, setWidth] = useState(0)
	const [current, setCurrent] = useState(value)
	const [isDragging, setIsDragging] = useState(false)
	const latest = useRef({ props, width, current })
	latest.current = { props, width, current }
	const dragging = useRef(false)
	const startX = useRef(0)

	useEffect(() => {
		if (!dragging.current) setCurrent(value)
	}, [value])

	const responder = useMemo(() => {
		const update = (x: number) => {
			const { props, width } = latest.current
			const min = props.minValue ?? props.minimumValue ?? 0
			const max =
				props.maxValue ??
				props.maximumValue ??
				(props.minValue === undefined ? 1 : 100)
			const step = props.step ?? 0
			let progress = clamp(x / (width || 1), 0, 1)
			if (props.inverted) progress = 1 - progress
			let next = min + progress * (max - min)
			if (step > 0) next = Math.round((next - min) / step) * step + min
			next = clamp(next, min, max)
			if (next === latest.current.current) return
			latest.current.current = next
			setCurrent(next)
			latest.current.props.onValueChange?.(next)
			latest.current.props.onChange?.(next)
		}

		return PanResponder.create({
			onStartShouldSetPanResponder: () => !latest.current.props.disabled,
			onMoveShouldSetPanResponder: () => !latest.current.props.disabled,
			onPanResponderTerminationRequest: () => false,
			onPanResponderGrant: event => {
				dragging.current = true
				setIsDragging(true)
				startX.current = event.nativeEvent.locationX
				latest.current.props.onSlidingStart?.()
				update(startX.current)
			},
			onPanResponderMove: (_, gesture) => update(startX.current + gesture.dx),
			onPanResponderRelease: () => {
				dragging.current = false
				setIsDragging(false)
				latest.current.props.onSlidingComplete?.(latest.current.current)
				latest.current.props.onChangeEnd?.(latest.current.current)
			},
			onPanResponderTerminate: () => {
				dragging.current = false
				setIsDragging(false)
			},
		})
	}, [])

	const range = maximumValue - minimumValue || 1
	const progress = clamp((current - minimumValue) / range, 0, 1)
	const x = (props.inverted ? 1 - progress : progress) * width
	const nudge = (by: number) => {
		if (props.disabled) return
		const next = clamp(
			current + by * (step || range / 100),
			minimumValue,
			maximumValue,
		)
		latest.current.current = next
		setCurrent(next)
		props.onValueChange?.(next)
		props.onChange?.(next)
		props.onSlidingComplete?.(next)
		props.onChangeEnd?.(next)
	}

	return {
		current,
		dragging: isDragging,
		minimumValue,
		maximumValue,
		nudge,
		onLayout: (event: LayoutChangeEvent) =>
			setWidth(event.nativeEvent.layout.width),
		panHandlers: responder.panHandlers,
		width,
		x,
	}
}
