import { ToastActionCreators } from '@valenced/discord/actions'

export function showToast(
	key: string,
	text: string,
	variant: 'default' | 'success' | 'critical' = 'default',
) {
	ToastActionCreators.open(key, { text, variant })
}
