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
		const masonry = new Masonry(node, options);

		if (parameters.onInitialized) {
			masonry.once?.('layoutComplete', (items: any[]) => {
				return parameters.onInitialized?.(masonry, items);
			});
		}

		masonry.layout?.();

		if (parameters.onLayoutComplete) {
			masonry.on?.('layoutComplete', parameters.onLayoutComplete);
		}

		return masonry;
	}

	let instance = initialize(params);

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

			if (itemsChanged) {
				if (newParams.alwaysReloadAndLayoutOnUpdate) {
					instance.reloadItems?.();
					instance.layout?.();
				}
				newParams.onUpdate?.(instance);
			}
		},
		destroy() {
			instance.destroy?.();
		}
	};
}) satisfies Action;

export default masonry;
