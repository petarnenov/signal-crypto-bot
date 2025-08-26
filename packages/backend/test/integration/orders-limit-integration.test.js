import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import WebSocket from 'ws';
import CryptoBotServer from '../../src/server.js';
import CryptoBotDatabase from '@signal-crypto-bot/database';

// Mock telegram bot to prevent connection attempts
vi.mock('../../src/telegram-bot.js', () => ({
	default: class MockTelegramBot {
		constructor(token, options) {
			this.token = token;
			this.options = options;
			this.isRunning = false;
		}

		start() {
			this.isRunning = true;
			console.log('Mock Telegram Bot started');
		}

		stop() {
			this.isRunning = false;
			console.log('Mock Telegram Bot stopped');
		}

		sendMessage() {
			return Promise.resolve({ ok: true });
		}
	}
}));

// Mock binance service to prevent API calls
vi.mock('../../src/binance-service.js', () => ({
	default: class MockBinanceService {
		constructor(options) {
			this.options = options;
		}

		async getCurrentPrice(symbol) {
			return 50000 + Math.random() * 10000;
		}

		async getOHLCV(symbol, timeframe, limit) {
			return [];
		}

		async get24hrTicker(symbol) {
			return {};
		}

		async getMarketData(symbol, timeframe) {
			return {
				symbol,
				timeframe,
				currentPrice: 50000 + Math.random() * 10000,
				ohlcv: [],
				ticker_24hr: {},
				technical_indicators: {},
				full_indicators: {},
				timestamp: Date.now()
			};
		}
	}
}));

// Mock OpenAI service
vi.mock('../../src/openai-service.js', () => ({
	default: class MockOpenAIService {
		constructor(apiKey, options) {
			this.apiKey = apiKey;
			this.options = options;
		}

		async analyzeMarket(symbol, data) {
			return {
				signal: 'HOLD',
				confidence: 50,
				reasoning: 'Mock analysis'
			};
		}
	}
}));

