import { lookupModuleWithImportedPath } from '@valenced/discord/utils/modules/finders'
import type { DiscordDesignModule, DiscordTokensModule } from '../types'

export function useDiscordTheme() {
	const [design] =
		lookupModuleWithImportedPath<DiscordDesignModule>('design/native.tsx')
	const [tokens] = lookupModuleWithImportedPath<DiscordTokensModule>(
		'../discord_common/js/packages/tokens/native.tsx',
	)
	const { useToken } = design!
	const { colors, radii, shadows } = tokens!.default

	return {
		surface: useToken(colors.BACKGROUND_SURFACE_HIGHEST),
		text: useToken(colors.TEXT_STRONG),
		muted: useToken(colors.TEXT_MUTED),
		row: useToken(colors.CARD_MUTED_BG),
		pressed: useToken(colors.CARD_MUTED_PRESSED_BG),
		danger: useToken(colors.TEXT_FEEDBACK_CRITICAL),
		border: useToken(colors.BORDER_SUBTLE),
		radius: radii.lg,
		shadow: shadows.SHADOW_HIGH,
	}
}
