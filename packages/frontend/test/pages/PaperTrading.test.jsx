import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaperTrading from '../../src/pages/PaperTrading';
import { SignalProvider } from '../../src/context/SignalContext.jsx';

// Mock WebSocket hook
const mockSendMessage = vi.fn();
const mockWebSocket = {
	sendMessage: mockSendMessage,
	isConnected: true,
	connect: vi.fn(),
	disconnect: vi.fn()
};

vi.mock('../../src/hooks/useWebSocket', () => ({
	default: () => mockWebSocket
}));

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn()
};
global.localStorage = localStorageMock;

describe('PaperTrading Orders Limit Dropdown', () => {
	const mockAccounts = [
		{ id: 'account1', name: 'Test Account 1', balance: 10000 },
		{ id: 'account2', name: 'Test Account 2', balance: 5000 }
	];

	const mockPositions = [
		{ id: 'pos1', symbol: 'BTCUSDT', side: 'BUY', quantity: 0.1, avgPrice: 50000 }
	];

	const mockOrders = [
		{ id: 'order1', symbol: 'BTCUSDT', side: 'BUY', quantity: 0.1, price: 50000, status: 'PENDING' },
		{ id: 'order2', symbol: 'ETHUSDT', side: 'SELL', quantity: 1, price: 3000, status: 'FILLED' }
	];

	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.getItem.mockReturnValue(null);

		// Setup default mock responses for initial data loading
		mockSendMessage
			.mockResolvedValueOnce({ settingValue: 'all' }) // get_user_setting
			.mockResolvedValueOnce({ data: mockAccounts }) // get_paper_trading_accounts
			.mockResolvedValueOnce({ data: [] }) // get_signals
			.mockResolvedValueOnce({ data: mockPositions }) // get_paper_trading_positions
			.mockResolvedValueOnce({ data: { totalTrades: 0, winRate: 0 } }) // get_stats
			.mockResolvedValueOnce({ data: mockOrders }) // get_paper_trading_orders
			.mockResolvedValueOnce({ data: mockAccounts }) // get_paper_trading_accounts (after account selection)
			.mockResolvedValueOnce({ data: mockPositions }) // get_paper_trading_positions (after account selection)
			.mockResolvedValueOnce({ data: mockOrders }); // get_paper_trading_orders (after account selection)
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const renderPaperTrading = () => {
		return render(
			<SignalProvider>
				<PaperTrading />
			</SignalProvider>
		);
	};

	describe('Orders Limit Dropdown Basic Functionality', () => {
		it('should render orders limit button after loading', async () => {
			renderPaperTrading();

			// Wait for loading to complete
			await waitFor(() => {
				expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
			}, { timeout: 5000 });

			// Now check for the orders limit button
			await waitFor(() => {
				expect(screen.getByTestId('orders-limit-button')).toBeInTheDocument();
			});

			expect(screen.getByTestId('orders-limit-button')).toHaveTextContent('Orders Limit: All');
		});

		it('should show dropdown when orders limit button is clicked', async () => {
			renderPaperTrading();

			// Wait for loading to complete
			await waitFor(() => {
				expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
			}, { timeout: 5000 });

			// Wait for the button to be available
			await waitFor(() => {
				expect(screen.getByTestId('orders-limit-button')).toBeInTheDocument();
			});

			const button = screen.getByTestId('orders-limit-button');
			await userEvent.click(button);

			expect(screen.getByTestId('orders-limit-dropdown')).toBeInTheDocument();
			expect(screen.getByTestId('limit-all')).toBeInTheDocument();
			expect(screen.getByTestId('limit-10')).toBeInTheDocument();
			expect(screen.getByTestId('limit-20')).toBeInTheDocument();
			expect(screen.getByTestId('limit-50')).toBeInTheDocument();
		});

		it('should close dropdown when clicking outside', async () => {
			renderPaperTrading();

			// Wait for loading to complete
			await waitFor(() => {
				expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
			}, { timeout: 5000 });

			// Wait for the button to be available
			await waitFor(() => {
				expect(screen.getByTestId('orders-limit-button')).toBeInTheDocument();
			});

			const button = screen.getByTestId('orders-limit-button');
			await userEvent.click(button);

			expect(screen.getByTestId('orders-limit-dropdown')).toBeInTheDocument();

			// Click outside the dropdown
			fireEvent.mouseDown(document.body);

			await waitFor(() => {
				expect(screen.queryByTestId('orders-limit-dropdown')).not.toBeInTheDocument();
			});
		});

		it('should change orders limit when clicking limit options', async () => {
			// Setup additional mock responses for the limit change
			mockSendMessage
				.mockResolvedValueOnce({ success: true }) // set_user_setting
				.mockResolvedValueOnce({ data: mockOrders.slice(0, 10) }); // get_paper_trading_orders with new limit

			renderPaperTrading();

			// Wait for loading to complete
			await waitFor(() => {
				expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
			}, { timeout: 5000 });

			// Wait for the button to be available
			await waitFor(() => {
				expect(screen.getByTestId('orders-limit-button')).toBeInTheDocument();
			});

			const button = screen.getByTestId('orders-limit-button');
			console.log('🔄 [TEST] Clicking orders limit button');
			await act(async () => {
				await userEvent.click(button);
			});

			// Wait for dropdown to appear
			await waitFor(() => {
				expect(screen.getByTestId('orders-limit-dropdown')).toBeInTheDocument();
			});

			console.log('🔄 [TEST] Dropdown is visible, clicking limit-10');
			const limit10Button = screen.getByTestId('limit-10');
			await act(async () => {
				await userEvent.click(limit10Button);
			});

			console.log('🔄 [TEST] Clicked limit-10, waiting for text to change');
			await waitFor(() => {
				expect(screen.getByTestId('orders-limit-button')).toHaveTextContent('Orders Limit: 10');
			}, { timeout: 5000 });

			// Verify that set_user_setting was called
			expect(mockSendMessage).toHaveBeenCalledWith('set_user_setting', {
				userId: 'default',
				settingKey: 'orders_limit',
				settingValue: '10'
			});

			// Verify that get_paper_trading_orders was called with new limit
			expect(mockSendMessage).toHaveBeenCalledWith('get_paper_trading_orders', {
				accountId: 'order1',
				limit: 10
			});
		});
	});

	describe('Orders Limit Error Handling', () => {
		it('should handle errors when saving user setting', async () => {
			// Setup additional mock responses for the limit change with error
			mockSendMessage
				.mockRejectedValueOnce(new Error('Save failed')); // set_user_setting fails

			renderPaperTrading();

			// Wait for loading to complete
			await waitFor(() => {
				expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
			}, { timeout: 5000 });

			// Wait for the button to be available
			await waitFor(() => {
				expect(screen.getByTestId('orders-limit-button')).toBeInTheDocument();
			});

			const button = screen.getByTestId('orders-limit-button');
			await act(async () => {
				await userEvent.click(button);
			});

			const limit10Button = screen.getByTestId('limit-10');
			await act(async () => {
				await userEvent.click(limit10Button);
			});

			// Should still update the UI even if save fails
			await waitFor(() => {
				expect(screen.getByTestId('orders-limit-button')).toHaveTextContent('Orders Limit: 10');
			});
		});
	});

	describe('Orders Limit UI Updates and Data Loading', () => {
		it('should update UI immediately when limit is changed', async () => {
			// Setup mock responses for limit changes
			mockSendMessage
				.mockResolvedValueOnce({ success: true }) // set_user_setting for 20
				.mockResolvedValueOnce({ data: mockOrders.slice(0, 20) }); // get_paper_trading_orders with limit 20

			renderPaperTrading();

			// Wait for loading to complete
			await waitFor(() => {
				expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
			}, { timeout: 5000 });

			// Wait for the button to be available
			await waitFor(() => {
				expect(screen.getByTestId('orders-limit-button')).toBeInTheDocument();
			});

			// Test changing to 20 orders
			const button = screen.getByTestId('orders-limit-button');
			await act(async () => {
				await userEvent.click(button);
			});

			// Wait for dropdown to appear
			await waitFor(() => {
				expect(screen.getByTestId('orders-limit-dropdown')).toBeInTheDocument();
			}, { timeout: 5000 });

			const limit20Button = screen.getByTestId('limit-20');
			await act(async () => {
				await userEvent.click(limit20Button);
			});

			// Verify UI updates immediately
			await waitFor(() => {
				expect(screen.getByTestId('orders-limit-button')).toHaveTextContent('Orders Limit: 20');
			}, { timeout: 5000 });
		});

		it('should load data with correct limit when limit is changed', async () => {
			// Setup mock responses for limit changes
			mockSendMessage
				.mockResolvedValueOnce({ success: true }) // set_user_setting for 10
				.mockResolvedValueOnce({ data: mockOrders.slice(0, 10) }); // get_paper_trading_orders with limit 10

			renderPaperTrading();

			// Wait for loading to complete
			await waitFor(() => {
				expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
			}, { timeout: 5000 });

			// Wait for the button to be available
			await waitFor(() => {
				expect(screen.getByTestId('orders-limit-button')).toBeInTheDocument();
			});

			// Test changing to 10 orders
			const button = screen.getByTestId('orders-limit-button');
			await act(async () => {
				await userEvent.click(button);
			});

			// Wait for dropdown to appear
			await waitFor(() => {
				expect(screen.getByTestId('orders-limit-dropdown')).toBeInTheDocument();
			}, { timeout: 5000 });

			const limit10Button = screen.getByTestId('limit-10');
			await act(async () => {
				await userEvent.click(limit10Button);
			});

			// Wait for UI to update
			await waitFor(() => {
				expect(screen.getByTestId('orders-limit-button')).toHaveTextContent('Orders Limit: 10');
			}, { timeout: 5000 });

			// Verify that get_paper_trading_orders was called with limit 10
			expect(mockSendMessage).toHaveBeenCalledWith('get_paper_trading_orders', {
				accountId: 'order1',
				limit: 10
			});
		});

		it('should persist limit setting across component re-renders', async () => {
			// Setup mock responses
			mockSendMessage
				.mockResolvedValueOnce({ success: true }) // set_user_setting
				.mockResolvedValueOnce({ data: mockOrders.slice(0, 10) }); // get_paper_trading_orders

			renderPaperTrading();

			// Wait for loading to complete
			await waitFor(() => {
				expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
			}, { timeout: 5000 });

			// Wait for the button to be available
			await waitFor(() => {
				expect(screen.getByTestId('orders-limit-button')).toBeInTheDocument();
			});

			// Change limit to 10
			const button = screen.getByTestId('orders-limit-button');
			await act(async () => {
				await userEvent.click(button);
			});

			await waitFor(() => {
				expect(screen.getByTestId('orders-limit-dropdown')).toBeInTheDocument();
			}, { timeout: 5000 });

			const limit10Button = screen.getByTestId('limit-10');
			await act(async () => {
				await userEvent.click(limit10Button);
			});

			// Verify UI updates
			await waitFor(() => {
				expect(screen.getByTestId('orders-limit-button')).toHaveTextContent('Orders Limit: 10');
			}, { timeout: 5000 });

			// Verify that set_user_setting was called to persist the setting
			expect(mockSendMessage).toHaveBeenCalledWith('set_user_setting', {
				userId: 'default',
				settingKey: 'orders_limit',
				settingValue: '10'
			});
		});
	});
});
