import Page from '@valenced/components/Page'
import { Design } from '@valenced/discord/design'
import { ScrollView } from 'react-native'
import { readSettings } from './types'
import type { PluginSettingsComponent } from '@valenced/plugins/types'
import type { ComponentProps } from 'react'
import type { Settings } from './types'

const { TableRowGroup, TableSwitchRow } = Design
type Props = ComponentProps<PluginSettingsComponent<{ jsonStorage: Settings }>>
type FeatureKey = Exclude<keyof Settings, 'avatarShapes'>

const Features: { key: FeatureKey; label: string }[] = [
	{ key: 'expressiveCorners', label: 'Expressive corners' },
	{ key: 'expressiveButtons', label: 'Buttons' },
	{ key: 'expressiveSwitches', label: 'Switches' },
	{ key: 'expressiveSliders', label: 'Sliders' },
	{ key: 'expressiveGroups', label: 'Segmented row groups' },
	{ key: 'expressiveRowTitles', label: 'Row group titles' },
	{ key: 'expressiveRowIcons', label: 'Row icons' },
	{ key: 'expressiveFloatingActionButtons', label: 'Floating action buttons' },
	{ key: 'expressiveRadioButtons', label: 'Radio buttons' },
	{ key: 'expressiveChatInput', label: 'Chat input' },
	{ key: 'expressiveHeaders', label: 'Headers' },
	{ key: 'expressiveMessageRows', label: 'Message rows' },
	{ key: 'expressiveTabs', label: 'Tabs' },
	{ key: 'expressiveGuilds', label: 'Server icons' },
]

export default function SettingsPage({ api }: Props) {
	const settings = readSettings(api.jsonStorage.use())

	const updateAvatarShapes = async (enabled: boolean) => {
		try {
			await api.jsonStorage.set({ avatarShapes: enabled })
		} catch (error) {
			api.plugin.reportError(error)
		}
	}

	const updateFeature = async <K extends FeatureKey>(
		key: K,
		enabled: Settings[K],
	) => {
		try {
			await api.jsonStorage.set({ [key]: enabled })
			api.plugin.requireReload()
		} catch (error) {
			api.plugin.reportError(error)
		}
	}

	return (
		<ScrollView
			style={{ flex: 1 }}
			contentContainerStyle={{ paddingBottom: 24 }}
		>
			<Page>
				<TableRowGroup title="Appearance">
					<TableSwitchRow
						label="Shape message avatars"
						subLabel="Clip chat avatars to the Material 3 cookie shape."
						value={settings.avatarShapes}
						onValueChange={updateAvatarShapes}
					/>
					{Features.slice(0, 1).map(({ key, label }) => (
						<TableSwitchRow
							key={key}
							label={label}
							subLabel="Reload the plugin to apply this feature."
							value={settings[key]}
							onValueChange={value => updateFeature(key, value)}
						/>
					))}
				</TableRowGroup>
				<TableRowGroup title="Components">
					{Features.slice(1).map(({ key, label }) => (
						<TableSwitchRow
							key={key}
							label={label}
							subLabel="Reload the plugin to apply this feature."
							value={settings[key]}
							onValueChange={value => updateFeature(key, value)}
						/>
					))}
				</TableRowGroup>
			</Page>
		</ScrollView>
	)
}
