<script lang="ts">
  import { SvelteMasonry } from '$lib/attachment.svelte.js';
  import type { MasonryAttachmentOptions } from '$lib/types.js';
  import { getMilliseconds } from '$lib/util.js';
  import { onMount, tick } from 'svelte';
  import { addToPanel } from 'svelte-inspect-value';
  import { scale } from 'svelte/transition';
  const colors = ['hotpink', 'orange', 'green', 'lightblue', 'salmon'];

  let gridWidth = $state(1000);
  let objItems = $state<ReturnType<typeof createItems>>([]);
  const options = $state<MasonryAttachmentOptions>({
    itemSelector: '.grid-item',
    columnWidth: '.grid-sizer',
    horizontalOrder: false,
    initLayout: false,
    stagger: 10,
    gutter: '.gutter-sizer',
    transitionDuration: 500,
    percentPosition: true,
    stamp: '.stamp',
    hiddenStyle: {
      opacity: 0,
      transform: 'translateY(50px) scale(0.5)'
    },
    visibleStyle: {
      opacity: 1,
      transform: 'translateY(0) scale(1)'
    }
  });

  const mas = new SvelteMasonry(
    () => objItems,
    () => options
  );

  onMount(() => {
    objItems = createItems(3);
  });

  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    objItems.length;
    const remove = addToPanel('masonry:', () => mas.instance);
    return remove;
  });
  addToPanel('items', () => objItems);

  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    gridWidth;
    setTimeout(() => {
      mas.instance?.layout();
    }, 300);
  });

  function getRandom<T>(arr: T[]) {
    return arr[between(0, arr.length - 1)];
  }

  function between(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  function _createWidths() {
    const baseWidth = 160,
      gutter = 8;
    return [
      baseWidth,
      baseWidth * 2 + gutter,
      baseWidth * 3 + gutter * 2,
      baseWidth * 4 + gutter * 3
    ];
  }

  function _createHeights() {
    const base = 180,
      gutter = 8;
    return [base, base * 2 + gutter, base * 3 + gutter * 2];
  }

  function getPokemon(id: string | number) {
    return fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then((res) => res.json());
  }

  function _randomW() {
    return getRandom(['', 'width2', 'width3']);
  }

  function _randomH() {
    // const dims = [112, 240, 472];
    return getRandom(['height2', 'height3', 'height4']);
  }

  function createItems(amount: number) {
    let items = [];

    for (let x = 0; x < amount; x++) {
      items.push({
        width: _randomW(),
        height: _randomH(),
        bgColor: getRandom(colors),
        id: Math.random().toString(),
        content: between(0, 1000).toString(),
        promise: getPokemon(between(1, 151))
      });
    }

    return items;
  }

  function addItem() {
    objItems.push(...createItems(1));
  }

  function appendMultiple() {
    objItems.push(...createItems(3));
  }

  function prepend() {
    objItems.unshift(...createItems(1));
  }

  function removeFirst() {
    const [_first, ...newList] = objItems;
    objItems = newList;
    mas.instance?.layout();
  }

  function removeLast() {
    const newList = objItems.slice(0, objItems.length - 1);
    objItems = newList;
  }

  const debug = () => {
    console.log(mas.instance);
  };

  function removerandom() {
    const random = getRandom(objItems);
    objItems = objItems.filter((obj) => obj !== random);
  }

  function removeObj(item: (typeof objItems)[number]) {
    objItems = objItems.filter((obj) => obj !== item);
  }

  function addRandom() {
    const randomIndex = between(0, objItems.length);
    const newItem = createItems(1)[0];
    newItem.bgColor = '#888';
    objItems.splice(randomIndex, 0, newItem);
  }

  async function embiggen(index: number) {
    const item = objItems[index];
    let newItem = { ...item, width: 160 * 4 + 8 * 3 + 'px', height: 328 * 2 + 8 + 'px' };
    objItems[index] = newItem;
    await tick();
    mas.instance?.layout();
  }
</script>

<main>
  <button onclick={debug}>debug</button>
  <button data-testid="add-button" onclick={addItem}>append</button>
  <button onclick={addRandom}>add random</button>
  <button onclick={appendMultiple}>append 3</button>
  <button data-testid="prepend-button" onclick={prepend}>prepend</button>
  <button data-testid="remove-first" onclick={removeFirst}>remove first</button>
  <button onclick={removerandom}>remove random</button>
  <button data-testid="remove-last" onclick={removeLast}>remove last</button>

  <label>
    column width
    <input type="number" bind:value={options.columnWidth} />
  </label>

  <label>
    grid width
    <input type="number" bind:value={gridWidth} step={168} />
  </label>

  <!-- <label>
    gutter
    <input type="number" bind:value={options.gutter} step={1} />
  </label> -->
  <label>
    dur
    <input style="max-width: 6ch" type="number" bind:value={options.transitionDuration} step={50} />
  </label>

  <label>
    horiz
    <input type="checkbox" bind:checked={options.horizontalOrder} />
  </label>
  <label>
    origin top
    <input type="checkbox" bind:checked={mas.originTop} />
  </label>
  <!-- style:max-width={gridWidth + 'px'} -->

  <div class="grid" {@attach mas.grid()} style:opacity={mas.ready ? 1 : 0}>
    <div class="grid-sizer"></div>
    <div class="gutter-sizer"></div>

    {#each mas.items as item, index (item.id)}
      <div
        data-testid="grid-item"
        class={['grid-item', item.width, item.height]}
        style:width={item.width}
        style:height={item.height}
        style:background-color={item.bgColor}
        out:scale={{ duration: getMilliseconds(options.transitionDuration ?? 0) / 2 }}
      >
        <!-- style:margin-bottom={mas.gutter + 'px'} -->
        <div style="position: relative; width: 100%; height: 100%">
          <div style="position: absolute; top: 0; right: 0; font-size: 8px;">
            {index}
            <button type="button" onclick={() => removeObj(item)}>x</button>
            <button type="button" onclick={() => embiggen(index)}>+</button>
          </div>
          {#await item.promise}
            fetching pokemon...
          {:then pokemon}
            <img
              src={pokemon.sprites.front_default}
              alt={pokemon.name}
              style="width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated;"
            />
          {/await}
          <!-- w: {item.width}<br />
          h: {item.height} -->
          <!-- {item.content} -->
        </div>
      </div>
    {/each}
  </div>
</main>

<style>
  :global(html, body) {
    width: 100%;
    margin: 0;
    padding: 0;
    overflow-x: hidden;
  }

  button {
    padding: 4px;
    outline: 1px solid white;
  }

  main {
    height: 100%;
    overflow-y: auto;
    width: 100%;
    background-color: black;
    color: white;
  }

  .grid {
    background-color: #333;
    transition:
      max-width 300ms ease-in-out,
      opacity 50ms ease-in;
    /* outline: 1px solid #333; */
    /* width: 960px; */
    /* max-width: 984px; */
    margin-left: auto;
    margin-right: auto;
    overflow: visible;
    max-width: 1200px;
    margin-bottom: 300px;
  }

  .grid-item {
    transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
    transition-timing-function: cubic-bezier(0.25, 1, 0.5, 1);
    /* transition-timing-function: cubic-bezier(0.33, 1, 0.68, 1); */
    /* transition: transform 250ms ease-in-out;
    transform: rotate(10deg); */
    font-family: monospace;
    font-size: 1rem;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    background-color: hotpink;
    border-radius: 8px;
    padding: 8px;
    height: 120px;
    float: left;
    border: 2px solid #333;
    border-color: hsla(0, 0%, 0%, 0.5);
  }

  .gutter-sizer {
    width: 0.5%;
  }

  .grid-sizer,
  .grid-item {
    width: 30%;
    margin-bottom: 4px;
  }

  .width2 {
    width: 30%;
  }
  .width3 {
    width: 30%;
  }

  .height2 {
    height: 200px;
  }
  .height3 {
    height: 260px;
  }
  .height4 {
    height: 360px;
  }
</style>
