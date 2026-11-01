import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { instead } from '@valenced/patcher'
import { useState } from 'react'
import { addSongsTab } from './items'

const SONG_SECTION = 'SONG_SPOTLIGHT'
interface MeasuredTabsModule {
	useMeasuredTabItems(items: import('./items').ProfileTabItem[]): unknown
}

interface ProfileSectionOptions {
	initialUserProfileSection?: string
	boardTabIndex?: number
	activityTabIndex?: number
	wishlistTabIndex?: number
	[key: string]: unknown
}

interface ActiveIndexState {
	activeIndex: {
		get(): number
		setActiveIndex(
			index: number,
			hapticFeedback?: boolean,
			immediate?: boolean,
		): void
	}
}

interface ProfileSectionResult {
	activeProfileTabSection: string
	activeProfileTabSectionIndex: number
	setActiveProfileTabSection(section: string): void
	handleTabChange(index: number): void
	restoreActiveIndex(state: ActiveIndexState): void
	[key: string]: unknown
}

interface ProfileSectionHooks {
	useProfileSectionTabs(options: ProfileSectionOptions): ProfileSectionResult
}

function shiftTabIndex(index: number | undefined) {
	return index !== undefined && index > 0 ? index + 1 : index
}

export function installProfileTabs(cleanup: (unpatch: () => void) => void) {
	cleanup(
		getModules(withProps<MeasuredTabsModule>('useMeasuredTabItems'), module => {
			cleanup(
				instead(module, 'useMeasuredTabItems', ([items], original) =>
					Reflect.apply(original, module, [addSongsTab(items)]),
				),
			)
		}),
	)

	cleanup(
		getModules(
			withProps<ProfileSectionHooks>('useProfileSectionTabs'),
			module => {
				cleanup(
					instead(module, 'useProfileSectionTabs', ([options], original) => {
						const result = Reflect.apply(original, module, [
							{
								...options,
								boardTabIndex: shiftTabIndex(options.boardTabIndex),
								activityTabIndex: shiftTabIndex(options.activityTabIndex),
								wishlistTabIndex: shiftTabIndex(options.wishlistTabIndex),
							},
						])
						const songTabIndex = 1
						const [selected, setSelected] = useState(
							options.initialUserProfileSection === SONG_SECTION,
						)

						return {
							...result,
							activeProfileTabSection: selected
								? SONG_SECTION
								: result.activeProfileTabSection,
							activeProfileTabSectionIndex: selected
								? songTabIndex
								: result.activeProfileTabSectionIndex,
							setActiveProfileTabSection(section: string) {
								setSelected(section === SONG_SECTION)
								if (section !== SONG_SECTION) {
									result.setActiveProfileTabSection(section)
								}
							},
							handleTabChange(index: number) {
								if (index === songTabIndex) {
									setSelected(true)
									return
								}
								setSelected(false)
								result.handleTabChange(index)
							},
							restoreActiveIndex(state: ActiveIndexState) {
								if (selected) {
									if (state.activeIndex.get() !== songTabIndex) {
										state.activeIndex.setActiveIndex(songTabIndex, false, true)
									}
									return
								}
								result.restoreActiveIndex(state)
							},
						}
					}),
				)
			},
		),
	)
}
