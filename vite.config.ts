import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [svelte()],
    build: {
        outDir: 'build'
    },
    resolve: {
        alias: {
            '@wasm': resolve(__dirname, 'wasm-build')
        }
    },
    assetsInclude: ['**/*.wasm']
});
