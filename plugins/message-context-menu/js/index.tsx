import { installLongPressMenu } from './discord/patches/longPressMenu'

export default plugin({
	start({ cleanup }) {
		console.log('[MessageContextMenu]', 'plugin started')
		installLongPressMenu(cleanup)
	},
})
