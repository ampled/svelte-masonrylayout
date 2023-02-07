import type { MasonryActionParameters, MasonryOptions } from '$lib/types';

export function getMasonryOptionsFromParameters(
	parameters: MasonryActionParameters
): MasonryOptions {
	const {
		items,
		alwaysReloadAndLayoutOnUpdate,
		onUpdate,
		onInitialized,
		onLayoutComplete,
		...options
	} = parameters;
	return options;
}
