<script lang="ts">
  import './app.css';
  import { routes } from '$devlib/ROUTES.js';
  import Inspect from 'svelte-inspect-value';

  console.log(routes);

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<Inspect.Panel values={{ routes }} />

<nav>
  <a href="/">action demo</a>
  <a href="/comp">component demo</a>
</nav>

{@render children?.()}

<style>
  a {
    color: white;
    margin-left: 2rem;
  }
</style>
