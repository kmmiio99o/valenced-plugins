export interface Settings {
	avatarShapes: boolean
	expressiveCorners: boolean
	expressiveButtons: boolean
	expressiveSwitches: boolean
	expressiveSliders: boolean
	expressiveGroups: boolean
	expressiveRowTitles: boolean
	expressiveRowIcons: boolean
	expressiveFloatingActionButtons: boolean
	expressiveRadioButtons: boolean
	expressiveChatInput: boolean
	expressiveHeaders: boolean
	expressiveMessageRows: boolean
	expressiveTabs: boolean
	expressiveGuilds: boolean
}

export const DefaultSettings: Settings = {
	avatarShapes: true,
	expressiveCorners: true,
	expressiveButtons: true,
	expressiveSwitches: true,
	expressiveSliders: true,
	expressiveGroups: true,
	expressiveRowTitles: true,
	expressiveRowIcons: true,
	expressiveFloatingActionButtons: true,
	expressiveRadioButtons: true,
	expressiveChatInput: true,
	expressiveHeaders: true,
	expressiveMessageRows: true,
	expressiveTabs: true,
	expressiveGuilds: true,
}

export function readSettings(value: object | undefined): Settings {
	const stored = (value ?? {}) as Record<string, unknown>
	const readBoolean = (key: string, fallback: boolean) =>
		typeof stored[key] === 'boolean' ? stored[key] : fallback
	const featureDefault = readBoolean('expressiveComponents', true)

	return {
		avatarShapes: readBoolean('avatarShapes', DefaultSettings.avatarShapes),
		expressiveCorners: readBoolean('expressiveCorners', featureDefault),
		expressiveButtons: readBoolean('expressiveButtons', featureDefault),
		expressiveSwitches: readBoolean('expressiveSwitches', featureDefault),
		expressiveSliders: readBoolean('expressiveSliders', featureDefault),
		expressiveGroups: readBoolean('expressiveGroups', featureDefault),
		expressiveRowTitles: readBoolean('expressiveRowTitles', featureDefault),
		expressiveRowIcons: readBoolean('expressiveRowIcons', featureDefault),
		expressiveFloatingActionButtons: readBoolean(
			'expressiveFloatingActionButtons',
			featureDefault,
		),
		expressiveRadioButtons: readBoolean(
			'expressiveRadioButtons',
			featureDefault,
		),
		expressiveChatInput: readBoolean('expressiveChatInput', featureDefault),
		expressiveHeaders: readBoolean('expressiveHeaders', featureDefault),
		expressiveMessageRows: readBoolean('expressiveMessageRows', featureDefault),
		expressiveTabs: readBoolean('expressiveTabs', featureDefault),
		expressiveGuilds: readBoolean('expressiveGuilds', featureDefault),
	}
}
