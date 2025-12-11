import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./src/tests/setup.ts'],
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['node_modules', '.svelte-kit', 'build'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'src/tests/setup.ts',
				'**/*.d.ts',
				'**/*.config.*',
				'**/mockData.ts',
				'dist/',
				'.svelte-kit/'
			]
		},
		alias: {
			$lib: '/src/lib',
			$domain: '/src/domain',
			$infrastructure: '/src/infrastructure'
		}
	},
	resolve: {
		conditions: ['browser'],
		alias: {
			$domain: '/src/domain',
			$infrastructure: '/src/infrastructure'
		}
	},
	ssr: {
		noExternal: ['svelte']
	}
});
