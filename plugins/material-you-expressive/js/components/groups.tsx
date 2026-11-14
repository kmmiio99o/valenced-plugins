import { Design } from '@valenced/discord/design'
import {
	Children,
	createContext,
	createElement,
	isValidElement,
	useContext,
} from 'react'
import { StyleSheet, View } from 'react-native'
import { AccentTitle } from './rows'
import type { ComponentType, ReactNode } from 'react'
import type { ViewProps, ViewStyle } from 'react-native'

interface GroupProps {
	title?: string
	description?: string
	hasIcons?: boolean
	children?: ReactNode
	[key: string]: unknown
}

const Gap = 2
const Outer = 24
const Inner = 4

type Corners = Pick<
	ViewStyle,
	| 'borderTopLeftRadius'
	| 'borderTopRightRadius'
	| 'borderBottomLeftRadius'
	| 'borderBottomRightRadius'
>

const SegmentCornersContext = createContext<Corners | null>(null)

function cornersOf(index: number, count: number): Corners {
	const top = index === 0 ? Outer : Inner
	const bottom = index === count - 1 ? Outer : Inner
	return {
		borderTopLeftRadius: top,
		borderTopRightRadius: top,
		borderBottomLeftRadius: bottom,
		borderBottomRightRadius: bottom,
	}
}

export function SegmentedGroupSurface(props: ViewProps) {
	const corners = useContext(SegmentCornersContext)
	return createElement(View, {
		...props,
		style: corners ? [props.style, corners] : props.style,
	})
}

/**
 * Splits a row group into native groups while preserving component hook boundaries.
 */
export function segmented(Group: ComponentType<any>) {
	function Segment({ corners, ...props }: GroupProps & { corners: Corners }) {
		return (
			<SegmentCornersContext.Provider value={corners}>
				<Group {...props} />
			</SegmentCornersContext.Provider>
		)
	}

	return function SegmentedGroup(props: GroupProps) {
		const { title, description, children, ...rest } = props
		const rows = Children.toArray(children).filter(isValidElement)

		if (!rows.length) return <Group {...props} />

		const { Text } = Design as unknown as {
			Text: ComponentType<{
				variant: string
				color: string
				style?: object
				children: ReactNode
			}>
		}

		return (
			<View>
				{title ? <AccentTitle title={title} /> : null}
				<View style={styles.segments}>
					{rows.map((row, i) => (
						<Segment
							key={row.key ?? i}
							{...rest}
							corners={cornersOf(i, rows.length)}
						>
							{row}
						</Segment>
					))}
				</View>
				{description ? (
					<Text
						variant="text-sm/medium"
						color="text-muted"
						style={styles.description}
					>
						{description}
					</Text>
				) : null}
			</View>
		)
	}
}

const styles = StyleSheet.create({
	segments: { gap: Gap },
	description: { marginTop: 8, marginHorizontal: 16 },
})
