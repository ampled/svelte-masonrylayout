<script lang="ts">
	import type { MasonryActionParameters, Masonry } from '$lib';
	import { masonry } from '$lib';

	let onInitializedCallbackHasRun = false;
	let layoutCompleteRuns = 0;

	function between(min: number, max: number) {
		return Math.floor(Math.random() * (max - min + 1) + min);
	}

	function randomS() {
		const dims = [290, 590, 290];
		const dim = dims[between(0, 2)];

		return dim + 'px';
	}

	function randomH() {
		const dims = [300, 500];
		const dim = dims[between(0, 1)];

		return dim + 'px';
	}

	let objItems = createItems(3);

	function createItems(amount: number) {
		let items = [];

		for (let x = 0; x < amount; x++) {
			items.push({
				width: randomS(),
				height: randomH(),
				id: Math.random().toString(),
				content: between(0, 1000).toString()
			});
		}

		return items;
	}

	function addItem() {
		objItems = [...objItems, ...createItems(1)];
	}

	function prepend() {
		objItems = [...createItems(3), ...objItems];
	}

	function removeFirst() {
		const [_first, ...newList] = objItems;
		objItems = newList;
	}

	function removeLast() {
		const newList = objItems.slice(0, objItems.length - 1);
		objItems = newList;
	}

	function onLayoutComplete(items: any[]) {
		layoutCompleteRuns++;
	}

	function onInitialized(instance: Masonry) {
		console.log('onInitialize');
		onInitializedCallbackHasRun = true;
		masonryInstance = instance;
	}

	function changeColumnWidth(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = Number.parseInt(target.value);
		masonryOptions = { ...masonryOptions, columnWidth: value };
		(<any>masonryInstance).columnWidth = value;
		masonryInstance?.layout?.();
	}

	const debug = () => {
		console.log(masonryInstance);
	};

	let masonryInstance: Masonry;
	let masonryOptions: MasonryActionParameters = {
		itemSelector: '.grid-item',
		columnWidth: 300,
		horizontalOrder: true,
		onLayoutComplete,
		onInitialized
	};
</script>

<main>
	<button on:click={debug}>debug</button>
	<button data-testid="add-button" on:click={addItem}>add item</button>
	<button data-testid="prepend-button" on:click={prepend}>prepend</button>
	<button data-testid="remove-first" on:click={removeFirst}>remove first</button>
	<button data-testid="remove-last" on:click={removeLast}>remove last</button>

	<input type="number" on:change={changeColumnWidth} />

	<div id="stuff" use:masonry={masonryOptions}>
		<div class="gutter-sizer" />
		{#each objItems as item, index (item.id)}
			<div
				data-testid="grid-item"
				class="grid-item"
				style:width={item.width}
				style:height={item.height}
			>
				{index}<br />
				{item.content}
			</div>
		{/each}
	</div>

	<div>
		<span data-testid="initialized">{onInitializedCallbackHasRun}</span>
		<span data-testid="layout-runs">{layoutCompleteRuns}</span>
	</div>
</main>

<style>
	:global(html, body) {
		width: 100%;
		margin: 0;
		padding: 0;
		overflow-x: hidden;
	}

	main {
		height: 100%;
		overflow-y: auto;
		width: 100%;
		background-color: black;
		color: white;
	}

	.gutter-sizer {
		width: 10px;
		background-color: blue;
	}

	.grid-item {
		font-family: monospace;
		font-size: 4rem;
		box-sizing: border-box;
		height: 300px;
		width: 300px;
		background-color: hotpink;
		border: 2px solid greenyellow;
		margin-bottom: 10px;
		border-radius: 10%;
		padding: 20px;
	}
</style>
