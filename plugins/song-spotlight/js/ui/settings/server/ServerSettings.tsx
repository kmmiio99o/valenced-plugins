import Page from '@valenced/components/Page'
import { Design } from '@valenced/discord/design'
import { ReactNavigationNative } from '@valenced/externals/react-navigation'
import { useEffect, useLayoutEffect, useState } from 'react'
import { ScrollView } from 'react-native'
import { getHost } from '../../../modules/api'
import { getRuntimeStorage } from '../../../modules/runtime'
import { showMessage } from '../../../modules/toasts'
import { DEFAULT_SETTINGS } from '../../../types'

export default function ServerSettings() {
	const storage = getRuntimeStorage()
	const saved = { ...DEFAULT_SETTINGS, ...(storage?.use() ?? {}) }
	const [host, setHost] = useState(saved.host)
	const [clientId, setClientId] = useState(saved.clientId)
	const navigation = ReactNavigationNative.useNavigation() as {
		setOptions(options: object): void
	}
	useLayoutEffect(() => {
		navigation.setOptions({ title: 'Song Spotlight server' })
	}, [navigation])

	useEffect(() => {
		setHost(saved.host)
		setClientId(saved.clientId)
	}, [saved.host, saved.clientId])

	async function save() {
		if (!storage) {
			showMessage(
				'Plugin storage is unavailable.',
				'SONG_SPOTLIGHT_HOST_STORAGE_ERROR',
				'critical',
			)
			return
		}
		try {
			await storage.set({ ...saved, host: getHost({ host }), clientId }, true)
			showMessage('Server settings saved.', 'SONG_SPOTLIGHT_HOST', 'success')
		} catch (error) {
			showMessage(error, 'SONG_SPOTLIGHT_HOST_SAVE_ERROR', 'critical')
		}
	}

	return (
		<ScrollView>
			<Page>
				<Design.TableRowGroup
					title="Server"
					description="Change these only if your server administrator gave you a custom Song Spotlight server."
				>
					<Design.Stack spacing={8} style={{ padding: 12 }}>
						<Design.TextInput
							label="Server URL"
							value={host}
							onChange={setHost}
						/>
						<Design.TextInput
							label="Discord OAuth client ID"
							value={clientId}
							onChange={setClientId}
						/>
						<Design.Button
							text="Save server settings"
							variant="secondary"
							onPress={() => void save()}
						/>
					</Design.Stack>
				</Design.TableRowGroup>
			</Page>
		</ScrollView>
	)
}
