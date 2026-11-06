import { lookupModule, lookupModules } from '@valenced/modules/finders'
import { withDependencies, withProps } from '@valenced/modules/finders/filters'

/** What the native picker resolves to; `portal.ts` reads `base64`. */
export type PickedImage = {
	base64?: string
	data?: string
	originalMd5?: string
	/** Discord returns either a path or a `{ uri }` object depending on platform. */
	uri?: string | { uri?: string; [key: string]: unknown }
	fileName?: string
	type?: string
	mimeType?: string
	width?: number
	height?: number
	[key: string]: unknown
}

type OpenImagePicker = (options: {
	size: number
}) => Promise<PickedImage | undefined>

type PickerNamespace = {
	openImagePicker?: OpenImagePicker
	default?: { openImagePicker?: OpenImagePicker }
}

/**
 * Dependents of `utils/native/UploadUtils`, pinned by export names verified not to
 * be minified. Ordered rarest-first: a rare anchor yields a small match set, which
 * keeps the forced initialisation cheap.
 *
 * `ImageConversionDecision` is imported only by upload/media code, so it drags in a
 * handful of modules. `PremiumUtils` is common — roughly 150 dependents on the
 * build this was written against — but it is the one that reliably resolves, since
 * by the time anyone reaches an upload button the client is fully booted and those
 * modules are initialised anyway, which makes `initialize: true` nearly free.
 */
const ANCHORS = ['shouldConvertToJPG', 'getPremiumBranding']

/**
 * Ceiling on how many modules one anchor may force-load. The scan stops at the
 * first verified match, so this only bounds the pathological case.
 */
const MAX_INITIALIZE = 400

let cached: OpenImagePicker | undefined

/** Pull `openImagePicker` out of a namespace, bound to its owner. */
function pickerFrom(namespace: unknown): OpenImagePicker | undefined {
	if (!namespace || typeof namespace !== 'object') return undefined
	const exports = namespace as PickerNamespace
	if (typeof exports.openImagePicker === 'function') {
		return exports.openImagePicker.bind(exports)
	}
	const inner = exports.default
	if (inner && typeof inner.openImagePicker === 'function') {
		return inner.openImagePicker.bind(inner)
	}
	return undefined
}

function findAnchor(name: string): number | null {
	const [, id] = lookupModule(withProps(name))
	return typeof id === 'number' ? id : null
}

function scan(): OpenImagePicker | undefined {
	for (const anchor of ANCHORS) {
		const id = findAnchor(anchor)
		if (id === null) continue

		const dependents = withDependencies(withDependencies.unordered([id]))
		let scanned = 0
		for (const [namespace] of lookupModules(dependents, {
			initialize: true,
			returnNamespace: true,
		})) {
			if (++scanned > MAX_INITIALIZE) break
			const picker = pickerFrom(namespace)
			if (picker) {
				console.log(
					'[CustomRPC] image picker resolved',
					JSON.stringify({ anchor, id, scanned }),
				)
				return picker
			}
		}
	}

	console.log(
		'[CustomRPC] image picker unavailable',
		JSON.stringify({ anchors: ANCHORS }),
	)
	return undefined
}

function resolve(): OpenImagePicker | undefined {
	if (cached) return cached

	const [namespace] = lookupModule(withProps('openImagePicker'), {
		returnNamespace: true,
	})
	const picker = pickerFrom(namespace)
	if (picker) {
		cached = picker
		return picker
	}

	cached = scan()
	return cached
}

/** Whether a picker is available, to tell a cancellation apart from a failure. */
export function isImagePickerAvailable(): boolean {
	return !!resolve()
}

/**
 * Open Discord's native image picker. Resolves to `undefined` when the user
 * cancels or no picker could be resolved; the picker shows its own toasts for
 * cancellations and permission denials.
 */
export async function pickImage(size = 512): Promise<PickedImage | undefined> {
	const openImagePicker = resolve()
	if (!openImagePicker) return undefined

	return (await openImagePicker({ size })) ?? undefined
}
