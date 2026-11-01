import { getAssetIdByName } from '@valenced/assets'
import Page from '@valenced/components/Page'
import { Design } from '@valenced/discord/design'
import { Stores } from '@valenced/discord/flux'
import { ReactNavigationNative } from '@valenced/externals/react-navigation'
import { useLayoutEffect } from 'react'
import { ScrollView } from 'react-native'
import { DEFAULT_SETTINGS } from '../../types'
import { SERVER_SETTINGS_ROUTE } from '../routes/SettingsRoutes'
import AccountSection from './account/AccountSection'
import SongsSection from './songs/SongsSection'
import useSongData from './useSongData'
import type { PluginSettingsComponent } from '@valenced/plugins/types'
import type { ComponentProps } from 'react'
import type { AuthToken } from '../../types'
import type { Options } from './types'

type Props = ComponentProps<PluginSettingsComponent<Options>>
const SettingsIcon = getAssetIdByName('SettingsIcon')!

export default function SettingsHome({ api }: Props) {
	const storage = api.jsonStorage
	const current = { ...DEFAULT_SETTINGS, ...(storage.use() ?? {}) }
	const userId = (
		Stores.UserStore as unknown as
			| { getCurrentUser?(): { id?: string } | undefined }
			| undefined
	)?.getCurrentUser?.()?.id
	const navigation = ReactNavigationNative.useNavigation() as {
		navigate(route: string): void
		setOptions(options: object): void
	}
	const token = userId ? current.tokens[userId] : undefined
	const { songs, loading, saveState, changeSongs, clearSongs } = useSongData(
		current.host,
		userId,
		token,
		updateToken,
	)

	useLayoutEffect(() => {
		navigation.setOptions({
			title: 'Song Spotlight',
			headerRight: () => (
				<Design.IconButton
					style={{ marginInlineEnd: 8 }}
					size="sm"
					variant="secondary"
					icon={SettingsIcon}
					accessibilityLabel="Song Spotlight server settings"
					onPress={() => navigation.navigate(SERVER_SETTINGS_ROUTE)}
				/>
			),
		})
	}, [navigation])

	async function updateToken(token: AuthToken) {
		if (!userId) throw new Error('No logged-in Discord account.')
		await storage.set({
			tokens: { ...current.tokens, [userId]: token },
		})
	}

	async function disconnect() {
		if (!userId) return
		const { [userId]: _removed, ...tokens } = current.tokens
		await storage.set({ ...current, tokens }, true)
	}

	return (
		<ScrollView>
			<Page>
				<AccountSection
					userId={userId}
					settings={current}
					saveToken={updateToken}
					onLogout={disconnect}
				/>
				{token ? (
					<SongsSection
						loading={loading}
						saveState={saveState}
						songs={songs}
						onChange={changeSongs}
						host={current.host}
						token={token}
						updateToken={updateToken}
						onDeleted={clearSongs}
					/>
				) : null}
			</Page>
		</ScrollView>
	)
}
