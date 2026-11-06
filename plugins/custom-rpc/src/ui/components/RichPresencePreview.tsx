import { Design } from '@valenced/discord/design'
import { lookupGeneratedIconComponent } from '@valenced/utils/discord'
import { Image, View } from 'react-native'
import { ACTIVITY_LABELS, DEFAULT_NAME } from '../../constants'
import { formatElapsed, formatRemaining } from '../../lib/elapsed'
import { getImagePreviewUri } from '../../lib/state'
import type { CustomRpcStorage } from '../../types'

const styles = {
	container: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 8,
		gap: 8,
	},
	card: {
		padding: 16,
		gap: 12,
	},
	body: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
	},
	imageContainer: {
		position: 'relative',
		width: 60,
		height: 60,
	},
	largeImage: {
		width: '100%',
		height: '100%',
		borderRadius: 8,
	},
	smallImageFrame: {
		position: 'absolute',
		right: -4,
		bottom: -4,
		width: 28,
		height: 28,
		padding: 2,
		borderRadius: 16,
	},
	smallImage: {
		width: 24,
		height: 24,
		borderRadius: 12,
	},
	content: {
		flex: 1,
		gap: 4,
	},
	buttons: {
		gap: 8,
	},
} as const

export default function RichPresencePreview({
	settings,
}: {
	settings: CustomRpcStorage
}) {
	const { Button, Card, Text } = Design
	const UnknownGameIcon = lookupGeneratedIconComponent('UnknownGameIcon')
	const appName = settings.applicationName || DEFAULT_NAME
	const largeImage = getImagePreviewUri(settings.largeImage, settings.clientId)
	const smallImage = getImagePreviewUri(settings.smallImage, settings.clientId)
	const headline = settings.details || appName
	const secondary = settings.state || (settings.details ? settings.details : '')
	const buttons = settings.buttons.filter(
		button => button.enabled && button.label && button.url,
	)

	return (
		<View style={styles.container}>
			<Text variant="text-sm/semibold" color="text-muted">
				Rich Presence preview{settings.enabled ? '' : ' · Disabled'}
			</Text>
			<Card variant="secondary" shadow="low" style={styles.card}>
				<Text variant="text-sm/semibold" lineClamp={1}>
					{ACTIVITY_LABELS[settings.activityType] ?? 'Playing'}
				</Text>
				<View style={styles.body}>
					<View style={styles.imageContainer}>
						{largeImage ? (
							<Image
								source={{ uri: largeImage }}
								style={styles.largeImage}
								resizeMode="cover"
							/>
						) : UnknownGameIcon ? (
							<UnknownGameIcon style={styles.largeImage} />
						) : null}
						{smallImage ? (
							<Card
								variant="secondary"
								border="none"
								style={styles.smallImageFrame}
							>
								<Image
									source={{ uri: smallImage }}
									style={styles.smallImage}
									resizeMode="cover"
								/>
							</Card>
						) : null}
					</View>
					<View style={styles.content}>
						<Text variant="text-md/semibold" lineClamp={1}>
							{headline}
						</Text>
						{secondary ? (
							<Text variant="text-xs/medium" lineClamp={1}>
								{secondary}
							</Text>
						) : null}
					</View>
				</View>
				{settings.showTimestamp ? (
					<View>
						<Text variant="text-xs/medium" color="text-muted">
							{formatElapsed(settings.timestampStart)}
							{settings.timestampEnd
								? ` · ${formatRemaining(settings.timestampEnd)}`
								: ''}
						</Text>
					</View>
				) : null}
				{buttons.length > 0 ? (
					<View style={styles.buttons}>
						{buttons.map((button, index) => (
							<Button
								key={`${index}-${button.label}`}
								text={button.label}
								variant="secondary"
							/>
						))}
					</View>
				) : null}
			</Card>
		</View>
	)
}
