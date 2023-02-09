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

	function initialize(parameters: MasonryActionParameters): [Masonry, MutationObserver] {
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

		const observer = new MutationObserver(() => {
			if (parameters.alwaysReloadAndLayoutOnUpdate) {
				instance.reloadItems?.();
				instance.layout?.();
			}
			parameters.onUpdate?.(instance);
		});

		observer.observe(node, { childList: true });

		return [masonry, observer];
	}

	let [instance, observer] = initialize(params);

	return {
		update(newParameters: MasonryActionParameters) {
			const newParams = { ...defaultParams, ...newParameters };
			const newOptions = getMasonryOptionsFromParameters(newParams);
			const optionsChanged = !equal(options, newOptions);

			if (optionsChanged) {
				options = newOptions;
				instance.destroy?.();
				observer.disconnect();
				[instance, observer] = initialize(newParams);
			}
		},
		destroy() {
			observer.disconnect();
			instance.destroy?.();
		}
	};
}) satisfies Action;

export default masonry;
