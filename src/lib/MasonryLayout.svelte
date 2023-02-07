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
	type $$Props = MasonryLayoutComponentProps<(typeof items)[0]>;

	export let items: any[];
	export let masonryOptions: MasonryOptions;
	export let masonryInstance: Masonry | undefined = undefined;

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

	$: actionParams = {
		...masonryOptions,
		items,
		onLayoutComplete,
		onInitialized
	} satisfies MasonryActionParameters;
</script>

<div use:masonry={actionParams}>
	<slot />
</div>
