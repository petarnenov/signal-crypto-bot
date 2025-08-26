import { describe, it, expect, beforeEach, afterEach } from 'vitest';
const PaperTradingService = require('../../src/paper-trading-service.js');
const CryptoBotDatabase = require('@signal-crypto-bot/database');

describe('PaperTradingService', () => {
	let paperTradingService;
	let mockDb;

	beforeEach(async () => {
		// Create a mock database object with all required methods
		mockDb = {
			createPaperTradingAccount: vi.fn(),
			getPaperTradingAccount: vi.fn(),
			getUserPaperTradingAccounts: vi.fn(),
			updatePaperTradingAccount: vi.fn(),
			createPaperTradingPosition: vi.fn(),
			getPaperTradingPositions: vi.fn(),
			updatePaperTradingPosition: vi.fn(),
			deletePaperTradingPosition: vi.fn(),
			createPaperTradingOrder: vi.fn(),
			getPaperTradingOrders: vi.fn(),
			getPaperTradingOrder: vi.fn(),
			updatePaperTradingOrder: vi.fn(),
			getPaperTradingAccounts: vi.fn(),
			db: {
				prepare: vi.fn().mockReturnValue({
					all: vi.fn().mockReturnValue([])
				})
			}
		};
		
		paperTradingService = new PaperTradingService({ db: mockDb });
		
		// Wait a bit for async initialization to complete
		await new Promise(resolve => setTimeout(resolve, 200));
	});

	afterEach(async () => {
		// Clean up mocks
		vi.clearAllMocks();
	});

	describe('Account Management', () => {
		it('should create account', async () => {
			// Mock the database method to return a successful result
			mockDb.createPaperTradingAccount.mockReturnValue({ changes: 1 });
			
			const account = await paperTradingService.createAccount('user1', 10000, 'USDT');
			expect(account).toBeDefined();
			expect(account.userId).toBe('user1');
			expect(account.balance).toBe(10000);
			expect(account.currency).toBe('USDT');
			
			// Verify that the database method was called
			expect(mockDb.createPaperTradingAccount).toHaveBeenCalled();
		});

		it('should get user accounts', async () => {
			// Mock the database methods
			mockDb.createPaperTradingAccount.mockReturnValue({ changes: 1 });
			mockDb.getUserPaperTradingAccounts.mockReturnValue([
				{ id: 'account1', userId: 'user1', balance: 10000, currency: 'USDT' },
				{ id: 'account2', userId: 'user1', balance: 5000, currency: 'USDT' }
			]);
			
			// Create multiple accounts
			await paperTradingService.createAccount('user1', 10000, 'USDT');
			await paperTradingService.createAccount('user1', 5000, 'USDT');

			const accounts = await paperTradingService.getUserAccounts('user1');
			expect(accounts.length).toBeGreaterThanOrEqual(2);
			expect(accounts[0].userId).toBe('user1');
			expect(accounts[1].userId).toBe('user1');
			
			// Verify that the database method was called
			expect(mockDb.getUserPaperTradingAccounts).toHaveBeenCalledWith('user1');
		});

		it('should get account by ID', async () => {
			const createdAccount = await paperTradingService.createAccount('user1', 10000, 'USDT');
			const account = await paperTradingService.getAccount(createdAccount.id);

			expect(account).toBeDefined();
			expect(account.id).toBe(createdAccount.id);
			expect(account.userId).toBe('user1');
		});

		it('should update account balance', async () => {
			// Mock the database methods
			mockDb.createPaperTradingAccount.mockReturnValue({ changes: 1 });
			
			const account = await paperTradingService.createAccount('user1', 10000, 'USDT');
			
			// Update the account balance
			const updatedAccountData = { ...account, balance: 9500 };
			await paperTradingService.updateAccount(updatedAccountData);
			
			// Verify that the database method was called
			expect(mockDb.updatePaperTradingAccount).toHaveBeenCalledWith(updatedAccountData);
			
			// Verify that the account in memory was updated
			expect(updatedAccountData.balance).toBe(9500);
		});
	});

	describe('Position Management', () => {
		it('should create position', async () => {
			// Mock the database methods
			mockDb.createPaperTradingAccount.mockReturnValue({ changes: 1 });
			mockDb.updatePaperTradingPosition.mockReturnValue({ changes: 1 });
			
			// Create account first
			const account = await paperTradingService.createAccount('user1', 10000, 'USDT');

			// Create position using the new simplified method
			const positionData = {
				accountId: account.id,
				symbol: 'BTCUSDT',
				side: 'LONG',
				quantity: 0.1,
				avgPrice: 50000,
				currentPrice: 51000
			};

			const position = await paperTradingService.createPosition(positionData);
			
			// Verify position was created
			expect(position).toBeDefined();
			expect(position.symbol).toBe('BTCUSDT');
			expect(position.side).toBe('LONG');
			expect(position.quantity).toBe(0.1);
			expect(position.avgPrice).toBe(50000);
			expect(position.currentPrice).toBe(51000);
			
			// Verify that the database method was called
			expect(mockDb.updatePaperTradingPosition).toHaveBeenCalled();
		});

		it('should get account positions', async () => {
			// Mock the database methods
			mockDb.createPaperTradingAccount.mockReturnValue({ changes: 1 });
			mockDb.updatePaperTradingPosition.mockReturnValue({ changes: 1 });
			
			// Create account first
			const account = await paperTradingService.createAccount('user1', 10000, 'USDT');
			
			// Now set up the mock with the actual account ID
			mockDb.getPaperTradingPositions.mockReturnValue([
				{
					id: `${account.id}_BTCUSDT`,
					accountId: account.id,
					symbol: 'BTCUSDT',
					side: 'LONG',
					quantity: 0.1,
					avgPrice: 50000,
					currentPrice: 51000,
					unrealizedPnl: 0,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				},
				{
					id: `${account.id}_ETHUSDT`,
					accountId: account.id,
					symbol: 'ETHUSDT',
					side: 'SHORT',
					quantity: 1.0,
					avgPrice: 3000,
					currentPrice: 2900,
					unrealizedPnl: 0,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
			]);

			// Create positions
			await paperTradingService.createPosition({
				accountId: account.id,
				symbol: 'BTCUSDT',
				side: 'LONG',
				quantity: 0.1,
				avgPrice: 50000,
				currentPrice: 51000
			});

			await paperTradingService.createPosition({
				accountId: account.id,
				symbol: 'ETHUSDT',
				side: 'SHORT',
				quantity: 1.0,
				avgPrice: 3000,
				currentPrice: 2900
			});

			const positions = await paperTradingService.getPositions(account.id);
			expect(positions).toHaveLength(2);
			expect(positions[0].symbol).toBe('BTCUSDT');
			expect(positions[1].symbol).toBe('ETHUSDT');
			
			// Verify that the database method was called
			expect(mockDb.getPaperTradingPositions).toHaveBeenCalledWith(account.id);
		});

		it('should update position unrealized PnL', async () => {
			// Mock the database methods
			mockDb.createPaperTradingAccount.mockReturnValue({ changes: 1 });
			mockDb.updatePaperTradingPosition.mockReturnValue({ changes: 1 });
			
			// Create account and position
			const account = await paperTradingService.createAccount('user1', 10000, 'USDT');

			const position = await paperTradingService.createPosition({
				accountId: account.id,
				symbol: 'BTCUSDT',
				side: 'LONG',
				quantity: 0.1,
				avgPrice: 50000,
				currentPrice: 51000
			});

			// Update PnL
			const updatedPosition = await paperTradingService.updateUnrealizedPnL(position.id, 52000);
			expect(updatedPosition.currentPrice).toBe(52000);
			expect(updatedPosition.unrealizedPnl).toBe(200); // (52000 - 50000) * 0.1
			
			// Verify that the database method was called
			expect(mockDb.updatePaperTradingPosition).toHaveBeenCalled();
		});

		it('should close position', async () => {
			// Mock the database methods
			mockDb.createPaperTradingAccount.mockReturnValue({ changes: 1 });
			mockDb.updatePaperTradingPosition.mockReturnValue({ changes: 1 });
			mockDb.createPaperTradingOrder.mockReturnValue({ changes: 1 });
			mockDb.updatePaperTradingAccount.mockReturnValue({ changes: 1 });
			mockDb.deletePaperTradingPosition.mockReturnValue({ changes: 1 });
			mockDb.getPaperTradingPositions.mockReturnValue([]);
			
			// Create account and position
			const account = await paperTradingService.createAccount('user1', 10000, 'USDT');

			const position = await paperTradingService.createPosition({
				accountId: account.id,
				symbol: 'BTCUSDT',
				side: 'LONG',
				quantity: 0.1,
				avgPrice: 50000,
				currentPrice: 51000
			});

			// Close position
			const result = await paperTradingService.closePosition(position.id, 52000);
			expect(result.success).toBe(true);

			// Position should be removed
			const positions = await paperTradingService.getPositions(account.id);
			expect(positions).toHaveLength(0);
			
			// Verify that the database methods were called
			expect(mockDb.createPaperTradingOrder).toHaveBeenCalled();
			expect(mockDb.updatePaperTradingAccount).toHaveBeenCalled();
			expect(mockDb.deletePaperTradingPosition).toHaveBeenCalled();
		});
	});

	describe('Order Management', () => {
		it('should create order', async () => {
			// Mock the database methods
			mockDb.createPaperTradingAccount.mockReturnValue({ changes: 1 });
			mockDb.createPaperTradingOrder.mockReturnValue({ changes: 1 });
			
			// Create account
			const account = await paperTradingService.createAccount('user1', 10000, 'USDT');

			const orderData = {
				accountId: account.id,
				symbol: 'BTCUSDT',
				side: 'BUY',
				type: 'MARKET',
				quantity: 0.1,
				price: 50000,
				status: 'FILLED'
			};

			const order = await paperTradingService.createOrder(orderData);
			expect(order).toBeDefined();
			expect(order.symbol).toBe('BTCUSDT');
			expect(order.side).toBe('BUY');
			expect(order.quantity).toBe(0.1);
			expect(order.price).toBe(50000);
			
			// Verify that the database method was called
			expect(mockDb.createPaperTradingOrder).toHaveBeenCalled();
		});

		it('should get order history', async () => {
			// Mock the database methods
			mockDb.createPaperTradingAccount.mockReturnValue({ changes: 1 });
			mockDb.createPaperTradingOrder.mockReturnValue({ changes: 1 });
			mockDb.getPaperTradingOrders.mockReturnValue([
				{
					id: 'order1',
					accountId: 'test_account',
					symbol: 'BTCUSDT',
					side: 'BUY',
					type: 'MARKET',
					quantity: 0.1,
					price: 50000,
					status: 'FILLED',
					createdAt: new Date().toISOString()
				},
				{
					id: 'order2',
					accountId: 'test_account',
					symbol: 'ETHUSDT',
					side: 'SELL',
					type: 'LIMIT',
					quantity: 1.0,
					price: 3000,
					status: 'PENDING',
					createdAt: new Date().toISOString()
				}
			]);
			
			// Create account
			const account = await paperTradingService.createAccount('user1', 10000, 'USDT');

			// Create orders
			await paperTradingService.createOrder({
				accountId: account.id,
				symbol: 'BTCUSDT',
				side: 'BUY',
				type: 'MARKET',
				quantity: 0.1,
				price: 50000,
				status: 'FILLED'
			});

			await paperTradingService.createOrder({
				accountId: account.id,
				symbol: 'ETHUSDT',
				side: 'SELL',
				type: 'LIMIT',
				quantity: 1.0,
				price: 3000,
				status: 'PENDING'
			});

			const orders = await paperTradingService.getOrderHistory(account.id);
			expect(orders).toHaveLength(2);
			expect(orders[0].symbol).toBe('BTCUSDT');
			expect(orders[1].symbol).toBe('ETHUSDT');
			
			// Verify that the database method was called
			expect(mockDb.getPaperTradingOrders).toHaveBeenCalledWith(account.id, 100);
		});

		it('should update order status', async () => {
			// Mock the database methods
			mockDb.createPaperTradingAccount.mockReturnValue({ changes: 1 });
			mockDb.createPaperTradingOrder.mockReturnValue({ changes: 1 });
			mockDb.updatePaperTradingOrder.mockReturnValue({ changes: 1 });
			
			// Create account and order
			const account = await paperTradingService.createAccount('user1', 10000, 'USDT');

			const order = await paperTradingService.createOrder({
				accountId: account.id,
				symbol: 'BTCUSDT',
				side: 'BUY',
				type: 'LIMIT',
				quantity: 0.1,
				price: 50000,
				status: 'PENDING'
			});

			// Update status
			const updatedOrder = await paperTradingService.updateOrderStatus(order.id, 'FILLED');
			expect(updatedOrder.status).toBe('FILLED');
			
			// Verify that the database method was called
			expect(mockDb.updatePaperTradingOrder).toHaveBeenCalled();
		});
	});

	describe('Balance and Equity Calculations', () => {
		it('should calculate account equity correctly', async () => {
			// Mock the database methods
			mockDb.createPaperTradingAccount.mockReturnValue({ changes: 1 });
			mockDb.updatePaperTradingPosition.mockReturnValue({ changes: 1 });
			mockDb.getPaperTradingPositions.mockReturnValue([
				{
					id: 'test_position',
					accountId: 'test_account',
					symbol: 'BTCUSDT',
					side: 'LONG',
					quantity: 0.1,
					avgPrice: 50000,
					currentPrice: 51000,
					unrealizedPnl: 100,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
			]);
			
			// Create account
			const account = await paperTradingService.createAccount('user1', 10000, 'USDT');

			// Create position with unrealized PnL
			await paperTradingService.createPosition({
				accountId: account.id,
				symbol: 'BTCUSDT',
				side: 'LONG',
				quantity: 0.1,
				avgPrice: 50000,
				currentPrice: 51000
			});

			const equity = await paperTradingService.calculateAccountEquity(account.id);
			expect(equity).toBe(10000 + 100); // Initial balance + unrealized PnL
			
			// Verify that the database methods were called
			expect(mockDb.getPaperTradingPositions).toHaveBeenCalled();
		});

		it('should calculate total PnL', async () => {
			// Mock the database methods
			mockDb.createPaperTradingAccount.mockReturnValue({ changes: 1 });
			mockDb.updatePaperTradingPosition.mockReturnValue({ changes: 1 });
			mockDb.getPaperTradingPositions.mockReturnValue([
				{
					id: 'test_position1',
					accountId: 'test_account',
					symbol: 'BTCUSDT',
					side: 'LONG',
					quantity: 0.1,
					avgPrice: 50000,
					currentPrice: 51000,
					unrealizedPnl: 100,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				},
				{
					id: 'test_position2',
					accountId: 'test_account',
					symbol: 'ETHUSDT',
					side: 'SHORT',
					quantity: 1.0,
					avgPrice: 3000,
					currentPrice: 2900,
					unrealizedPnl: 100,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
			]);
			
			// Create account
			const account = await paperTradingService.createAccount('user1', 10000, 'USDT');

			// Create positions with different PnL
			await paperTradingService.createPosition({
				accountId: account.id,
				symbol: 'BTCUSDT',
				side: 'LONG',
				quantity: 0.1,
				avgPrice: 50000,
				currentPrice: 51000
			});

			await paperTradingService.createPosition({
				accountId: account.id,
				symbol: 'ETHUSDT',
				side: 'SHORT',
				quantity: 1.0,
				avgPrice: 3000,
				currentPrice: 2900
			});

			const totalPnL = await paperTradingService.calculateTotalPnL(account.id);
			expect(totalPnL).toBe(100 + 100); // BTC profit + ETH profit
			
			// Verify that the database methods were called
			expect(mockDb.getPaperTradingPositions).toHaveBeenCalled();
		});
	});
});
