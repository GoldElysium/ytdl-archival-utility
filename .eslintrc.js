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
	parserOptions: {
		ecmaVersion: 12,
		sourceType: 'module',
		project: './tsconfig.eslint.json',
	},
	plugins: [
		'@typescript-eslint',
	],
	parser: '@typescript-eslint/parser',
	rules: {
		indent: 'off',
		'no-tabs': 'off',
		'@typescript-eslint/indent': ['error', 'tab'],
		'no-plusplus': ['error', {
			allowForLoopAfterthoughts: true,
		}],
	},
};
