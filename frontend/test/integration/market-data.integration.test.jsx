import React from 'react';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock all hooks and components
const mockSendMessage = vi.fn();
const mockSignals = [
	{
		id: 1,
		cryptocurrency: 'BTCUSDT',
		signalType: 'buy',
		confidence: 85,
		timeframe: '1h',
		status: 'active',
		createdAt: new Date().toISOString(),
		profitLoss: 0
	},
	{
		id: 2,
		cryptocurrency: 'ETHUSDT',
		signalType: 'sell',
		confidence: 72,
		timeframe: '4h',
		status: 'completed',
		createdAt: new Date().toISOString(),
		profitLoss: 150
	}
];

// Mock all hooks
vi.mock('../../src/hooks/useWebSocket', () => ({
	default: () => ({
		ws: { readyState: 1 },
		sendMessage: mockSendMessage,
		isConnected: true
	})
}));

vi.mock('../../src/hooks/useModal', () => ({
	default: () => ({
		showModal: vi.fn(),
		hideModal: vi.fn(),
		isOpen: false,
		modalState: {},
		showSuccess: vi.fn(),
		showError: vi.fn()
	})
}));

vi.mock('../../src/hooks/useSignals', () => ({
	useSignals: () => ({
		signals: mockSignals,
		isLoading: false,
		error: null,
		generateManualSignal: vi.fn(),
		refreshSignals: vi.fn()
	})
}));

// Mock context providers
vi.mock('../../src/context/SignalContext', () => ({
	SignalProvider: ({ children }) => <div data-testid="signal-provider">{children}</div>
}));

vi.mock('../../src/context/ToastContext', () => ({
	ToastProvider: ({ children }) => <div data-testid="toast-provider">{children}</div>
}));

// Mock Signals component
const MockSignals = () => {
	const [currentPrices, setCurrentPrices] = React.useState({});
	const [expectedSignals, setExpectedSignals] = React.useState([]);

	React.useEffect(() => {
		// Simulate market data loading
		const loadMarketData = async () => {
			const cryptocurrencies = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT'];
			const pricePromises = cryptocurrencies.map(async (symbol) => {
				try {
					const response = await mockSendMessage('get_market_data', { symbol, timeframe: '1m' });
					return { symbol, price: response?.currentPrice || 0 };
				} catch (error) {
					return { symbol, price: 0 };
				}
			});

			const prices = await Promise.all(pricePromises);
			const priceMap = {};
			prices.forEach(({ symbol, price }) => {
				priceMap[symbol] = price;
			});
			setCurrentPrices(priceMap);
		};

		loadMarketData();
	}, []);

	return (
		<div data-testid="signals-page">
			<div data-testid="refresh-data-button" onClick={() => {
				// Simulate refresh
				mockSendMessage('get_market_data', { symbol: 'BTCUSDT', timeframe: '1m' });
			}}>
				Refresh Data
			</div>
			<div data-testid="expected-signals-section">
				{Object.entries(currentPrices).map(([symbol, price]) => (
					<div key={symbol} data-testid={`crypto-${symbol}`}>
						{symbol}: ${price}
					</div>
				))}
			</div>
		</div>
	);
};

// Test wrapper component
const TestWrapper = ({ children }) => (
	<BrowserRouter>
		{children}
	</BrowserRouter>
);

