import { Design } from '@valenced/discord/design'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

export default function TextInputRow({
	label,
	value,
	onChange,
	placeholder,
	subLabel,
	disabled,
	isClearable,
	commitOnBlur = false,
}: {
	label: string
	value: string
	onChange: (value: string) => void
	placeholder?: string
	subLabel?: string
	disabled?: boolean
	isClearable?: boolean
	commitOnBlur?: boolean
}) {
	const { TableRow, TextInput, Text } = Design
	const [draft, setDraft] = useState(value)

	useEffect(() => {
		setDraft(value)
	}, [value])

	const labelNode = (
		<View style={{ flex: 1, gap: 4, paddingVertical: 4 }}>
			<Text variant="text-md/semibold">{label}</Text>
			<TextInput
				placeholder={placeholder}
				value={commitOnBlur ? draft : value}
				onChange={next => {
					if (commitOnBlur) {
						setDraft(next)
					} else {
						onChange(next)
					}
				}}
				onBlur={commitOnBlur ? () => onChange(draft) : undefined}
				isDisabled={disabled}
				isClearable={isClearable}
			/>
			{subLabel ? (
				<Text variant="text-sm/medium" color="text-muted">
					{subLabel}
				</Text>
			) : null}
		</View>
	)

	return <TableRow disabled={disabled} label={labelNode} />
}
