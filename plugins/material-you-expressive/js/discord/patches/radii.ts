import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import type { PreInitPluginApi } from '@valenced/plugins/types'

type Radii = Record<string, number>
type RadiusTokens = {
	default: {
		radii: Radii
		modules: {
			button: { BORDER_RADIUS: number; BORDER_RADIUS_LG: number }
		}
	}
	RawColor: unknown
	SemanticColor: unknown
}
const ExpressiveRadii: Radii = {
	xs: 8,
	sm: 12,
	md: 16,
	lg: 24,
	xl: 28,
	xxl: 36,
}

export function patchRadii(
	cleanup: PreInitPluginApi['cleanup'],
	settings: { expressiveCorners: boolean; expressiveButtons: boolean },
) {
	cleanup(
		getModules(withProps<RadiusTokens>('RawColor', 'SemanticColor'), tokens => {
			if (settings.expressiveCorners) {
				const radii = tokens.default.radii
				const original = { ...radii }
				Object.assign(radii, ExpressiveRadii)
				cleanup(() => Object.assign(radii, original))
			}
			if (settings.expressiveButtons) {
				const { button } = tokens.default.modules
				const originalButton = {
					borderRadius: button.BORDER_RADIUS,
					borderRadiusLg: button.BORDER_RADIUS_LG,
				}
				button.BORDER_RADIUS = 999
				button.BORDER_RADIUS_LG = 999
				cleanup(() => {
					button.BORDER_RADIUS = originalButton.borderRadius
					button.BORDER_RADIUS_LG = originalButton.borderRadiusLg
				})
			}
		}),
	)
}
