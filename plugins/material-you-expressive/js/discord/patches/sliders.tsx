import { getModules } from '@valenced/modules/finders'
import { withName, withProps } from '@valenced/modules/finders/filters'
import { forwardRef } from 'react'
import { M3Slider } from '../../components/slider'
import { replaceExport } from './exports'
import type { ComponentType } from 'react'
import type { Exports, Restore } from './exports'

export function patchSliders(restores: Restore[]) {
	const cleanups = [
		getModules(
			withProps<Exports>('Slider'),
			exports => replaceExport(exports, 'Slider', () => M3Slider, restores),
			{ max: 4 },
		),
		getModules(
			withName('SliderComponent'),
			exports => {
				const module = exports as Exports
				const slider = module.default as ComponentType<any> & {
					render?: { name?: string }
				}
				if (slider?.render?.name !== 'SliderComponent') return

				replaceExport(
					module,
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
				)
			},
			{ max: 1, returnNamespace: true },
		),
	]
	return () => cleanups.forEach(cleanup => cleanup())
}
