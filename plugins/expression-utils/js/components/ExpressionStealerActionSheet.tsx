import { ActionSheetActionCreators } from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import { BottomSheet as Gorhom } from '@valenced/externals/gorhom'
import { useState } from 'react'
import { View } from 'react-native'
import { getGuilds, ServerRow } from './stealer/ServerRows'
import { expressionName } from './stealer/types'
import type { CloneableExpression } from './stealer/types'

function ExpressionStealer({
	expression,
}: {
	expression: CloneableExpression
}) {
	const initialName = expressionName(expression)
	const [name, setName] = useState(initialName)
	const { ActionSheet, ActionSheetRow, BottomSheetTitleHeader, TextInput } =
		Design
	const { BottomSheetScrollView } = Gorhom
	const guilds = getGuilds()
	const isEmoji = expression.kind === 'emoji'

	return (
		<ActionSheet
			scrollable
			header={
				<BottomSheetTitleHeader
					title={isEmoji ? `Clone :${initialName}:` : `Clone ${initialName}`}
					subtitle="Choose a server where you can manage expressions"
				/>
			}
		>
			<BottomSheetScrollView keyboardShouldPersistTaps="handled">
				<ActionSheetRow.Group>
					<View style={{ padding: 16 }}>
						<TextInput
							label={isEmoji ? 'Emoji Name' : 'Sticker Name'}
							value={name}
							onChange={setName}
							maxLength={isEmoji ? 32 : 30}
						/>
					</View>
				</ActionSheetRow.Group>
				<View style={{ height: 12 }} />
				<ActionSheetRow.Group>
					{guilds.length === 0 ? (
						<ActionSheetRow label="No servers available for expression management." />
					) : (
						guilds.map(guild => (
							<ServerRow
								key={guild.id}
								guild={guild}
								expression={expression}
								name={name.trim() || initialName}
							/>
						))
					)}
				</ActionSheetRow.Group>
			</BottomSheetScrollView>
		</ActionSheet>
	)
}

export function openExpressionStealer(expression: CloneableExpression) {
	ActionSheetActionCreators.openLazy(
		Promise.resolve({
			default: () => <ExpressionStealer expression={expression} />,
		}),
		'expression-utils-clone',
		{},
		'stack',
	)
}
