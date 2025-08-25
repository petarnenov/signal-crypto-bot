import React from 'react';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import fs from 'fs';
import path from 'path';

// Make React globally available
global.React = React;

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

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation(query => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // deprecated
		removeListener: vi.fn(), // deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Clean up after each test
afterEach(() => {
	cleanup();

	// Clean up memory files
	try {
		const projectRoot = path.resolve(__dirname, '../..');
		const files = fs.readdirSync(projectRoot);

		files.forEach(file => {
			if (file.startsWith(':memory:')) {
				const filePath = path.join(projectRoot, file);
				fs.unlinkSync(filePath);
				console.log(`Cleaned up memory file: ${file}`);
			}
		});
	} catch (error) {
		// Ignore errors during cleanup
	}
});
