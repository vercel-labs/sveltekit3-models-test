<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getModel, getModels, getProviders } from './models.remote';

	// URL is the source of truth, so every view is a shareable link
	let q = $derived(page.url.searchParams.get('q') ?? '');
	let provider = $derived(page.url.searchParams.get('provider') ?? '');
	let selected = $derived(page.url.searchParams.get('model'));

	function set(key: string, value: string | null) {
		const url = new URL(page.url.href);
		if (value) url.searchParams.set(key, value);
		else url.searchParams.delete(key);
		goto(url, { replace: key === 'q', reset: false });
	}

	let copied = $state(false);
	async function share() {
		await navigator.clipboard.writeText(page.url.href);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}

	const perMillion = (price?: string) =>
		price ? `$${(Number(price) * 1e6).toFixed(2)}` : '—';
	const tokens = (n?: number) => (n ? `${Math.round(n / 1000)}k` : '—');
</script>

<svelte:head>
	<title>AI Gateway models</title>
</svelte:head>

<h1>Vercel AI Gateway models</h1>

<div class="controls">
	<input
		type="search"
		placeholder="Search models or tags…"
		value={q}
		oninput={(e) => set('q', e.currentTarget.value)}
	/>

	<!-- `await` directly in markup — Async Svelte -->
	<select value={provider} onchange={(e) => set('provider', e.currentTarget.value)}>
		<option value="">All providers</option>
		{#each await getProviders() as p (p.id)}
			<option value={p.id}>{p.id} ({p.count})</option>
		{/each}
	</select>

	<button onclick={share}>{copied ? 'Copied!' : 'Copy share link'}</button>
</div>

<svelte:boundary>
	<div class="layout">
		<section>
			{#if true}
				<!-- query results are cached per argument, so this is fetched once -->
				{@const models = await getModels({ q, provider })}
				<p class="count">
					{models.length} models
					{#if $effect.pending()}<span class="pending">updating…</span>{/if}
				</p>
				<table>
					<thead>
						<tr><th>Model</th><th>Context</th><th>In / 1M</th><th>Out / 1M</th></tr>
					</thead>
					<tbody>
						{#each models as m (m.id)}
							<tr class:active={m.id === selected} onclick={() => set('model', m.id)}>
								<td><strong>{m.name}</strong><br /><code>{m.id}</code></td>
								<td>{tokens(m.context_window)}</td>
								<td>{perMillion(m.pricing?.input)}</td>
								<td>{perMillion(m.pricing?.output)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</section>

		{#if selected}
			{@const m = await getModel(selected)}
			<aside>
				<button class="close" onclick={() => set('model', null)}>×</button>
					<h2>{m.name}</h2>
					<code>{m.id}</code>
					<p>{m.description || 'No description.'}</p>
					<dl>
						<dt>Type</dt><dd>{m.type}</dd>
						<dt>Context</dt><dd>{m.context_window?.toLocaleString() ?? '—'}</dd>
						<dt>Max output</dt><dd>{m.max_tokens?.toLocaleString() ?? '—'}</dd>
					</dl>
					{#if m.tags?.length}
						<p>{#each m.tags as t}<span class="tag">{t}</span>{/each}</p>
					{/if}
					<pre>{`import { generateText } from 'ai';

await generateText({
  model: '${m.id}',
  prompt: 'Hello!'
});`}</pre>
			</aside>
		{/if}
	</div>

	{#snippet failed(error, reset)}
		<p>Failed to load models: {(error as Error).message}</p>
		<button onclick={reset}>Retry</button>
	{/snippet}
</svelte:boundary>

<style>
	.controls {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	input {
		flex: 1;
	}
	input,
	select,
	button {
		padding: 0.5rem;
		font: inherit;
	}
	.layout {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 1rem;
		align-items: start;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		background: white;
	}
	th,
	td {
		text-align: left;
		padding: 0.4rem 0.6rem;
		border-bottom: 1px solid #eee;
		font-size: 0.85rem;
	}
	tbody tr {
		cursor: pointer;
	}
	tbody tr:hover,
	tr.active {
		background: #fff4ee;
	}
	code {
		font-size: 0.75rem;
		color: #666;
	}
	.count {
		margin: 0 0 0.5rem;
		color: #555;
	}
	.pending {
		color: var(--color-theme-1);
		margin-left: 0.5rem;
	}
	aside {
		position: sticky;
		top: 1rem;
		width: 20rem;
		background: white;
		padding: 1rem;
		border-radius: 8px;
		box-shadow: 0 2px 12px rgb(0 0 0 / 0.08);
	}
	aside h2 {
		margin: 0 0 0.25rem;
		text-align: left;
	}
	.close {
		float: right;
		background: none;
		border: 0;
		font-size: 1.25rem;
		cursor: pointer;
	}
	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.25rem 1rem;
		font-size: 0.85rem;
	}
	dd {
		margin: 0;
	}
	.tag {
		display: inline-block;
		background: #eee;
		border-radius: 4px;
		padding: 0 0.4rem;
		margin: 0 0.25rem 0.25rem 0;
		font-size: 0.75rem;
	}
	pre {
		font-size: 0.75rem;
		background: #f6f6f6;
		padding: 0.75rem;
		overflow-x: auto;
	}
</style>
