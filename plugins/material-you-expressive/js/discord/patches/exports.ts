import type { ComponentType } from 'react'

export type Exports = Record<string, unknown>
export type Restore = () => void

export function replaceExport(
	exports: Exports,
	name: string,
	wrap: (original: ComponentType<any>) => ComponentType<any>,
	restores: Restore[],
) {
	const original = exports[name]
	const descriptor = Object.getOwnPropertyDescriptor(exports, name)
	if (!original || !descriptor?.writable) return

	const replacement = wrap(original as ComponentType<any>) as unknown as Exports
	for (const key of Object.keys(original))
		if (/^[A-Z]/.test(key)) replacement[key] = (original as Exports)[key]

	exports[name] = replacement
	restores.push(() => {
		exports[name] = original
	})
}
