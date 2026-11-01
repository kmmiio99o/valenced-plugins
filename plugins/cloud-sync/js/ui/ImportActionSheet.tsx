import { ActionSheetActionCreators } from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import { BottomSheet as Gorhom } from '@valenced/externals/gorhom'
import { useState } from 'react'
import type { SelectiveDomains, UserData } from '../types'

export function openImportActionSheet(options: {
	cloudData: UserData | null
	onConfirmImport: (selected: SelectiveDomains) => void
}) {
	ActionSheetActionCreators.openLazy(
		Promise.resolve({
			default: () => {
				const [selected, setSelected] = useState<Required<SelectiveDomains>>({
					repos: true,
					plugins: true,
					themes: true,
					fonts: true,
					iconPacks: true,
					emojiPacks: true,
					settings: true,
					experiments: true,
				})
				const {
					ActionSheet,
					ActionSheetRow,
					ActionSheetSwitchRow,
					BottomSheetTitleHeader,
				} = Design
				const { BottomSheetScrollView } = Gorhom

				const cloudData = options.cloudData
				const reposCount = cloudData?.repos?.length ?? 0
				const pluginsCount = Object.keys(cloudData?.plugins ?? {}).length
				const themesCount = Object.keys(cloudData?.themes ?? {}).length
				const fontsCount = Object.keys(cloudData?.fonts ?? {}).length
				const iconPacksCount = Object.keys(cloudData?.iconPacks ?? {}).length
				const emojiPacksCount = Object.keys(cloudData?.emojiPacks ?? {}).length
				const settingsCount = Object.keys(cloudData?.settings ?? {}).length
				const experimentsCount = Object.keys(
					cloudData?.experiments ?? {},
				).length
				const totalItems =
					reposCount +
					pluginsCount +
					themesCount +
					fontsCount +
					iconPacksCount +
					emojiPacksCount +
					settingsCount +
					experimentsCount

				return (
					<ActionSheet
						scrollable
						header={
							<BottomSheetTitleHeader
								title="Selective Cloud Import"
								subtitle={
									cloudData
										? `${totalItems} items ready to restore`
										: 'Choose domains to import'
								}
							/>
						}
					>
						<BottomSheetScrollView keyboardShouldPersistTaps="handled">
							<ActionSheetRow.Group>
								<ActionSheetSwitchRow
									label="Plugins & Sideloads"
									subLabel={`${pluginsCount} plugins available`}
									value={selected.plugins}
									onValueChange={(val: boolean) =>
										setSelected(prev => ({ ...prev, plugins: val }))
									}
								/>
								<ActionSheetSwitchRow
									label="Themes"
									subLabel={`${themesCount} themes available`}
									value={selected.themes}
									onValueChange={(val: boolean) =>
										setSelected(prev => ({ ...prev, themes: val }))
									}
								/>
								<ActionSheetSwitchRow
									label="Repositories"
									subLabel={`${reposCount} repositories available`}
									value={selected.repos}
									onValueChange={(val: boolean) =>
										setSelected(prev => ({ ...prev, repos: val }))
									}
								/>
								<ActionSheetSwitchRow
									label="Icon Packs"
									subLabel={`${iconPacksCount} icon packs available`}
									value={selected.iconPacks}
									onValueChange={(val: boolean) =>
										setSelected(prev => ({ ...prev, iconPacks: val }))
									}
								/>
								<ActionSheetSwitchRow
									label="Emoji Packs"
									subLabel={`${emojiPacksCount} emoji packs available`}
									value={selected.emojiPacks}
									onValueChange={(val: boolean) =>
										setSelected(prev => ({ ...prev, emojiPacks: val }))
									}
								/>
								<ActionSheetSwitchRow
									label="Font Packs"
									subLabel={`${fontsCount} font entries available`}
									value={selected.fonts}
									onValueChange={(val: boolean) =>
										setSelected(prev => ({ ...prev, fonts: val }))
									}
								/>
								<ActionSheetSwitchRow
									label="All Valenced Settings"
									subLabel={`${settingsCount} setting items available`}
									value={selected.settings}
									onValueChange={(val: boolean) =>
										setSelected(prev => ({ ...prev, settings: val }))
									}
								/>
								<ActionSheetSwitchRow
									label="Discord Experiments"
									subLabel={`${experimentsCount} experiment overrides available`}
									value={selected.experiments}
									onValueChange={(val: boolean) =>
										setSelected(prev => ({ ...prev, experiments: val }))
									}
								/>
							</ActionSheetRow.Group>
							<ActionSheetRow.Group>
								<ActionSheetRow
									label="Import Selected"
									onPress={() => {
										ActionSheetActionCreators.hideActionSheet()
										options.onConfirmImport(selected)
									}}
								/>
								<ActionSheetRow
									label="Cancel"
									onPress={() => ActionSheetActionCreators.hideActionSheet()}
								/>
							</ActionSheetRow.Group>
						</BottomSheetScrollView>
					</ActionSheet>
				)
			},
		}),
		'cloudsync-import-sheet',
		{},
	)
}
