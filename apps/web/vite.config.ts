import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
	plugins: [
		wasm(),
		topLevelAwait(),
		sveltekit()
	],
	server: {
		port: 5173,
		strictPort: true,
		fs: {
			allow: ['..']
		}
	},
	build: {
		target: 'esnext'
	},
	optimizeDeps: {
		exclude: ['@automerge/automerge-wasm', 'loro-crdt', 'loro-prosemirror'],
		esbuildOptions: {
			target: 'esnext'
		}
	},
	ssr: {
		noExternal: ['radix-icons-svelte']
	},
	assetsInclude: ['**/*.wasm'],
	worker: {
		format: 'es'
	}
});
