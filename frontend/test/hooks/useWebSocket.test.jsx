import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToastProvider } from '../../src/context/ToastContext.jsx';
import useWebSocket from '../../src/hooks/useWebSocket';

// Mock WebSocket
const mockWebSocket = {
	OPEN: 1,
	CONNECTING: 0,
	CLOSED: 3,
	CLOSE_NORMAL: 1000,
	CLOSE_GOING_AWAY: 1001
};

global.WebSocket = vi.fn(() => ({
	readyState: mockWebSocket.OPEN,
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
		hostname: 'localhost'
	},
	writable: true
});

describe('useWebSocket Hook', () => {
	let mockWs;

	// Wrapper component to provide ToastProvider context
	const wrapper = ({ children }) => (
		<ToastProvider>
			{children}
		</ToastProvider>
	);

	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();

		// Create mock WebSocket instance
		mockWs = {
			readyState: mockWebSocket.OPEN,
			onopen: null,
			onclose: null,
			onerror: null,
			onmessage: null,
			send: vi.fn(),
			close: vi.fn()
		};

		global.WebSocket = vi.fn(() => mockWs);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Connection Status', () => {
		it('should start with isOnline as false', () => {
			const { result } = renderHook(() => useWebSocket(), { wrapper });

			expect(result.current.isOnline).toBe(false);
		});

		it('should set isOnline to true when WebSocket connects', async () => {
			const { result } = renderHook(() => useWebSocket(), { wrapper });

			// Simulate WebSocket connection
			await act(async () => {
				if (mockWs.onopen) {
					mockWs.onopen();
				}
			});

			expect(result.current.isOnline).toBe(true);
		});

		it('should set isOnline to false when WebSocket disconnects', async () => {
			const { result } = renderHook(() => useWebSocket(), { wrapper });

			// First connect
			await act(async () => {
				if (mockWs.onopen) {
					mockWs.onopen();
				}
			});

			expect(result.current.isOnline).toBe(true);

			// Then disconnect
			await act(async () => {
				if (mockWs.onclose) {
					mockWs.onclose({ code: 1006, reason: 'Connection lost' });
				}
			});

			expect(result.current.isOnline).toBe(false);
		});

		it('should set isOnline to false when WebSocket encounters an error', async () => {
			const { result } = renderHook(() => useWebSocket(), { wrapper });

			// First connect
			await act(async () => {
				if (mockWs.onopen) {
					mockWs.onopen();
				}
			});

			expect(result.current.isOnline).toBe(true);

			// Then trigger error
			await act(async () => {
				if (mockWs.onerror) {
					mockWs.onerror(new Error('Connection error'));
				}
			});

			expect(result.current.isOnline).toBe(false);
		});

		it('should maintain isOnline as false for clean disconnections', async () => {
			const { result } = renderHook(() => useWebSocket(), { wrapper });

			// Simulate clean disconnection (code 1000)
			await act(async () => {
				if (mockWs.onclose) {
					mockWs.onclose({ code: 1000, reason: 'Normal closure' });
				}
			});

			expect(result.current.isOnline).toBe(false);
		});

		it('should handle connection attempts and update status accordingly', async () => {
			const { result } = renderHook(() => useWebSocket(), { wrapper });

			// Simulate connection attempt
			await act(async () => {
				// Simulate connecting state
				mockWs.readyState = mockWebSocket.CONNECTING;
			});

			expect(result.current.isOnline).toBe(false);

			// Simulate successful connection
			await act(async () => {
				mockWs.readyState = mockWebSocket.OPEN;
				if (mockWs.onopen) {
					mockWs.onopen();
				}
			});

			expect(result.current.isOnline).toBe(true);
		});
	});

	describe('WebSocket Lifecycle', () => {
		it('should create WebSocket connection on mount', () => {
			renderHook(() => useWebSocket(), { wrapper });

			// Check that WebSocket was called with any localhost URL
			expect(global.WebSocket).toHaveBeenCalled();
			const callArgs = global.WebSocket.mock.calls[0][0];
			expect(callArgs).toMatch(/^ws:\/\/localhost:\d+$/);
		});

		it('should handle connection events properly', async () => {
			const { result } = renderHook(() => useWebSocket(), { wrapper });

			// Test connection flow
			await act(async () => {
				if (mockWs.onopen) {
					mockWs.onopen();
				}
			});

			expect(result.current.isOnline).toBe(true);
			expect(mockWs.send).toBeDefined();
		});
	});
});
