import {
	refreshSettings,
	registerSettingsItem,
} from '@valenced/discord/modules/settings'
import AssetLibraryPage from './pages/AssetLibraryPage'
import ImageSettingsPage from './pages/ImageSettingsPage'

const PREFIX = 'dev.kmmiio99o.custom.rpc'

export const LARGE_IMAGE_ROUTE = `${PREFIX}.image-large`
export const SMALL_IMAGE_ROUTE = `${PREFIX}.image-small`
export const LARGE_ASSET_ROUTE = `${PREFIX}.assets-large`
export const SMALL_ASSET_ROUTE = `${PREFIX}.assets-small`

export function registerImagePages(): () => void {
	const unregister = [
		registerSettingsItem(LARGE_IMAGE_ROUTE, {
			parent: null,
			type: 'route',
			useTitle: () => 'Large Image',
			screen: {
				route: LARGE_IMAGE_ROUTE,
				getComponent: () => () => <ImageSettingsPage imageKey="largeImage" />,
			},
		}),
		registerSettingsItem(SMALL_IMAGE_ROUTE, {
			parent: null,
			type: 'route',
			useTitle: () => 'Small Image',
			screen: {
				route: SMALL_IMAGE_ROUTE,
				getComponent: () => () => <ImageSettingsPage imageKey="smallImage" />,
			},
		}),
		registerSettingsItem(LARGE_ASSET_ROUTE, {
			parent: null,
			type: 'route',
			useTitle: () => 'Large Image Assets',
			screen: {
				route: LARGE_ASSET_ROUTE,
				getComponent: () => () => <AssetLibraryPage imageKey="largeImage" />,
			},
		}),
		registerSettingsItem(SMALL_ASSET_ROUTE, {
			parent: null,
			type: 'route',
			useTitle: () => 'Small Image Assets',
			screen: {
				route: SMALL_ASSET_ROUTE,
				getComponent: () => () => <AssetLibraryPage imageKey="smallImage" />,
			},
		}),
	]

	refreshSettings()

	return () => {
		for (const remove of unregister) remove()
		refreshSettings()
	}
}
