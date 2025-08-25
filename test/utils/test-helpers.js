const CryptoBotDatabase = require('../../database/db.js');

/**
 * Create a test database instance
 */
export async function createTestDatabase() {
	const db = new CryptoBotDatabase(':memory:');
	await db.initialize();
	return db;
}

/**
 * Seed test database with sample data
 */
export async function seedTestDatabase(db) {
	// Add test configuration
	db.setConfig('cryptocurrencies', JSON.stringify(['BTCUSDT', 'ETHUSDT']));
	db.setConfig('timeframes', JSON.stringify(['1h', '4h', '1d']));
	db.setConfig('signal_confidence_threshold', '0.7');
	db.setConfig('max_position_size_percent', '10');

	// Add test signals
	const signalData = {
		cryptocurrency: 'BTCUSDT',
		signalType: 'buy',
		timeframe: '1h',
		price: 50000,
		confidence: 0.85,
		aiReasoning: 'Strong bullish pattern detected',
		technicalIndicators: JSON.stringify({ rsi: 30, macd: 'bullish' })
	};
	db.createSignal(signalData);

	// Add test paper trading account
	const accountData = {
		id: 'test_account_1',
		userId: 'user1',
		name: 'Test Account',
		initialBalance: 10000,
		currentBalance: 10000,
		currency: 'USDT'
	};
	db.createPaperTradingAccount(accountData);

	// Add test position
	const positionData = {
		id: 'test_position_1',
		accountId: 'test_account_1',
		symbol: 'BTCUSDT',
		side: 'LONG',
		quantity: 0.1,
		avgPrice: 50000,
		currentPrice: 51000,
		unrealizedPnl: 100
	};
	db.createPaperTradingPosition(positionData);

	return db;
}

/**
 * Create mock signal data
 */
export function createMockSignal(overrides = {}) {
	return {
		id: 1,
		cryptocurrency: 'BTCUSDT',
		signalType: 'buy',
		timeframe: '1h',
		price: 50000,
		confidence: 0.85,
		aiReasoning: 'Strong bullish pattern detected',
		technicalIndicators: JSON.stringify({ rsi: 30, macd: 'bullish' }),
		createdAt: new Date().toISOString(),
		status: 'pending',
		...overrides
	};
}

/**
 * Create mock account data
 */
export function createMockAccount(overrides = {}) {
	return {
		id: 'test_account_1',
		userId: 'user1',
		name: 'Test Account',
		initialBalance: 10000,
		currentBalance: 10000,
		currency: 'USDT',
		createdAt: new Date().toISOString(),
		...overrides
	};
}

/**
 * Create mock position data
 */
export function createMockPosition(overrides = {}) {
	return {
		id: 'test_position_1',
		accountId: 'test_account_1',
		symbol: 'BTCUSDT',
		side: 'LONG',
		quantity: 0.1,
		avgPrice: 50000,
		currentPrice: 51000,
		unrealizedPnl: 100,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides
	};
}

/**
 * Create mock order data
 */
export function createMockOrder(overrides = {}) {
	return {
		id: 'test_order_1',
		accountId: 'test_account_1',
		symbol: 'BTCUSDT',
		side: 'BUY',
		type: 'MARKET',
		quantity: 0.1,
		price: 50000,
		status: 'FILLED',
		executedAt: new Date().toISOString(),
		createdAt: new Date().toISOString(),
		...overrides
	};
}

/**
 * Create mock market data
 */
export function createMockMarketData(overrides = {}) {
	return {
		symbol: 'BTCUSDT',
		timeframe: '1h',
		currentPrice: 50000,
		ohlcv: [
			[Date.now(), 50000, 51000, 49000, 50500, 1000000]
		],
		ticker_24hr: {
			symbol: 'BTCUSDT',
			priceChange: '500',
			priceChangePercent: '1.0',
			volume: '1000000'
		},
		technical_indicators: {
			rsi: 30,
			macd: 'bullish',
			bollinger_bands: { upper: 52000, middle: 50000, lower: 48000 }
		},
		full_indicators: {
			rsi: 30,
			macd: { value: 100, signal: 50, histogram: 50 },
			bollinger_bands: { upper: 52000, middle: 50000, lower: 48000 },
			moving_averages: { sma_20: 49500, ema_20: 49800 }
		},
		timestamp: Date.now(),
		...overrides
	};
}

