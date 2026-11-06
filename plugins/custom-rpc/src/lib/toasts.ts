import { ToastActionCreators } from '@valenced/discord/actions'

export function showToast(content: string) {
	ToastActionCreators.open(
		`custom-rpc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		{
			text: content,
		},
	)
}
