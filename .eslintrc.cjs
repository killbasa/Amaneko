module.exports = {
	root: true,
	extends: ['@kbotdev/eslint-config'],
	parserOptions: {
		project: './tsconfig.eslint.json',
		tsconfigRootDir: __dirname
	},
	overrides: [
		{
			files: ['Augments.ts', 'environment.ts'],
			rules: {
				'@typescript-eslint/consistent-type-definitions': 'off'
			}
		}
	]
};
