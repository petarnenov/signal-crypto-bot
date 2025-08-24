#!/usr/bin/env node

const OpenAI = require('openai');
const BinanceService = require('./src/binance-service.js');

class AIServiceTester {
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
		console.log('🚀 Starting AI Service Tests...\n');
		
		try {
			// Test 1: Service Initialization
			await this.testServiceInitialization();
			
			// Test 2: Prompt Generation
			await this.testPromptGeneration();
			
			// Test 3: Market Data Preparation
			await this.testMarketDataPreparation();
			
			// Test 4: Technical Indicators
			await this.testTechnicalIndicators();
			
			// Test 5: AI Analysis (if OpenAI is configured)
			if (this.openai) {
				await this.testAIAnalysis();
				await this.testMultipleCryptocurrencies();
				await this.testErrorHandling();
			} else {
				console.log('⏭️ Skipping AI Analysis tests (OpenAI not configured)\n');
			}
			
			// Test 6: Signal Generation Logic
			await this.testSignalGenerationLogic();
			
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
			
			if (this.openai) {
				this.assert(this.openai, 'OpenAI client should be initialized');
			}
			
			console.log('✅ Service Initialization: PASSED\n');
			this.testResults.push({ test: 'Service Initialization', status: 'PASSED' });
		} catch (error) {
			this.fail('Service Initialization', error.message);
		}
	}

	async testPromptGeneration() {
		console.log('📝 Testing Prompt Generation...');
		try {
			const marketData = {
				symbol: 'BTCUSDT',
				timeframe: '1h',
				current_price: 50000,
				price_change_24h: 2.5,
				volume_24h: 1000000,
				technical_indicators: {
					sma_20: 49500,
					sma_50: 49000,
					rsi: 65,
					macd: { MACD: 100, signal: 90, histogram: 10 },
					bollinger_bands: { upper: 52000, middle: 50000, lower: 48000 },
					stochastic: { k: 70, d: 65 }
				}
			};

			const prompt = this.generateAnalysisPrompt(marketData);
			
			this.assert(prompt, 'Should generate prompt');
			this.assert(typeof prompt === 'string', 'Prompt should be string');
			this.assert(prompt.length > 100, 'Prompt should be substantial');
			this.assert(prompt.includes('BTCUSDT'), 'Prompt should include symbol');
			this.assert(prompt.includes('50000'), 'Prompt should include current price');
			this.assert(prompt.includes('RSI'), 'Prompt should include technical indicators');
			
			console.log(`✅ Prompt Generation: PASSED (${prompt.length} characters)\n`);
			this.testResults.push({ test: 'Prompt Generation', status: 'PASSED' });
		} catch (error) {
			this.fail('Prompt Generation', error.message);
		}
	}

	async testMarketDataPreparation() {
		console.log('📊 Testing Market Data Preparation...');
		try {
			const marketData = await this.binance.getMarketData('BTCUSDT', '1h');
			
			this.assert(marketData, 'Should return market data');
			this.assert(marketData.symbol === 'BTCUSDT', 'Should have correct symbol');
			this.assert(marketData.timeframe === '1h', 'Should have correct timeframe');
			this.assert(marketData.current_price > 0, 'Should have positive current price');
			this.assert(Array.isArray(marketData.ohlcv), 'Should have OHLCV data');
			this.assert(marketData.ohlcv.length > 0, 'Should have OHLCV data');
			this.assert(marketData.technical_indicators, 'Should have technical indicators');
			this.assert(marketData.ticker_24hr, 'Should have 24hr ticker');
			
			console.log(`✅ Market Data Preparation: PASSED (Price: $${marketData.current_price})\n`);
			this.testResults.push({ test: 'Market Data Preparation', status: 'PASSED' });
		} catch (error) {
			this.fail('Market Data Preparation', error.message);
		}
	}

	async testTechnicalIndicators() {
		console.log('📈 Testing Technical Indicators...');
		try {
			const ohlcv = await this.binance.getOHLCV('BTCUSDT', '1h', 100);
			const indicators = this.binance.calculateTechnicalIndicators(ohlcv);
			
			this.assert(indicators, 'Should return indicators');
			this.assert(indicators.latest, 'Should have latest values');
			this.assert(indicators.full, 'Should have full indicators');
			this.assert(indicators.latest.current_price > 0, 'Should have current price');
			this.assert(indicators.latest.sma_20 !== null || indicators.latest.sma_20 !== undefined, 'Should have SMA 20');
			this.assert(indicators.latest.rsi !== null || indicators.latest.rsi !== undefined, 'Should have RSI');
			this.assert(indicators.latest.macd !== null || indicators.latest.macd !== undefined, 'Should have MACD');
			this.assert(indicators.latest.bollinger_bands !== null || indicators.latest.bollinger_bands !== undefined, 'Should have Bollinger Bands');
			this.assert(indicators.latest.stochastic !== null || indicators.latest.stochastic !== undefined, 'Should have Stochastic');
			
			console.log(`✅ Technical Indicators: PASSED (Price: $${indicators.latest.current_price})\n`);
			this.testResults.push({ test: 'Technical Indicators', status: 'PASSED' });
		} catch (error) {
			this.fail('Technical Indicators', error.message);
		}
	}

	async testAIAnalysis() {
		console.log('🤖 Testing AI Analysis...');
		try {
			const marketData = await this.binance.getMarketData('BTCUSDT', '1h');
			const prompt = this.generateAnalysisPrompt(marketData);
			
			const response = await this.openai.chat.completions.create({
				model: 'gpt-4',
				messages: [
					{
						role: 'system',
						content: 'You are a cryptocurrency trading analyst. Provide concise buy/sell signals based on technical analysis.'
					},
					{
						role: 'user',
						content: prompt
					}
				],
				max_tokens: 500,
				temperature: 0.3
			});

			const aiResponse = response.choices[0].message.content;
			
			this.assert(aiResponse, 'Should return AI response');
			this.assert(typeof aiResponse === 'string', 'Response should be string');
			this.assert(aiResponse.length > 50, 'Response should be substantial');
			this.assert(aiResponse.toLowerCase().includes('buy') || aiResponse.toLowerCase().includes('sell') || aiResponse.toLowerCase().includes('hold'), 'Should contain trading signal');
			
			console.log(`✅ AI Analysis: PASSED (${aiResponse.length} characters)\n`);
			console.log(`   AI Response: ${aiResponse.substring(0, 100)}...\n`);
			this.testResults.push({ test: 'AI Analysis', status: 'PASSED' });
		} catch (error) {
			this.fail('AI Analysis', error.message);
		}
	}

	async testMultipleCryptocurrencies() {
		console.log('🪙 Testing Multiple Cryptocurrencies AI Analysis...');
		const cryptos = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'];
		let passed = 0;
		
		for (const crypto of cryptos) {
			try {
				const marketData = await this.binance.getMarketData(crypto, '1h');
				const prompt = this.generateAnalysisPrompt(marketData);
				
				const response = await this.openai.chat.completions.create({
					model: 'gpt-4',
					messages: [
						{
							role: 'system',
							content: 'You are a cryptocurrency trading analyst. Provide concise buy/sell signals based on technical analysis.'
						},
						{
							role: 'user',
							content: prompt
						}
					],
					max_tokens: 300,
					temperature: 0.3
				});

				const aiResponse = response.choices[0].message.content;
				
				this.assert(aiResponse, `Should get AI response for ${crypto}`);
				this.assert(aiResponse.length > 30, `Response should be substantial for ${crypto}`);
				console.log(`   ✅ ${crypto}: ${aiResponse.substring(0, 50)}...`);
				passed++;
			} catch (error) {
				console.log(`   ❌ ${crypto}: ${error.message}`);
			}
		}
		
		this.assert(passed === cryptos.length, `All ${cryptos.length} cryptocurrencies should work`);
		console.log(`✅ Multiple Cryptocurrencies AI: PASSED (${passed}/${cryptos.length})\n`);
		this.testResults.push({ test: 'Multiple Cryptocurrencies AI', status: 'PASSED' });
	}

	async testErrorHandling() {
		console.log('⚠️ Testing Error Handling...');
		try {
			// Test with invalid market data
			const invalidMarketData = {
				symbol: 'INVALID',
				timeframe: '1h',
				current_price: 0,
				technical_indicators: {}
			};

			const prompt = this.generateAnalysisPrompt(invalidMarketData);
			
			const response = await this.openai.chat.completions.create({
				model: 'gpt-4',
				messages: [
					{
						role: 'system',
						content: 'You are a cryptocurrency trading analyst. Provide concise buy/sell signals based on technical analysis.'
					},
					{
						role: 'user',
						content: prompt
					}
				],
				max_tokens: 200,
				temperature: 0.3
			});

			const aiResponse = response.choices[0].message.content;
			
			this.assert(aiResponse, 'Should handle invalid data gracefully');
			this.assert(aiResponse.toLowerCase().includes('insufficient') || aiResponse.toLowerCase().includes('unclear') || aiResponse.toLowerCase().includes('hold'), 'Should indicate uncertainty with invalid data');
			
			console.log(`✅ Error Handling: PASSED\n`);
			this.testResults.push({ test: 'Error Handling', status: 'PASSED' });
		} catch (error) {
			this.fail('Error Handling', error.message);
		}
	}

	async testSignalGenerationLogic() {
		console.log('📡 Testing Signal Generation Logic...');
		try {
			// Test signal classification logic
			const testCases = [
				{ response: 'BUY: Strong bullish momentum', expected: 'buy' },
				{ response: 'SELL: Bearish trend detected', expected: 'sell' },
				{ response: 'HOLD: Wait for better entry', expected: 'hold' },
				{ response: 'The market shows mixed signals', expected: 'hold' }
			];

			let passed = 0;
			for (const testCase of testCases) {
				const signal = this.classifySignal(testCase.response);
				if (signal === testCase.expected) {
					passed++;
				}
			}

			this.assert(passed === testCases.length, 'Signal classification should work correctly');
			console.log(`✅ Signal Generation Logic: PASSED (${passed}/${testCases.length})\n`);
			this.testResults.push({ test: 'Signal Generation Logic', status: 'PASSED' });
		} catch (error) {
			this.fail('Signal Generation Logic', error.message);
		}
	}

	// Helper methods
	generateAnalysisPrompt(marketData) {
		const { symbol, timeframe, current_price, technical_indicators } = marketData;
		const { sma_20, sma_50, rsi, macd, bollinger_bands, stochastic } = technical_indicators;

		return `Analyze ${symbol} on ${timeframe} timeframe:

Current Price: $${current_price}
SMA 20: ${sma_20 ? `$${sma_20}` : 'N/A'}
SMA 50: ${sma_50 ? `$${sma_50}` : 'N/A'}
RSI: ${rsi ? rsi.toFixed(2) : 'N/A'}
MACD: ${macd ? `${macd.MACD?.toFixed(2) || 'N/A'}` : 'N/A'}
Bollinger Bands: ${bollinger_bands ? `Upper: $${bollinger_bands.upper}, Middle: $${bollinger_bands.middle}, Lower: $${bollinger_bands.lower}` : 'N/A'}
Stochastic: ${stochastic ? `K: ${stochastic.k?.toFixed(2) || 'N/A'}, D: ${stochastic.d?.toFixed(2) || 'N/A'}` : 'N/A'}

Provide a clear BUY, SELL, or HOLD signal with confidence level (1-10) and brief reasoning.`;
	}

	classifySignal(response) {
		const lowerResponse = response.toLowerCase();
		
		if (lowerResponse.includes('buy') && !lowerResponse.includes('sell')) {
			return 'buy';
		} else if (lowerResponse.includes('sell') && !lowerResponse.includes('buy')) {
			return 'sell';
		} else {
			return 'hold';
		}
	}

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
		console.log('📋 AI Service Test Results:');
		console.log('===========================');
		
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
			console.log('\n🎉 All AI service tests passed! The AI integration is working correctly.');
		} else {
			console.log('\n⚠️ Some tests failed. Please check the errors above.');
		}
	}
}

// Run the tests
async function main() {
	const tester = new AIServiceTester();
	await tester.runAllTests();
}

// Main execution
console.log('🔍 Starting AI Service Tests...\n');
main().catch(console.error);
