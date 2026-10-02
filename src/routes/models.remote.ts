/**
 * Remote functions: this file only ever runs on the server, but components
 * import and call these like plain async functions. SvelteKit turns each
 * call into a typed, validated fetch — and inlines the result during SSR.
 */
import { query } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';

const PAGE_SIZE = 20;

type Model = {
	id: string;
	name: string;
	description: string;
	owned_by: string;
	type: string;
	released?: number;
	context_window?: number;
	max_tokens?: number;
	tags?: string[];
	pricing?: { input?: string; output?: string };
};

/** The public AI Gateway catalog (no key needed), memoized for 5 minutes. */
let cache: Promise<Model[]> | undefined;
let cachedAt = 0;

function catalog() {
	if (!cache || Date.now() - cachedAt > 300_000) {
		cachedAt = Date.now();
		cache = fetch('https://ai-gateway.vercel.sh/v1/models')
			.then((r) => (r.ok ? r.json() : error(502, `AI Gateway said ${r.status}`)))
			.then((r: { data: Model[] }) => r.data.sort((a, b) => (b.released ?? 0) - (a.released ?? 0)));
		cache.catch(() => (cache = undefined)); // don't memoize failures
	}
	return cache;
}

/** Providers, busiest first. */
export const getProviders = query(async () => {
	const counts = Object.groupBy(await catalog(), (m) => m.owned_by);
	return Object.entries(counts)
		.map(([id, models]) => ({ id, count: models!.length }))
		.sort((a, b) => b.count - a.count);
});

/**
 * One page of matching models. The schema is checked on the server before
 * this runs, so `page` really is a non-negative integer.
 */
export const getModels = query(
	v.object({
		q: v.pipe(v.string(), v.maxLength(100)),
		provider: v.pipe(v.string(), v.maxLength(50)),
		page: v.pipe(v.number(), v.integer(), v.minValue(0))
	}),
	async ({ q, provider, page }) => {
		const needle = q.trim().toLowerCase();
		const matches = (await catalog()).filter(
			(m) =>
				(!provider || m.owned_by === provider) &&
				(!needle || [m.id, m.name, ...(m.tags ?? [])].some((s) => s.toLowerCase().includes(needle)))
		);
		const start = page * PAGE_SIZE;

		return {
			total: matches.length,
			more: start + PAGE_SIZE < matches.length,
			// send only what the list shows — details come from getModel
			models: matches
				.slice(start, start + PAGE_SIZE)
				.map(({ id, name, context_window, pricing }) => ({ id, name, context_window, pricing }))
		};
	}
);

/** Everything about one model. */
export const getModel = query(v.pipe(v.string(), v.maxLength(100)), async (id) => {
	return (await catalog()).find((m) => m.id === id) ?? error(404, `No model called ${id}`);
});
