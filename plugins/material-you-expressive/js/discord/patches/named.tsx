import { getModules } from '@valenced/modules/finders'
import { withName } from '@valenced/modules/finders/filters'
import { segmented } from '../../components/groups'
import {
	cardRow,
	largeTitle,
	pillButton,
	pillChatInput,
	pillTab,
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
	['expressiveChatInput', 'FloatingChatInputContainer', pillChatInput],
	['expressiveHeaders', 'LeftAlignedHeaderTitle', largeTitle],
	['expressiveHeaders', 'GenericHeaderTitle', largeTitle],
	['expressiveMessageRows', 'MessagesItemChannelBase', cardRow],
	['expressiveTabs', 'TabItem', pillTab],
	['expressiveGroups', 'ActionSheetRowGroup', segmented],
	['expressiveGuilds', 'GuildsBarAnimatedItemWrapper', shapedGuild],
] as const

export function patchNamedComponents(settings: Settings, restores: Restore[]) {
	return NamedComponents.filter(([feature]) => settings[feature]).map(
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
}
