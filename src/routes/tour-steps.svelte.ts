/**
 * The tour: one stop per place this page touches data. Each <Beacon id> on the
 * page anchors the matching card rendered by <Tour />.
 */
export type Step = {
	id: string;
	tag: string; // the SvelteKit / Svelte capability on show
	title: string;
	body: string; // trusted, hand-written HTML
	code: string; // lines starting with `!` are highlighted
	docs: string;
	reveal?: () => void; // make this stop's beacon appear when the tour gets here
};

export const steps: Step[] = [
	{
		id: 'server',
		tag: 'remote functions',
		title: 'The server half',
		body: '<code>models.remote.ts</code> never ships to the browser. Each export is a <code>query()</code>: import it into a component, call it like a function, and SvelteKit turns the call into a typed <code>fetch</code>. Here it reads the public AI Gateway catalog and memoizes it for 5 minutes.',
		code: `// models.remote.ts (server only)
!export const getProviders = query(async () => {
  const models = await catalog(); // memoized fetch
  …
});`,
		docs: 'https://svelte.dev/docs/kit/remote-functions'
	},
	{
		id: 'search',
		tag: 'query() · validation · shallow routing',
		title: 'Typing is a new query',
		body: '<code>query</code> comes from <code>$app/server</code>. Wrap a server function in it inside a <code>.remote.ts</code> file, and components can import and call the result directly. Each keystroke changes <code>q</code>, so the page calls <code>getModels</code> with new arguments: a new query. The server checks those arguments against the schema (the first argument to <code>query</code>) before your code runs. A <em>shallow</em> <code>goto</code> keeps the URL shareable without navigating.',
		code: `// models.remote.ts
!import { query } from '$app/server';

export const getModels = query(
  v.object({
    q: v.string(), provider: v.string(), page: v.number()
  }),
  async ({ q, provider, page }) => { … }
);

// +page.svelte
!import { getModels } from './models.remote';
!getModels({ q, provider, page: 0 }) // new q → new query
goto(url, { replace: true, shallow: true });`,
		docs: 'https://svelte.dev/docs/kit/remote-functions#query-Query-arguments'
	},
	{
		id: 'providers',
		tag: 'await in markup · SSR',
		title: 'Awaited right in the template',
		body: 'No <code>load</code> function, no loading state. During SSR the server waits for the query, renders the options <em>and</em> embeds the result in the HTML, so hydration reuses it instead of fetching again.',
		code: `<select>
!  {#each await getProviders() as p (p.id)}
    <option value={p.id}>{p.id} · {p.count}</option>
  {/each}
</select>`,
		docs: 'https://svelte.dev/docs/svelte/await-expressions'
	},
	{
		id: 'list',
		tag: '$effect.pending()',
		title: 'Old rows stay until new ones land',
		body: 'Queries are cached per argument, so <code>first</code> and the list share one request. When arguments change, Svelte keeps the current UI on screen until the new data is ready, instead of flashing a spinner. The red bar sweeping across the list, driven by <code>$effect.pending()</code>, is the only loading state.',
		code: `!{@const first = await getModels({ q, provider, page: 0 })}

{first.total} models
!<ol class:loading={$effect.pending()}>…</ol>`,
		docs: 'https://svelte.dev/docs/svelte/await-expressions#Indicating-loading-states'
	},
	{
		id: 'more',
		tag: 'one query per page',
		title: 'Show more = one more await',
		body: 'Each page is its own query. A click renders one more <code>await</code>, which becomes a single <code>GET /_app/remote/…/getModels</code> for just those 20 rows. Earlier pages are already cached.',
		code: `{#each { length: pages }, i}
!  {@const { models } = await getModels({ q, provider, page: i })}
  {#each models as m}…{/each}
{/each}

<button onclick={() => pages++}>show more</button>`,
		docs: 'https://svelte.dev/docs/kit/remote-functions#query'
	},
	{
		id: 'detail',
		tag: 'error() · <svelte:boundary>',
		title: 'Details from the URL',
		body: '<code>?model=</code> drives <code>getModel(id)</code>, so any panel is a link. An unknown id throws <code>error(404)</code> on the server; the nearest <code>&lt;svelte:boundary&gt;</code> catches it and renders its <code>failed</code> snippet, with a retry button.',
		code: `!{@const m = await getModel(selected)}

// models.remote.ts
!return model ?? error(404, \`No model called \${id}\`);`,
		docs: 'https://svelte.dev/docs/svelte/svelte-boundary',
		reveal: () => document.querySelector<HTMLElement>('ol li button')?.click()
	}
];

/** Which stops have been opened, so their beacons can stop rippling. */
export const seen: Record<string, boolean> = $state({});

const beaconFor = (id: string) =>
	document.querySelector<HTMLElement>(`[popovertarget="tour-${id}"]`);

/** Resolves with the beacon once it renders (or null after ~2s). */
async function waitFor(id: string) {
	for (let t = 0; t < 40 && !beaconFor(id); t++) await new Promise((r) => setTimeout(r, 50));
	return beaconFor(id);
}

/** Open the first of `candidates` that's on the page (or can be revealed). */
async function go(candidates: Step[]) {
	for (const step of candidates) {
		if (!beaconFor(step.id)) step.reveal?.();
		const beacon = beaconFor(step.id) ?? (step.reveal ? await waitFor(step.id) : null);
		if (!beacon) continue;

		// on phones the card is a bottom drawer, so park the beacon near the top instead
		const phone = matchMedia('(width <= 40rem)').matches;
		beacon.scrollIntoView({ block: phone ? 'start' : 'center', behavior: 'smooth' });
		return document.getElementById(`tour-${step.id}`)!.showPopover(); // closes the open one
	}
	return false;
}

/** Forward from stop `from` (or start the tour). Past the last stop, close it. */
export async function next(from = -1) {
	if ((await go(steps.slice(from + 1))) === false)
		document.querySelector<HTMLElement>('[popover]:popover-open')?.hidePopover();
}

/** Back from stop `from`. On the first stop, stay put. */
export const back = (from: number) => go(steps.slice(0, from).reverse());