/**
 * Create mock WebSocket message
 */
export function createMockWebSocketMessage(type, data, requestId = 'test-request') {
	return {
		type,
		data,
		requestId
	};
}

/**
 * Wait for a condition to be true
 */
export function waitFor(condition, timeout = 5000) {
	return new Promise((resolve, reject) => {
		const startTime = Date.now();
		
		const check = () => {
			if (condition()) {
				resolve();
			} else if (Date.now() - startTime > timeout) {
				reject(new Error('Timeout waiting for condition'));
			} else {
				setTimeout(check, 10);
			}
		};
		
		check();
	});
}

/**
 * Mock console methods to avoid noise in tests
 */
export function mockConsole() {
	const originalConsole = { ...console };
	
	beforeEach(() => {
		console.log = vi.fn();
		console.error = vi.fn();
		console.warn = vi.fn();
		console.info = vi.fn();
	});
	
	afterEach(() => {
		console.log = originalConsole.log;
		console.error = originalConsole.error;
		console.warn = originalConsole.warn;
		console.info = originalConsole.info;
	});
}

/**
 * Create a mock WebSocket server
 */
export function createMockWebSocketServer() {
	const clients = new Set();
	const messageHandlers = new Map();
	
	return {
		clients,
		messageHandlers,
		
		on(event, handler) {
			if (event === 'connection') {
				// Simulate connection
				const mockClient = {
					send: vi.fn(),
					close: vi.fn(),
					on: vi.fn(),
					readyState: 1 // OPEN
				};
				clients.add(mockClient);
				handler(mockClient);
			}
		},
		
		handleMessage(type, handler) {
			messageHandlers.set(type, handler);
		},
		
		broadcast(message) {
			clients.forEach(client => {
				client.send(JSON.stringify(message));
			});
		}
	};
}

/**
 * Validate signal data structure
 */
export function validateSignal(signal) {
	expect(signal).toHaveProperty('id');
	expect(signal).toHaveProperty('cryptocurrency');
	expect(signal).toHaveProperty('signalType');
	expect(signal).toHaveProperty('timeframe');
	expect(signal).toHaveProperty('confidence');
	expect(signal).toHaveProperty('createdAt');
	
	expect(['buy', 'sell', 'hold']).toContain(signal.signalType);
	expect(signal.confidence).toBeGreaterThanOrEqual(0);
	expect(signal.confidence).toBeLessThanOrEqual(1);
}

/**
 * Validate account data structure
 */
export function validateAccount(account) {
	expect(account).toHaveProperty('id');
	expect(account).toHaveProperty('userId');
	expect(account).toHaveProperty('name');
	expect(account).toHaveProperty('initialBalance');
	expect(account).toHaveProperty('currentBalance');
	expect(account).toHaveProperty('currency');
	expect(account).toHaveProperty('createdAt');
	
	expect(account.initialBalance).toBeGreaterThan(0);
	expect(account.currentBalance).toBeGreaterThanOrEqual(0);
}

/**
 * Validate position data structure
 */
export function validatePosition(position) {
	expect(position).toHaveProperty('id');
	expect(position).toHaveProperty('accountId');
	expect(position).toHaveProperty('symbol');
	expect(position).toHaveProperty('side');
	expect(position).toHaveProperty('quantity');
	expect(position).toHaveProperty('avgPrice');
	expect(position).toHaveProperty('currentPrice');
	expect(position).toHaveProperty('unrealizedPnl');
	
	expect(['LONG', 'SHORT']).toContain(position.side);
	expect(position.quantity).toBeGreaterThan(0);
	expect(position.avgPrice).toBeGreaterThan(0);
	expect(position.currentPrice).toBeGreaterThan(0);
}
