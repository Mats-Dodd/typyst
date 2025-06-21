import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5173,
		strictPort: true,
		fs: {
			allow: ['..']
		}
	},
	optimizeDeps: {
		exclude: ['@electric-sql/pglite', '@automerge/automerge-wasm']
	},
	ssr: {
		noExternal: ['radix-icons-svelte']
	},
	assetsInclude: ['**/*.wasm']
});
