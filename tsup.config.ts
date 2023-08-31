import { defineConfig } from 'tsup';

export default defineConfig({
	bundle: false,
	clean: true,
	dts: false,
	entry: ['src/**/*.ts', '!src/**/*.d.ts'],
	format: ['esm'],
	keepNames: true,
	minify: false,
	shims: false,
	skipNodeModulesBundle: true,
	splitting: false,
	sourcemap: true,
	target: 'es2022',
	treeshake: true,
	tsconfig: './src/tsconfig.json'
});
