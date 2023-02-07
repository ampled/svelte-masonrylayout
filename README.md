# svelte-masonrylayout

Svelte wrapper for [masonry-layout](https://masonry.desandro.com/)

[DEMO](https://stackblitz.com/edit/eirikk-svelte-masonry-layout-demo?file=src%2FApp.svelte)

## Examples

### Action

```
<script lang="ts">
	import masonry from '@eirikk/svelte-masonry-layout/action';

	let items = createItems(3);

	function createItems(amount: number) {
		let items = [];

		for (let x = 0; x < amount; x++) {
			items.push({ id: Math.random().toString() });
		}

		return items;
	}
</script>

<div use:masonry={{ items, itemSelector: '.grid-item', columnWidth: 300 }}>
	{#each items as item (item.id)}
		<div class="grid-item">look at me!!</div>
	{/each}
</div>

<style>
	.grid-item {
		width: 300px;
		height: 300px;
		background-color: hotpink;
	}
</style>

```

```

```
