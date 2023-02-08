import type { Options } from 'masonry-layout';
import type Masonry from 'masonry-layout';
export type { default as Masonry } from 'masonry-layout';

type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

export type MasonryOptions = Prettify<Options>;

export type OnInitializedFn = (instance: Masonry, items: any[]) => void;
export type OnLayoutCompleteFn = (laidOutItems: any[]) => void;

export type MasonryActionParameters<T = any> = Prettify<
	{
		items: T[];
		/**
		 * If true, the action will call {@link Masonry.reloadItems|`reloadItems`}
		 * and {@link Masonry.layout|`layout`} on the Masonry instance
		 * whenever {@link MasonryActionParameters.items|`items`} changes in the parameters.
		 *
		 * Defaults to `true`.
		 * @default true
		 */
		alwaysReloadAndLayoutOnUpdate?: boolean;
		onUpdate?: (masonryInstance: Masonry) => void;
		/**
		 * Callback that runs only after the first masonry layout completes.
		 * Good if you want access to the Masonry instance for some reason.
		 * Will rerun if any masonry options change as that will create a new Masonry instance.
		 * @param instance masonry instance
		 * @param items masonry items in some sort of internal masonry type
		 *
		 * {@link https://masonry.desandro.com/events.html#layoutcomplete layoutComplete}
		 */
		onInitialized?: OnInitializedFn;
		/**
		 * Callback that will run for every Masonry `layoutComplete` event.
		 *
		 * {@link https://masonry.desandro.com/events.html#layoutcomplete layoutComplete}
		 */
		onLayoutComplete?: OnLayoutCompleteFn;
	} & MasonryOptions
>;

export type MasonryLayoutComponentProps<T = any> = {
	items: T[];
	masonryOptions: MasonryOptions;
};
