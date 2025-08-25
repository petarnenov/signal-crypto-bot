import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock WebSocket for frontend tests
global.WebSocket = class MockWebSocket {
	constructor(url) {
		this.url = url;
		this.readyState = 1; // OPEN
		this.onopen = null;
		this.onmessage = null;
		this.onclose = null;
		this.onerror = null;
		this.send = vi.fn();
		this.close = vi.fn();

		// Simulate connection
		setTimeout(() => {
			if (this.onopen) this.onopen();
		}, 0);
	}
};

// Mock localStorage
global.localStorage = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn()
};

// Mock sessionStorage
global.sessionStorage = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn()
};

// Cleanup after each test
afterEach(() => {
	cleanup();
	vi.clearAllMocks();

	// Clean up any :memory: files that might have been created
	const fs = require('fs');
	const path = require('path');
	const projectDir = path.resolve(__dirname, '../..');

	try {
		const files = fs.readdirSync(projectDir);
		files.forEach(file => {
			if (file.startsWith(':memory:')) {
				const filePath = path.join(projectDir, file);
				fs.unlinkSync(filePath);
				console.log(`🧹 Cleaned up :memory: file: ${file}`);
			}
		});
	} catch (error) {
		console.warn('⚠️ Could not clean up :memory: files:', error.message);
	}
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
}));
