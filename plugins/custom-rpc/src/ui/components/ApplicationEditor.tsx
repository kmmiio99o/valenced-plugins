import { Design } from '@valenced/discord/design'
import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { errorDetails, errorToText, verifyApplication } from '../../lib/portal'
import { getSettings, setSettings } from '../../lib/state'
import { showToast } from '../../lib/toasts'
import { openApplicationPickerSheet } from '../sheets/ApplicationPickerSheet'
import ErrorDetails from './ErrorDetails'
import TextInputRow from './TextInputRow'

export default function ApplicationEditor({
	onVerified,
}: {
	onVerified?: () => void
}) {
	const { Button, TableRowGroup, TableRow, Text } = Design

	const [draft, setDraft] = useState(getSettings().clientId)
	const [status, setStatus] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [details, setDetails] = useState('')
	const [busy, setBusy] = useState(false)

	const verify = useCallback(async () => {
		const id = draft.replace(/\D/g, '')
		if (!id) {
			showToast('Enter an Application ID first')
			return
		}
		setBusy(true)
		setError(null)
		setDetails('')
		setStatus(null)
		try {
			const { assets } = await verifyApplication(id)
			setSettings({ clientId: id })
			setStatus(
				assets.length > 0
					? `Verified — ${assets.length} asset${assets.length === 1 ? '' : 's'} available`
					: 'Verified — no assets uploaded yet',
			)
			showToast('Application ID verified')
			onVerified?.()
		} catch (err) {
			setError(errorToText(err))
			setDetails(errorDetails(err))
		} finally {
			setBusy(false)
		}
	}, [draft, onVerified])

	const clear = useCallback(() => {
		setSettings({ clientId: '' })
		setDraft('')
		setStatus(null)
		setError(null)
		setDetails('')
		showToast('Application ID cleared')
	}, [])

	return (
		<>
			<TableRowGroup title="Application ID">
				<TextInputRow
					label="Application ID"
					value={draft}
					isClearable={!!draft}
					onChange={v => {
						const next = v.replace(/\D/g, '')
						setDraft(next)
						setStatus(null)
						if (!next) clear()
					}}
					placeholder="e.g. 1234567890123456789"
					subLabel="From discord.com/developers → your app → General Information"
					disabled={busy}
				/>
				<TableRow
					label={busy ? 'Checking…' : 'Verify and use'}
					subLabel="Confirms the ID and loads its assets"
					trailing={<TableRow.Arrow />}
					disabled={busy}
					onPress={verify}
				/>
				{status ? (
					<View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
						<Text variant="text-sm/medium" color="text-muted">
							{status}
						</Text>
					</View>
				) : null}
				{error ? (
					<View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
						<Text variant="text-sm/medium" color="text-feedback-critical">
							{error}
						</Text>
					</View>
				) : null}
			</TableRowGroup>

			<View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
				<Button
					text="Choose from your applications"
					size="lg"
					variant="primary"
					grow
					disabled={busy}
					onPress={() =>
						openApplicationPickerSheet(application => {
							setDraft(application.id)
							setStatus(`Using ${application.name}`)
							setError(null)
							setDetails('')
						})
					}
				/>
			</View>

			<ErrorDetails details={details} />
		</>
	)
}
