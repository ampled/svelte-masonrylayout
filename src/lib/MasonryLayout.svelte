<script lang="ts">
  import { type Snippet } from 'svelte';
  import masonry from './action.js';
  import type {
    MasonryActionParameters,
    OnLayoutCompleteFn,
    OnInitializedFn,
    // Masonry,
    MasonryLayoutComponentProps
  } from './types/index.js';
  type Props = MasonryLayoutComponentProps & {
    children?: Snippet;
    layoutComplete?: OnLayoutCompleteFn;
    initialized?: OnInitializedFn;
  };

  let { masonryOptions, layoutComplete, initialized, children }: Props = $props();
  // let masonryInstance: Masonry | undefined = undefined;

  const onLayoutComplete: OnLayoutCompleteFn = (items) => {
    layoutComplete?.(items);
    // dispatch('layoutComplete', { items });
  };

  const onInitialized: OnInitializedFn = (instance, items) => {
    // masonryInstance = instance;
    initialized?.(instance, items);
  };

  let actionParams = $derived({
    ...masonryOptions,
    onLayoutComplete,
    onInitialized
  } satisfies MasonryActionParameters);
</script>

<div use:masonry={actionParams}>
  {@render children?.()}
</div>
