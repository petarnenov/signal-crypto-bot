import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import WebSocket from 'ws';
import Server from '../../src/server.js';
import CryptoBotDatabase from '@signal-crypto-bot/database';

describe('Server Configuration WebSocket Tests', () => {
	let server;
	let db;
	let ws;
	let port = 8082 + Math.floor(Math.random() * 1000); // Use random port for each test

	beforeEach(async () => {
		// Create server instance with explicit port
		server = new Server();
		server.port = port;

		// Create in-memory database with unique name for each test
		const uniqueDbPath = `:memory:${Date.now()}-${Math.random()}`;
		db = new CryptoBotDatabase(uniqueDbPath);
		db.init();

		// Replace server's database with our test database
		server.db = db;

		// Set global server instance for broadcast functionality
		global.serverInstance = server;

		await server.start();

		// Wait for server to start
		await new Promise(resolve => setTimeout(resolve, 100));

		// Connect WebSocket client
		ws = new WebSocket(`ws://localhost:${port}`);
		await new Promise((resolve, reject) => {
			ws.on('open', resolve);
			ws.on('error', reject);
		});
	});

	afterEach(async () => {
		if (ws) {
			ws.close();
		}
		if (server && server.server) {
			server.server.close();
		}
		await new Promise(resolve => setTimeout(resolve, 100));
	});

	describe('WebSocket Configuration Updates', () => {
		it('should handle update_config for cryptocurrencies array', async () => {
			const requestId = 'test-request-1';
			const cryptocurrencies = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'];

			const responsePromise = new Promise((resolve) => {
				ws.on('message', (data) => {
					const message = JSON.parse(data);
					if (message.requestId === requestId) {
						resolve(message);
					}
				});
			});

			ws.send(JSON.stringify({
				type: 'update_config',
				payload: {
					key: 'cryptocurrencies',
					value: cryptocurrencies
				},
				requestId
			}));

			const message = await responsePromise;
			expect(message.type).toBe('config_updated_response');
			expect(message.data.success).toBe(true);
			expect(message.data.message).toBe('Configuration updated');

			// Verify the value was saved correctly in database
			const savedValue = db.getConfig('cryptocurrencies');
			expect(savedValue).toEqual(cryptocurrencies);
		});

		it('should handle update_config for numeric values', async () => {
			const requestId = 'test-request-2';
			const analysisInterval = 300000;

			const responsePromise = new Promise((resolve) => {
				ws.on('message', (data) => {
					const message = JSON.parse(data);
					if (message.requestId === requestId) {
						resolve(message);
					}
				});
			});

			ws.send(JSON.stringify({
				type: 'update_config',
				payload: {
					key: 'analysis_interval',
					value: analysisInterval
				},
				requestId
			}));

			const message = await responsePromise;
			expect(message.type).toBe('config_updated_response');
			expect(message.data.success).toBe(true);

			// Verify the value was saved correctly in database
			const savedValue = db.getConfig('analysis_interval');
			expect(savedValue).toBe(analysisInterval);
		});

		it('should handle update_config for string values', async () => {
			const requestId = 'test-request-3';
			const aiModel = 'gpt-4';

			const responsePromise = new Promise((resolve) => {
				ws.on('message', (data) => {
					const message = JSON.parse(data);
					if (message.requestId === requestId) {
						resolve(message);
					}
				});
			});

			ws.send(JSON.stringify({
				type: 'update_config',
				payload: {
					key: 'ai_model',
					value: aiModel
				},
				requestId
			}));

			const message = await responsePromise;
			expect(message.type).toBe('config_updated_response');
			expect(message.data.success).toBe(true);

			// Verify the value was saved correctly in database
			const savedValue = db.getConfig('ai_model');
			expect(savedValue).toBe(aiModel);
		});

		it('should handle update_config for float values', async () => {
			const requestId = 'test-request-4';
			const confidenceThreshold = 0.8;

			const responsePromise = new Promise((resolve) => {
				ws.on('message', (data) => {
					const message = JSON.parse(data);
					if (message.requestId === requestId) {
						resolve(message);
					}
				});
			});

			ws.send(JSON.stringify({
				type: 'update_config',
				payload: {
					key: 'signal_confidence_threshold',
					value: confidenceThreshold
				},
				requestId
			}));

			const message = await responsePromise;
			expect(message.type).toBe('config_updated_response');
			expect(message.data.success).toBe(true);

			// Verify the value was saved correctly in database
			const savedValue = db.getConfig('signal_confidence_threshold');
			expect(savedValue).toBe(confidenceThreshold);
		});

		it('should handle update_config for timeframes', async () => {
			const requestId = 'test-request-5';
			const timeframes = ['1h', '4h', '1d'];

			const responsePromise = new Promise((resolve) => {
				ws.on('message', (data) => {
					const message = JSON.parse(data);
					if (message.requestId === requestId) {
						resolve(message);
					}
				});
			});

			// Add a small delay to ensure WebSocket is fully connected
			await new Promise(resolve => setTimeout(resolve, 50));

			ws.send(JSON.stringify({
				type: 'update_config',
				payload: {
					key: 'timeframes',
					value: timeframes
				},
				requestId
			}));

			const message = await responsePromise;
			expect(message.type).toBe('config_updated_response');
			expect(message.data.success).toBe(true);

			// Verify the value was saved correctly in database
			const savedValue = db.getConfig('timeframes');
			expect(savedValue).toEqual(timeframes);
		});

		it('should handle multiple configuration updates', async () => {
			const updates = [
				{ key: 'cryptocurrencies', value: ['BTCUSDT', 'ETHUSDT'] },
				{ key: 'timeframes', value: ['1h', '4h'] },
				{ key: 'analysis_interval', value: 300000 },
				{ key: 'max_signals_per_hour', value: 10 },
				{ key: 'signal_confidence_threshold', value: 0.7 },
				{ key: 'ai_model', value: 'gpt-4' },
				{ key: 'openai_temperature', value: 0.7 },
				{ key: 'openai_max_tokens', value: 500 }
			];

			const responses = [];

			const responsePromise = new Promise((resolve) => {
				ws.on('message', (data) => {
					const message = JSON.parse(data);
					if (message.type === 'config_updated_response') {
						responses.push(message);
						if (responses.length === updates.length) {
							resolve(responses);
						}
					}
				});
			});

			// Add a small delay to ensure WebSocket is fully connected
			await new Promise(resolve => setTimeout(resolve, 100));

			// Send all updates with longer delays between requests
			updates.forEach((update, index) => {
				setTimeout(() => {
					ws.send(JSON.stringify({
						type: 'update_config',
						payload: update,
						requestId: `test-request-${index}`
					}));
				}, index * 100); // Longer delay between requests
			});

			const responseMessages = await responsePromise;

			// Verify all responses were successful
			responseMessages.forEach(message => {
				expect(message.data.success).toBe(true);
			});

			// Verify all values were saved correctly
			updates.forEach(update => {
				const savedValue = db.getConfig(update.key);
				if (Array.isArray(update.value)) {
					expect(savedValue).toEqual(update.value);
				} else {
					expect(savedValue).toBe(update.value);
				}
			});
		}, 10000); // Increase timeout to 10 seconds
	});

	describe('WebSocket Configuration Retrieval', () => {
		it('should handle get_config request', async () => {
			const requestId = 'test-request-6';

			// Set some initial config
			db.setConfig('cryptocurrencies', JSON.stringify(['BTCUSDT', 'ETHUSDT']));
			db.setConfig('timeframes', JSON.stringify(['1h', '4h']));
			db.setConfig('analysis_interval', '300000');

			const responsePromise = new Promise((resolve) => {
				ws.on('message', (data) => {
					const message = JSON.parse(data);
					if (message.requestId === requestId) {
						resolve(message);
					}
				});
			});

			ws.send(JSON.stringify({
				type: 'get_config',
				requestId
			}));

			const message = await responsePromise;
			expect(message.type).toBe('config_response');
			expect(message.data).toHaveProperty('cryptocurrencies');
			expect(message.data).toHaveProperty('timeframes');
			expect(message.data).toHaveProperty('analysis_interval');
			expect(message.data.cryptocurrencies).toEqual(['BTCUSDT', 'ETHUSDT']);
			expect(message.data.timeframes).toEqual(['1h', '4h']);
			expect(message.data.analysis_interval).toBe(300000);
		});

		it('should handle get_config with empty database', async () => {
			const requestId = 'test-request-7';

			const responsePromise = new Promise((resolve) => {
				ws.on('message', (data) => {
					const message = JSON.parse(data);
					if (message.requestId === requestId) {
						resolve(message);
					}
				});
			});

			ws.send(JSON.stringify({
				type: 'get_config',
				requestId
			}));

			const message = await responsePromise;
			expect(message.type).toBe('config_response');
			expect(message.data).toEqual({});
		});
	});

	describe('WebSocket Error Handling', () => {
		it('should handle malformed update_config request', async () => {
			const requestId = 'test-request-8';

			const responsePromise = new Promise((resolve) => {
				ws.on('message', (data) => {
					const message = JSON.parse(data);
					if (message.requestId === requestId) {
						resolve(message);
					}
				});
			});

			ws.send(JSON.stringify({
				type: 'update_config',
				payload: null, // Invalid payload
				requestId
			}));

			const message = await responsePromise;
			expect(message.type).toBe('error');
			expect(message.data.message).toContain('Invalid payload');
		});

		it('should handle update_config with missing key', async () => {
			const requestId = 'test-request-9';

			const responsePromise = new Promise((resolve) => {
				ws.on('message', (data) => {
					const message = JSON.parse(data);
					if (message.requestId === requestId) {
						resolve(message);
					}
				});
			});

			ws.send(JSON.stringify({
				type: 'update_config',
				payload: {
					value: 'test_value'
					// Missing key
				},
				requestId
			}));

			const message = await responsePromise;
			expect(message.type).toBe('error');
			expect(message.data.message).toContain('Missing key');
		});

		it('should handle update_config with missing value', async () => {
			const requestId = 'test-request-10';

			const responsePromise = new Promise((resolve) => {
				ws.on('message', (data) => {
					const message = JSON.parse(data);
					if (message.requestId === requestId) {
						resolve(message);
					}
				});
			});

			ws.send(JSON.stringify({
				type: 'update_config',
				payload: {
					key: 'test_key'
					// Missing value
				},
				requestId
			}));

			const message = await responsePromise;
			expect(message.type).toBe('error');
			expect(message.data.message).toContain('Missing value');
		});
	});

	describe('WebSocket Broadcast', () => {
		it('should broadcast config_updated event', async () => {
			const requestId = 'test-request-11';
			let broadcastReceived = false;
			let responseReceived = false;

			const responsePromise = new Promise((resolve) => {
				// Listen for broadcast messages
				ws.on('message', (data) => {
					const message = JSON.parse(data);
					if (message.type === 'config_updated' && !broadcastReceived) {
						broadcastReceived = true;
						expect(message.data).toHaveProperty('key', 'cryptocurrencies');
						expect(message.data).toHaveProperty('value');
						expect(message.data).toHaveProperty('timestamp');
						expect(message.data).toHaveProperty('message');
						expect(message.data.message).toContain('Configuration updated');
					} else if (message.requestId === requestId && !responseReceived) {
						responseReceived = true;
						expect(message.type).toBe('config_updated_response');
						expect(message.data.success).toBe(true);
						resolve({ broadcastReceived, responseReceived });
					}
				});
			});

			// Add a small delay to ensure WebSocket is fully connected and registered for broadcast
			await new Promise(resolve => setTimeout(resolve, 100));

			ws.send(JSON.stringify({
				type: 'update_config',
				payload: {
					key: 'cryptocurrencies',
					value: ['BTCUSDT', 'ETHUSDT']
				},
				requestId
			}));

			const result = await responsePromise;
			expect(result.broadcastReceived).toBe(true);
			expect(result.responseReceived).toBe(true);
		}, 10000); // Increase timeout to 10 seconds
	});
});
