import { Tokens } from '@valenced/discord/common/tokens'
import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { beforeJSX } from '@valenced/react/jsx-runtime'
import { Children, createContext, createElement, useContext } from 'react'
import { StyleSheet, View } from 'react-native'
import { Roles } from '../../components/colors'
import type { ComponentType } from 'react'
import type { Restore } from './exports'

type InputFieldModule = {
	InputFieldContainer: ComponentType<any>
	useInputStyles: (options: Record<string, unknown>) => unknown
}

type InputFieldVariant = {
	variant: 'filled' | 'outlined'
	active: boolean
	error: boolean
}

const InputFieldVariantContext = createContext<InputFieldVariant | undefined>(
	undefined,
)

function ExpressiveInputFieldSurface(props: Record<string, any>) {
	const field = useContext(InputFieldVariantContext)
	if (field === undefined) return createElement(View, props)

	const radius = Tokens.default.radii.md
	const surfaceStyle =
		field.variant === 'outlined'
			? {
					minHeight: 56,
					backgroundColor: 'transparent',
					borderWidth: 1,
					borderColor: Tokens.default.colors.INPUT_BORDER_DEFAULT,
					borderRadius: 999,
				}
			: {
					minHeight: 56,
					backgroundColor: Roles.surfaceHighest(),
					borderWidth: 0,
					borderBottomWidth: 1,
					borderBottomColor: field.error
						? Tokens.default.colors.INPUT_BORDER_ERROR_DEFAULT
						: field.active
							? Tokens.default.colors.INPUT_BORDER_ACTIVE
							: Tokens.default.colors.INPUT_BORDER_DEFAULT,
					borderTopLeftRadius: radius,
					borderTopRightRadius: radius,
					borderBottomLeftRadius: 0,
					borderBottomRightRadius: 0,
				}
	// Discord renders its animated focus ring as the container's first child.
	const children =
		field.variant === 'filled'
			? Children.map(props.children, (child, index) =>
					index === 0 ? null : child,
				)
			: props.children

	return createElement(View, {
		...props,
		children,
		style: [props.style, surfaceStyle],
	})
}

export function patchInputFields(restores: Restore[]) {
	restores.push(
		beforeJSX(View, args => {
			const [, props, key] = args
			const style = StyleSheet.flatten(props.style)
			const isFieldContainer =
				style?.flexDirection === 'row' &&
				style.alignItems === 'center' &&
				typeof style.opacity === 'number' &&
				typeof style.flexGrow === 'number' &&
				(style.pointerEvents === 'auto' || style.pointerEvents === 'none')
			return isFieldContainer ? [ExpressiveInputFieldSurface, props, key] : args
		}),
	)

	return getModules(
		withProps<InputFieldModule>('InputFieldContainer', 'useInputStyles'),
		exports => {
			const { InputFieldContainer } = exports as InputFieldModule
			const ExpressiveInputFieldContainer = (props: Record<string, any>) => {
				const outlined = props.round === true || props.isFocused?.round === true
				const focusState = props.isFocused
				const status = props.status ?? focusState?.status
				return createElement(InputFieldVariantContext.Provider, {
					value: {
						variant: outlined ? 'outlined' : 'filled',
						active: focusState === true || focusState?.isFocused === true,
						error: status != null && status !== 'default',
					},
					children: createElement(InputFieldContainer, props),
				})
			}
			restores.push(
				beforeJSX(InputFieldContainer, args => {
					const [, props, key] = args
					return [ExpressiveInputFieldContainer, props, key]
				}),
			)
		},
		{ max: 1 },
	)
}
