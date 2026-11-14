import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { beforeJSX } from '@valenced/react/jsx-runtime'
import { StyleSheet } from 'react-native'
import { M3Fab } from '../../components/fab'
import { replaceComponentByName } from './named'
import type { ComponentType } from 'react'
import type { Restore } from './exports'

type BaseTextButtonModule = {
	BaseTextButton: ComponentType<any>
}

function patchCollapsibleFabShape(restores: Restore[]) {
	return getModules(
		withProps<BaseTextButtonModule>('BaseTextButton'),
		exports => {
			const { BaseTextButton } = exports as BaseTextButtonModule
			restores.push(
				beforeJSX(BaseTextButton, args => {
					const [, props, key] = args
					const style = StyleSheet.flatten(props.style)
					const isFloatingActionButton =
						props.variant === 'primary' &&
						props.size === 'lg' &&
						props.icon != null &&
						props.pillStyle != null &&
						style?.position === 'absolute' &&
						typeof style.right === 'number' &&
						typeof style.bottom === 'number'

					return isFloatingActionButton
						? [
								BaseTextButton,
								{
									...props,
									pillStyle: [props.pillStyle, { borderRadius: 16 }],
								},
								key,
							]
						: args
				}),
			)
		},
		{ max: 1, returnNamespace: true },
	)
}

export function patchFloatingActionButtons(
	restores: Restore[],
	reportError: (error: unknown) => void,
) {
	const cleanups = [
		replaceComponentByName(
			'FloatingActionButton',
			M3Fab,
			restores,
			reportError,
		),
		patchCollapsibleFabShape(restores),
	]
	return () => cleanups.forEach(cleanup => cleanup())
}
