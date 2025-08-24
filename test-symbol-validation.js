#!/usr/bin/env node

require('dotenv').config();
const SignalGenerator = require('./src/signal-generator');

async function testSymbolValidation() {
	console.log('🧪 Testing Symbol Validation...\n');

	try {
		// Initialize Signal Generator
		const signalGenerator = new SignalGenerator({
			binance: {
				apiKey: process.env.BINANCE_API_KEY,
				apiSecret: process.env.BINANCE_API_SECRET
			},
			openai: {
				apiKey: process.env.OPENAI_API_KEY
			}
		});
		console.log('✅ Signal Generator initialized');

		// Test cases
		const testCases = [
			{
				name: 'Valid Latin symbols',
				symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT']
			},
			{
				name: 'Non-Latin symbols (Cyrillic)',
				symbols: ['BTCUSDТ', 'ETHUSDТ', 'ADAUSDТ'] // Cyrillic Т instead of Latin T
			},
			{
				name: 'Mixed valid and non-Latin',
				symbols: ['BTCUSDT', 'ETHUSDТ', 'ADAUSDT']
			},
			{
				name: 'Invalid symbols without USDT',
				symbols: ['BTC', 'ETH', 'ADA']
			},
			{
				name: 'Non-existent symbols',
				symbols: ['INVALIDUSDT', 'FAKEUSDT']
			}
		];

		for (const testCase of testCases) {
			console.log(`\n📋 Testing: ${testCase.name}`);
			console.log(`Symbols: ${testCase.symbols.join(', ')}`);

			try {
				const result = await signalGenerator.validateCryptocurrencies(testCase.symbols);
				console.log(`✅ Result: ${result.join(', ')}`);
			} catch (error) {
				console.log(`❌ Error: ${error.message}`);
			}
		}

		console.log('\n✅ Symbol validation test completed!');

	} catch (error) {
		console.error('❌ Test failed:', error);
		process.exit(1);
	}
}

// Run the test
testSymbolValidation();
