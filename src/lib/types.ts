import { Masonry, type Item, type MasonryOptions } from './masonry/index.js';
export type { Masonry };

export type OnInitializedFn = (instance: Masonry, items: Item[]) => void;
export type OnLayoutCompleteFn = (laidOutItems: Item[]) => void;

export type MasonryAttachmentOptions = {
  /**
   * If true, the action will call {@link Masonry.reloadItems|`reloadItems`}
   * and {@link Masonry.layout|`layout`} on the Masonry instance
   * whenever {@link MasonryAttachmentOptions.items|`items`} changes in the parameters.
   *
   * @defaultvalue `true``
   */
  alwaysReloadAndLayoutOnUpdate?: boolean;
  /**
   * Custom callback to run after items change
   * @param masonryInstance masonry instance created by the action
   */
  onUpdate?: (masonryInstance: Masonry) => void;
  /**
   * Callback that runs only after the first masonry layout completes.
   * If you want access to the Masonry instance created by the action, use this callback.
   * Will rerun if any masonry options change as that will create a new Masonry instance.
   * @param instance masonry instance created by the action
   * @param items masonry items in some sort of internal masonry type
   *
   * @see {@link https://masonry.desandro.com/events.html#layoutcomplete layoutComplete}
   */
  onInitialized?: OnInitializedFn;
  /**
   * Callback that will run for every Masonry `layoutComplete` event.
   *
   * @see {@link https://masonry.desandro.com/events.html#layoutcomplete layoutComplete}
   */
  onLayoutComplete?: OnLayoutCompleteFn;
} & MasonryOptions;
