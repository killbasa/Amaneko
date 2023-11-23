import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	test: {
		globals: true,
		coverage: {
			provider: 'istanbul',
			reporter: ['text']
		},
		globalSetup: './tests/vitest.global.ts'
	},
	resolve: {
		alias: {
			'#src': resolve('./src')
		}
	}
});
