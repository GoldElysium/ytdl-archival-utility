module.exports = {
	env: {
		es2021: true,
		node: true,
	},
	extends: [
		'oclif',
		'oclif-typescript',
		'airbnb-base',
		'airbnb-typescript/base',
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 12,
		sourceType: 'module',
		project: './tsconfig.eslint.json',
	},
	plugins: [
		'@typescript-eslint',
	],
	rules: {
		indent: 'off',
		'no-tabs': 'off',
		'@typescript-eslint/indent': ['error', 'tab'],
		'no-plusplus': ['error', {
			allowForLoopAfterthoughts: true,
		}],
		'unicorn/no-process-exit': 'off',
		'unicorn/import-style': 'off',
		'unicorn/prefer-module': 'off',
		'no-restricted-syntax': 'off',
		'unicorn/filename-case': 'off',
	},
};