describe('Orders Limit Integration Tests', () => {
	let server;
	let db;
	let ws;
	let port = 3003; // Use different port for testing

	beforeAll(async () => {
		// Set test environment
		process.env.NODE_ENV = 'test';
		process.env.PORT = port.toString();

		// Create test database
		db = new CryptoBotDatabase(':memory:');

		// Start server
		server = new CryptoBotServer();
		server.db = db; // Override database with test database
		await server.start();
	});

	afterAll(async () => {
		if (server) {
			await server.shutdown();
		}
	});

	beforeEach(async () => {
		// Create test data
		await setupTestData();
	});

	afterEach(async () => {
		// Clean up test data
		await cleanupTestData();
		if (ws) {
			ws.close();
		}
	});

	// Helper function to setup test data
	async function setupTestData() {
		// Create test accounts
		const account1 = {
			id: 'test_account_1',
			userId: 'test_user',
			name: 'Test Account 1',
			balance: 10000,
			equity: 10000,
			createdAt: new Date().toISOString()
		};

		const account2 = {
			id: 'test_account_2',
			userId: 'test_user',
			name: 'Test Account 2',
			balance: 5000,
			equity: 5000,
			createdAt: new Date().toISOString()
		};

		// Insert accounts
		await db.createPaperTradingAccount(account1);
		await db.createPaperTradingAccount(account2);

		// Create test orders for account 1 (15 orders)
		for (let i = 1; i <= 15; i++) {
			const order = {
				id: `order_test_account_1_${i}`,
				accountId: 'test_account_1',
				symbol: 'BTCUSDT',
				side: 'BUY',
				type: 'MARKET',
				quantity: 0.001 * i,
				price: 50000 + (i * 100),
				status: 'FILLED',
				createdAt: new Date(Date.now() - (i * 60000)).toISOString() // Each order 1 minute apart
			};
			await db.createPaperTradingOrder(order);
		}

		// Create test orders for account 2 (8 orders)
		for (let i = 1; i <= 8; i++) {
			const order = {
				id: `order_test_account_2_${i}`,
				accountId: 'test_account_2',
				symbol: 'ETHUSDT',
				side: 'SELL',
				type: 'MARKET',
				quantity: 0.01 * i,
				price: 3000 + (i * 50),
				status: 'FILLED',
				createdAt: new Date(Date.now() - (i * 60000)).toISOString() // Each order 1 minute apart
			};
			await db.createPaperTradingOrder(order);
		}

		// Set default user setting
		await db.setUserSetting('default', 'orders_limit', 'all');
	}

	// Helper function to cleanup test data
	async function cleanupTestData() {
		// Clean up orders
		await db.db.prepare('DELETE FROM paper_trading_orders WHERE accountId LIKE ?').run('test_%');

		// Clean up accounts
		await db.db.prepare('DELETE FROM paper_trading_accounts WHERE id LIKE ?').run('test_%');

		// Clean up user settings
		await db.db.prepare('DELETE FROM user_settings WHERE userId = ?').run('default');
	}

	// Helper function to send WebSocket message and wait for response
	function sendWebSocketMessage(message) {
		return new Promise((resolve, reject) => {
			const requestId = `test_${Date.now()}_${Math.random()}`;
			const messageWithId = { ...message, requestId };

			console.log('Sending WebSocket message:', messageWithId);
			ws.send(JSON.stringify(messageWithId));

			const timeout = setTimeout(() => {
				reject(new Error('WebSocket message timeout'));
			}, 5000);

			ws.once('message', (data) => {
				clearTimeout(timeout);
				try {
					const response = JSON.parse(data.toString());
					console.log('Received WebSocket response:', response);
					if (response.requestId === requestId) {
						resolve(response);
					}
				} catch (error) {
					reject(error);
				}
			});
		});
	}

	// Helper function to connect WebSocket
	async function connectWebSocket() {
		return new Promise((resolve, reject) => {
			ws = new WebSocket(`ws://localhost:${port}`);

			ws.on('open', () => {
				console.log('WebSocket connected for testing');
				resolve(ws);
			});

			ws.on('error', (error) => {
				reject(error);
			});

			// Set timeout
			setTimeout(() => {
				reject(new Error('WebSocket connection timeout'));
			}, 5000);
		});
	}

	describe('User Settings Management', () => {
		it('should get user setting for orders limit', async () => {
			await connectWebSocket();

			// Get user setting
			const response = await sendWebSocketMessage({
				type: 'get_user_setting',
				payload: {
					userId: 'default',
					settingKey: 'orders_limit'
				}
			});

			expect(response.type).toBe('user_setting_response');
			expect(response.data.settingKey).toBe('orders_limit');
			expect(response.data.settingValue).toBe('all');
		});

		it('should set user setting for orders limit', async () => {
			await connectWebSocket();

			// Set user setting to 10
			const response = await sendWebSocketMessage({
				type: 'set_user_setting',
				payload: {
					userId: 'default',
					settingKey: 'orders_limit',
					settingValue: '10'
				}
			});

			expect(response.type).toBe('user_setting_updated_response');
			expect(response.data.settingKey).toBe('orders_limit');
			expect(response.data.settingValue).toBe('10');

			// Verify setting was saved
			const getResponse = await sendWebSocketMessage({
				type: 'get_user_setting',
				payload: {
					userId: 'default',
					settingKey: 'orders_limit'
				}
			});

			expect(getResponse.data.settingValue).toBe('10');
		});
	});

	describe('Orders Limit Functionality', () => {
		it('should return all orders when limit is "all"', async () => {
			await connectWebSocket();

			// Get all orders for account 1
			const response = await sendWebSocketMessage({
				type: 'get_paper_trading_orders',
				payload: {
					accountId: 'test_account_1',
					limit: 'all'
				}
			});

			expect(response.type).toBe('paper_trading_orders_response');
			expect(response.data).toHaveLength(15); // All 15 orders for account 1

			// Verify orders are for the correct account
			response.data.forEach(order => {
				expect(order.accountId).toBe('test_account_1');
			});
		});

		it('should return limited orders when limit is set to 10', async () => {
			await connectWebSocket();

			// Get orders with limit 10 for account 1
			const response = await sendWebSocketMessage({
				type: 'get_paper_trading_orders',
				payload: {
					accountId: 'test_account_1',
					limit: 10
				}
			});

			expect(response.type).toBe('paper_trading_orders_response');
			expect(response.data).toHaveLength(10); // Only 10 orders

			// Verify orders are for the correct account
			response.data.forEach(order => {
				expect(order.accountId).toBe('test_account_1');
			});

			// Verify orders are sorted by date (newest first)
			for (let i = 0; i < response.data.length - 1; i++) {
				const currentDate = new Date(response.data[i].createdAt);
				const nextDate = new Date(response.data[i + 1].createdAt);
				expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
			}
		});

		it('should return limited orders when limit is set to 5', async () => {
			await connectWebSocket();

			// Get orders with limit 5 for account 1
			const response = await sendWebSocketMessage({
				type: 'get_paper_trading_orders',
				payload: {
					accountId: 'test_account_1',
					limit: 5
				}
			});

			expect(response.type).toBe('paper_trading_orders_response');
			expect(response.data).toHaveLength(5); // Only 5 orders

			// Verify orders are for the correct account
			response.data.forEach(order => {
				expect(order.accountId).toBe('test_account_1');
			});
		});

		it('should return all orders when no accountId is specified', async () => {
			await connectWebSocket();

			// Get all orders without specifying account
			const response = await sendWebSocketMessage({
				type: 'get_paper_trading_orders',
				payload: {
					limit: 100
				}
			});

			expect(response.type).toBe('paper_trading_orders_response');
			expect(response.data).toHaveLength(23); // 15 + 8 orders from both accounts

			// Verify orders are from both accounts
			const account1Orders = response.data.filter(order => order.accountId === 'test_account_1');
			const account2Orders = response.data.filter(order => order.accountId === 'test_account_2');

			expect(account1Orders).toHaveLength(15);
			expect(account2Orders).toHaveLength(8);
		}, 10000); // Increase timeout to 10 seconds

		it('should return limited orders when no accountId is specified and limit is set', async () => {
			await connectWebSocket();

			// Get limited orders without specifying account
			const response = await sendWebSocketMessage({
				type: 'get_paper_trading_orders',
				payload: {
					limit: 10
				}
			});

			expect(response.type).toBe('paper_trading_orders_response');
			expect(response.data).toHaveLength(10); // Only 10 orders total

			// Verify orders are sorted by date (newest first)
			for (let i = 0; i < response.data.length - 1; i++) {
				const currentDate = new Date(response.data[i].createdAt);
				const nextDate = new Date(response.data[i + 1].createdAt);
				expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
			}
		});
	});

	describe('Orders Limit Edge Cases', () => {
		it('should handle invalid limit values', async () => {
			await connectWebSocket();

			// Test with invalid limit
			const response = await sendWebSocketMessage({
				type: 'get_paper_trading_orders',
				payload: {
					accountId: 'test_account_1',
					limit: 'invalid'
				}
			});

			expect(response.type).toBe('paper_trading_orders_response');
			// Should default to 100 orders
			expect(response.data).toHaveLength(15); // All orders for account 1
		}, 10000); // Increase timeout to 10 seconds

		it('should handle negative limit values', async () => {
			await connectWebSocket();

			// Test with negative limit
			const response = await sendWebSocketMessage({
				type: 'get_paper_trading_orders',
				payload: {
					accountId: 'test_account_1',
					limit: -5
				}
			});

			expect(response.type).toBe('paper_trading_orders_response');
			// Should default to 100 orders
			expect(response.data).toHaveLength(15); // All orders for account 1
		});

		it('should handle non-existent account', async () => {
			await connectWebSocket();

			// Test with non-existent account
			const response = await sendWebSocketMessage({
				type: 'get_paper_trading_orders',
				payload: {
					accountId: 'non_existent_account',
					limit: 10
				}
			});

			expect(response.type).toBe('paper_trading_orders_response');
			expect(response.data).toHaveLength(0); // No orders for non-existent account
		});
	});

	describe('Orders Limit Integration with User Settings', () => {
		it('should change orders limit and verify the change', async () => {
			await connectWebSocket();

			// Set limit to 10
			await sendWebSocketMessage({
				type: 'set_user_setting',
				payload: {
					userId: 'default',
					settingKey: 'orders_limit',
					settingValue: '10'
				}
			});

			// Verify setting was saved
			const getResponse = await sendWebSocketMessage({
				type: 'get_user_setting',
				payload: {
					userId: 'default',
					settingKey: 'orders_limit'
				}
			});

			expect(getResponse.data.settingValue).toBe('10');

			// Get orders with the new limit
			const ordersResponse = await sendWebSocketMessage({
				type: 'get_paper_trading_orders',
				payload: {
					accountId: 'test_account_1',
					limit: 10
				}
			});

			expect(ordersResponse.data).toHaveLength(10);
		});

		it('should change orders limit to "all" and verify all orders are returned', async () => {
			await connectWebSocket();

			// Set limit to "all"
			await sendWebSocketMessage({
				type: 'set_user_setting',
				payload: {
					userId: 'default',
					settingKey: 'orders_limit',
					settingValue: 'all'
				}
			});

			// Verify setting was saved
			const getResponse = await sendWebSocketMessage({
				type: 'get_user_setting',
				payload: {
					userId: 'default',
					settingKey: 'orders_limit'
				}
			});

			expect(getResponse.data.settingValue).toBe('all');

			// Get all orders
			const ordersResponse = await sendWebSocketMessage({
				type: 'get_paper_trading_orders',
				payload: {
					accountId: 'test_account_1',
					limit: 'all'
				}
			});

			expect(ordersResponse.data).toHaveLength(15); // All orders
		});
	});
});
