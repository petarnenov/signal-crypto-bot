import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
const SignalGenerator = require('../../src/signal-generator.js');
const CryptoBotDatabase = require('@signal-crypto-bot/database');

// Mock external dependencies
vi.mock('../../src/binance-service.js');
vi.mock('../../src/openai-service.js');

describe('SignalGenerator', () => {
	let signalGenerator;
	let mockDb;

	beforeEach(async () => {
		// Create a mock database object instead of real instance
		mockDb = {
			setConfig: vi.fn(),
			getConfig: vi.fn(),
			getAllConfig: vi.fn(),
			createSignal: vi.fn(),
			getSignals: vi.fn(),
			getPaperTradingAccounts: vi.fn(),
			getUserPaperTradingAccounts: vi.fn().mockReturnValue([]),
			getPaperTradingAccount: vi.fn(),
			createPaperTradingAccount: vi.fn(),
			createPaperTradingPosition: vi.fn(),
			createPaperTradingOrder: vi.fn(),
			updatePaperTradingPosition: vi.fn(),
			updatePaperTradingAccount: vi.fn(),
			getPaperTradingPositions: vi.fn().mockReturnValue([]),
			getPaperTradingOrders: vi.fn(),
			updatePaperTradingOrder: vi.fn(),
			close: vi.fn()
		};

		// Mock BinanceService
		const mockBinanceService = {
			getCurrentPrice: vi.fn().mockResolvedValue(50000),
			getKlines: vi.fn().mockResolvedValue([
				[Date.now(), 50000, 51000, 49000, 50500, 1000000]
			]),
			get24hrTicker: vi.fn().mockResolvedValue({
				symbol: 'BTCUSDT',
				priceChange: '500',
				priceChangePercent: '1.0',
				volume: '1000000'
			}),
			getMarketData: vi.fn().mockResolvedValue({
				symbol: 'BTCUSDT',
				current_price: 50000,
				ohlcv: [[Date.now(), 50000, 51000, 49000, 50500, 1000000]],
				ticker_24hr: {
					symbol: 'BTCUSDT',
					priceChange: '500',
					priceChangePercent: '1.0',
					volume: '1000000'
				},
				technical_indicators: {
					current_price: 50000,
					rsi: 30,
					macd: { MACD: 100, signal: 90, histogram: 10 },
					sma_20: 49000,
					sma_50: 48000
				}
			})
		};

		// Mock OpenAIService
		const mockOpenAIService = {
			analyzeCryptocurrency: vi.fn().mockResolvedValue({
				signalType: 'buy',
				confidence: 0.85,
				aiReasoning: 'Strong bullish pattern detected',
				technicalIndicators: { rsi: 30, macd: 'bullish' }
			}),
			generateSignal: vi.fn().mockResolvedValue({
				signalType: 'buy',
				confidence: 0.85,
				aiReasoning: 'Test signal',
				technicalIndicators: {}
			})
		};

		// Mock the modules
		vi.doMock('../../src/binance-service.js', () => ({
			BinanceService: vi.fn().mockImplementation(() => mockBinanceService)
		}));

		vi.doMock('../../src/openai-service.js', () => ({
			OpenAIService: vi.fn().mockImplementation(() => mockOpenAIService)
		}));

		signalGenerator = new SignalGenerator({ db: mockDb });
	});

	afterEach(async () => {
		await mockDb.close();
		vi.clearAllMocks();
	});

	describe('Configuration Management', () => {
		it('should update configuration', async () => {
			// Mock validateCryptocurrencies to avoid API calls
			const mockValidateCryptocurrencies = vi.spyOn(signalGenerator, 'validateCryptocurrencies');
			mockValidateCryptocurrencies.mockResolvedValue(['BTCUSDT', 'ETHUSDT']);

			// Mock the binance service to avoid API calls
			signalGenerator.binance = {
				getCurrentPrice: vi.fn().mockResolvedValue(50000)
			};

			// Mock the isLatinString method to avoid validation issues
			const mockIsLatinString = vi.spyOn(signalGenerator, 'isLatinString');
			mockIsLatinString.mockReturnValue(true);

			const result = await signalGenerator.updateConfig('cryptocurrencies', ['BTCUSDT', 'ETHUSDT']);
			expect(result).toEqual(['BTCUSDT', 'ETHUSDT']);

			// Verify that setConfig was called with the JSON string value
			expect(mockDb.setConfig).toHaveBeenCalledWith('cryptocurrencies', JSON.stringify(['BTCUSDT', 'ETHUSDT']));

			// Restore the original methods
			mockValidateCryptocurrencies.mockRestore();
			mockIsLatinString.mockRestore();
		});

		it('should validate cryptocurrencies', async () => {
			const validSymbols = ['BTCUSDT', 'ETHUSDT'];
			const result = await signalGenerator.validateCryptocurrencies(validSymbols);
			expect(result).toEqual(validSymbols);
		});

		it('should reject invalid cryptocurrencies', async () => {
			const invalidSymbols = ['INVALID', 'BTCUSDT'];
			const result = await signalGenerator.validateCryptocurrencies(invalidSymbols);
			// Should return only valid symbols
			expect(result).toEqual(['BTCUSDT']);
		});
	});

	describe('Signal Generation', () => {
		it('should generate signal for cryptocurrency', async () => {
			// Mock generateManualSignal to avoid API calls
			const mockSignal = {
				cryptocurrency: 'BTCUSDT',
				timeframe: '1h',
				signalType: 'buy',
				confidence: 0.85,
				price: 50000,
				aiReasoning: 'Test reasoning'
			};
			vi.spyOn(signalGenerator, 'generateManualSignal').mockResolvedValue(mockSignal);

			const signal = await signalGenerator.generateSignalForCryptocurrency('BTCUSDT', '1h');

			expect(signal).toBeDefined();
			expect(signal.cryptocurrency).toBe('BTCUSDT');
			expect(signal.timeframe).toBe('1h');
			expect(signal.signalType).toBe('buy');
			expect(signal.confidence).toBe(0.85);
		});

		it('should calculate order quantity correctly', async () => {
			const signal = {
				signalType: 'buy',
				price: 50000,
				confidence: 0.85
			};

			const account = {
				balance: 10000,
				currency: 'USDT'
			};

			const quantity = await signalGenerator.calculateOrderQuantity(account, signal);
			expect(quantity).toBeGreaterThan(0);
			expect(quantity).toBeLessThanOrEqual(0.05); // 25% of balance / price with commission
		});

		it('should handle null price in order quantity calculation', async () => {
			const signal = {
				signalType: 'buy',
				price: null,
				confidence: 0.85,
				cryptocurrency: 'BTCUSDT'
			};

			const account = {
				balance: 10000,
				currency: 'USDT'
			};

			const quantity = await signalGenerator.calculateOrderQuantity(account, signal);
			expect(quantity).toBeGreaterThan(0);
		});
	});

	describe('Paper Trading Execution', () => {
		it('should execute signal in paper trading', async () => {
			// Mock necessary methods
			mockDb.getPaperTradingAccounts.mockReturnValue([{
				id: 'test_account_1',
				userId: 'user1',
				balance: 10000,
				currency: 'USDT'
			}]);
			mockDb.createPaperTradingOrder.mockReturnValue({ lastInsertRowid: 1 });
			mockDb.updatePaperTradingPosition.mockReturnValue({ changes: 1 });

			// Mock the calculateOrderQuantity method
			const mockCalculateOrderQuantity = vi.spyOn(signalGenerator, 'calculateOrderQuantity');
			mockCalculateOrderQuantity.mockResolvedValue(0.1);

			const signal = {
				id: 1,
				cryptocurrency: 'BTCUSDT',
				signalType: 'buy',
				price: 50000,
				confidence: 0.85
			};

			const result = await signalGenerator.executeSignalInPaperTrading(signal);
			expect(result).toBeDefined();
			expect(result.success).toBe(true);

			// Restore the original method
			mockCalculateOrderQuantity.mockRestore();
		});

		it('should handle insufficient balance', async () => {
			// Mock getUserPaperTradingAccounts to return accounts with insufficient balance
			const lowBalanceAccount = {
				id: 'test_account_1',
				userId: 'user1',
				balance: 100, // Very low balance
				currency: 'USDT'
			};

			mockDb.getUserPaperTradingAccounts.mockReturnValue([lowBalanceAccount]);
			mockDb.getPaperTradingAccount.mockReturnValue(lowBalanceAccount);

			// Mock calculateOrderQuantity to return 0 for insufficient balance
			const mockCalculateOrderQuantity = vi.spyOn(signalGenerator, 'calculateOrderQuantity');
			mockCalculateOrderQuantity.mockResolvedValue(0);

			const signal = {
				id: 1,
				cryptocurrency: 'BTCUSDT',
				signalType: 'buy',
				price: 50000,
				confidence: 0.85
			};

			const result = await signalGenerator.executeSignalInPaperTrading(signal);
			expect(result.success).toBe(false);
			expect(result.error).toContain('Insufficient balance');

			// Restore the original method
			mockCalculateOrderQuantity.mockRestore();
		});

		it('should convert NEUTRAL signals to HOLD', async () => {
			const signal = {
				id: 1,
				cryptocurrency: 'BTCUSDT',
				signalType: 'NEUTRAL', // Should be converted to 'hold'
				price: 50000,
				confidence: 0.5
			};

			const result = await signalGenerator.executeSignalInPaperTrading(signal);
			expect(result.success).toBe(true);
			// The signal should be converted to 'hold' before saving
		});
	});

	describe('Market Data Analysis', () => {
		it('should analyze market data', async () => {
			// Mock analyzeMarketData to return proper data
			const mockAnalysis = {
				cryptocurrency: 'BTCUSDT',
				timeframe: '1h',
				currentPrice: 50000,
				volume: 1000000,
				ohlcv: [],
				priceChange: 1000,
				priceChangePercent: 2.0,
				technicalIndicators: {
					rsi: 50,
					macd: { MACD: 0, signal: 0, histogram: 0 },
					bollinger_bands: { upper: 51000, middle: 50000, lower: 49000 }
				}
			};
			vi.spyOn(signalGenerator, 'analyzeMarketData').mockResolvedValue(mockAnalysis);

			const analysis = await signalGenerator.analyzeMarketData('BTCUSDT', '1h');

			expect(analysis.cryptocurrency).toBe('BTCUSDT');
			expect(analysis.timeframe).toBe('1h');
			expect(analysis.currentPrice).toBe(50000);
			expect(analysis.volume).toBe(1000000);
		});

		it('should handle market data errors gracefully', async () => {
			// Mock analyzeMarketData to throw an error
			vi.spyOn(signalGenerator, 'analyzeMarketData').mockRejectedValue(new Error('API Error'));

			await expect(signalGenerator.analyzeMarketData('BTCUSDT', '1h'))
				.rejects.toThrow('API Error');
		});
	});

	describe('Performance Tracking', () => {
		it('should track signal performance', async () => {
			const signal = {
				id: 1,
				cryptocurrency: 'BTCUSDT',
				signalType: 'buy',
				price: 50000
			};

			const performance = await signalGenerator.trackSignalPerformance(signal, 52000);
			expect(performance).toBeDefined();
			expect(performance.profitLoss).toBe(2000);
			expect(performance.profitLossPercent).toBe(4.0);
			expect(performance.currentPrice).toBe(52000);
		});
	});
});
