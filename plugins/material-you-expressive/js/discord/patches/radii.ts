import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import type { PreInitPluginApi } from '@valenced/plugins/types'

type Radii = Record<string, number>
const ExpressiveRadii: Radii = {
	xs: 8,
	sm: 12,
	md: 16,
	lg: 24,
	xl: 28,
	xxl: 36,
}

export function patchRadii(cleanup: PreInitPluginApi['cleanup']) {
	cleanup(
		getModules(
			withProps<{
				default: { radii: Radii }
				RawColor: unknown
				SemanticColor: unknown
			}>('RawColor', 'SemanticColor'),
			tokens => {
				const radii = tokens.default.radii
				const original = { ...radii }
				Object.assign(radii, ExpressiveRadii)
				cleanup(() => Object.assign(radii, original))
			},
		),
	)
}
