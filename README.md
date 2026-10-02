# sveltekit3-models-test

Browse every [Vercel AI Gateway](https://vercel.com/ai-gateway) model. A tiny demo of
[SvelteKit 3](https://svelte.dev/blog/sveltekit-3-is-here)'s two experimental features:

- **[Remote functions](https://svelte.dev/docs/kit/remote-functions)**: `query()`s in
  [`models.remote.ts`](src/routes/models.remote.ts) run on the server but are called like local
  functions, with validated arguments and typed results.
- **[Async Svelte](https://svelte.dev/docs/svelte/await-expressions)**: [`+page.svelte`](src/routes/+page.svelte)
  just `await`s them in markup. SSR resolves everything up front; afterwards, old results stay on
  screen until new ones are ready.

Search, provider, and the selected model live in the URL, so any view is a shareable link.
Results load 20 at a time.

```sh
pnpm install
pnpm dev
```

No API key needed: the [model catalog](https://ai-gateway.vercel.sh/v1/models) is public. Both
features are switched on in [`vite.config.ts`](vite.config.ts), where SvelteKit 3 config now lives.
