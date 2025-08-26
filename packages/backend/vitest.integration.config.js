import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		setupFiles: ['./test/setup.js'],
		include: ['test/integration/**/*.test.js'],
		exclude: ['test/backend/**/*.test.js'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'test/',
				'**/*.test.js',
				'**/*.spec.js',
				'coverage/',
				'dist/',
				'build/'
			]
		}
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, './src'),
			'@test': resolve(__dirname, './test')
		}
	}
});
