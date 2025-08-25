import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Signals from '../../src/pages/Signals.jsx';
import { SignalProvider } from '../../src/context/SignalContext.jsx';
import { ToastProvider } from '../../src/context/ToastContext.jsx';

// Mock useWebSocket hook
const mockSendMessage = vi.fn();
vi.mock('../../src/hooks/useWebSocket.js', () => ({
	default: vi.fn(() => ({
		ws: { readyState: 1 }, // WebSocket.OPEN
		sendMessage: mockSendMessage
	}))
}));

// Mock useModal hook
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
vi.mock('../../src/hooks/useModal.js', () => ({
	default: vi.fn(() => ({
		showSuccess: mockShowSuccess,
		showError: mockShowError
	}))
}));

// Mock useSignals hook
const mockSignals = [
	{
		id: 1,
		cryptocurrency: 'BTCUSDT',
		signalType: 'buy',
		timeframe: '1h',
		price: 45000,
		confidence: 0.85,
		createdAt: '2024-01-01T10:00:00Z'
	},
	{
		id: 2,
		cryptocurrency: 'ETHUSDT',
		signalType: 'sell',
		timeframe: '4h',
		price: 3000,
		confidence: 0.75,
		createdAt: '2024-01-01T09:00:00Z'
	},
	{
		id: 3,
		cryptocurrency: 'ADAUSDT',
		signalType: 'hold',
		timeframe: '1d',
		price: 0.5,
		confidence: 0.60,
		createdAt: '2024-01-01T08:00:00Z'
	}
];

const mockGenerateManualSignal = vi.fn();
const mockRefreshSignals = vi.fn();

vi.mock('../../src/hooks/useSignals.js', () => ({
	useSignals: vi.fn(() => ({
		signals: mockSignals,
		isLoading: false,
		generateManualSignal: mockGenerateManualSignal,
		refreshSignals: mockRefreshSignals
	}))
}));

// Test wrapper component
const TestWrapper = ({ children }) => (
	<BrowserRouter>
		<ToastProvider>
			<SignalProvider>
				{children}
			</SignalProvider>
		</ToastProvider>
	</BrowserRouter>
);

