import { ActionSheetActionCreators } from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import { BottomSheet as Gorhom } from '@valenced/externals/gorhom'
import { useEffect, useState } from 'react'
import { callNativeSafe } from '../sync'

export function openIgnoredPluginsSheet(options: {
	ignoredPlugins: string[]
	onUpdateIgnored: (newList: string[]) => void
}) {
	ActionSheetActionCreators.openLazy(
		Promise.resolve({
			default: () => {
				const [search, setSearch] = useState('')
				const [currentIgnored, setCurrentIgnored] = useState<string[]>(
					options.ignoredPlugins,
				)
				const [installedList, setInstalledList] = useState<
					Array<{ id: string; name: string }>
				>([])
				const {
					ActionSheet,
					ActionSheetRow,
					BottomSheetTitleHeader,
					ActionSheetSwitchRow,
					TextInput,
				} = Design
				const { BottomSheetScrollView } = Gorhom

				useEffect(() => {
					let cancelled = false
					void callNativeSafe('valenced.plugins.list').then(plugins => {
						if (cancelled || !Array.isArray(plugins)) return
						const installed = plugins.flatMap(plugin => {
							const id = plugin?.manifest?.id ?? plugin?.id
							if (
								typeof id !== 'string' ||
								id === 'dev.kmmiio99o.cloud.sync' ||
								id === 'rosie.cloud-sync' ||
								id.includes('cloud-sync') ||
								id.startsWith('valenced.api')
							) {
								return []
							}
							const name = plugin?.manifest?.name ?? plugin?.name ?? id
							return [{ id, name: String(name) }]
						})
						installed.sort((a, b) => a.name.localeCompare(b.name))
						setInstalledList(installed)
					})
					return () => {
						cancelled = true
					}
				}, [])

				const filtered = installedList.filter(
					p =>
						p.name.toLowerCase().includes(search.toLowerCase()) ||
						p.id.toLowerCase().includes(search.toLowerCase()),
				)

				const toggle = (id: string) => {
					const next = currentIgnored.includes(id)
						? currentIgnored.filter(x => x !== id)
						: [...currentIgnored, id]
					setCurrentIgnored(next)
					options.onUpdateIgnored(next)
				}

				return (
					<ActionSheet
						scrollable
						header={
							<BottomSheetTitleHeader
								title={`Ignored Plugins (${currentIgnored.length})`}
								subtitle="Excluded from cloud backup & restoration"
							/>
						}
					>
						<BottomSheetScrollView keyboardShouldPersistTaps="handled">
							<TextInput
								placeholder="Search plugins to exclude..."
								value={search}
								onChange={(val: string) => setSearch(val)}
								isClearable
								returnKeyType="search"
							/>
							<ActionSheetRow.Group>
								{filtered.length === 0 ? (
									<ActionSheetRow label="No matching plugins found." />
								) : (
									filtered.map(p => (
										<ActionSheetSwitchRow
											key={p.id}
											label={p.name}
											subLabel={p.id}
											value={currentIgnored.includes(p.id)}
											onValueChange={() => toggle(p.id)}
										/>
									))
								)}
							</ActionSheetRow.Group>
						</BottomSheetScrollView>
					</ActionSheet>
				)
			},
		}),
		'cloudsync-ignored-sheet',
		{},
	)
}
