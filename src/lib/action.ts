import Masonry from 'masonry-layout';
import type { Action } from 'svelte/action';
import equal from 'lodash.isequal';
import type { MasonryActionParameters } from './types';
import { getMasonryOptionsFromParameters } from './util';

const defaultParams: Partial<MasonryActionParameters> = {
	itemSelector: '.grid-item',
	alwaysReloadAndLayoutOnUpdate: true,
	initLayout: false
};

const masonry = ((node: HTMLElement, parameters: MasonryActionParameters) => {
	const params = { ...defaultParams, ...parameters };
	let options = getMasonryOptionsFromParameters(params);

	function initialize(parameters: MasonryActionParameters) {
		const options = getMasonryOptionsFromParameters(parameters);
		const inst = new Masonry(node, options);

		if (parameters.onLayoutComplete) {
			inst.on?.('layoutComplete', parameters.onLayoutComplete);
		}

		if (parameters.onInitialized) {
			inst.once?.('layoutComplete', (items: any[]) => {
				return parameters.onInitialized?.(instance, items);
			});
		}

		return inst;
	}

	let instance = initialize(params);

	instance.layout?.();

	return {
		update(newParameters: MasonryActionParameters) {
			const newParams = { ...defaultParams, ...newParameters };
			const newOptions = getMasonryOptionsFromParameters(newParams);
			const optionsChanged = !equal(options, newOptions);
			const itemsChanged = !equal(newParams.items, params.items);

			if (optionsChanged) {
				options = newOptions;
				instance.destroy?.();
				instance = initialize(newParams);
			}

			if (newParams.alwaysReloadAndLayoutOnUpdate) {
				instance.reloadItems?.();
				instance.layout?.();
			}

			if (itemsChanged) {
				newParams.onUpdate?.(instance);
			}
		},
		destroy() {
			instance.destroy?.();
		}
	};
}) satisfies Action;

export default masonry;
