import { describe, it, expect, beforeEach, vi } from 'vitest';
import CryptoBotDatabase from '../../database/db.js';

describe('Configuration Backend Tests', () => {
	let db;

	beforeEach(async () => {
		// Create in-memory database for testing
		db = new CryptoBotDatabase(':memory:');
		await db.init();
	});

	describe('Database Configuration Methods', () => {
		it('should set configuration using setConfig', () => {
			const result = db.setConfig('test_key', 'test_value');
			expect(result.changes).toBe(1);

			const config = db.getConfig('test_key');
			expect(config).toBe('test_value');
		});

		it('should update existing configuration', () => {
			// First set initial value
			db.setConfig('test_key', 'initial_value');

			// Then update it
			const result = db.updateConfig('test_key', 'updated_value');
			expect(result.changes).toBe(1);

			const savedValue = db.getConfig('test_key');
			expect(savedValue).toBe('updated_value');
		});

		it('should handle array values by converting to JSON string', () => {
			const arrayValue = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'];
			const result = db.setConfig('cryptocurrencies', JSON.stringify(arrayValue));
			expect(result.changes).toBe(1);

			const savedValue = db.getConfig('cryptocurrencies');
			expect(savedValue).toEqual(arrayValue); // getConfig automatically parses JSON
		});

		it('should handle numeric values', () => {
			const numericValue = 300000;
			const result = db.setConfig('analysis_interval', numericValue.toString());
			expect(result.changes).toBe(1);

			const savedValue = db.getConfig('analysis_interval');
			expect(savedValue).toBe(300000); // getConfig automatically parses numbers
		});

		it('should handle float values', () => {
			const floatValue = 0.7;
			const result = db.setConfig('signal_confidence_threshold', floatValue.toString());
			expect(result.changes).toBe(1);

			const savedValue = db.getConfig('signal_confidence_threshold');
			expect(savedValue).toBe(0.7); // getConfig automatically parses numbers
		});

		it('should return null for non-existent config', () => {
			const savedValue = db.getConfig('non_existent_key');
			expect(savedValue).toBeNull();
		});

		it('should get all configuration', () => {
			// Set multiple config values
			db.setConfig('key1', 'value1');
			db.setConfig('key2', 'value2');
			db.setConfig('key3', 'value3');

			const allConfig = db.getAllConfig();
			expect(allConfig).toHaveProperty('key1', 'value1');
			expect(allConfig).toHaveProperty('key2', 'value2');
			expect(allConfig).toHaveProperty('key3', 'value3');
		});

		it('should handle empty string values', () => {
			const result = db.setConfig('empty_key', '');
			expect(result.changes).toBe(1);

			const savedValue = db.getConfig('empty_key');
			expect(savedValue).toBe('');
		});
	});

	describe('Configuration Validation', () => {
		it('should validate required configuration keys', () => {
			const requiredKeys = [
				'cryptocurrencies',
				'timeframes',
				'analysis_interval',
				'max_signals_per_hour',
				'signal_confidence_threshold',
				'ai_model',
				'openai_temperature',
				'openai_max_tokens'
			];

			// Set all required keys
			requiredKeys.forEach(key => {
				db.setConfig(key, 'test_value');
			});

			const allConfig = db.getAllConfig();
			requiredKeys.forEach(key => {
				expect(allConfig).toHaveProperty(key);
			});
		});

		it('should handle special characters in configuration values', () => {
			const specialValue = 'BTC/USDT, ETH/USDT, ADA/USDT';
			const result = db.setConfig('cryptocurrencies', specialValue);
			expect(result.changes).toBe(1);

			const savedValue = db.getConfig('cryptocurrencies');
			expect(savedValue).toBe(specialValue);
		});

		it('should handle very long configuration values', () => {
			const longValue = 'a'.repeat(10000);
			const result = db.setConfig('long_key', longValue);
			expect(result.changes).toBe(1);

			const savedValue = db.getConfig('long_key');
			expect(savedValue).toBe(longValue);
		});
	});

	describe('Configuration Edge Cases', () => {
		it('should handle concurrent configuration updates', () => {
			// Simulate concurrent updates
			const promises = [];
			for (let i = 0; i < 10; i++) {
				promises.push(db.setConfig('concurrent_key', `value_${i}`));
			}

			Promise.all(promises).then(results => {
				results.forEach(result => {
					expect(result.changes).toBe(1);
				});
			});
		});

		it('should handle configuration with SQL injection attempts', () => {
			const maliciousValue = "'; DROP TABLE config; --";
			const result = db.setConfig('malicious_key', maliciousValue);
			expect(result.changes).toBe(1);

			const savedValue = db.getConfig('malicious_key');
			expect(savedValue).toBe(maliciousValue);

			// Verify table still exists
			const allConfig = db.getAllConfig();
			expect(typeof allConfig).toBe('object');
		});

		it('should handle configuration keys with special characters', () => {
			const specialKey = 'config.key.with.dots';
			const result = db.setConfig(specialKey, 'test_value');
			expect(result.changes).toBe(1);

			const savedValue = db.getConfig(specialKey);
			expect(savedValue).toBe('test_value');
		});
	});
});