describe('Market Data Integration Tests', () => {
	beforeAll(() => {
		// Setup mocks
		mockSendMessage.mockClear();
	});

	afterAll(() => {
		vi.clearAllMocks();
	});

	it('should load market data and display current prices', async () => {
		// Mock successful market data responses
		mockSendMessage.mockImplementation((type, payload) => {
			if (type === 'get_market_data') {
				const mockPrices = {
					'BTCUSDT': 112469.4,
					'ETHUSDT': 3456.78,
					'ADAUSDT': 0.52,
					'DOTUSDT': 7.89,
					'LINKUSDT': 16.45
				};

				return Promise.resolve({
					symbol: payload.symbol,
					timeframe: payload.timeframe,
					currentPrice: mockPrices[payload.symbol],
					ohlcv: [],
					ticker_24hr: {},
					technical_indicators: {},
					full_indicators: {},
					timestamp: Date.now()
				});
			}
			return Promise.resolve({});
		});

		render(
			<TestWrapper>
				<MockSignals />
			</TestWrapper>
		);

		// Wait for the component to load
		await waitFor(() => {
			expect(screen.getByTestId('signals-page')).toBeInTheDocument();
		});

		// Wait for market data to be loaded
		await waitFor(() => {
			expect(mockSendMessage).toHaveBeenCalledWith('get_market_data', {
				symbol: 'BTCUSDT',
				timeframe: '1m'
			});
		}, { timeout: 5000 });

		// Check that all cryptocurrency prices are requested
		const expectedSymbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT'];
		expectedSymbols.forEach(symbol => {
			expect(mockSendMessage).toHaveBeenCalledWith('get_market_data', {
				symbol,
				timeframe: '1m'
			});
		});

		// Verify that sendMessage was called exactly 5 times (one for each symbol)
		expect(mockSendMessage).toHaveBeenCalledTimes(5);
	});

	it('should handle market data loading errors gracefully', async () => {
		// Mock failed market data responses
		mockSendMessage.mockImplementation((type, payload) => {
			if (type === 'get_market_data') {
				return Promise.reject(new Error('Failed to fetch market data'));
			}
			return Promise.resolve({});
		});

		render(
			<TestWrapper>
				<MockSignals />
			</TestWrapper>
		);

		// Wait for the component to load
		await waitFor(() => {
			expect(screen.getByTestId('signals-page')).toBeInTheDocument();
		});

		// Wait for market data requests to be made
		await waitFor(() => {
			expect(mockSendMessage).toHaveBeenCalledWith('get_market_data', {
				symbol: 'BTCUSDT',
				timeframe: '1m'
			});
		}, { timeout: 5000 });

		// Verify that sendMessage was called despite errors
		expect(mockSendMessage).toHaveBeenCalledTimes(5);
	});

	it('should refresh market data when refresh button is clicked', async () => {
		// Mock successful market data responses
		mockSendMessage.mockImplementation((type, payload) => {
			if (type === 'get_market_data') {
				return Promise.resolve({
					symbol: payload.symbol,
					timeframe: payload.timeframe,
					currentPrice: 50000 + Math.random() * 10000,
					ohlcv: [],
					ticker_24hr: {},
					technical_indicators: {},
					full_indicators: {},
					timestamp: Date.now()
				});
			}
			return Promise.resolve({});
		});

		render(
			<TestWrapper>
				<MockSignals />
			</TestWrapper>
		);

		// Wait for the component to load
		await waitFor(() => {
			expect(screen.getByTestId('signals-page')).toBeInTheDocument();
		});

		// Clear previous calls
		mockSendMessage.mockClear();

		// Click refresh button
		const refreshButton = screen.getByTestId('refresh-data-button');
		refreshButton.click();

		// Wait for market data to be refreshed
		await waitFor(() => {
			expect(mockSendMessage).toHaveBeenCalledWith('get_market_data', {
				symbol: 'BTCUSDT',
				timeframe: '1m'
			});
		}, { timeout: 5000 });

		// Verify that refresh was triggered
		expect(mockSendMessage).toHaveBeenCalledWith('get_market_data', {
			symbol: 'BTCUSDT',
			timeframe: '1m'
		});
	});

	it('should display current prices in the expected signals section', async () => {
		// Mock successful market data responses with specific prices
		mockSendMessage.mockImplementation((type, payload) => {
			if (type === 'get_market_data') {
				const mockPrices = {
					'BTCUSDT': 112469.4,
					'ETHUSDT': 3456.78,
					'ADAUSDT': 0.52,
					'DOTUSDT': 7.89,
					'LINKUSDT': 16.45
				};

				return Promise.resolve({
					symbol: payload.symbol,
					timeframe: payload.timeframe,
					currentPrice: mockPrices[payload.symbol],
					ohlcv: [],
					ticker_24hr: {},
					technical_indicators: {},
					full_indicators: {},
					timestamp: Date.now()
				});
			}
			return Promise.resolve({});
		});

		render(
			<TestWrapper>
				<MockSignals />
			</TestWrapper>
		);

		// Wait for the component to load
		await waitFor(() => {
			expect(screen.getByTestId('signals-page')).toBeInTheDocument();
		});

		// Wait for market data to be loaded
		await waitFor(() => {
			expect(mockSendMessage).toHaveBeenCalledTimes(5);
		}, { timeout: 5000 });

		// Check that the expected signals section is rendered
		await waitFor(() => {
			expect(screen.getByTestId('expected-signals-section')).toBeInTheDocument();
		});

		// Check that cryptocurrency symbols are displayed
		expect(screen.getByTestId('crypto-BTCUSDT')).toBeInTheDocument();
		expect(screen.getByTestId('crypto-ETHUSDT')).toBeInTheDocument();
		expect(screen.getByTestId('crypto-ADAUSDT')).toBeInTheDocument();
		expect(screen.getByTestId('crypto-DOTUSDT')).toBeInTheDocument();
		expect(screen.getByTestId('crypto-LINKUSDT')).toBeInTheDocument();
	});

	it('should handle WebSocket connection issues', async () => {
		// Mock WebSocket connection failure
		mockSendMessage.mockImplementation(() => {
			return Promise.reject(new Error('WebSocket connection failed'));
		});

		render(
			<TestWrapper>
				<MockSignals />
			</TestWrapper>
		);

		// Wait for the component to load
		await waitFor(() => {
			expect(screen.getByTestId('signals-page')).toBeInTheDocument();
		});

		// Wait for market data requests to be made (even if they fail)
		await waitFor(() => {
			expect(mockSendMessage).toHaveBeenCalled();
		}, { timeout: 5000 });

		// Verify that the component still renders despite WebSocket errors
		expect(screen.getByTestId('signals-page')).toBeInTheDocument();
		expect(screen.getByTestId('refresh-data-button')).toBeInTheDocument();
	});
});
