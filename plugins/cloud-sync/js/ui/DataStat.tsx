import { Design } from '@valenced/discord/design'

export default function DataStat({
	count,
	label,
}: {
	count: string | number
	label: string
}) {
	const { Card, Stack, Text } = Design

	return (
		<Card
			variant="secondary"
			style={{
				paddingHorizontal: 10,
				paddingVertical: 12,
				minWidth: 72,
				flex: 1,
				marginHorizontal: 3,
			}}
		>
			<Stack spacing={4} align="center">
				<Text variant="heading-md/bold">{count}</Text>
				<Text variant="text-xs/medium">{label}</Text>
			</Stack>
		</Card>
	)
}