describe('Signals Page', () => {

	const mockMarketData = {
		BTCUSDT: { currentPrice: 45000 },
		ETHUSDT: { currentPrice: 3000 },
		ADAUSDT: { currentPrice: 0.5 },
		DOTUSDT: { currentPrice: 20 },
		LINKUSDT: { currentPrice: 15 }
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockSendMessage.mockResolvedValue({ success: true });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Initial Rendering', () => {
		it('should render signals page with title and subtitle', async () => {
			render(<Signals />, { wrapper: TestWrapper });

			expect(screen.getByTestId('signals-page')).toBeInTheDocument();
			expect(screen.getByTestId('signals-title')).toHaveTextContent('Signals');
			expect(screen.getByTestId('signals-subtitle')).toHaveTextContent('View and manage trading signals');
		});

		it('should render action buttons', async () => {
			render(<Signals />, { wrapper: TestWrapper });

			expect(screen.getByTestId('refresh-data-button')).toBeInTheDocument();
			expect(screen.getByTestId('generate-signal-button')).toBeInTheDocument();
		});

		it('should render filters section', async () => {
			render(<Signals />, { wrapper: TestWrapper });

			expect(screen.getByTestId('filters-section')).toBeInTheDocument();
			expect(screen.getByTestId('search-input')).toBeInTheDocument();
			expect(screen.getByTestId('filter-select')).toBeInTheDocument();
		});

		it('should render market data section', async () => {
			render(<Signals />, { wrapper: TestWrapper });

			expect(screen.getByTestId('market-data-section')).toBeInTheDocument();
			expect(screen.getByTestId('recent-signals-card')).toBeInTheDocument();
			expect(screen.getByTestId('current-prices-card')).toBeInTheDocument();
		});

		it('should render signals table', async () => {
			render(<Signals />, { wrapper: TestWrapper });

			expect(screen.getByTestId('signals-table-section')).toBeInTheDocument();
			expect(screen.getByTestId('signals-table')).toBeInTheDocument();
		});
	});

	describe('Search and Filter Functionality', () => {
		it('should filter signals by search term', async () => {
			render(<Signals />, { wrapper: TestWrapper });

			const searchInput = screen.getByTestId('search-input');
			fireEvent.change(searchInput, { target: { value: 'BTC' } });

			await waitFor(() => {
				expect(screen.getByTestId('signal-cryptocurrency-1')).toHaveTextContent('BTCUSDT');
			});
		});

		it('should filter signals by signal type', async () => {
			render(<Signals />, { wrapper: TestWrapper });

			const filterSelect = screen.getByTestId('filter-select');
			fireEvent.change(filterSelect, { target: { value: 'buy' } });

			await waitFor(() => {
				expect(filterSelect.value).toBe('buy');
			});
		});

		it('should show no signals found when no matches', async () => {
			render(<Signals />, { wrapper: TestWrapper });

			const searchInput = screen.getByTestId('search-input');
			fireEvent.change(searchInput, { target: { value: 'NONEXISTENT' } });

			await waitFor(() => {
				expect(screen.getByTestId('no-signals-found')).toBeInTheDocument();
			});
		});
	});

	describe('Generate Signal Modal', () => {
		it('should open generate signal modal when button is clicked', async () => {
			render(<Signals />, { wrapper: TestWrapper });

			const generateButton = screen.getByTestId('generate-signal-button');
			fireEvent.click(generateButton);

			await waitFor(() => {
				expect(screen.getByTestId('generate-signal-modal')).toBeInTheDocument();
				expect(screen.getByTestId('generate-signal-modal-title')).toHaveTextContent('Generate Manual Signal');
			});
		});

		it('should close modal when cancel button is clicked', async () => {
			render(<Signals />, { wrapper: TestWrapper });

			// Open modal
			const generateButton = screen.getByTestId('generate-signal-button');
			fireEvent.click(generateButton);

			await waitFor(() => {
				expect(screen.getByTestId('generate-signal-modal')).toBeInTheDocument();
			});

			// Close modal
			const cancelButton = screen.getByTestId('generate-signal-cancel-button');
			fireEvent.click(cancelButton);

			await waitFor(() => {
				expect(screen.queryByTestId('generate-signal-modal')).not.toBeInTheDocument();
			});
		});

		it('should render form fields in modal', async () => {
			render(<Signals />, { wrapper: TestWrapper });

			const generateButton = screen.getByTestId('generate-signal-button');
			fireEvent.click(generateButton);

			await waitFor(() => {
				expect(screen.getByTestId('generate-signal-form')).toBeInTheDocument();
				expect(screen.getByTestId('generate-signal-cryptocurrency-input')).toBeInTheDocument();
				expect(screen.getByTestId('generate-signal-timeframe-select')).toBeInTheDocument();
				expect(screen.getByTestId('generate-signal-submit-button')).toBeInTheDocument();
			});
		});

		it('should handle form submission', async () => {
			mockGenerateManualSignal.mockResolvedValue({});

			render(<Signals />, { wrapper: TestWrapper });

			// Open modal
			const generateButton = screen.getByTestId('generate-signal-button');
			fireEvent.click(generateButton);

			await waitFor(() => {
				expect(screen.getByTestId('generate-signal-modal')).toBeInTheDocument();
			});

			// Fill form
			const cryptocurrencyInput = screen.getByTestId('generate-signal-cryptocurrency-input');
			const timeframeSelect = screen.getByTestId('generate-signal-timeframe-select');
			const submitButton = screen.getByTestId('generate-signal-submit-button');

			fireEvent.change(cryptocurrencyInput, { target: { value: 'BTCUSDT' } });
			fireEvent.change(timeframeSelect, { target: { value: '1h' } });

			// Submit form
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(mockGenerateManualSignal).toHaveBeenCalledWith('BTCUSDT', '1h');
			});
		});
	});

	describe('Market Data Loading', () => {
		it('should load market data when component mounts', async () => {
			mockSendMessage.mockResolvedValueOnce(mockMarketData.BTCUSDT);
			mockSendMessage.mockResolvedValueOnce(mockMarketData.ETHUSDT);
			mockSendMessage.mockResolvedValueOnce(mockMarketData.ADAUSDT);
			mockSendMessage.mockResolvedValueOnce(mockMarketData.DOTUSDT);
			mockSendMessage.mockResolvedValueOnce(mockMarketData.LINKUSDT);

			render(<Signals />, { wrapper: TestWrapper });

			await waitFor(() => {
				expect(mockSendMessage).toHaveBeenCalledWith('get_market_data', { symbol: 'BTCUSDT', timeframe: '1m' });
			});
		});

		it('should refresh market data when refresh button is clicked', async () => {
			mockSendMessage.mockResolvedValue(mockMarketData.BTCUSDT);

			render(<Signals />, { wrapper: TestWrapper });

			const refreshButton = screen.getByTestId('refresh-data-button');
			fireEvent.click(refreshButton);

			await waitFor(() => {
				expect(mockSendMessage).toHaveBeenCalledWith('get_market_data', { symbol: 'BTCUSDT', timeframe: '1m' });
			});
		});

		it('should show loading state for market data', async () => {
			render(<Signals />, { wrapper: TestWrapper });

			expect(screen.getByTestId('loading-recent-signals')).toBeInTheDocument();
			expect(screen.getByTestId('loading-current-prices')).toBeInTheDocument();
		});
	});

	describe('Signals Table', () => {
		it('should display signals in table', async () => {
			render(<Signals />, { wrapper: TestWrapper });

			await waitFor(() => {
				expect(screen.getByTestId('signal-cryptocurrency-1')).toHaveTextContent('BTCUSDT');
				expect(screen.getByTestId('signal-type-1')).toHaveTextContent('BUY');
				expect(screen.getByTestId('signal-timeframe-1')).toHaveTextContent('1h');
				expect(screen.getByTestId('signal-price-1')).toHaveTextContent('$45000');
				expect(screen.getByTestId('signal-confidence-1')).toHaveTextContent('85.0%');
			});
		});

		it('should show loading spinner when signals are loading', async () => {
			// Temporarily override the mock to return loading state
			const { useSignals } = await import('../../src/hooks/useSignals.js');
			vi.mocked(useSignals).mockReturnValueOnce({
				signals: [],
				isLoading: true,
				generateManualSignal: mockGenerateManualSignal,
				refreshSignals: mockRefreshSignals
			});

			render(<Signals />, { wrapper: TestWrapper });

			expect(screen.getByTestId('signals-loading')).toBeInTheDocument();
			expect(screen.getByTestId('signals-loading-spinner')).toBeInTheDocument();
		});

		it('should show no signals found when signals array is empty', async () => {
			// Temporarily override the mock to return empty signals
			const { useSignals } = await import('../../src/hooks/useSignals.js');
			vi.mocked(useSignals).mockReturnValueOnce({
				signals: [],
				isLoading: false,
				generateManualSignal: mockGenerateManualSignal,
				refreshSignals: mockRefreshSignals
			});

			render(<Signals />, { wrapper: TestWrapper });

			expect(screen.getByTestId('no-signals-found')).toBeInTheDocument();
		});
	});

	describe('Recent Signals Display', () => {
		it('should display recent signals with correct styling', async () => {
			mockSendMessage.mockResolvedValue(mockMarketData.BTCUSDT);

			render(<Signals />, { wrapper: TestWrapper });

			await waitFor(() => {
				expect(screen.getByTestId('recent-signals-title')).toHaveTextContent('Recent Signals');
				expect(screen.getByTestId('recent-signals-subtitle')).toHaveTextContent('Latest signals for each cryptocurrency');
			});
		});

		it('should show signal types with correct colors', async () => {
			mockSendMessage.mockResolvedValue(mockMarketData.BTCUSDT);

			render(<Signals />, { wrapper: TestWrapper });

			await waitFor(() => {
				// The component shows signals based on mockSignals, not mockMarketData
				// BTCUSDT should have a 'buy' signal from mockSignals
				const buySignal = screen.getByTestId('recent-signal-type-BTCUSDT');
				expect(buySignal).toHaveTextContent('BUY');
				expect(buySignal).toHaveClass('bg-green-100', 'text-green-800');
			});
		});
	});

	describe('Current Prices Display', () => {
		it('should display current prices with correct formatting', async () => {
			mockSendMessage.mockResolvedValue(mockMarketData.BTCUSDT);

			render(<Signals />, { wrapper: TestWrapper });

			await waitFor(() => {
				expect(screen.getByTestId('current-prices-title')).toHaveTextContent('Current Prices');
				expect(screen.getByTestId('current-prices-subtitle')).toHaveTextContent('Live cryptocurrency prices');
			});
		});

		it('should format prices correctly', async () => {
			mockSendMessage.mockResolvedValue(mockMarketData.BTCUSDT);

			render(<Signals />, { wrapper: TestWrapper });

			await waitFor(() => {
				const priceElement = screen.getByTestId('current-price-value-BTCUSDT');
				expect(priceElement).toHaveTextContent('$45,000.00');
			});
		});
	});

	describe('Error Handling', () => {
		it('should handle market data loading errors gracefully', async () => {
			mockSendMessage.mockRejectedValue(new Error('Network error'));

			render(<Signals />, { wrapper: TestWrapper });

			await waitFor(() => {
				// Should not crash and should show loading states
				expect(screen.getByTestId('loading-recent-signals')).toBeInTheDocument();
				expect(screen.getByTestId('loading-current-prices')).toBeInTheDocument();
			});
		});

		it('should handle signal generation errors', async () => {
			mockGenerateManualSignal.mockRejectedValue(new Error('Generation failed'));

			render(<Signals />, { wrapper: TestWrapper });

			// Open modal and submit form
			const generateButton = screen.getByTestId('generate-signal-button');
			fireEvent.click(generateButton);

			await waitFor(() => {
				expect(screen.getByTestId('generate-signal-modal')).toBeInTheDocument();
			});

			const cryptocurrencyInput = screen.getByTestId('generate-signal-cryptocurrency-input');
			const timeframeSelect = screen.getByTestId('generate-signal-timeframe-select');
			const submitButton = screen.getByTestId('generate-signal-submit-button');

			fireEvent.change(cryptocurrencyInput, { target: { value: 'BTCUSDT' } });
			fireEvent.change(timeframeSelect, { target: { value: '1h' } });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(mockShowError).toHaveBeenCalledWith('Error', 'Failed to generate signal. Please try again.');
			});
		});
	});

	describe('WebSocket Integration', () => {
		it('should listen for data updates from WebSocket', async () => {
			render(<Signals />, { wrapper: TestWrapper });

			// Simulate WebSocket data update
			await act(async () => {
				window.dispatchEvent(new Event('dataUpdated'));
			});

			await waitFor(() => {
				expect(mockRefreshSignals).toHaveBeenCalled();
			});
		});
	});
});
