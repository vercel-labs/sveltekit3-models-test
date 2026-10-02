<!-- Every tour card, rendered once. Each floats beside its <Beacon> via CSS anchor positioning. -->
<script lang="ts">
	import { highlight } from './highlight';
	import { back, next, seen, steps } from './tour-steps.svelte';

	// ← / → step through the tour while a card is open (Esc closes it natively)
	function onkeydown(e: KeyboardEvent) {
		if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
		const i = steps.findIndex((s) => document.getElementById(`tour-${s.id}`)?.matches(':popover-open'));
		if (i === -1 || (e.target as HTMLElement).matches('input, select, textarea')) return;

		e.preventDefault();
		if (e.key === 'ArrowRight') next(i);
		else back(i);
	}
</script>

<svelte:window {onkeydown} />

{#each steps as step, i (step.id)}
	<div
		id="tour-{step.id}"
		popover
		class="card"
		style:position-anchor="--tour-{step.id}"
		ontoggle={(e) => e.newState === 'open' && (seen[step.id] = true)}
	>
		<header>
			<span class="tag">{step.tag}</span>
			<span>{i + 1}/{steps.length}</span>
		</header>
		<h3>{step.title}</h3>
		<p>{@html step.body}</p>
		<pre class="code">{@html highlight(step.code)}</pre>
		<footer>
			<a href={step.docs} target="_blank" rel="noreferrer">docs ↗</a>
			<button onclick={() => next(i)}>{i === steps.length - 1 ? 'done' : 'next →'}</button>
		</footer>
	</div>
{/each}

<style>
	.card {
		width: min(31rem, calc(100vw - 2rem));
		padding: 1rem 1.1rem;
		background: var(--card);
		color: var(--fg);
		border: 1px solid var(--line);
		border-radius: 8px;
		box-shadow: 0 12px 40px #0000001f;
		font-size: 12px;
	}

	/* desktop: sit next to the beacon, flipping to whichever side has room */
	@media (width > 40rem) {
		@supports (position-area: bottom) {
			.card {
				inset: auto;
				margin: 0.5rem;
				position-area: bottom span-right;
				position-try-fallbacks: flip-inline, flip-block, flip-block flip-inline;
			}
		}
		.card:popover-open {
			animation: in 0.15s var(--curve);
		}
	}
	@keyframes in {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
	}

	/* phones: a bottom drawer; tap the dimmed page to dismiss */
	@media (width <= 40rem) {
		.card {
			inset: auto 0 0;
			width: auto;
			max-height: 70dvh;
			margin: 0;
			overflow-y: auto;
			border-radius: 12px 12px 0 0;
			box-shadow: 0 -12px 40px #00000026;
		}
		.card::backdrop {
			background: #00000033;
		}
		.card:popover-open {
			animation: drawer 0.2s var(--curve);
		}
	}
	@keyframes drawer {
		from {
			transform: translateY(100%);
		}
	}

	header,
	footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: var(--dim);
	}
	.tag {
		padding: 0 0.45rem;
		border-radius: 4px;
		background: var(--red-soft);
		color: var(--red);
	}
	h3 {
		margin: 0.6rem 0 0;
		font-size: 13px;
	}
	p {
		color: var(--dim);
	}
	p :global(code) {
		color: var(--fg);
	}
	pre {
		margin: 0;
		padding: 0.75rem;
		overflow-x: auto;
		background: var(--bg);
		border: 1px solid var(--line);
		border-radius: 6px;
		font-size: 11px;
	}
	footer {
		margin-top: 0.75rem;
	}
	footer button {
		padding: 0.25rem 0.75rem;
		background: none;
		border: 1px solid var(--line);
		border-radius: 6px;
		cursor: pointer;
		transition:
			border-color var(--ease),
			color var(--ease);
	}
	footer button:hover {
		border-color: var(--red);
		color: var(--red);
	}
</style>
