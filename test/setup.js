import { beforeAll, afterAll } from 'vitest';
const CryptoBotDatabase = require('../database/db.js');

// Generate unique port for each test run
const getTestPort = () => {
	const basePort = 3301;
	const randomOffset = Math.floor(Math.random() * 100);
	return basePort + randomOffset;
};

// Global test setup
beforeAll(async () => {
	// Create test database
	global.testDb = new CryptoBotDatabase(':memory:');
	// Database is automatically initialized in constructor

	// Set unique port for this test run
	global.testPort = getTestPort();
	process.env.PORT = global.testPort.toString();
});

afterAll(async () => {
	// Cleanup test database
	if (global.testDb) {
		await global.testDb.close();
	}

	// Clean up any :memory: files that might have been created
	const fs = require('fs');
	const path = require('path');
	const testDir = path.resolve(__dirname, '..');

	try {
		const files = fs.readdirSync(testDir);
		files.forEach(file => {
			if (file.startsWith(':memory:')) {
				const filePath = path.join(testDir, file);
				fs.unlinkSync(filePath);
				console.log(`🧹 Cleaned up :memory: file: ${file}`);
			}
		});
	} catch (error) {
		console.warn('⚠️ Could not clean up :memory: files:', error.message);
	}
});

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.BINANCE_API_KEY = 'test-api-key';
process.env.BINANCE_SECRET_KEY = 'test-secret-key';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.TELEGRAM_BOT_TOKEN = 'test-telegram-token';
