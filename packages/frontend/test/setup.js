// Test setup for frontend package
import { expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';

// Global test utilities
globalThis.expect = expect;
globalThis.vi = vi;
globalThis.React = React;

// Mock WebSocket
globalThis.WebSocket = vi.fn(() => ({
	readyState: 1,
	onopen: null,
	onclose: null,
	onerror: null,
	onmessage: null,
	send: vi.fn(),
	close: vi.fn()
}));

// Mock window.location
Object.defineProperty(window, 'location', {
	value: {
		protocol: 'http:',
		hostname: 'localhost',
		port: '3000',
		origin: 'http://localhost:3000',
		href: 'http://localhost:3000/',
		pathname: '/'
	},
	writable: true
});
