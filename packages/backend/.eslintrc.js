module.exports = {
	extends: ['../../.eslintrc.js'],
	env: {
		node: true,
	},
	rules: {
		// Backend-specific rules
		'no-case-declarations': 'off', // Allow declarations in case blocks
	},
	overrides: [
		{
			files: ['**/*.test.js', '**/*.test.jsx', '**/*.spec.js', '**/*.spec.jsx', 'test/**/*.js'],
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
