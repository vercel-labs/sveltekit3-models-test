<!-- A rippling dot that opens tour stop `id`. `corner` pins it to its parent's top-right. -->
<script lang="ts">
	import { seen, steps } from './tour-steps.svelte';

	let { id, corner = false }: { id: string; corner?: boolean } = $props();
</script>

<button
	class="beacon"
	class:corner
	class:seen={seen[id]}
	popovertarget="tour-{id}"
	style:anchor-name="--tour-{id}"
	aria-label="How this works: {steps.find((s) => s.id === id)?.title}"
></button>

<style>
	.beacon {
		position: relative;
		display: inline-block;
		width: 1.25rem;
		height: 1.25rem;
		margin: 0 0 0 0.4rem;
		padding: 0;
		vertical-align: middle;
		background: none;
		border: 0;
		cursor: pointer;
		scroll-margin-top: 1.5rem;
	}
	.corner {
		position: absolute;
		top: -0.6rem;
		right: -0.6rem;
		margin: 0;
		z-index: 1;
	}

	/* the dot, and a ring rippling out of it */
	.beacon::before,
	.beacon::after {
		content: '';
		position: absolute;
		inset: calc(50% - 0.25rem);
		border-radius: 50%;
		background: var(--red);
	}
	.beacon::before {
		box-shadow: 0 0 0 2px var(--bg);
		transition: transform var(--ease);
	}
	.beacon::after {
		animation: ripple 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
	}
	.beacon:hover::before {
		transform: scale(1.4);
	}

	/* visited stops calm down to a hollow ring */
	.seen::before {
		background: var(--bg);
		box-shadow: inset 0 0 0 1.5px var(--red);
	}
	.seen::after {
		animation: none;
		opacity: 0;
	}

	@keyframes ripple {
		from {
			transform: scale(1);
			opacity: 0.6;
		}
		to {
			transform: scale(3.5);
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.beacon::after {
			animation: none;
		}
	}
</style>
