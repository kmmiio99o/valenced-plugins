import type { ComponentType, ReactNode } from 'react'

export interface MessageOrigin {
	x: number
	y: number
}

export interface ActionSheetActionCreators {
	hideActionSheet(key?: string): void
	hideAllActionSheets(): void
}

export interface MessageContextMenuProps {
	children: ReactNode
	header?: ReactNode
	origin?: MessageOrigin
	sheetExpansion: SheetExpansionSignal
	actionSheetActionCreators: ActionSheetActionCreators
}

export interface SheetExpansionSignal {
	subscribe(listener: () => void): () => void
	expand(): void
	reset(): void
}

export interface ActionSheetProps {
	children?: ReactNode
	header?: ReactNode
	backdropOpacity?: number
	backgroundStyles?: object
	bodyStyles?: object
	contentStyles?: object
	handleDisabled?: boolean
	onExpand?: () => void
	scrollable?: boolean
	showGradient?: boolean
	startExpanded?: boolean
}

export interface ActionSheetModule {
	ActionSheet: ComponentType<ActionSheetProps>
}

export interface ActionSheetActionCreatorsModule {
	default: ActionSheetActionCreators
}

export interface ActionSheetStoreModule {
	default: {
		getKey(): string | undefined
	}
}

export interface EmojiReactionRowButtonsModule {
	EmojiReactionRowButton: (...args: unknown[]) => unknown
	EmojiPickerRowButton: (...args: unknown[]) => unknown
}

export interface LongPressSheetModule {
	default: (...args: unknown[]) => unknown
}

export interface ElementProps {
	children?: ReactNode
	[key: string]: unknown
}

export interface DiscordDesignModule {
	BackgroundBlurView: ComponentType<{
		children?: ReactNode
		blurTheme?: string
		style?: object
	}>
	useToken(token: unknown): string
}

export interface DiscordTokensModule {
	default: {
		colors: Record<string, unknown>
		radii: Record<string, number>
		shadows: Record<string, object>
	}
}
