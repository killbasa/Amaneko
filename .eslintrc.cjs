module.exports = {
	root: true,
	extends: ['@kbotdev/eslint-config'],
	parserOptions: {
		project: './tsconfig.eslint.json',
		tsconfigRootDir: __dirname
	},
	overrides: [
		{
			files: ['Augments.ts', 'environment.d.ts'],
			rules: {
				'@typescript-eslint/consistent-type-definitions': 'off'
			}
		},
		{
			files: ['tests/**'],
			rules: {
				'import/no-unresolved': 'off'
			}
		},
		{
			files: ['**/interaction-handlers/**/*.ts'],
			rules: {
				'@typescript-eslint/explicit-function-return-type': 'off',
				'@typescript-eslint/explicit-module-boundary-types': 'off'
			}
		}
	]
};
