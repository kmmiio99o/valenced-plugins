import type { UserData } from './types'

export function normalizeHost(host: string): string {
	const trimmed = host.trim()
	return trimmed.endsWith('/') ? trimmed : `${trimmed}/`
}

export async function loginWithUserId(host: string, userId: string): Promise<string> {
	const base = normalizeHost(host)
	try {
		const res = await fetch(`${base}api/auth/token?userId=${encodeURIComponent(userId)}`)
		if (res.ok) {
			const text = await res.text()
			if (text && text.trim()) return text.trim()
		}
	} catch {}

	try {
		const resPost = await fetch(`${base}api/auth/token`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ userId }),
		})
		if (resPost.ok) {
			const text = await resPost.text()
			if (text && text.trim()) return text.trim()
		}
	} catch {}

	try {
		const resAuth = await fetch(`${base}api/auth/authorize?userId=${encodeURIComponent(userId)}`)
		if (resAuth.ok) {
			const text = await resAuth.text()
			if (text && text.trim()) return text.trim()
		}
	} catch {}

	return `cs_${userId}_${Date.now()}`
}

export async function authorizeWithCode(host: string, code: string): Promise<string> {
	const base = normalizeHost(host)
	const res = await fetch(`${base}api/auth/authorize?code=${encodeURIComponent(code)}`)
	if (!res.ok) {
		const text = await res.text()
		throw new Error(text || `OAuth code authorization failed with status ${res.status}`)
	}
	return (await res.text()).trim()
}

export async function getData(host: string, token: string): Promise<UserData> {
	const base = normalizeHost(host)
	const res = await fetch(`${base}api/data`, {
		headers: {
			authorization: token,
		},
	})
	if (!res.ok) {
		const text = await res.text()
		throw new Error(text || `Fetch data failed with status ${res.status}`)
	}
	return await res.json()
}

export async function saveData(host: string, token: string, data: UserData): Promise<boolean> {
	const base = normalizeHost(host)
	const res = await fetch(`${base}api/data`, {
		method: 'PUT',
		headers: {
			'content-type': 'application/json',
			authorization: token,
		},
		body: JSON.stringify(data),
	})
	if (!res.ok) {
		const text = await res.text()
		throw new Error(text || `Save data failed with status ${res.status}`)
	}
	return true
}

export async function deleteData(host: string, token: string): Promise<boolean> {
	const base = normalizeHost(host)
	const res = await fetch(`${base}api/data`, {
		method: 'DELETE',
		headers: {
			authorization: token,
		},
	})
	if (!res.ok) {
		const text = await res.text()
		throw new Error(text || `Delete data failed with status ${res.status}`)
	}
	return true
}