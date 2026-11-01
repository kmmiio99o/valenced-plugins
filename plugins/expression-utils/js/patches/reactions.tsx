import { getModuleWithImportedPath } from '@valenced/discord/utils/modules/finders'
import { after } from '@valenced/patcher'
import { useEffect } from 'react'
import { Pressable } from 'react-native'
import { openEmojiActionSheet } from '../utils/openEmojiActionSheet'
import type { FC, ReactElement, ReactNode } from 'react'
import type { ElementLike } from './reactTree'

interface Reaction {
	emoji?: { id?: string; name?: string; animated?: boolean }
}

interface TabsRow {
	props: {
		tabs: ReactNode[]
		onSelect(index: number): void
	}
}

type AddCleanup = (cleanup: () => void) => void
type ReportError = (error: unknown) => void

export function installReactionPatch(
	addCleanup: AddCleanup,
	reportError: ReportError,
) {
	addCleanup(
		getModuleWithImportedPath<{
			MessageReactionsContent: FC
		}>('modules/reactions/native/MessageReactionsContent.tsx', module => {
			addCleanup(
				after(module, 'MessageReactionsContent', result => {
					const header = (result as ElementLike)?.props?.header as
						| { type?: (...args: unknown[]) => unknown }
						| undefined
					if (!header || typeof header.type !== 'function') return result
					const unpatchHeader = after(
						header as { type: (...args: unknown[]) => unknown },
						'type',
						headerResult => {
							useEffect(() => unpatchHeader, [])
							try {
								const children = (headerResult as ElementLike)?.props
									?.children as ElementLike[] | undefined
								const tabsRow = children?.[0] as TabsRow | undefined
								if (!Array.isArray(tabsRow?.props?.tabs)) return headerResult
								tabsRow.props.tabs = tabsRow.props.tabs.map((node, index) => {
									const tab = node as ReactElement<{
										reaction?: Reaction
										index?: number
									}>
									const reaction = tab.props?.reaction?.emoji
									return (
										<Pressable
											key={index}
											onPress={() =>
												tabsRow.props.onSelect(tab.props.index ?? index)
											}
											onLongPress={() => {
												if (reaction?.id && reaction.name) {
													openEmojiActionSheet({
														id: reaction.id,
														name: reaction.name,
														animated: reaction.animated,
													})
												}
											}}
										>
											{tab}
										</Pressable>
									)
								})
							} catch (error) {
								reportError(
									`Failed to add reaction emoji actions: ${String(error)}`,
								)
							}
							return headerResult
						},
					)
					return result
				}),
			)
		}),
	)
}
