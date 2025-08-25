import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		setupFiles: ['./test/setup.js'],
		include: ['test/backend/**/*.test.js', 'test/integration/**/*.test.js'],
		exclude: [],
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
			'@test': resolve(__dirname, './test'),
			'@frontend': resolve(__dirname, './frontend/src')
		}
	}
});
