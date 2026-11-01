import { lookupModuleWithImportedPath } from '@valenced/discord/utils/modules/finders'
import * as finders from '@valenced/modules/finders'
import { withName, withProps } from '@valenced/modules/finders/filters'
import * as metro from '@valenced/modules/metro'
import { getHost } from './api'
import type { AuthToken, SongSpotlightSettings } from '../types'

const OAUTH_MODAL_PATH = 'modules/oauth2/native/OAuth2AuthorizeModal.tsx'
const OAUTH_CLIENT_ID = '1157745434140344321'

interface OAuthModalProps {
	clientId: string
	scopes: string[]
	integrationType: 1
	permissions: bigint
	responseType: 'code'
	redirectUri: string
	cancelCompletesFlow: boolean
	callback(args: OAuthCallbackArgs): void
	dismissOAuthModal(): void
}

interface OAuthCallbackArgs {
	location?: string
	canceled?: boolean
	isAuthorized?:
		| boolean
		| ((result: {
				isAuthorized: boolean
				overrideSuccessCallback(location: string): void
		  }) => void)
}

interface RootModalApi {
	pushModal(options: unknown): void
	popModal(key: string): void
}

function findRootModalApi() {
	const result = finders.lookupModule(withProps('pushModal', 'popModal'))
	return result.length === 2
		? (result[0] as unknown as RootModalApi)
		: undefined
}

function loadOAuthModal() {
	let module = lookupModuleWithImportedPath<{ default?: unknown }>(
		OAUTH_MODAL_PATH,
	)
	if (module.length === 2) return module[0]?.default ?? module[0]

	const scopesId = finders.lookupModule(withProps('OAuth2Scopes'))?.[1]
	if (typeof scopesId !== 'number') return undefined

	const dependencies = new Map<number, number[]>()
	for (let id = 0, gap = 0; gap < 5000; id++) {
		const deps = metro.getModuleDependencies(id)
		if (!deps) {
			gap++
			continue
		}
		gap = 0
		dependencies.set(
			id,
			[...deps].filter(dep => typeof dep === 'number'),
		)
	}

	const dependents = (targets: Set<number>, minimum = 1) =>
		[...dependencies].filter(
			([, deps]) => deps.filter(dep => targets.has(dep)).length >= minimum,
		)
	const helpers = new Set(dependents(new Set([scopesId])).map(([id]) => id))
	const forms = new Set(
		dependents(helpers, 2)
			.filter(
				([id, deps]) =>
					!metro.isModuleInitialized(id) && deps.includes(scopesId),
			)
			.map(([id]) => id),
	)
	const screens = dependents(forms)
		.map(([id]) => id)
		.filter(id => !metro.isModuleInitialized(id))
		.slice(0, 4)

	for (const id of screens) {
		__r(id)
		module = lookupModuleWithImportedPath<{ default?: unknown }>(
			OAUTH_MODAL_PATH,
		)
		if (module.length === 2) return module[0]?.default ?? module[0]
	}

	return finders.lookupModule(withName('OAuth2AuthorizeModal'))?.[0]
}

export async function startOAuth(
	settings: Partial<SongSpotlightSettings>,
	saveToken: (token: AuthToken) => Promise<void>,
) {
	const host = getHost(settings)
	const modalApi = findRootModalApi()
	const oauthModal = loadOAuthModal()
	if (!modalApi || typeof oauthModal !== 'function')
		throw new Error("Couldn't open Discord's sign-in screen. Try again later.")

	return new Promise<void>((resolve, reject) => {
		let modalKey: string | undefined
		let finished = false
		let authorizationApproved = false
		let exchangeStarted = false
		const timeout = setTimeout(
			() => {
				finishWithError(new Error('Sign-in did not finish. Please try again.'))
			},
			5 * 60 * 1000,
		)
		const finishWithError = (error: Error) => {
			if (finished) return
			finished = true
			clearTimeout(timeout)
			reject(error)
		}
		async function exchangeLocation(location: string) {
			if (finished || exchangeStarted) return
			exchangeStarted = true
			try {
				const callbackUrl = new URL(location)
				const expectedUrl = new URL(`${host}api/auth/authorize`)
				if (
					callbackUrl.origin !== expectedUrl.origin ||
					callbackUrl.pathname !== expectedUrl.pathname
				)
					throw new Error('OAuth returned an unexpected redirect URL.')
				const separator = location.includes('?') ? '&' : '?'
				const response = await fetch(`${location}${separator}whois=vd-fork`)
				if (!response.ok)
					throw new Error(`Authorization failed (HTTP ${response.status}).`)
				const access = await response.text()
				const refresh = response.headers.get('X-Refresh-Token')
				if (!access || !refresh)
					throw new Error('Authorization response did not include both tokens.')
				await saveToken({ access, refresh })
				finished = true
				clearTimeout(timeout)
				resolve()
			} catch (error) {
				finishWithError(
					error instanceof Error ? error : new Error(String(error)),
				)
			}
		}
		const props: OAuthModalProps = {
			clientId: settings.clientId || OAUTH_CLIENT_ID,
			scopes: ['applications.commands', 'identify'],
			integrationType: 1,
			permissions: 0n,
			responseType: 'code',
			redirectUri: `${host}api/auth/authorize`,
			cancelCompletesFlow: false,
			callback: args => {
				if (finished || exchangeStarted) return
				if (args.location) {
					void exchangeLocation(args.location)
					return
				}
				if (typeof args.isAuthorized === 'function') {
					authorizationApproved = true
					args.isAuthorized({
						isAuthorized: true,
						overrideSuccessCallback: location =>
							void exchangeLocation(location),
					})
				} else if (args.canceled && !authorizationApproved) {
					finishWithError(new Error('Authorization was cancelled.'))
				}
			},
			dismissOAuthModal: () => {
				if (modalKey) modalApi.popModal(modalKey)
			},
		}

		modalKey = `song-spotlight-oauth-${Date.now()}`
		try {
			modalApi.pushModal({
				key: modalKey,
				modal: {
					key: modalKey,
					modal: oauthModal,
					animation: 'slide-up',
					shouldPersistUnderModals: false,
					closable: true,
					props,
				},
			})
		} catch (error) {
			finishWithError(error instanceof Error ? error : new Error(String(error)))
		}
	})
}
