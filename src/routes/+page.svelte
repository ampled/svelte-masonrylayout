<script lang="ts">
	import { masonry } from '$lib';
	import type { MasonryActionParameters } from '$lib/types';
	import type Masonry from 'masonry-layout';

	function between(min: number, max: number) {
		return Math.floor(Math.random() * (max - min + 1) + min);
	}

	function random(min: number, max: number) {
		return between(min, max).toString() + 'px';
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
			items.push({ width: randomS(), height: randomH(), id: Math.random().toString() });
		}

		return items;
	}

	function addItem() {
		objItems = [...objItems, ...createItems(1)];
		masonryOptions = { ...masonryOptions, items: objItems };
	}

	function prepend() {
		objItems = [...createItems(3), ...objItems];
		masonryOptions = { ...masonryOptions, items: objItems };
	}

	function onLayoutComplete(items: any) {
		console.log('layout complete!');
	}

	let masonryInstance: Masonry;
	let masonryOptions: MasonryActionParameters = {
		items: objItems,
		itemSelector: '.grid-item',
		columnWidth: 300,
		horizontalOrder: true,
		onLayoutComplete,
		onInitialized: (instance) => (masonryInstance = instance)
	};

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
</script>

<main>
	<button on:click={debug}>debug</button>
	<button on:click={addItem}>add item</button>
	<button on:click={prepend}>prepend</button>
	<input type="number" on:change={changeColumnWidth} />

	<!-- <pre>{JSON.stringify(items)}</pre> -->

	<div id="stuff" use:masonry={masonryOptions}>
		<div class="gutter-sizer" />
		{#each objItems as item (item.id)}
			<div class="grid-item" style:width={item.width} style:height={item.height}>
				{item.id}
			</div>
		{/each}
		<!-- <div class="grid-item">1</div> -->
	</div>

	end of grid
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
		box-sizing: border-box;
		height: 300px;
		width: 300px;
		background-color: hotpink;
		border: 2px solid greenyellow;
		margin-bottom: 10px;
		border-radius: 10%;
		padding: 20px;
	}

	.grid-item:hover,
	.grid-item:active,
	.grid-item:focus {
		transition: transform 0.2s ease-in;
		transform-origin: top center;
		transform: scale(1.2, 1.2);
		z-index: 10;
	}
</style>
