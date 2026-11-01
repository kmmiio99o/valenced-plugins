import { createElement } from 'react'
import ProfileSongs from '../../components/profile/ProfileSongs'

const SONG_TAB_ID = 'song-spotlight'

export interface ProfileTabItem {
	id: string
	label: string | null
	page: unknown
}

function findUserId(
	node: unknown,
	seen = new Set<object>(),
): string | undefined {
	if (!node || typeof node !== 'object' || seen.has(node)) return
	seen.add(node)

	const props = (node as { props?: Record<string, unknown> }).props
	if (typeof props?.userId === 'string' && props.userId) return props.userId
	const user = props?.user as { id?: unknown } | undefined
	if (typeof user?.id === 'string' && user.id) return user.id

	const children = props?.children
	for (const child of Array.isArray(children) ? children : [children]) {
		const userId = findUserId(child, seen)
		if (userId) return userId
	}
}

export function addSongsTab(items: ProfileTabItem[]) {
	if (
		!items.some(item => item.id === 'main') ||
		items.some(item => item.id === SONG_TAB_ID)
	) {
		return items
	}

	const mainPage = items.find(item => item.id === 'main')?.page
	const userId = findUserId(mainPage)
	if (!userId) return items

	const mainIndex = items.findIndex(item => item.id === 'main')
	return [
		...items.slice(0, mainIndex + 1),
		{
			id: SONG_TAB_ID,
			label: 'Song Spotlight',
			page: createElement(ProfileSongs, { userId }),
		},
		...items.slice(mainIndex + 1),
	]
}
