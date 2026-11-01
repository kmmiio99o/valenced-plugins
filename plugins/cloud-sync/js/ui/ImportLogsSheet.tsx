import { ActionSheetActionCreators } from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import { BottomSheet as Gorhom } from '@valenced/externals/gorhom'
import { useState } from 'react'
import type { LogScope } from '../sync'

export interface LogEntry {
	id: string
	time: string
	scope: LogScope
	message: string
}

export function openImportLogsSheet(options: {
	getLogs: () => LogEntry[]
	onClearLogs: () => void
}) {
	ActionSheetActionCreators.openLazy(
		Promise.resolve({
			default: () => {
				const [logs, setLogs] = useState<LogEntry[]>(options.getLogs())
				const { ActionSheet, ActionSheetRow, BottomSheetTitleHeader } = Design
				const { BottomSheetScrollView } = Gorhom

				const handleClear = () => {
					options.onClearLogs()
					setLogs([])
				}

				return (
					<ActionSheet
						scrollable
						header={
							<BottomSheetTitleHeader
								title="CloudSync Live Logs"
								subtitle={`${logs.length} logged entries recorded`}
							/>
						}
					>
						<BottomSheetScrollView>
							<ActionSheetRow.Group>
								{logs.length === 0 ? (
									<ActionSheetRow
										label="No log entries recorded yet."
										disabled
									/>
								) : (
									logs.map(entry => (
										<ActionSheetRow
											key={entry.id}
											label={`${entry.time} · ${entry.scope.toUpperCase()}`}
											subLabel={entry.message}
										/>
									))
								)}
								{logs.length > 0 && (
									<ActionSheetRow
										label="Clear Logs"
										variant="danger"
										onPress={handleClear}
									/>
								)}
							</ActionSheetRow.Group>
						</BottomSheetScrollView>
					</ActionSheet>
				)
			},
		}),
		'cloudsync-logs-sheet',
		{},
	)
}
