module.exports = {
	root: true,
	env: {
		es2020: true,
		node: true,
	},
	extends: [
		'eslint:recommended',
	],
	ignorePatterns: ['dist', 'node_modules/**', '**/node_modules/**'],
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
	},
	rules: {
		// Common rules for all packages
		'no-unused-vars': ['error', {
			'argsIgnorePattern': '^_',
			'varsIgnorePattern': '^_',
			'caughtErrorsIgnorePattern': '^_'
		}],
		'no-mixed-spaces-and-tabs': 'error',
	},
	overrides: [
		{
			files: ['**/*.test.js', '**/*.test.jsx', '**/*.spec.js', '**/*.spec.jsx', 'test/setup.js'],
			env: {
				node: true,
				es2020: true
			},
			globals: {
				// Vitest globals
				'describe': 'readonly',
				'it': 'readonly',
				'expect': 'readonly',
				'beforeEach': 'readonly',
				'afterEach': 'readonly',
				'beforeAll': 'readonly',
				'afterAll': 'readonly',
				'vi': 'readonly',
				'screen': 'readonly',
				'render': 'readonly',
				'waitFor': 'readonly',
				'act': 'readonly',
				'renderHook': 'readonly'
			},
			rules: {
				'no-unused-vars': 'off', // Allow unused vars in tests
				'no-undef': 'off', // Allow undefined globals in tests (vitest provides them)
			}
		}
	]
};
