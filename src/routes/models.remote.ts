import { query } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';

const GATEWAY = 'https://ai-gateway.vercel.sh/v1/models';

export type Model = {
	id: string;
	name: string;
	description: string;
	owned_by: string;
	type: string;
	context_window?: number;
	max_tokens?: number;
	tags?: string[];
	pricing?: { input?: string; output?: string };
	released?: number;
};

// Shared, cached fetch of the public AI Gateway catalog (no API key needed)
let cache: { at: number; data: Model[] } | undefined;

async function catalog(): Promise<Model[]> {
	if (cache && Date.now() - cache.at < 5 * 60_000) return cache.data;
	const res = await fetch(GATEWAY);
	if (!res.ok) error(502, `AI Gateway responded ${res.status}`);
	const { data } = (await res.json()) as { data: Model[] };
	cache = { at: Date.now(), data };
	return data;
}

/** All providers, with model counts */
export const getProviders = query(async () => {
	const counts = new Map<string, number>();
	for (const m of await catalog()) counts.set(m.owned_by, (counts.get(m.owned_by) ?? 0) + 1);
	return [...counts].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count);
});

/** Filtered model list — the argument is validated on the server */
export const getModels = query(
	v.object({
		q: v.optional(v.pipe(v.string(), v.maxLength(100)), ''),
		provider: v.optional(v.pipe(v.string(), v.maxLength(50)), '')
	}),
	async ({ q, provider }) => {
		const needle = q.trim().toLowerCase();
		return (await catalog())
			.filter((m) => !provider || m.owned_by === provider)
			.filter(
				(m) =>
					!needle ||
					m.id.toLowerCase().includes(needle) ||
					m.name.toLowerCase().includes(needle) ||
					m.tags?.some((t) => t.includes(needle))
			)
			.sort((a, b) => (b.released ?? 0) - (a.released ?? 0))
			.map(({ id, name, owned_by, type, context_window, pricing, tags }) => ({
				id,
				name,
				owned_by,
				type,
				context_window,
				pricing,
				tags
			}));
	}
);

/** Full details for one model */
export const getModel = query(v.pipe(v.string(), v.maxLength(100)), async (id) => {
	const model = (await catalog()).find((m) => m.id === id);
	if (!model) error(404, `Unknown model ${id}`);
	return model;
});
