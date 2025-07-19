<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import masonry from './action';
	import type {
		MasonryOptions,
		MasonryActionParameters,
		OnLayoutCompleteFn,
		OnInitializedFn,
		Masonry,
		MasonryLayoutComponentProps
	} from './types';
	type $$Props = MasonryLayoutComponentProps;

	interface Props {
		masonryOptions: MasonryOptions;
		children?: import('svelte').Snippet;
	}

	let { masonryOptions, children }: Props = $props();
	let masonryInstance: Masonry | undefined = undefined;

	const dispatch = createEventDispatcher<{
		layoutComplete: { items: any[] };
		initialized: { instance: Masonry; items: any[] };
	}>();

	const onLayoutComplete: OnLayoutCompleteFn = (items) => {
		dispatch('layoutComplete', { items });
	};

	const onInitialized: OnInitializedFn = (instance, items) => {
		masonryInstance = instance;
		dispatch('initialized', { instance, items });
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
