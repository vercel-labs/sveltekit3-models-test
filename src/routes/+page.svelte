<script lang="ts">
	import '@fontsource-variable/geist-mono';
	import '../app.css';
	import { onMount } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getModel, getModels, getProviders } from './models.remote';
	import Beacon from './Beacon.svelte';
	import { fastClick } from './fast-click';
	import { highlight } from './highlight';
	import Tour from './Tour.svelte';
	import { next } from './tour-steps.svelte';

	// Provider and selected model live in the URL, so every view is a shareable link.
	let provider = $derived(page.url.searchParams.get('provider') ?? '');
	let selected = $derived(page.url.searchParams.get('model'));

	// The search box is deliberately uncontrolled: Async Svelte holds DOM updates until
	// pending `await`s settle, so a reactive `value={q}` would land late and eat keystrokes.
	const initialQ = page.url.searchParams.get('q') ?? '';
	let q = $state(initialQ);
	let input: HTMLInputElement;

	// Results arrive a page at a time; each page is its own cached query.
	let pages = $state(1);

	/** The current address with some params changed (falsy values are removed). */
	function withParams(changes: Record<string, string | null>) {
		const url = new URL(location.href); // not page.url — shallow updates skip it
		for (const [k, v] of Object.entries(changes)) {
			if (v) url.searchParams.set(k, v);
			else url.searchParams.delete(k);
		}
		return url;
	}

	const open = (model: string | null) => goto(withParams({ model }), { reset: false });

	onMount(fastClick);

	// Hovering a row fetches its details, so opening it is instant. A query is cached
	// only while something holds it, so keep the handles around.
	const warm = new Map<string, ReturnType<typeof getModel>>();
	function prefetch(id: string) {
		if (warm.has(id)) return;
		const model = getModel(id);
		warm.set(id, model);
		model.catch(() => warm.delete(id)); // let a failed one retry
	}

	function filter(changes: Record<string, string>, shallow = false) {
		pages = 1;
		// shallow = just rewrite the address bar, no navigation
		goto(withParams(changes), { reset: false, replace: shallow, shallow });
	}

	// Back/forward restores whatever was typed
	afterNavigate(({ type }) => {
		if (type === 'popstate') input.value = q = new URL(location.href).searchParams.get('q') ?? '';
	});

	let copied = $state(false);
	async function copyLink() {
		await navigator.clipboard.writeText(location.href);
		copied = true;
		setTimeout(() => (copied = false), 1200);
	}

	const usd = (perToken?: string) => (perToken ? `$${+(+perToken * 1e6).toFixed(2)}` : '—');
	const k = (n?: number) => (!n ? '—' : n < 1e6 ? `${Math.round(n / 1e3)}k` : `${+(n / 1e6).toFixed(2)}M`);
</script>

<svelte:head>
	<title>AI Gateway models · SvelteKit 3</title>
</svelte:head>

<!-- Esc closes the details, unless it's closing a tour card first -->
<svelte:window
	onkeydown={(e) =>
		e.key === 'Escape' && selected && !document.querySelector(':popover-open') && open(null)}
/>

<header>
	<div class="top">
		<h1>ai gateway models<Beacon id="server" /></h1>
		<nav>
			<a href="https://github.com/vercel-labs/sveltekit3-models-test">source code</a>
			/
			<button onclick={() => next()}>how it works</button>
		</nav>
	</div>
	<p>
		Every model on <a href="https://vercel.com/ai-gateway">Vercel AI Gateway</a>, served by
		SvelteKit 3 <a href="https://svelte.dev/docs/kit/remote-functions">remote functions</a> and
		<a href="https://svelte.dev/docs/svelte/await-expressions">async Svelte</a>.
	</p>
</header>

