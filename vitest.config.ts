import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
	plugins: [
		svelte({
			hot: !process.env.VITEST,
			compilerOptions: {
				css: 'injected',
				dev: true
			}
		})
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		globals: true,
		setupFiles: ['src/setupTests.ts'],
		mockReset: true,
		deps: {
			inline: [/^svelte/]
		},
		coverage: {
			exclude: [
				'src/mocks/**',
				'src/setupTests.ts',
				'postcss.config.js',
				'svelte.config.js',
				'tailwind.config.ts',
				'forbidden-psalm-tracker/src/routes/+layout.svelte',
				'src/lib/items.ts',
				'src/lib/types.ts',
				'src/lib/constants.ts',
				'src/lib/firebase.ts',
				'src/routes/+layout.svelte',
				'eslint.config.js',
				'vite.config.ts',
				'vitest.config.ts',
				'forbidden-psalm-tracker/.svelte-kit/**',
				'**/*.d.ts',
				'**/*.js',
				'forbidden-psalm-tracker/.svelte-kit/generated/**',
				'forbidden-psalm-tracker/.svelte-kit/generated/client/**',
				'forbidden-psalm-tracker/.svelte-kit/generated/client/nodes/**',
				'forbidden-psalm-tracker/.svelte-kit/generated/server/**',
				'forbidden-psalm-tracker/.svelte-kit/types/src/routes/**',
				'forbidden-psalm-tracker/src/app.d.ts',
				'.svelte-kit/generated/root.svelte'
			]
		},
		testTimeout: 10000,
		silent: true,
		onConsoleLog: (message) => {
			// Suppress all console logs during tests
			return false;
		}
	},
	resolve: {
		alias: {
			$lib: path.resolve(__dirname, './src/lib'),
			'$app/environment': path.resolve(__dirname, './src/mocks/app.environment.ts'),
			'$env/static/public': path.resolve(__dirname, './src/lib/mocks/env.ts')
		},
		conditions: ['browser']
	}
});
