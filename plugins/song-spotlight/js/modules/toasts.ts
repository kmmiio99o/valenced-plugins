import { ToastActionCreators } from '@valenced/discord/actions'

export function showMessage(
	value: unknown,
	key: string,
	variant: 'default' | 'success' | 'critical' = 'default',
) {
	ToastActionCreators.open(key, {
		text: value instanceof Error ? value.message : String(value),
		variant,
	})
}
