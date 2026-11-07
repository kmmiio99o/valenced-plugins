import { getModuleWithImportedPath } from '@valenced/discord/utils/modules/finders'
import { instead } from '@valenced/patcher'
import { ReactNative } from '@valenced/react'
import type { MessageOrigin } from '../../types'

interface NativeMessageEvent {
	messageId?: unknown
	absoluteX?: unknown
	absoluteY?: unknown
	pageX?: unknown
	pageY?: unknown
	screenX?: unknown
	screenY?: unknown
	locationX?: unknown
	locationY?: unknown
	x?: unknown
	y?: unknown
	nativeEvent?: unknown
	touches?: unknown
	changedTouches?: unknown
	target?: unknown
}

interface MessageDataModule {
	getNativeSyntheticEventData(event: unknown): NativeMessageEvent
}

const MESSAGE_DATA_PATH =
	'modules/messages/native/snowflake/MessageDataSnowflakeUtils.tsx'
const ORIGIN_MAX_AGE_MS = 5000
const LOG_PREFIX = '[MessageContextMenu]'

const capturedOrigins = new Map<
	string,
	MessageOrigin & {
		capturedAt: number
		lookupCount: number
		source: string
	}
>()
let lastCoordinateMissLogAt = 0

function finiteCoordinate(value: unknown) {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function asEvent(value: unknown): NativeMessageEvent | undefined {
	return value != null && typeof value === 'object'
		? (value as NativeMessageEvent)
		: undefined
}

function getCoordinates(
	event: NativeMessageEvent,
	scope: 'payload' | 'input',
):
	| {
			origin: MessageOrigin
			source: string
	  }
	| undefined {
	let current: NativeMessageEvent | undefined = event
	for (let depth = 0; current != null && depth < 3; depth++) {
		const candidates = [
			{ event: current, source: depth === 0 ? scope : `${scope}:nativeEvent` },
			...(['touches', 'changedTouches'] as const).flatMap(key => {
				const touches = current?.[key]
				if (!Array.isArray(touches)) return []
				return touches
					.slice(0, 1)
					.map(touch => ({ event: asEvent(touch), source: `${scope}:${key}` }))
					.filter(
						(
							candidate,
						): candidate is {
							event: NativeMessageEvent
							source: string
						} => candidate.event != null,
					)
			}),
		]

		for (const candidate of candidates) {
			for (const [coordinate, xValue, yValue] of [
				['absolute', candidate.event.absoluteX, candidate.event.absoluteY],
				['page', candidate.event.pageX, candidate.event.pageY],
				['screen', candidate.event.screenX, candidate.event.screenY],
			]) {
				const x = finiteCoordinate(xValue)
				const y = finiteCoordinate(yValue)
				if (x !== undefined && y !== undefined)
					return {
						origin: { x, y },
						source: `${candidate.source}:${coordinate}`,
					}
			}
		}
		current = asEvent(current.nativeEvent)
	}
}

function hasCoordinatePair(event: NativeMessageEvent | undefined) {
	if (!event)
		return { absolute: false, page: false, screen: false, local: false }
	return {
		absolute:
			finiteCoordinate(event.absoluteX) !== undefined &&
			finiteCoordinate(event.absoluteY) !== undefined,
		page:
			finiteCoordinate(event.pageX) !== undefined &&
			finiteCoordinate(event.pageY) !== undefined,
		screen:
			finiteCoordinate(event.screenX) !== undefined &&
			finiteCoordinate(event.screenY) !== undefined,
		local:
			(finiteCoordinate(event.locationX) !== undefined &&
				finiteCoordinate(event.locationY) !== undefined) ||
			(finiteCoordinate(event.x) !== undefined &&
				finiteCoordinate(event.y) !== undefined),
	}
}

function getLocalTouch(event: NativeMessageEvent, scope: 'payload' | 'input') {
	let current: NativeMessageEvent | undefined = event
	let inheritedTarget: number | undefined
	for (let depth = 0; current != null && depth < 3; depth++) {
		const currentTarget = finiteCoordinate(current.target) ?? inheritedTarget
		const candidates = [
			{
				event: current,
				source: depth === 0 ? scope : `${scope}:nativeEvent`,
				target: currentTarget,
			},
			...(['touches', 'changedTouches'] as const).flatMap(key => {
				const touches = current?.[key]
				if (!Array.isArray(touches)) return []
				return touches
					.slice(0, 1)
					.map(touch => {
						const event = asEvent(touch)
						return {
							event,
							source: `${scope}:${key}`,
							target: finiteCoordinate(event?.target) ?? currentTarget,
						}
					})
					.filter(
						(
							candidate,
						): candidate is {
							event: NativeMessageEvent
							source: string
							target: number | undefined
						} => candidate.event != null,
					)
			}),
		]

		for (const candidate of candidates) {
			const x =
				finiteCoordinate(candidate.event.locationX) ??
				finiteCoordinate(candidate.event.x)
			const y =
				finiteCoordinate(candidate.event.locationY) ??
				finiteCoordinate(candidate.event.y)
			const target = candidate.target
			if (x !== undefined && y !== undefined && target !== undefined)
				return { target, x, y, source: `${candidate.source}:local` }
		}
		inheritedTarget = currentTarget
		current = asEvent(current.nativeEvent)
	}
}

function storeOrigin(
	messageId: string,
	origin: MessageOrigin,
	capturedAt: number,
	source: string,
) {
	for (const [id, value] of capturedOrigins) {
		if (capturedAt - value.capturedAt > ORIGIN_MAX_AGE_MS)
			capturedOrigins.delete(id)
	}
	capturedOrigins.set(messageId, {
		...origin,
		capturedAt,
		lookupCount: 0,
		source,
	})
}

export function getLongPressOrigin(
	messageId?: string,
): MessageOrigin | undefined {
	if (messageId == null) {
		console.log(LOG_PREFIX, 'origin unavailable', {
			reason: 'missing-message-id',
		})
		return
	}
	const origin = capturedOrigins.get(messageId)
	if (!origin) {
		console.log(LOG_PREFIX, 'origin unavailable', { reason: 'not-captured' })
		return
	}
	const ageMs = Date.now() - origin.capturedAt
	if (ageMs > ORIGIN_MAX_AGE_MS) {
		capturedOrigins.delete(messageId)
		console.log(LOG_PREFIX, 'origin unavailable', { reason: 'expired', ageMs })
		return
	}
	origin.lookupCount++
	console.log(LOG_PREFIX, 'origin lookup', {
		source: origin.source,
		ageMs,
		lookupCount: origin.lookupCount,
		x: Math.round(origin.x),
		y: Math.round(origin.y),
	})
	return { x: origin.x, y: origin.y }
}

export function installLongPressOriginCapture(
	addCleanup: (cleanup: () => void) => void,
) {
	addCleanup(
		getModuleWithImportedPath<MessageDataModule>(MESSAGE_DATA_PATH, module => {
			console.log(LOG_PREFIX, 'origin hook installed')
			addCleanup(
				instead(
					module,
					'getNativeSyntheticEventData',
					function (args, original) {
						const data = Reflect.apply(original, this, args)
						if (data == null || typeof data !== 'object') return data

						const event = data as NativeMessageEvent
						const messageId = event.messageId
						if (typeof messageId !== 'string') return data
						const input = asEvent(args[0])
						const coordinates =
							getCoordinates(event, 'payload') ??
							(input ? getCoordinates(input, 'input') : undefined)
						if (coordinates) {
							storeOrigin(
								messageId,
								coordinates.origin,
								Date.now(),
								coordinates.source,
							)
							return data
						}

						const localTouch =
							getLocalTouch(event, 'payload') ??
							(input ? getLocalTouch(input, 'input') : undefined)
						if (
							localTouch != null &&
							Number.isInteger(localTouch.target) &&
							typeof ReactNative.UIManager?.measureInWindow === 'function'
						) {
							const capturedAt = Date.now()
							ReactNative.UIManager.measureInWindow(
								localTouch.target,
								(x, y) => {
									if (Date.now() - capturedAt > ORIGIN_MAX_AGE_MS) return
									storeOrigin(
										messageId,
										{ x: x + localTouch.x, y: y + localTouch.y },
										capturedAt,
										localTouch.source,
									)
								},
							)
							return data
						}

						const now = Date.now()
						if (now - lastCoordinateMissLogAt > 1000) {
							lastCoordinateMissLogAt = now
							console.log(LOG_PREFIX, 'native event has no coordinate pair', {
								payload: hasCoordinatePair(event),
								input: hasCoordinatePair(input),
								payloadKeys: Object.keys(event).slice(0, 12),
								inputKeys: input ? Object.keys(input).slice(0, 12) : [],
							})
						}
						return data
					},
				),
			)
		}),
	)
	addCleanup(() => {
		capturedOrigins.clear()
	})
}
