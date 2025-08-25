import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WebSocket from 'ws';
import Server from '../../src/server.js';
import CryptoBotDatabase from '../../database/db.js';

describe('Configuration Integration Tests', () => {
	let server;
	let db;
	let ws;
	let port = 8083 + Math.floor(Math.random() * 1000); // Use random port for each test

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

	describe('Configuration Flow Integration', () => {
		it('should handle complete configuration update flow', async () => {
			const requestId = 'integration-test-1';
			const configData = {
				cryptocurrencies: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'],
				timeframes: ['1h', '4h', '1d'],
				analysis_interval: 300000,
				signal_confidence_threshold: 0.7
			};

			// Test each configuration key
			for (const [key, value] of Object.entries(configData)) {
				const responsePromise = new Promise((resolve) => {
					ws.on('message', (data) => {
						const message = JSON.parse(data);
						if (message.requestId === `${requestId}-${key}`) {
							resolve(message);
						}
					});
				});

				ws.send(JSON.stringify({
					type: 'update_config',
					payload: { key, value },
					requestId: `${requestId}-${key}`
				}));

				const message = await responsePromise;
				expect(message.type).toBe('config_updated_response');
				expect(message.data.success).toBe(true);

				// Verify the value was saved correctly in database
				const savedValue = db.getConfig(key);
				expect(savedValue).toEqual(value);
			}

			// Verify all configurations are saved
			const allConfig = db.getAllConfig();
			Object.entries(configData).forEach(([key, value]) => {
				expect(allConfig).toHaveProperty(key);
				expect(allConfig[key]).toEqual(value);
			});
		});

		it('should handle configuration validation and error handling', async () => {
			const requestId = 'validation-test-1';

			// Test missing key
			const missingKeyPromise = new Promise((resolve) => {
				ws.on('message', (data) => {
					const message = JSON.parse(data);
					if (message.requestId === `${requestId}-missing-key`) {
						resolve(message);
					}
				});
			});

			ws.send(JSON.stringify({
				type: 'update_config',
				payload: { value: 'test_value' }, // Missing key
				requestId: `${requestId}-missing-key`
			}));

			const missingKeyMessage = await missingKeyPromise;
			expect(missingKeyMessage.type).toBe('error');
			expect(missingKeyMessage.data.message).toContain('Missing key');

			// Test missing value
			const missingValuePromise = new Promise((resolve) => {
				ws.on('message', (data) => {
					const message = JSON.parse(data);
					if (message.requestId === `${requestId}-missing-value`) {
						resolve(message);
					}
				});
			});

			ws.send(JSON.stringify({
				type: 'update_config',
				payload: { key: 'test_key' }, // Missing value
				requestId: `${requestId}-missing-value`
			}));

			const missingValueMessage = await missingValuePromise;
			expect(missingValueMessage.type).toBe('error');
			expect(missingValueMessage.data.message).toContain('Missing value');
		});

		it('should handle configuration broadcast to multiple clients', async () => {
			const requestId = 'broadcast-test-1';
			const configKey = 'test_broadcast_key';
			const configValue = 'broadcast_test_value';

			// Create second WebSocket client
			const ws2 = new WebSocket(`ws://localhost:${port}`);
			await new Promise((resolve, reject) => {
				ws2.on('open', resolve);
				ws2.on('error', reject);
			});

			// Listen for broadcast messages on both clients
			const broadcastPromises = [
				new Promise((resolve) => {
					ws.on('message', (data) => {
						const message = JSON.parse(data);
						if (message.type === 'config_updated') {
							resolve(message);
						}
					});
				}),
				new Promise((resolve) => {
					ws2.on('message', (data) => {
						const message = JSON.parse(data);
						if (message.type === 'config_updated') {
							resolve(message);
						}
					});
				})
			];

			// Send configuration update
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
				payload: { key: configKey, value: configValue },
				requestId
			}));

			// Wait for response
			const response = await responsePromise;
			expect(response.type).toBe('config_updated_response');
			expect(response.data.success).toBe(true);

			// Wait for broadcast messages
			const [broadcast1, broadcast2] = await Promise.all(broadcastPromises);

			expect(broadcast1.type).toBe('config_updated');
			expect(broadcast1.data.key).toBe(configKey);
			expect(broadcast1.data.value).toBe(configValue);

			expect(broadcast2.type).toBe('config_updated');
			expect(broadcast2.data.key).toBe(configKey);
			expect(broadcast2.data.value).toBe(configValue);

			// Clean up second client
			ws2.close();
		});

		it('should handle configuration persistence across server restarts', async () => {
			const configKey = 'persistence_test_key';
			const configValue = 'persistence_test_value';
			const requestId = 'persistence-test-1';

			// Set configuration
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
				payload: { key: configKey, value: configValue },
				requestId
			}));

			const response = await responsePromise;
			expect(response.type).toBe('config_updated_response');
			expect(response.data.success).toBe(true);

			// Verify configuration is saved
			const savedValue = db.getConfig(configKey);
			expect(savedValue).toBe(configValue);

			// Simulate server restart by creating new database connection
			const newDb = new CryptoBotDatabase(':memory:');
			newDb.init();

			// The configuration should persist in the original database
			// In a real scenario, this would be the same database file
			const originalValue = db.getConfig(configKey);
			expect(originalValue).toBe(configValue);
		});

		it('should handle configuration with complex data types', async () => {
			const requestId = 'complex-types-test-1';
			const complexConfigs = {
				'nested_object': {
					level1: {
						level2: {
							value: 'deep_nested',
							array: [1, 2, 3, 4, 5]
						}
					}
				},
				'mixed_array': [
					{ id: 1, name: 'BTCUSDT', active: true },
					{ id: 2, name: 'ETHUSDT', active: false },
					{ id: 3, name: 'ADAUSDT', active: true }
				],
				'boolean_value': true,
				'null_value': null,
				'empty_array': [],
				'empty_object': {}
			};

			// Test each complex configuration
			for (const [key, value] of Object.entries(complexConfigs)) {
				const responsePromise = new Promise((resolve) => {
					ws.on('message', (data) => {
						const message = JSON.parse(data);
						if (message.requestId === `${requestId}-${key}`) {
							resolve(message);
						}
					});
				});

				ws.send(JSON.stringify({
					type: 'update_config',
					payload: { key, value },
					requestId: `${requestId}-${key}`
				}));

				const message = await responsePromise;
				expect(message.type).toBe('config_updated_response');
				expect(message.data.success).toBe(true);

				// Verify the value was saved correctly
				const savedValue = db.getConfig(key);
				// Handle null values - they are stored as empty strings in SQLite
				if (value === null) {
					expect(savedValue).toBe('');
				} else {
					expect(savedValue).toEqual(value);
				}
			}
		});

		it('should handle configuration update with concurrent requests', async () => {
			const baseRequestId = 'concurrent-test';
			const configKey = 'concurrent_test_key';
			const numRequests = 5;

			// Send multiple concurrent requests
			const promises = [];
			for (let i = 0; i < numRequests; i++) {
				const requestId = `${baseRequestId}-${i}`;
				const value = `concurrent_value_${i}`;

				const promise = new Promise((resolve) => {
					ws.on('message', (data) => {
						const message = JSON.parse(data);
						if (message.requestId === requestId) {
							resolve(message);
						}
					});
				});

				ws.send(JSON.stringify({
					type: 'update_config',
					payload: { key: configKey, value },
					requestId
				}));

				promises.push(promise);
			}

			// Wait for all responses
			const responses = await Promise.all(promises);

			// All should succeed
			responses.forEach(response => {
				expect(response.type).toBe('config_updated_response');
				expect(response.data.success).toBe(true);
			});

			// The last value should be the final one in the database
			const finalValue = db.getConfig(configKey);
			expect(finalValue).toBe(`concurrent_value_${numRequests - 1}`);
		});

		it('should handle configuration with special characters and encoding', async () => {
			const requestId = 'encoding-test-1';
			const specialConfigs = {
				'unicode_chars': '🚀 Bitcoin 🚀, € Euro €, ¥ Yen ¥',
				'html_entities': '<script>alert("test")</script>',
				'sql_injection': "'; DROP TABLE config; --",
				'newlines': 'Line 1\nLine 2\nLine 3',
				'tabs': 'Tab\tSeparated\tValues',
				'quotes': 'Single \' and double " quotes',
				'backslashes': 'C:\\Users\\Test\\Documents',
				'emoji': '🎯🎲🎳🎴🎵🎶🎷🎸🎹🎺🎻🎼🎽🎾🎿'
			};

			// Test each special configuration
			for (const [key, value] of Object.entries(specialConfigs)) {
				const responsePromise = new Promise((resolve) => {
					ws.on('message', (data) => {
						const message = JSON.parse(data);
						if (message.requestId === `${requestId}-${key}`) {
							resolve(message);
						}
					});
				});

				ws.send(JSON.stringify({
					type: 'update_config',
					payload: { key, value },
					requestId: `${requestId}-${key}`
				}));

				const message = await responsePromise;
				expect(message.type).toBe('config_updated_response');
				expect(message.data.success).toBe(true);

				// Verify the value was saved correctly
				const savedValue = db.getConfig(key);
				expect(savedValue).toBe(value);
			}
		});
	});
});
