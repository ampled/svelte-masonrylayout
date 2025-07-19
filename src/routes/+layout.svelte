<script lang="ts">
	import './app.css';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

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
