import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['test/setup.js'],
		include: ['test/**/*.test.jsx', 'test/**/*.test.js'],
		exclude: ['test/integration/**/*.test.jsx'],
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
