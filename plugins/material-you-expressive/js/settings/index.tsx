import Page from '@valenced/components/Page'
import { Tokens } from '@valenced/discord/common/tokens'
import { Design } from '@valenced/discord/design'
import { Children, isValidElement } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { AccentTitle } from '../components/rows'
import { readSettings } from './types'
import type { PluginSettingsComponent } from '@valenced/plugins/types'
import type { ComponentProps, Context, ReactNode } from 'react'
import type { Settings } from './types'

type Props = ComponentProps<PluginSettingsComponent<{ jsonStorage: Settings }>>
type FeatureKey = Exclude<keyof Settings, 'avatarShapes'>

function SettingsGroup({
	title,
	children,
}: {
	title: string
	children: ReactNode
}) {
	const { TableRowGroupContext } = Design as unknown as {
		TableRowGroupContext: Context<boolean>
	}
	const rows = Children.toArray(children).filter(isValidElement)
	return (
		<View style={{ marginBottom: Tokens.default.space.PX_16 }}>
			<AccentTitle title={title} />
			<View style={styles.rows}>
				{rows.map((row, index) => (
					<View
						key={row.key ?? index}
						style={[
							styles.rowSurface,
							{
								borderRadius: Tokens.default.radii.lg,
								backgroundColor: Tokens.default.colors.CARD_MUTED_BG,
							},
						]}
					>
						<TableRowGroupContext.Provider value>
							{row}
						</TableRowGroupContext.Provider>
					</View>
				))}
			</View>
		</View>
	)
}

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
	const { TableSwitchRow } = Design
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
			if (key !== 'expressiveGuilds') api.plugin.requireReload()
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
				<SettingsGroup title="Appearance">
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
							subLabel="Reload Discord to apply this feature."
							value={settings[key]}
							onValueChange={value => updateFeature(key, value)}
						/>
					))}
				</SettingsGroup>
				<SettingsGroup title="Components">
					{Features.slice(1).map(({ key, label }) => (
						<TableSwitchRow
							key={key}
							label={label}
							subLabel={
								key === 'expressiveGuilds'
									? 'Applied immediately.'
									: 'Reload Discord to apply this feature.'
							}
							value={settings[key]}
							onValueChange={value => updateFeature(key, value)}
						/>
					))}
				</SettingsGroup>
			</Page>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	rows: { gap: 2 },
	rowSurface: { overflow: 'hidden' },
})
