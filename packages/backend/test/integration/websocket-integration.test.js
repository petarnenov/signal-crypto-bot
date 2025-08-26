import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import WebSocket from 'ws';
const CryptoBotServer = require('../../src/server.js');
const CryptoBotDatabase = require('@signal-crypto-bot/database');

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

describe('WebSocket Integration Tests', () => {
	let server;
	let db;
	let ws;
	let port = 0; // Use dynamic port

	beforeAll(async () => {
		// Set test environment
		process.env.NODE_ENV = 'test';

		// Create test database
		db = new CryptoBotDatabase(':memory:');

		// Start server with dynamic port
		server = new CryptoBotServer();
		server.db = db; // Override database with test database
		server.port = port; // Use dynamic port
		await server.start();

		// Get the actual port that was assigned
		port = server.server.address().port;
		console.log(`Server started on port: ${port}`);
	});

	afterAll(async () => {
		if (ws) {
			ws.close();
		}
		if (server) {
			await server.shutdown();
		}
		if (db) {
			await db.close();
		}
	});

	beforeEach(async () => {
		// Connect WebSocket client
		ws = new WebSocket(`ws://localhost:${port}`);

		await new Promise((resolve) => {
			ws.on('open', resolve);
		});
	});

	afterEach(() => {
		if (ws && ws.readyState === WebSocket.OPEN) {
			ws.close();
		}
	});

	describe('Connection Management', () => {
		it('should establish WebSocket connection', () => {
			expect(ws.readyState).toBe(WebSocket.OPEN);
		});

		it('should handle connection close', async () => {
			await new Promise((resolve) => {
				ws.on('close', () => {
					// Add a small delay to ensure WebSocket state is properly updated
					setTimeout(() => {
						expect(ws.readyState).toBe(WebSocket.CLOSED);
						resolve();
					}, 10);
				});

				ws.close();
			});
		});
	});

	describe('Message Handling', () => {
		it('should handle get_signals request', async () => {
			const requestId = 'test-request-1';
			const message = {
				type: 'get_signals',
				payload: { limit: 10 },
				requestId
			};

			const response = await new Promise((resolve) => {
				ws.on('message', (data) => {
					const parsed = JSON.parse(data);
					// Skip connection_status messages
					if (parsed.type !== 'connection_status') {
						resolve(parsed);
					}
				});
				ws.send(JSON.stringify(message));
			});

			expect(response.type).toBe('signals_response');
			expect(response.requestId).toBe(requestId);
			expect(Array.isArray(response.data)).toBe(true);
		});

		it('should handle get_stats request', async () => {
			const requestId = 'test-request-2';
			const message = {
				type: 'get_stats',
				payload: {},
				requestId
			};

			const response = await new Promise((resolve) => {
				ws.on('message', (data) => {
					const parsed = JSON.parse(data);
					// Skip connection_status messages
					if (parsed.type !== 'connection_status') {
						resolve(parsed);
					}
				});
				ws.send(JSON.stringify(message));
			});

			expect(response.type).toBe('stats_response');
			expect(response.requestId).toBe(requestId);
			expect(response.data).toBeDefined();
		});

		it('should handle update_config request', async () => {
			const requestId = 'test-request-3';
			const message = {
				type: 'update_config',
				payload: {
					key: 'test_config',
					value: 'test_value'
				},
				requestId
			};

			const response = await new Promise((resolve) => {
				ws.on('message', (data) => {
					const parsed = JSON.parse(data);
					// Skip connection_status and broadcast messages
					if (parsed.type !== 'connection_status' && parsed.type !== 'config_updated') {
						resolve(parsed);
					}
				});
				ws.send(JSON.stringify(message));
			});

			expect(response.type).toBe('config_updated_response');
			expect(response.data.success).toBe(true);
			expect(response.data.message).toBe('Configuration updated');
		});

		it('should handle invalid message format', async () => {
			const response = await new Promise((resolve) => {
				ws.on('message', (data) => {
					const parsed = JSON.parse(data);
					// Skip connection_status messages
					if (parsed.type !== 'connection_status') {
						resolve(parsed);
					}
				});
				ws.send('invalid json');
			});

			expect(response.type).toBe('error');
			expect(response.data.message).toContain('Invalid message format');
		});

		it('should handle unknown message type', async () => {
			const requestId = 'test-request-4';
			const message = {
				type: 'unknown_type',
				payload: {},
				requestId
			};

			const response = await new Promise((resolve) => {
				ws.on('message', (data) => {
					const parsed = JSON.parse(data);
					// Skip connection_status messages
					if (parsed.type !== 'connection_status') {
						resolve(parsed);
					}
				});
				ws.send(JSON.stringify(message));
			});

			expect(response.type).toBe('error');
			expect(response.requestId).toBe(requestId);
			expect(response.data.message).toContain('Unknown message type');
		});
	});

	describe('Paper Trading Integration', () => {
		it('should handle get_paper_trading_accounts request', async () => {
			const requestId = 'test-request-5';
			const message = {
				type: 'get_paper_trading_accounts',
				payload: {},
				requestId
			};

			const response = await new Promise((resolve) => {
				ws.on('message', (data) => {
					const parsed = JSON.parse(data);
					// Skip connection_status messages
					if (parsed.type !== 'connection_status') {
						resolve(parsed);
					}
				});
				ws.send(JSON.stringify(message));
			});

			expect(response.type).toBe('paper_trading_accounts_response');
			expect(response.requestId).toBe(requestId);
			expect(Array.isArray(response.data)).toBe(true);
		});

		it('should handle get_paper_trading_positions request', async () => {
			const requestId = 'test-request-6';
			const message = {
				type: 'get_paper_trading_positions',
				payload: { userId: 'user1' },
				requestId
			};

			const response = await new Promise((resolve) => {
				ws.on('message', (data) => {
					const parsed = JSON.parse(data);
					// Skip connection_status messages
					if (parsed.type !== 'connection_status') {
						resolve(parsed);
					}
				});
				ws.send(JSON.stringify(message));
			});

			expect(response.type).toBe('paper_trading_positions_response');
			expect(response.requestId).toBe(requestId);
			expect(Array.isArray(response.data)).toBe(true);
		});
	});

	describe('Signal Generator Status', () => {
		it('should handle get_signal_generator_status request', async () => {
			const requestId = 'test-request-7';
			const message = {
				type: 'get_signal_generator_status',
				payload: {},
				requestId
			};

			const response = await new Promise((resolve) => {
				ws.on('message', (data) => {
					const parsed = JSON.parse(data);
					// Skip connection_status messages
					if (parsed.type !== 'connection_status') {
						resolve(parsed);
					}
				});
				ws.send(JSON.stringify(message));
			});

			expect(response.type).toBe('signal_generator_status_response');
			expect(response.requestId).toBe(requestId);
			expect(response.data).toBeDefined();
		});
	});

	describe('Error Handling', () => {
		it('should handle database errors gracefully', async () => {
			const requestId = 'test-request-9';
			const message = {
				type: 'get_signals',
				payload: { limit: 'invalid' }, // Invalid limit to trigger error
				requestId
			};

			const response = await new Promise((resolve) => {
				ws.on('message', (data) => {
					const parsed = JSON.parse(data);
					// Skip connection_status messages
					if (parsed.type !== 'connection_status') {
						resolve(parsed);
					}
				});
				ws.send(JSON.stringify(message));
			});

			expect(response.type).toBe('error');
			expect(response.requestId).toBe(requestId);
			expect(response.data.message).toContain('datatype mismatch');
		});

		it('should handle missing requestId', async () => {
			const message = {
				type: 'get_signals',
				payload: { limit: 10 }
				// Missing requestId
			};

			const response = await new Promise((resolve) => {
				ws.on('message', (data) => {
					const parsed = JSON.parse(data);
					// Skip connection_status messages
					if (parsed.type !== 'connection_status') {
						resolve(parsed);
					}
				});
				ws.send(JSON.stringify(message));
			});

			expect(response.type).toBe('signals_response');
			expect(Array.isArray(response.data)).toBe(true);
		});
	});

	describe('Broadcasting', () => {
		it('should handle ping request', async () => {
			const requestId = 'test-request-10';
			const message = {
				type: 'ping',
				payload: {},
				requestId
			};

			const response = await new Promise((resolve) => {
				ws.on('message', (data) => {
					const parsed = JSON.parse(data);
					// Skip connection_status messages
					if (parsed.type !== 'connection_status') {
						resolve(parsed);
					}
				});
				ws.send(JSON.stringify(message));
			});

			expect(response.type).toBe('pong_response');
			expect(response.requestId).toBe(requestId);
			expect(response.data.timestamp).toBeDefined();
		});
	});
});
