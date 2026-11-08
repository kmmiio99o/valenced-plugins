import { StyleSheet, View } from 'react-native'
import { Roles } from './colors'

export function M3Radio({ selected }: { selected: boolean | null }) {
	const primary = Roles.primary()

	return (
		<View
			style={[
				styles.radio,
				{ borderColor: selected ? primary : Roles.onSurfaceVariant() },
			]}
		>
			{selected ? (
				<View style={[styles.dot, { backgroundColor: primary }]} />
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	radio: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		alignItems: 'center',
		justifyContent: 'center',
	},
	dot: { width: 10, height: 10, borderRadius: 5 },
})
