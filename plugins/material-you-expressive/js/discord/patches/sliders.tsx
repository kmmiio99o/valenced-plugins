import { getModules } from '@valenced/modules/finders'
import {
	createFilterGenerator,
	withProps,
} from '@valenced/modules/finders/filters'
import { forwardRef } from 'react'
import { M3Slider } from '../../components/slider'
import { replaceExport } from './exports'
import type { Exports, Restore } from './exports'

const withNativeSliderComponent = createFilterGenerator<[]>(
	(_args, _id, exports) => {
		if (!exports || typeof exports !== 'object') return false
		const slider = (
			exports as { default?: { $$typeof?: symbol; render?: { name?: string } } }
		).default
		return (
			slider?.$$typeof === Symbol.for('react.forward_ref') &&
			slider.render?.name === 'SliderComponent'
		)
	},
	() => 'native-slider-component',
)()

export function patchSliders(
	restores: Restore[],
	reportError: (error: unknown) => void,
) {
	const cleanups = [
		getModules(
			withProps<Exports>('Slider'),
			exports =>
				replaceExport(exports, 'Slider', () => M3Slider, restores, reportError),
			{ max: 4 },
		),
		getModules(
			withNativeSliderComponent,
			module =>
				replaceExport(
					module as Exports,
					'default',
					Original =>
						forwardRef((props: any, ref) =>
							props.onValueChange ||
							props.onSlidingComplete ||
							props.onChange ||
							props.onChangeEnd ? (
								<M3Slider {...props} />
							) : (
								<Original {...props} ref={ref} />
							),
						),
					restores,
					reportError,
				),
			{ max: 1, returnNamespace: true },
		),
	]
	return () => cleanups.forEach(cleanup => cleanup())
}
