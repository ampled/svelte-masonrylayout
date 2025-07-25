<script lang="ts" generics="Element extends string = 'div', Item extends unknown = unknown">
  import { type Snippet } from 'svelte';
  import type { SvelteHTMLElements } from 'svelte/elements';

  import type { MasonryOptions } from './types.js';
  import { SvelteMasonry } from './attachment.svelte.js';

  type Props = {
    masonryOptions: MasonryOptions;
    items: Item[];
    ele?: Element;
    children?: Snippet;
  } & SvelteHTMLElements[Element];

  let {
    items,
    masonryOptions,
    layoutComplete,
    initialized,
    ele = 'div' as Element,
    children,
    ...rest
  }: Props = $props();

  const masonry = new SvelteMasonry(
    () => items,
    () => masonryOptions
  );
</script>

<svelte:element this={ele} {@attach masonry.grid()} {...rest}>
  {@render children?.()}
</svelte:element>
