import { defineConfig } from 'vite';
import path from 'path';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
    plugins: [svelte()],
    build: {
        outDir: 'build'
    },
    resolve: {
        alias: {
            '@wasm': path.resolve(__dirname, 'wasm-build')
        }
    },
    assetsInclude: ['**/*.wasm']
});
