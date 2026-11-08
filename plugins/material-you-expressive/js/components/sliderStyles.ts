import { StyleSheet } from 'react-native'

export const SliderMetrics = {
	track: 16,
	gap: 6,
	handle: { width: 4, height: 44 },
	valueIndicator: { width: 48, height: 32, bottomSpace: 12 },
}

const { track, handle, valueIndicator } = SliderMetrics

export const SliderStyles = StyleSheet.create({
	row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	container: { flex: 1, height: handle.height },
	track: {
		position: 'absolute',
		top: (handle.height - track) / 2,
		height: track,
	},
	active: { left: 0, borderRadius: track / 2 },
	inactive: { right: 0, borderRadius: track / 2 },
	stop: {
		position: 'absolute',
		right: (track - 4) / 2,
		top: (handle.height - 4) / 2,
		width: 4,
		height: 4,
		borderRadius: 2,
	},
	handle: {
		position: 'absolute',
		top: 0,
		width: handle.width,
		height: handle.height,
		borderRadius: handle.width / 2,
	},
	valueIndicator: {
		position: 'absolute',
		minWidth: valueIndicator.width,
		height: valueIndicator.height,
		paddingHorizontal: 8,
		borderRadius: valueIndicator.height / 2,
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 3,
	},
})
