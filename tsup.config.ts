import { defineConfig } from 'tsup';

export default defineConfig({
	bundle: false,
	clean: true,
	dts: false,
	entry: ['src/index.ts'],
	format: ['esm'],
	keepNames: true,
	minify: false,
	shims: false,
	skipNodeModulesBundle: true,
	splitting: false,
	sourcemap: true,
	target: 'esnext',
	treeshake: true,
	tsconfig: './tsconfig.json'
});
