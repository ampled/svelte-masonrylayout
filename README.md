Svelte wrapper for [masonry-layout](https://masonry.desandro.com/)

[DEMO](https://stackblitz.com/edit/eirikk-svelte-masonry-layout-demo?file=src%2FApp.svelte)

## Usage

You can use the exported action or component.

```html
<script lang="ts">
 import MasonryLayout, {masonry} from '@eirikk/svelte-masonry-layout';

 let items = createItems(10);

 function createItems(amount: number) {
   let items = [];

   for (let x = 0; x < amount; x++) {
    items.push({ id: Math.random().toString() });
   }

   return items;
  }
</script>

<!-- action  -->
<div use:masonry={{ items, itemSelector: '.grid-item', columnWidth: 300 }}>
 {#each items as item (item.id)}
  <div class="grid-item">look at me im in a masonry grid!!</div>
 {/each}
</div>

<!-- component -->
<MasonryLayout {items} masonryOptions={{ itemSelector: '.grid-item', columnWidth: 300 }}>
 {#each items as item (item.id)}
  <div class="grid-item">owee me too!!</div>
 {/each}
</MasonryLayout>

<style>
 .grid-item {
   width: 300px;
   height: 300px;
   background-color: hotpink;
 }
</style>
```

See the [routes](https://github.com/ampled/svelte-masonrylayout/tree/main/src/routes) folder in the repo for more comprehensive examples.
