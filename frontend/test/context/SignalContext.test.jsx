import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, renderHook, act } from '@testing-library/react';
import { SignalProvider } from '../../src/context/SignalContext.jsx';
import { useSignals } from '../../src/hooks/useSignals.js';
import { ToastProvider } from '../../src/context/ToastContext.jsx';

// Mock useWebSocket hook
const mockSendMessage = vi.fn();
vi.mock('../../src/hooks/useWebSocket.js', () => ({
	default: vi.fn(() => ({
		ws: { readyState: 1 }, // WebSocket.OPEN
		sendMessage: mockSendMessage
	}))
}));

// Test component to access context
const TestComponent = () => {
	const { signals, stats, isLoading, error, fetchSignals, updateConfig } = useSignals();

	const handleUpdateConfig = async () => {
		try {
			await updateConfig('test', 'value');
		} catch (error) {
			// Error is already handled by the context
		}
	};

	return (
		<div>
			<div data-testid="signals-count">{signals?.length || 0}</div>
			<div data-testid="is-loading">{isLoading.toString()}</div>
			<div data-testid="error">{error || 'no-error'}</div>
			<div data-testid="stats">{JSON.stringify(stats)}</div>
			<button onClick={fetchSignals} data-testid="fetch-signals">Fetch Signals</button>
			<button onClick={handleUpdateConfig} data-testid="update-config">Update Config</button>
		</div>
	);
};

