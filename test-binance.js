#!/usr/bin/env node

const BinanceService = require('./src/binance-service.js');

class BinanceTester {
	constructor() {
		this.binance = new BinanceService();
		this.testResults = [];
	}

	async runAllTests() {
		console.log('🚀 Starting Binance Service Tests...\n');

		try {
			// Test 1: Service Initialization
			await this.testServiceInitialization();

			// Test 2: Get OHLCV Data
			await this.testGetOHLCV();

			// Test 3: Get Price
			await this.testGetPrice();

			// Test 4: Get 24hr Ticker
			await this.testGet24hrTicker();

			// Test 5: Get Order Book
			await this.testGetOrderBook();

			// Test 6: Get Recent Trades
			await this.testGetRecentTrades();

			// Test 7: Test Multiple Cryptocurrencies
			await this.testMultipleCryptocurrencies();

			// Test 8: Test Invalid Symbols
			await this.testInvalidSymbols();

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
			this.assert(this.binance.client, 'Client should be available');
			console.log('✅ Service Initialization: PASSED\n');
			this.testResults.push({ test: 'Service Initialization', status: 'PASSED' });
		} catch (error) {
			this.fail('Service Initialization', error.message);
		}
	}

	async testGetOHLCV() {
		console.log('📊 Testing Get OHLCV Data...');
		try {
			const data = await this.binance.getOHLCV('BTCUSDT', '1h', 100);
			this.assert(Array.isArray(data), 'Should return array');
			this.assert(data.length > 0, 'Should have data');
			this.assert(data[0].timestamp, 'Should have timestamp');
			this.assert(data[0].open, 'Should have open price');
			this.assert(data[0].high, 'Should have high price');
			this.assert(data[0].low, 'Should have low price');
			this.assert(data[0].close, 'Should have close price');
			this.assert(data[0].volume, 'Should have volume');

			console.log(`✅ Get OHLCV: PASSED (${data.length} candles)\n`);
			this.testResults.push({ test: 'Get OHLCV', status: 'PASSED' });
		} catch (error) {
			this.fail('Get OHLCV', error.message);
		}
	}

	async testGetPrice() {
		console.log('💰 Testing Get Price...');
		try {
			const price = await this.binance.getCurrentPrice('BTCUSDT');
			this.assert(price, 'Should return price');
			this.assert(typeof price === 'number', 'Price should be number');
			this.assert(price > 0, 'Price should be positive');

			console.log(`✅ Get Price: PASSED (BTCUSDT: $${price})\n`);
			this.testResults.push({ test: 'Get Price', status: 'PASSED' });
		} catch (error) {
			this.fail('Get Price', error.message);
		}
	}

	async testGet24hrTicker() {
		console.log('📈 Testing Get 24hr Ticker...');
		try {
			const ticker = await this.binance.get24hrTicker('BTCUSDT');
			this.assert(ticker, 'Should return ticker data');
			this.assert(ticker.symbol, 'Should have symbol');
			this.assert(ticker.priceChange, 'Should have price change');
			this.assert(ticker.priceChangePercent, 'Should have price change percent');
			this.assert(ticker.volume, 'Should have volume');

			console.log(`✅ Get 24hr Ticker: PASSED (${ticker.symbol})\n`);
			this.testResults.push({ test: 'Get 24hr Ticker', status: 'PASSED' });
		} catch (error) {
			this.fail('Get 24hr Ticker', error.message);
		}
	}

	async testGetOrderBook() {
		console.log('📚 Testing Get Order Book...');
		try {
			const orderBook = await this.binance.getOrderBook('BTCUSDT', 10);
			this.assert(orderBook, 'Should return order book');
			this.assert(orderBook.bids, 'Should have bids');
			this.assert(orderBook.asks, 'Should have asks');
			this.assert(Array.isArray(orderBook.bids), 'Bids should be array');
			this.assert(Array.isArray(orderBook.asks), 'Asks should be array');
			this.assert(orderBook.bids.length > 0, 'Should have bids');
			this.assert(orderBook.asks.length > 0, 'Should have asks');
			this.assert(orderBook.bids[0].price, 'Bid should have price');
			this.assert(orderBook.bids[0].quantity, 'Bid should have quantity');
			this.assert(orderBook.asks[0].price, 'Ask should have price');
			this.assert(orderBook.asks[0].quantity, 'Ask should have quantity');

			console.log(`✅ Get Order Book: PASSED (${orderBook.bids.length} bids, ${orderBook.asks.length} asks)\n`);
			this.testResults.push({ test: 'Get Order Book', status: 'PASSED' });
		} catch (error) {
			this.fail('Get Order Book', error.message);
		}
	}

	async testGetRecentTrades() {
		console.log('🔄 Testing Get Recent Trades...');
		try {
			const trades = await this.binance.getRecentTrades('BTCUSDT', 10);
			this.assert(Array.isArray(trades), 'Should return array');
			this.assert(trades.length > 0, 'Should have trades');
			this.assert(trades[0].id, 'Should have trade ID');
			this.assert(trades[0].price, 'Should have price');
			this.assert(trades[0].quantity, 'Should have quantity');
			this.assert(trades[0].time, 'Should have time');

			console.log(`✅ Get Recent Trades: PASSED (${trades.length} trades)\n`);
			this.testResults.push({ test: 'Get Recent Trades', status: 'PASSED' });
		} catch (error) {
			this.fail('Get Recent Trades', error.message);
		}
	}

	async testMultipleCryptocurrencies() {
		console.log('🪙 Testing Multiple Cryptocurrencies...');
		const cryptos = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'XRPUSDT'];
		let passed = 0;

		for (const crypto of cryptos) {
			try {
				const price = await this.binance.getCurrentPrice(crypto);
				this.assert(price, `Should get price for ${crypto}`);
				this.assert(price > 0, `Price should be positive for ${crypto}`);
				console.log(`   ✅ ${crypto}: $${price}`);
				passed++;
			} catch (error) {
				console.log(`   ❌ ${crypto}: ${error.message}`);
			}
		}

		this.assert(passed === cryptos.length, `All ${cryptos.length} cryptocurrencies should work`);
		console.log(`✅ Multiple Cryptocurrencies: PASSED (${passed}/${cryptos.length})\n`);
		this.testResults.push({ test: 'Multiple Cryptocurrencies', status: 'PASSED' });
	}

	async testInvalidSymbols() {
		console.log('❌ Testing Invalid Symbols...');
		const invalidSymbols = ['BTC', 'ETH', 'ADA', 'DOT', 'INVALID'];
		let failed = 0;

		for (const symbol of invalidSymbols) {
			try {
				await this.binance.getCurrentPrice(symbol);
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
		console.log('📋 Binance Service Test Results:');
		console.log('================================');

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
			console.log('\n🎉 All Binance service tests passed! The service is working correctly.');
		} else {
			console.log('\n⚠️ Some tests failed. Please check the errors above.');
		}
	}
}

// Run the tests
async function main() {
	const tester = new BinanceTester();
	await tester.runAllTests();
}

// Main execution
console.log('🔍 Starting Binance Service Tests...\n');
main().catch(console.error);
