#!/usr/bin/env node

const SignalGenerator = require('./src/signal-generator.js');
const BinanceService = require('./src/binance-service.js');

class SignalGeneratorTester {
	constructor() {
		this.binance = new BinanceService();
		this.testResults = [];

		// Initialize OpenAI client
		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey || apiKey === 'your_openai_api_key_here') {
			console.log('⚠️ OpenAI API key not configured. Some tests will be skipped.');
			this.openai = null;
		} else {
			this.openai = new OpenAI({ apiKey });
		}
	}

	async runAllTests() {
		console.log('🚀 Starting Signal Generator Tests...\n');

		try {
			// Test 1: Service Initialization
			await this.testServiceInitialization();

			// Test 2: Valid Cryptocurrencies
			await this.testValidCryptocurrencies();

			// Test 3: Invalid Symbols (DOT without USDT)
			await this.testInvalidSymbols();

			// Test 4: Manual Signal Generation
			await this.testManualSignalGeneration();

			// Test 5: Error Handling
			await this.testErrorHandling();

			// Test 6: Configuration Validation
			await this.testConfigurationValidation();

			// Print Results
			this.printResults();

		} catch (error) {
			console.error('❌ Test suite failed:', error.message);
		}
	}

	async testServiceInitialization() {
		console.log('🔧 Testing Service Initialization...');
		try {
			this.assert(this.binance, 'BinanceService should be initialized');
			this.assert(this.binance.client, 'Binance client should be available');

			console.log('✅ Service Initialization: PASSED\n');
			this.testResults.push({ test: 'Service Initialization', status: 'PASSED' });
		} catch (error) {
			this.fail('Service Initialization', error.message);
		}
	}

	async testValidCryptocurrencies() {
		console.log('✅ Testing Valid Cryptocurrencies...');
		const validCryptos = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'XRPUSDT'];
		let passed = 0;

		for (const crypto of validCryptos) {
			try {
				// Test if we can get market data for valid symbols
				const marketData = await this.binance.getMarketData(crypto, '1h');
				this.assert(marketData.symbol === crypto, `Should get market data for ${crypto}`);
				this.assert(marketData.current_price > 0, `Should have positive price for ${crypto}`);
				console.log(`   ✅ ${crypto}: $${marketData.current_price}`);
				passed++;
			} catch (error) {
				console.log(`   ❌ ${crypto}: ${error.message}`);
			}
		}

		this.assert(passed === validCryptos.length, `All ${validCryptos.length} valid cryptocurrencies should work`);
		console.log(`✅ Valid Cryptocurrencies: PASSED (${passed}/${validCryptos.length})\n`);
		this.testResults.push({ test: 'Valid Cryptocurrencies', status: 'PASSED' });
	}

	async testInvalidSymbols() {
		console.log('❌ Testing Invalid Symbols (DOT without USDT)...');
		const invalidSymbols = ['DOT', 'BTC', 'ETH', 'ADA', 'XRP'];
		let failed = 0;

		for (const symbol of invalidSymbols) {
			try {
				// Test if invalid symbols properly fail
				await this.binance.getMarketData(symbol, '1h');
				console.log(`   ❌ ${symbol}: Should have failed but didn't`);
			} catch (error) {
				console.log(`   ✅ ${symbol}: Correctly failed - ${error.message}`);
				failed++;
			}
		}

		this.assert(failed === invalidSymbols.length, `All ${invalidSymbols.length} invalid symbols should fail`);
		console.log(`✅ Invalid Symbols: PASSED (${failed}/${invalidSymbols.length} failed correctly)\n`);
		this.testResults.push({ test: 'Invalid Symbols', status: 'PASSED' });
	}

	async testManualSignalGeneration() {
		console.log('📡 Testing Manual Signal Generation...');
		try {
			// Test with valid cryptocurrency
			const signalData = {
				cryptocurrency: 'BTCUSDT',
				timeframe: '1h'
			};

			// Simulate the signal generation process
			const marketData = await this.binance.getMarketData(signalData.cryptocurrency, signalData.timeframe);

			this.assert(marketData, 'Should get market data');
			this.assert(marketData.symbol === 'BTCUSDT', 'Should have correct symbol');
			this.assert(marketData.current_price > 0, 'Should have positive price');
			this.assert(marketData.technical_indicators, 'Should have technical indicators');

			console.log(`✅ Manual Signal Generation: PASSED (Price: $${marketData.current_price})\n`);
			this.testResults.push({ test: 'Manual Signal Generation', status: 'PASSED' });
		} catch (error) {
			this.fail('Manual Signal Generation', error.message);
		}
	}

	async testErrorHandling() {
		console.log('⚠️ Testing Error Handling...');
		try {
			// Test the specific case from the error
			const invalidSymbol = 'DOT';
			const timeframe = '1d';

			try {
				await this.binance.getOHLCV(invalidSymbol, timeframe, 100);
				console.log(`   ❌ ${invalidSymbol}: Should have failed but didn't`);
			} catch (error) {
				console.log(`   ✅ ${invalidSymbol}: Correctly failed - ${error.message}`);

				// Check if it's the expected error
				this.assert(error.code === -1121, 'Should have error code -1121 (Invalid symbol)');
				this.assert(error.message.includes('Invalid symbol'), 'Should have "Invalid symbol" message');
				this.assert(error.url.includes(invalidSymbol), 'Error URL should contain the invalid symbol');
			}

			// Test with valid symbol
			const validSymbol = 'DOTUSDT';
			const validData = await this.binance.getOHLCV(validSymbol, timeframe, 100);
			this.assert(validData.length > 0, 'Valid symbol should return data');
			console.log(`   ✅ ${validSymbol}: Successfully got ${validData.length} candles`);

			console.log('✅ Error Handling: PASSED\n');
			this.testResults.push({ test: 'Error Handling', status: 'PASSED' });
		} catch (error) {
			this.fail('Error Handling', error.message);
		}
	}

	async testConfigurationValidation() {
		console.log('⚙️ Testing Configuration Validation...');
		try {
			// Test configuration scenarios
			const testCases = [
				{
					name: 'Valid USDT pairs',
					cryptocurrencies: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'XRPUSDT'],
					expected: true
				},
				{
					name: 'Invalid pairs without USDT',
					cryptocurrencies: ['BTC', 'ETH', 'ADA', 'DOT', 'XRP'],
					expected: false
				},
				{
					name: 'Mixed valid and invalid',
					cryptocurrencies: ['BTCUSDT', 'ETH', 'ADAUSDT', 'DOT', 'XRPUSDT'],
					expected: false
				}
			];

			let passed = 0;
			for (const testCase of testCases) {
				try {
					// Test each cryptocurrency in the configuration
					let allValid = true;
					for (const crypto of testCase.cryptocurrencies) {
						try {
							await this.binance.getCurrentPrice(crypto);
						} catch (error) {
							allValid = false;
							break;
						}
					}

					if (allValid === testCase.expected) {
						console.log(`   ✅ ${testCase.name}: ${testCase.cryptocurrencies.join(', ')}`);
						passed++;
					} else {
						console.log(`   ❌ ${testCase.name}: Expected ${testCase.expected}, got ${allValid}`);
					}
				} catch (error) {
					console.log(`   ❌ ${testCase.name}: ${error.message}`);
				}
			}

			this.assert(passed === testCases.length, 'All configuration test cases should pass');
			console.log(`✅ Configuration Validation: PASSED (${passed}/${testCases.length})\n`);
			this.testResults.push({ test: 'Configuration Validation', status: 'PASSED' });
		} catch (error) {
			this.fail('Configuration Validation', error.message);
		}
	}

	// Helper methods
	assert(condition, message) {
		if (!condition) {
			throw new Error(message);
		}
	}

	fail(testName, error) {
		console.log(`❌ ${testName}: FAILED - ${error}\n`);
		this.testResults.push({ test: testName, status: 'FAILED', error });
	}

	printResults() {
		console.log('📋 Signal Generator Test Results:');
		console.log('==================================');

		const passed = this.testResults.filter(r => r.status === 'PASSED').length;
		const failed = this.testResults.filter(r => r.status === 'FAILED').length;
		const total = this.testResults.length;

		console.log(`✅ Passed: ${passed}`);
		console.log(`❌ Failed: ${failed}`);
		console.log(`📊 Total: ${total}`);

		if (failed > 0) {
			console.log('\n❌ Failed Tests:');
			this.testResults.filter(r => r.status === 'FAILED').forEach(result => {
				console.log(`   - ${result.test}: ${result.error}`);
			});
		}

		console.log(`\n🎯 Success Rate: ${Math.round((passed / total) * 100)}%`);

		if (passed === total) {
			console.log('\n🎉 All Signal Generator tests passed! The service is working correctly.');
		} else {
			console.log('\n⚠️ Some tests failed. Please check the errors above.');
		}

		// Specific recommendation for the DOT error
		console.log('\n💡 Recommendation for DOT error:');
		console.log('   - Use "DOTUSDT" instead of "DOT" in configuration');
		console.log('   - All cryptocurrency symbols must include USDT suffix');
		console.log('   - Valid symbols: BTCUSDT, ETHUSDT, ADAUSDT, DOTUSDT, XRPUSDT');
	}
}

// Run the tests
async function main() {
	const tester = new SignalGeneratorTester();
	await tester.runAllTests();
}

// Main execution
console.log('🔍 Starting Signal Generator Tests...\n');
main().catch(console.error);
