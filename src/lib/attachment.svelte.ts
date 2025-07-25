import type { Item, MasonryOptions } from './masonry/index.js';
import { BROWSER } from 'esm-env';
import { onDestroy } from 'svelte';
import { createSubscriber } from 'svelte/reactivity';
import Masonry from './masonry/masonry.js';
import type { MasonryAttachmentOptions } from './types.js';
import { getMilliseconds, omit, pick } from './util.js';

const optionKey = [
  'columnWidth',
  'gutter',
  'transitionDuration',
  'hiddenStyle',
  'visibleStyle',
  'containerStyle',
  'resize',
  'layoutInstant',
  'itemSelector',
  'rowHeight',
  'originLeft',
  'originTop',
  'initLayout',
  'stamp',
  'stagger',
  'resizeContainer',
  'fitWidth',
  'isFitWidth',
  'horizontalOrder',
  'horizontal'
] as const;

const attachmentKeys = [
  'alwaysReloadAndLayoutOnUpdate',
  'onLayoutComplete',
  'onInitialized',
  'onUpdate'
] as const;

export function splitOptions(options: MasonryAttachmentOptions) {
  const attachment = pick(options, attachmentKeys);
  const masonry = omit(options, attachmentKeys) satisfies MasonryOptions;
  return [attachment, masonry];
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
export interface SvelteMasonry<T extends unknown[] = unknown[]> extends MasonryOptions {}

/**
 * Svelte Attachment for Masonry layout.
 * This class creates a Masonry instance and manages its lifecycle.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class SvelteMasonry<T extends unknown[] = unknown[]> {
  /** Masonry instance. Will be undefined until .grid() is called */
  #instance = $state<Masonry>();
  numItems: number;
  observer: MutationObserver | undefined;
  #subscribe: () => void;
  #update?: () => void;
  ready = $state(false);

  constructor(
    private _items: () => T,
    private options: () => MasonryAttachmentOptions
  ) {
    if (BROWSER) {
      this.observer = new MutationObserver(this.#onMutate);
    }
    this.numItems = $derived(_items().length);

    onDestroy(() => {
      this.observer?.disconnect();
      this.#instance?.off('layoutComplete', this.#runLayoutCompleteFn);
      this.#instance?.destroy();
    });

    $effect(() => {
      const [_, options] = splitOptions(this.options());
      this.#instance?.option(options as MasonryOptions);
      this.#instance?.layout();
      this.#update?.();
    });

    this.#subscribe = createSubscriber((update) => {
      this.#update = update;
    });

    optionKey.forEach((key) => {
      Object.defineProperty(this, key, {
        get: () => {
          this.#subscribe(); // update getter value when setter is used
          if (this.#instance) {
            return this.#instance.options[key];
          }
          return this.options()[key];
        },
        set: (value) => {
          this.#update?.(); // notify subscribers
          if (this.#instance) {
            this.#instance.option({ [key]: value });
            this.#instance.layout();
          }
        }
      });
    });
  }

  grid() {
    return (element: HTMLElement) => {
      this.observer?.observe(element, { childList: true });
      if (!this.#instance) {
        const opts = this.options();
        const masonryOptions = omit(opts, [
          'alwaysReloadAndLayoutOnUpdate',
          'onInitialized',
          'onLayoutComplete',
          'onUpdate'
        ]);
        const { onInitialized, onLayoutComplete } = opts;

        this.#instance = new Masonry(element, masonryOptions);
        this.#instance.once('layoutComplete', () => {
          this.ready = true;
        });

        if (onInitialized) {
          this.#instance.once('layoutComplete', (items: Item[]) => {
            onInitialized(this.#instance!, items);
          });
        }
        if (onLayoutComplete) {
          this.#instance.on('layoutComplete', this.#runLayoutCompleteFn);
        }
      }
    };
  }

  reloadAndLayout() {
    if (this.#instance) {
      this.#instance.reloadItems();
      this.#instance.layout();
    }
  }

  #runLayoutCompleteFn = (items: Item[]) => {
    const { onLayoutComplete } = this.options();
    if (onLayoutComplete) {
      onLayoutComplete(items);
    }
  };

  setOptions(options: Partial<MasonryOptions>, layout = true) {
    if (this.#instance) {
      this.#instance.option(options);
      if (layout) {
        this.#instance.layout();
      }
    }
  }

  get items() {
    return this._items();
  }

  get instance() {
    this.#subscribe();
    return this.#instance;
  }

  get masonryItems() {
    return this.#instance?.items;
  }

  /**
   * Get or set gutter with numbers only.
   *
   * Utility for binding to a number input that expects gutter only
   * (which can be of type `string` (selector), `Element` and `number`)
   */
  get gutterInt() {
    this.#subscribe();
    if (this.#instance) {
      return this.#instance.gutter;
    }
    const { gutter } = this.options();
    if (typeof gutter === 'number') return gutter;
    return 0;
  }

  set gutterInt(value: number) {
    this.#update?.();
    if (this.#instance) {
      this.#instance.option({ gutter: value });
      this.#instance.layout();
    }
  }

  get columnWidthInt() {
    this.#subscribe();
    if (this.#instance) {
      return this.#instance.columnWidth;
    }
    const { columnWidth } = this.options();
    if (typeof columnWidth === 'number') return columnWidth;
    return 0;
  }

  set columnWidthInt(value: number) {
    this.#update?.();
    if (this.#instance) {
      this.#instance.option({ columnWidth: value });
      this.#instance.layout();
    }
  }

  /**
   * Get masonry transition time in milliseconds, regardless if option was supplied as string or number.
   *
   * Use this to get the same transition time as masonry if using svelte transitions
   */
  get transitionTimeMs() {
    return getMilliseconds(this.#instance?.options.transitionDuration ?? 0);
  }

  #onMutate = (mutations: MutationRecord[]) => {
    if (!this.#instance) return;
    const appended: Element[] = [];
    const prepended: Element[] = [];
    let needsLayout = false;
    let needsReload = false;
    const existing = Array.from(
      this.#instance.element.querySelectorAll<HTMLElement>('[data-masi]')
    );

    for (const { addedNodes, removedNodes } of mutations) {
      for (const addedNode of addedNodes) {
        if (!(addedNode instanceof HTMLElement)) return;
        if (!addedNode.matches(this.#instance.options.itemSelector!)) return;
        const first = existing.at(0);
        const last = existing.at(-1);
        if (first && last) {
          const relativeToFirst = first.compareDocumentPosition(addedNode);
          const relativeToLast = last.compareDocumentPosition(addedNode);
          const beforeFirst = Node.DOCUMENT_POSITION_PRECEDING === relativeToFirst;
          const afterLast = Node.DOCUMENT_POSITION_FOLLOWING === relativeToLast;
          if (afterLast) {
            appended.push(addedNode);
          } else if (beforeFirst) {
            prepended.push(addedNode);
          } else {
            needsReload = true;
            needsLayout = true;

            addedNode.style.opacity = '0';

            setTimeout(() => {
              addedNode.style.opacity = '';
            }, getMilliseconds(this.transitionTimeMs));
          }
        } else {
          this.#instance.appended(addedNode as HTMLElement);
        }
      }
      for (const removedNode of removedNodes) {
        const removedItem = this.#instance.items.find((item) => item.element === removedNode);
        if (removedItem) {
          needsReload = true;
          needsLayout = true;
        }
      }
    }

    if (appended.length) this.#instance.appended(appended);
    if (prepended.length) this.#instance.prepended(prepended);

    if (needsReload) this.#instance.reloadItems();
    if (needsLayout) this.#instance.layout();
  };
}
