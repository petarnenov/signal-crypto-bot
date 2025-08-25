module.exports = {
	root: true,
	env: {
		browser: true,
		es2020: true,
		node: true
	},
	extends: [
		'eslint:recommended',
		'plugin:react/recommended',
		'plugin:react/jsx-runtime',
		'plugin:react-hooks/recommended',
	],
	ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules/**', '**/node_modules/**'],
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
		ecmaFeatures: {
			jsx: true
		}
	},
	settings: {
		react: {
			version: '18.2'
		}
	},
	plugins: ['react-refresh'],
	rules: {
		'react-refresh/only-export-components': [
			'warn',
			{ allowConstantExport: true },
		],
		// Disable prop-types for now to reduce noise
		'react/prop-types': 'off',
		// Allow unused variables in test files
		'no-unused-vars': ['error', {
			'argsIgnorePattern': '^_',
			'varsIgnorePattern': '^_',
			'caughtErrorsIgnorePattern': '^_'
		}],
		// Fix mixed spaces and tabs
		'no-mixed-spaces-and-tabs': 'error',
		// Custom rule for data-testid enforcement in test files
		'no-restricted-properties': [
			'error',
			{
				object: 'screen',
				property: 'getByText',
				message: 'Use getByTestId instead of getByText for more stable tests. Add data-testid attributes to your components'
			},
			{
				object: 'screen',
				property: 'getByLabelText',
				message: 'Use getByTestId instead of getByLabelText for more stable tests. Add data-testid attributes to your components'
			},
			{
				object: 'screen',
				property: 'getByDisplayValue',
				message: 'Use getByTestId instead of getByDisplayValue for more stable tests. Add data-testid attributes to your components'
			},
			{
				object: 'screen',
				property: 'getByRole',
				message: 'Use getByTestId instead of getByRole for more stable tests. Add data-testid attributes to your components'
			},
			{
				object: 'screen',
				property: 'getAllByDisplayValue',
				message: 'Use getByTestId instead of getAllByDisplayValue for more stable tests. Add data-testid attributes to your components'
			}
		]
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
				'no-restricted-properties': [
					'error',
					{
						object: 'screen',
						property: 'getByText',
						message: 'Use getByTestId instead of getByText for more stable tests. Add data-testid attributes to your components'
					},
					{
						object: 'screen',
						property: 'getByLabelText',
						message: 'Use getByTestId instead of getByLabelText for more stable tests. Add data-testid attributes to your components'
					},
					{
						object: 'screen',
						property: 'getByDisplayValue',
						message: 'Use getByTestId instead of getByDisplayValue for more stable tests. Add data-testid attributes to your components'
					},
					{
						object: 'screen',
						property: 'getByRole',
						message: 'Use getByTestId instead of getByRole for more stable tests. Add data-testid attributes to your components'
					},
					{
						object: 'screen',
						property: 'getAllByDisplayValue',
						message: 'Use getByTestId instead of getAllByDisplayValue for more stable tests. Add data-testid attributes to your components'
					}
				]
			}
		}
	],
};
