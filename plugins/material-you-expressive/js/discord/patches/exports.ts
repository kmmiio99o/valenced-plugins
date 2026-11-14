import type { ComponentType } from 'react'

export type Exports = Record<string, unknown>
export type Restore = () => void

export function replaceProperty(
	exports: Exports,
	name: string,
	replacement: unknown,
	restores: Restore[],
) {
	const descriptor = Object.getOwnPropertyDescriptor(exports, name)
	if (!descriptor || (!descriptor.writable && !descriptor.configurable))
		return false

	if (descriptor.writable) exports[name] = replacement
	else {
		Object.defineProperty(exports, name, {
			configurable: true,
			enumerable: descriptor.enumerable,
			writable: true,
			value: replacement,
		})
	}

	restores.push(() => Object.defineProperty(exports, name, descriptor))
	return true
}

export function replaceExport(
	exports: Exports,
	name: string,
	wrap: (original: ComponentType<any>) => ComponentType<any>,
	restores: Restore[],
	reportError: (error: unknown) => void,
) {
	const original = exports[name]
	if (!original) {
		reportError(new Error(`Cannot patch missing export "${name}".`))
		return
	}

	const replacement = wrap(original as ComponentType<any>) as unknown as Exports
	for (const key of Object.keys(original))
		if (/^[A-Z]/.test(key)) replacement[key] = (original as Exports)[key]

	if (!replaceProperty(exports, name, replacement, restores))
		reportError(new Error(`Cannot replace non-configurable export "${name}".`))
}
