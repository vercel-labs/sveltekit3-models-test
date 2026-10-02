import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// SvelteKit 3: config lives here now, not in svelte.config.js
export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter(),
			compilerOptions: {
				runes: true,
				experimental: { async: true } // `await` anywhere in components
			},
			experimental: { remoteFunctions: true } // `*.remote.ts` → typed server calls
		})
	]
});