describe('SignalContext', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSendMessage.mockResolvedValue({ success: true });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should provide initial state', async () => {
		// Mock sendMessage to resolve immediately
		mockSendMessage
			.mockResolvedValueOnce([]) // fetchSignals
			.mockResolvedValueOnce({}); // fetchStats

		render(
			<ToastProvider>
				<SignalProvider>
					<TestComponent />
				</SignalProvider>
			</ToastProvider>
		);

		// Wait for initial loading to complete
		await waitFor(() => {
			expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
		});

		expect(screen.getByTestId('signals-count')).toHaveTextContent('0');
		expect(screen.getByTestId('error')).toHaveTextContent('no-error');
	});

	it('should fetch signals on mount', async () => {
		const mockSignals = [
			{ id: 1, cryptocurrency: 'BTCUSDT', signalType: 'buy', confidence: 0.85 },
			{ id: 2, cryptocurrency: 'ETHUSDT', signalType: 'sell', confidence: 0.75 }
		];

		mockSendMessage
			.mockResolvedValueOnce(mockSignals) // fetchSignals
			.mockResolvedValueOnce({ totalSignals: 2, successRate: 0.8 }); // fetchStats

		render(
			<ToastProvider>
				<SignalProvider>
					<TestComponent />
				</SignalProvider>
			</ToastProvider>
		);

		await waitFor(() => {
			expect(mockSendMessage).toHaveBeenCalledWith('get_signals', { limit: 50 });
		});

		await waitFor(() => {
			expect(screen.getByTestId('signals-count')).toHaveTextContent('2');
		});
	});

	it('should handle fetch signals error', async () => {
		mockSendMessage.mockRejectedValueOnce(new Error('Network error'));

		render(
			<ToastProvider>
				<SignalProvider>
					<TestComponent />
				</SignalProvider>
			</ToastProvider>
		);

		await waitFor(() => {
			expect(screen.getByTestId('error')).toHaveTextContent('Network error');
		});
	});

	it('should fetch signals manually', async () => {
		const mockSignals = [{ id: 1, cryptocurrency: 'BTCUSDT', signalType: 'buy' }];
		mockSendMessage
			.mockResolvedValueOnce([]) // Initial fetch
			.mockResolvedValueOnce({ totalSignals: 0, successRate: 0 }) // Initial stats
			.mockResolvedValueOnce(mockSignals); // Manual fetch

		render(
			<ToastProvider>
				<SignalProvider>
					<TestComponent />
				</SignalProvider>
			</ToastProvider>
		);

		// Wait for initial loading to complete
		await waitFor(() => {
			expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
		});

		const fetchButton = screen.getByTestId('fetch-signals');

		await act(async () => {
			fetchButton.click();
		});

		await waitFor(() => {
			expect(mockSendMessage).toHaveBeenCalledWith('get_signals', { limit: 50 });
		});

		await waitFor(() => {
			expect(screen.getByTestId('signals-count')).toHaveTextContent('1');
		});
	});

	it('should update configuration', async () => {
		mockSendMessage
			.mockResolvedValueOnce([]) // Initial fetch
			.mockResolvedValueOnce({ totalSignals: 0, successRate: 0 }) // Initial stats
			.mockResolvedValueOnce({ success: true }); // Update config

		render(
			<ToastProvider>
				<SignalProvider>
					<TestComponent />
				</SignalProvider>
			</ToastProvider>
		);

		// Wait for initial loading to complete
		await waitFor(() => {
			expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
		});

		const updateButton = screen.getByTestId('update-config');

		await act(async () => {
			updateButton.click();
		});

		await waitFor(() => {
			expect(mockSendMessage).toHaveBeenCalledWith('update_config', {
				key: 'test',
				value: 'value'
			});
		});
	});

	it('should handle configuration update error', async () => {
		mockSendMessage
			.mockResolvedValueOnce([]) // Initial fetch
			.mockResolvedValueOnce({ totalSignals: 0, successRate: 0 }) // Initial stats
			.mockRejectedValueOnce(new Error('Update failed')); // Update config error

		render(
			<ToastProvider>
				<SignalProvider>
					<TestComponent />
				</SignalProvider>
			</ToastProvider>
		);

		// Wait for initial loading to complete
		await waitFor(() => {
			expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
		});

		const updateButton = screen.getByTestId('update-config');

		await act(async () => {
			// The click will trigger updateConfig which throws an error
			// We need to handle this properly
			updateButton.click();
		});

		// Wait for the error to be set in state
		await waitFor(() => {
			expect(screen.getByTestId('error')).toHaveTextContent('Update failed');
		}, { timeout: 5000 });
	});

	it('should generate manual signal', async () => {
		const mockSignal = { id: 1, cryptocurrency: 'BTCUSDT', signalType: 'buy' };
		mockSendMessage
			.mockResolvedValueOnce([]) // Initial fetch
			.mockResolvedValueOnce({ totalSignals: 0, successRate: 0 }) // Initial stats
			.mockResolvedValueOnce(mockSignal); // Generate signal

		render(
			<ToastProvider>
				<SignalProvider>
					<TestComponent />
				</SignalProvider>
			</ToastProvider>
		);

		// Access the context to call generateManualSignal
		const { result } = renderHook(() => useSignals(), {
			wrapper: ({ children }) => (
				<ToastProvider>
					<SignalProvider>{children}</SignalProvider>
				</ToastProvider>
			)
		});

		await act(async () => {
			await result.current.generateManualSignal('BTCUSDT', '1h');
		});

		expect(mockSendMessage).toHaveBeenCalledWith('generate_signal', {
			cryptocurrency: 'BTCUSDT',
			timeframe: '1h'
		});
	});

	it('should handle WebSocket disconnection', async () => {
		// Mock sendMessage to return null to simulate disconnected state
		mockSendMessage.mockResolvedValue(null);

		render(
			<ToastProvider>
				<SignalProvider>
					<TestComponent />
				</SignalProvider>
			</ToastProvider>
		);

		// Wait for the component to stabilize
		await waitFor(() => {
			expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
		});
	});

	it('should retry failed requests', async () => {
		mockSendMessage
			.mockRejectedValueOnce(new Error('Network error')) // First attempt
			.mockResolvedValueOnce([]); // Retry success

		render(
			<ToastProvider>
				<SignalProvider>
					<TestComponent />
				</SignalProvider>
			</ToastProvider>
		);

		// Should retry after 2 seconds
		await waitFor(() => {
			expect(mockSendMessage).toHaveBeenCalledTimes(2);
		}, { timeout: 3000 });
	});

	it('should handle stats update', async () => {
		const mockStats = { totalSignals: 10, successRate: 0.85, totalProfit: 1500 };
		mockSendMessage
			.mockResolvedValueOnce([]) // Initial fetch
			.mockResolvedValueOnce(mockStats); // Stats

		render(
			<ToastProvider>
				<SignalProvider>
					<TestComponent />
				</SignalProvider>
			</ToastProvider>
		);

		await waitFor(() => {
			expect(screen.getByTestId('stats')).toHaveTextContent(JSON.stringify(mockStats));
		});
	});
});
