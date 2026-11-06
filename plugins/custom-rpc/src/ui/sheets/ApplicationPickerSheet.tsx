import { ActionSheetActionCreators } from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import { BottomSheet as Gorhom } from '@valenced/externals/gorhom'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import {
	createApplication,
	errorDetails,
	errorToText,
	listApplications,
	verifyApplication,
} from '../../lib/portal'
import { getSettings, setSettings } from '../../lib/state'
import { showToast } from '../../lib/toasts'
import ErrorDetails from '../components/ErrorDetails'
import TextInputRow from '../components/TextInputRow'
import { APPLICATION_PICKER_SHEET_KEY } from '../sheetKeys'
import type { PortalApplication } from '../../lib/portal'

function closePickerSheet() {
	ActionSheetActionCreators.hideActionSheet(APPLICATION_PICKER_SHEET_KEY)
}

function ApplicationPickerSheet({
	onSelect,
}: {
	onSelect?: (application: PortalApplication) => void
}) {
	const { ActionSheet, BottomSheetTitleHeader, TableRowGroup, TableRow, Text } =
		Design
	const { BottomSheetScrollView } = Gorhom
	const [applications, setApplications] = useState<PortalApplication[]>([])
	const [loading, setLoading] = useState(true)
	const [busy, setBusy] = useState(false)
	const [createName, setCreateName] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [details, setDetails] = useState('')

	useEffect(() => {
		let mounted = true
		void listApplications()
			.then(result => {
				if (mounted) setApplications(result)
			})
			.catch(err => {
				if (!mounted) return
				setError(errorToText(err))
				setDetails(errorDetails(err))
			})
			.finally(() => {
				if (mounted) setLoading(false)
			})

		return () => {
			mounted = false
		}
	}, [])

	const selectApplication = async (application: PortalApplication) => {
		setBusy(true)
		setError(null)
		setDetails('')
		try {
			const { assets } = await verifyApplication(application.id)
			setSettings({ clientId: application.id })
			onSelect?.(application)
			showToast(
				assets.length > 0
					? `Using "${application.name}" — ${assets.length} asset${assets.length === 1 ? '' : 's'} available`
					: `Using "${application.name}"`,
			)
			closePickerSheet()
		} catch (err) {
			setError(errorToText(err))
			setDetails(errorDetails(err))
		} finally {
			setBusy(false)
		}
	}

	const create = async () => {
		const name = createName.trim()
		if (!name) {
			showToast('Enter an application name first')
			return
		}

		setBusy(true)
		setError(null)
		setDetails('')
		try {
			const application = await createApplication(name)
			setApplications(current => [application, ...current])
			setSettings({ clientId: application.id })
			onSelect?.(application)
			showToast(`Created and selected "${application.name}"`)
			closePickerSheet()
		} catch (err) {
			setError(errorToText(err))
			setDetails(errorDetails(err))
		} finally {
			setBusy(false)
		}
	}

	return (
		<ActionSheet
			scrollable
			header={<BottomSheetTitleHeader title="Your applications" />}
		>
			<BottomSheetScrollView keyboardShouldPersistTaps="handled">
				<TableRowGroup title="Your applications">
					{loading ? <TableRow label="Loading applications…" disabled /> : null}
					{!loading && !error && applications.length === 0 ? (
						<TableRow label="No applications found" disabled />
					) : null}
					{applications.map(application => (
						<TableRow
							key={application.id}
							label={application.name}
							subLabel={application.id}
							trailing={
								application.id === getSettings().clientId ? (
									<TableRow.TrailingText text="Selected" />
								) : (
									<TableRow.Arrow />
								)
							}
							disabled={busy || application.id === getSettings().clientId}
							onPress={() => void selectApplication(application)}
						/>
					))}
				</TableRowGroup>
				<TableRowGroup title="Create application">
					<TextInputRow
						label="Application name"
						value={createName}
						onChange={setCreateName}
						placeholder="Name shown in Discord"
						disabled={busy}
					/>
					<TableRow
						label={
							busy ? 'Creating application…' : 'Create and use application'
						}
						subLabel="Creates a Discord application and selects it"
						trailing={<TableRow.Arrow />}
						disabled={busy || !createName.trim()}
						onPress={() => void create()}
					/>
				</TableRowGroup>
				{error ? (
					<View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
						<Text variant="text-sm/medium" color="text-feedback-critical">
							Could not load applications: {error}
						</Text>
					</View>
				) : null}
				<ErrorDetails details={details} />
			</BottomSheetScrollView>
		</ActionSheet>
	)
}

export function openApplicationPickerSheet(
	onSelect?: (application: PortalApplication) => void,
) {
	ActionSheetActionCreators.openLazy(
		Promise.resolve({
			default: () => <ApplicationPickerSheet onSelect={onSelect} />,
		}),
		APPLICATION_PICKER_SHEET_KEY,
		{},
		'stack',
	)
}