<div class="filters" role="search">
	<span class="field">
		<input
		bind:this={input}
		value={initialQ}
		oninput={(e) => filter({ q: (q = e.currentTarget.value) }, true)}
		type="search"
		placeholder="search models, ids, tags…"
		aria-label="Search"
		/>
		<Beacon id="search" corner />
	</span>
	<span class="field">
	<select value={provider} onchange={(e) => filter({ provider: e.currentTarget.value })}>
		<option value="">all providers</option>
		<!-- `await` right in markup: resolved during SSR, so no loading flash -->
		{#each await getProviders() as p (p.id)}
			<option value={p.id}>{p.id} · {p.count}</option>
		{/each}
	</select>
		<Beacon id="providers" corner />
	</span>
</div>

<svelte:boundary>
	{@const first = await getModels({ q, provider, page: 0 })}

	<div class="layout">
		<section>
			<p class="meta">
				{first.total} models<Beacon id="list" />
			</p>

			{#if first.total === 0}
				<p class="empty">nothing matches “{q}”</p>
			{/if}

			<!-- old rows stay on screen while new ones load; a red bar sweeping the top edge is the only spinner -->
			<ol class:loading={$effect.pending()}>
				{#each { length: pages }, i}
					<!-- page 0 here is the same call as `first` above, so it's fetched once -->
					{#each (await getModels({ q, provider, page: i })).models as m (m.id)}
						<li>
							<button
								class:active={m.id === selected}
								onpointerenter={() => prefetch(m.id)}
								onfocus={() => prefetch(m.id)}
								onclick={() => open(m.id)}
							>
								<span class="name">{m.name}<small>{m.id}</small></span>
								<span class="ctx" title="context window">{k(m.context_window)}</span>
								<span title="input / output per 1M tokens">
									{usd(m.pricing?.input)} / {usd(m.pricing?.output)}
								</span>
							</button>
						</li>
					{/each}
				{/each}
			</ol>

			{#if (await getModels({ q, provider, page: pages - 1 })).more}
				<button class="more" onclick={() => pages++}>show more ↓</button><Beacon id="more" />
			{/if}
		</section>

		{#if selected}
			{@const m = await getModel(selected)}
			<aside>
				<nav>
					<button onclick={copyLink}>{copied ? 'copied ✓' : 'copy link'}</button>
					<button onclick={() => open(null)} aria-label="Close">×</button>
				</nav>
				<h2>{m.name}<Beacon id="detail" /></h2>
				<code>{m.id}</code>
				<p>{m.description || 'No description yet.'}</p>
				<dl>
					<dt>context</dt><dd>{m.context_window?.toLocaleString() ?? '—'}</dd>
					<dt>max output</dt><dd>{m.max_tokens?.toLocaleString() ?? '—'}</dd>
					<dt>per 1M in</dt><dd>{usd(m.pricing?.input)}</dd>
					<dt>per 1M out</dt><dd>{usd(m.pricing?.output)}</dd>
				</dl>
				{#if m.tags?.length}
					<ul class="tags">{#each m.tags as tag}<li>{tag}</li>{/each}</ul>
				{/if}
				<pre class="code">{@html highlight(`import { generateText } from 'ai';

await generateText({
!  model: '${m.id}',
  prompt: 'Hello!'
});`)}</pre>
			</aside>
		{/if}
	</div>

	{#snippet failed(err, retry)}
		<p class="empty">couldn’t load models: {(err as Error).message}</p>
		<button class="more" onclick={retry}>try again</button>
	{/snippet}
</svelte:boundary>

<Tour />

<style>
	header,
	.filters,
	.layout {
		max-width: 64rem;
		margin: 0 auto;
		padding: 0 1.5rem;
	}

	header {
		padding-top: 1.75rem;
	}
	h1 {
		display: flex;
		align-items: center;
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0;
	}
	.top {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.25rem 1rem;
	}
	.top nav {
		color: var(--dim);
	}
	.top nav a,
	.top nav button {
		padding: 0;
		background: none;
		border: 0;
		color: inherit;
		text-decoration: none;
		cursor: pointer;
		transition: color var(--ease);
	}
	.top nav a:hover,
	.top nav button:hover {
		color: var(--red);
	}
	header p {
		color: var(--dim);
		margin-bottom: 0;
		text-wrap: balance; /* one line on desktop, even lines when it has to wrap */
	}

	.filters {
		display: flex;
		gap: 0.5rem;
		margin-block: 1.25rem 0.75rem;
	}
	input,
	select {
		height: 2.5rem;
		padding: 0 0.75rem;
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 6px;
		transition: border-color var(--ease);
	}
	.field {
		position: relative;
		display: flex;
	}
	.field {
		min-width: 0;
	}
	.field:first-child {
		flex: 1;
	}
	.field:last-child {
		max-width: 40%; /* long provider names shouldn't crowd out search */
	}
	input,
	select {
		flex: 1;
		min-width: 0;
	}
	/* our own chevron, inset from the edge (the native one hugs the border) */
	select {
		appearance: none;
		padding-right: 2.25rem;
		background-image: var(--chevron);
		background-repeat: no-repeat;
		background-position: right 0.9rem center;
		background-size: 10px 6px;
		text-overflow: ellipsis;
	}
	input:focus,
	select:focus {
		border-color: var(--red);
		outline: none;
	}

	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 2rem;
		padding-bottom: 4rem;
	}
	.layout:has(aside) {
		grid-template-columns: minmax(0, 1fr) 22rem;
	}


	.meta,
	.empty {
		color: var(--dim);
	}

	ol {
		position: relative;
		list-style: none;
		margin: 0;
		padding: 0;
		border-top: 1px solid var(--line);
	}
	ol.loading::before {
		content: '';
		position: absolute;
		top: -1px;
		height: 1px;
		background: var(--red);
		animation: sweep 1s var(--curve) infinite;
	}
	@keyframes sweep {
		from {
			left: 0;
			right: 100%;
		}
		50% {
			left: 0;
			right: 0;
		}
		to {
			left: 100%;
			right: 0;
		}
	}
	li button {
		display: grid;
		grid-template-columns: 1fr 4rem 9rem;
		gap: 1rem;
		align-items: center;
		width: 100%;
		padding: 0.6rem 0.75rem;
		background: none;
		border: 0;
		border-bottom: 1px solid var(--line);
		text-align: left;
		cursor: pointer;
		transition: background var(--ease);
	}
	li button > span:not(.name) {
		color: var(--dim);
		text-align: right;
	}
	li button:hover {
		background: var(--card);
	}
	li button.active {
		background: var(--red-soft);
	}
	.name {
		overflow-wrap: anywhere;
	}
	.name small {
		display: block;
		color: var(--dim);
	}
	.active .name small {
		color: var(--red);
	}

	.more,
	aside nav button {
		margin-top: 1rem;
		padding: 0.4rem 0.9rem;
		background: none;
		border: 1px solid var(--line);
		border-radius: 6px;
		cursor: pointer;
		transition:
			border-color var(--ease),
			color var(--ease);
	}
	.more:hover,
	aside nav button:hover {
		border-color: var(--red);
		color: var(--red);
	}

	aside {
		position: sticky;
		top: 1.5rem;
		align-self: start;
		padding: 1.25rem;
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 8px;
	}
	aside nav {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}
	aside nav button {
		margin: 0;
		padding: 0.15rem 0.6rem;
	}
	h2 {
		font-size: 1rem;
		margin: 0.75rem 0 0;
	}
	aside > code {
		color: var(--red);
	}
	aside p {
		color: var(--dim);
	}

	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.2rem 1rem;
	}
	dt {
		color: var(--dim);
	}
	dd {
		margin: 0;
		text-align: right;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		padding: 0;
		list-style: none;
	}
	.tags li {
		padding: 0 0.45rem;
		border: 1px solid var(--line);
		border-radius: 4px;
		color: var(--dim);
		font-size: 11px;
	}

	pre {
		margin: 1rem 0 0;
		padding: 0.9rem;
		overflow-x: auto;
		background: var(--bg);
		border: 1px solid var(--line);
		border-radius: 6px;
		font-size: 11.5px;
	}

	/* small screens (last, so it wins over the rules above): details become a bottom drawer, rows drop the context column */
	@media (width <= 52rem) {
		.layout:has(aside) {
			grid-template-columns: minmax(0, 1fr);
		}
		aside {
			position: fixed;
			inset: auto 0 0;
			z-index: 10;
			max-height: 75dvh;
			overflow-y: auto;
			padding-top: 0;
			border-radius: 12px 12px 0 0;
			box-shadow: 0 -12px 40px #00000026;
			animation: drawer 0.2s var(--curve);
		}
		aside nav {
			position: sticky;
			top: 0;
			padding-top: 1rem;
			background: var(--card);
		}
		li button {
			grid-template-columns: minmax(0, 1fr) auto;
		}
		.ctx {
			display: none;
		}
	}
	@keyframes drawer {
		from {
			transform: translateY(100%);
		}
	}

	/* phones: search and provider each get a full row */
	@media (width <= 36rem) {
		.filters {
			flex-direction: column;
		}
		.field:last-child {
			max-width: none;
		}
	}
</style>
