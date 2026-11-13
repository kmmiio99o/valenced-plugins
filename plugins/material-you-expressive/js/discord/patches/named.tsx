import { getModules } from '@valenced/modules/finders'
import { withName } from '@valenced/modules/finders/filters'
import { segmented } from '../../components/groups'
import {
	cardRow,
	largeTitle,
	pillButton,
	pillTab,
	setGuildShapesEnabled,
	shapedGuild,
	tonalActions,
} from '../../components/screens'
import { replaceExport } from './exports'
import type { Settings } from '../../settings/types'
import type { Exports, Restore } from './exports'

const NamedComponents = [
	['expressiveButtons', 'BaseButton', pillButton],
	['expressiveButtons', 'BaseTextButton', pillButton],
	['expressiveButtons', 'PrivateChannelButtons', tonalActions],
	['expressiveButtons', 'ChannelActionButtons', tonalActions],
	['expressiveHeaders', 'LeftAlignedHeaderTitle', largeTitle],
	['expressiveHeaders', 'GenericHeaderTitle', largeTitle],
	['expressiveMessageRows', 'MessagesItemChannelBase', cardRow],
	['expressiveTabs', 'TabItem', pillTab],
	['expressiveGroups', 'ActionSheetRowGroup', segmented],
] as const

const GuildsBarComponent = 'GuildsBarAnimatedItemWrapper'

export function patchNamedComponents(settings: Settings, restores: Restore[]) {
	setGuildShapesEnabled(settings.expressiveGuilds)
	const patches = NamedComponents.filter(([feature]) => settings[feature]).map(
		([, name, wrap]) =>
			getModules(
				withName(name),
				exports => {
					const module = exports as unknown as Exports
					if ((module.default as { name?: string } | undefined)?.name === name)
						replaceExport(module, 'default', wrap, restores)
				},
				{ returnNamespace: true },
			),
	)
	patches.push(
		getModules(
			withName(GuildsBarComponent),
			exports => {
				const module = exports as unknown as Exports
				if (
					(module.default as { name?: string } | undefined)?.name ===
					GuildsBarComponent
				)
					replaceExport(module, 'default', shapedGuild, restores)
			},
			{ returnNamespace: true },
		),
		() => setGuildShapesEnabled(false),
	)
	return patches
}
