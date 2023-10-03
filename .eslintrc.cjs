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
		}
	]
};
