import { describe, it, expect, beforeEach, afterEach } from 'vitest';
const CryptoBotDatabase = require('../../database/db.js');

describe('CryptoBotDatabase', () => {
	let db;

	beforeEach(async () => {
		db = new CryptoBotDatabase(':memory:');
	});

	afterEach(async () => {
		await db.close();
	});

	describe('Configuration Management', () => {
		it('should set config', async () => {
			const result = db.setConfig('test_key', 'test_value');
			expect(result.changes).toBe(1);

			// Verify the value was saved
			const savedValue = db.getConfig('test_key');
			expect(savedValue).toBe('test_value');
		});

		it('should update existing config', async () => {
			// Set initial value
			db.setConfig('test_key', 'initial_value');

			// Update value
			const result = db.updateConfig('test_key', 'updated_value');
			expect(result.changes).toBe(1);

			// Verify update
			const config = db.getConfig('test_key');
			expect(config).toBe('updated_value');
		});

		it('should return null for non-existent config', () => {
			const config = db.getConfig('non_existent_key');
			expect(config).toBeNull();
		});
	});

	describe('Signal Management', () => {
		it('should create and retrieve signals', async () => {
			const signalData = {
				cryptocurrency: 'BTCUSDT',
				signalType: 'buy',
				timeframe: '1h',
				price: 50000,
				confidence: 0.85,
				aiReasoning: 'Strong bullish pattern detected',
				technicalIndicators: JSON.stringify({ rsi: 30, macd: 'bullish' })
			};

			const result = db.createSignal(signalData);
			expect(result.changes).toBe(1);

			const signals = db.getSignals();
			expect(signals).toHaveLength(1);
			expect(signals[0].cryptocurrency).toBe('BTCUSDT');
			expect(signals[0].signalType).toBe('buy');
		});

		it('should update signal status', async () => {
			const signalData = {
				cryptocurrency: 'BTCUSDT',
				signalType: 'buy',
				timeframe: '1h',
				price: 50000,
				confidence: 0.85,
				aiReasoning: 'Test signal',
				technicalIndicators: '{}'
			};

			const createResult = db.createSignal(signalData);
			const signalId = createResult.lastInsertRowid;
			const result = db.updateSignalStatus(signalId, 'executed');
			expect(result.changes).toBe(1);

			const signals = db.getSignals();
			expect(signals[0].status).toBe('executed');
		});
	});

	describe('Paper Trading', () => {
		it('should create and retrieve paper trading accounts', async () => {
			const accountData = {
				id: 'test_account_1',
				userId: 'user1',
				balance: 10000,
				currency: 'USDT',
				equity: 10000,
				unrealizedPnl: 0,
				realizedPnl: 0,
				totalTrades: 0,
				winningTrades: 0,
				losingTrades: 0
			};

			const result = db.createPaperTradingAccount(accountData);
			expect(result.changes).toBe(1);

			const accounts = db.getUserPaperTradingAccounts('user1');
			expect(accounts).toHaveLength(1);
			expect(accounts[0].balance).toBe(10000);
		});

		it('should create and retrieve positions', async () => {
			// Create account first
			const accountData = {
				id: 'test_account_1',
				userId: 'user1',
				balance: 10000,
				currency: 'USDT',
				equity: 10000,
				unrealizedPnl: 0,
				realizedPnl: 0,
				totalTrades: 0,
				winningTrades: 0,
				losingTrades: 0
			};
			db.createPaperTradingAccount(accountData);

			// Create position
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

			const result = db.createPaperTradingPosition(positionData);
			expect(result.changes).toBe(1);

			const positions = db.getPaperTradingPositions('test_account_1');
			expect(positions).toHaveLength(1);
			expect(positions[0].symbol).toBe('BTCUSDT');
			expect(positions[0].side).toBe('LONG');
		});

		it('should create and retrieve orders', async () => {
			// Create account first
			const accountData = {
				id: 'test_account_1',
				userId: 'user1',
				balance: 10000,
				currency: 'USDT',
				equity: 10000,
				unrealizedPnl: 0,
				realizedPnl: 0,
				totalTrades: 0,
				winningTrades: 0,
				losingTrades: 0
			};
			db.createPaperTradingAccount(accountData);

			// Create order
			const orderData = {
				id: 'test_order_1',
				accountId: 'test_account_1',
				symbol: 'BTCUSDT',
				side: 'BUY',
				type: 'MARKET',
				quantity: 0.1,
				price: 50000,
				status: 'FILLED',
				executedAt: new Date().toISOString()
			};

			const result = db.createPaperTradingOrder(orderData);
			expect(result.changes).toBe(1);

			const orders = db.getPaperTradingOrders('test_account_1');
			expect(orders).toHaveLength(1);
			expect(orders[0].symbol).toBe('BTCUSDT');
			expect(orders[0].side).toBe('BUY');
		});
	});

	describe('AI Analysis', () => {
		it('should save and retrieve AI analysis', async () => {
			const analysisData = {
				cryptocurrency: 'BTCUSDT',
				timeframe: '1h',
				marketData: { price: 50000, volume: 1000000 },
				aiResponse: 'Bullish sentiment detected',
				tokensUsed: 150,
				cost: 0.003,
				analysisTimeMs: 2500
			};

			const analysisId = db.saveAIAnalysis(analysisData);
			expect(analysisId).toBeGreaterThan(0);

			const history = db.getAIAnalysisHistory('BTCUSDT', 10);
			expect(history).toHaveLength(1);
			expect(history[0].cryptocurrency).toBe('BTCUSDT');
			expect(history[0].aiResponse).toBe('Bullish sentiment detected');
		});
	});

	describe('Performance Metrics', () => {
		it('should save and retrieve performance metrics', async () => {
			// First create a signal
			const signalData = {
				cryptocurrency: 'BTCUSDT',
				signalType: 'buy',
				timeframe: '1h',
				price: 50000,
				confidence: 0.8,
				aiReasoning: 'Test signal',
				technicalIndicators: JSON.stringify({ rsi: 30, macd: 'bullish' })
			};
			
			const signalResult = db.createSignal(signalData);
			expect(signalResult.changes).toBe(1);
			
			const signalId = signalResult.lastInsertRowid;

			const metricData = {
				signalId: signalId,
				cryptocurrency: 'BTCUSDT',
				entryPrice: 50000,
				exitPrice: 52000,
				profitLoss: 2000,
				profitLossPercent: 4.0,
				durationHours: 24
			};

			const result = db.addPerformanceMetric(metricData);
			expect(result.changes).toBe(1);

			const stats = db.getPerformanceStats('BTCUSDT');
			expect(stats).toBeDefined();
		});
	});
});
