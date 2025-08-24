#!/usr/bin/env node

const axios = require('axios');
const WebSocket = require('ws');

class SimpleCryptoBotTester {
	constructor() {
		this.baseUrl = 'http://localhost:3001/api';
		this.wsUrl = 'ws://localhost:3001';
		this.testResults = [];
	}

	async runCoreTests() {
		console.log('🚀 Starting Core Crypto Bot Tests...\n');

		try {
			// Core functionality tests
			await this.testServerStatus();
			await this.testConfiguration();
			await this.testSignalGeneration();
			await this.testDatabaseOperations();
			await this.testWebSocketConnection();
			await this.testAnalytics();
			await this.testSignalGeneratorControl();

			// Print Results
			this.printResults();

		} catch (error) {
			console.error('❌ Test suite failed:', error.message);
		}
	}

	async testServerStatus() {
		console.log('📊 Testing Server Status...');
		try {
			const response = await axios.get(`${this.baseUrl}/status`);
			this.assert(response.status === 200, 'Server status endpoint should return 200');
			this.assert(response.data.status, 'Server should return status');
			console.log('✅ Server Status: PASSED\n');
			this.testResults.push({ test: 'Server Status', status: 'PASSED' });
		} catch (error) {
			this.fail('Server Status', error.message);
		}
	}

	async testConfiguration() {
		console.log('⚙️ Testing Configuration...');
		try {
			const response = await axios.get(`${this.baseUrl}/config`);
			this.assert(response.status === 200, 'Config endpoint should return 200');
			this.assert(response.data.cryptocurrencies, 'Should have cryptocurrencies config');
			this.assert(response.data.timeframes, 'Should have timeframes config');
			this.assert(response.data.ai_model, 'Should have AI model config');
			console.log('✅ Configuration: PASSED\n');
			this.testResults.push({ test: 'Configuration', status: 'PASSED' });
		} catch (error) {
			this.fail('Configuration', error.message);
		}
	}

	async testSignalGeneration() {
		console.log('📡 Testing Signal Generation...');
		try {
			const signalData = {
				cryptocurrency: 'BTCUSDT',
				timeframe: '1h'
			};

			const response = await axios.post(`${this.baseUrl}/signals/generate`, signalData);
			this.assert(response.status === 200, 'Signal generation should return 200');
			this.assert(response.data.signal_id, 'Should return signal ID');
			this.assert(response.data.cryptocurrency === 'BTCUSDT', 'Should return correct cryptocurrency');
			this.assert(response.data.signal_type, 'Should return signal type');
			this.assert(response.data.confidence, 'Should return confidence level');
			this.assert(response.data.technical_indicators, 'Should return technical indicators');

			console.log(`✅ Signal Generation: PASSED (Signal ID: ${response.data.signal_id})\n`);
			this.testResults.push({ test: 'Signal Generation', status: 'PASSED' });
		} catch (error) {
			this.fail('Signal Generation', error.message);
		}
	}

	async testDatabaseOperations() {
		console.log('🗄️ Testing Database Operations...');
		try {
			// Test getting signals
			const signalsResponse = await axios.get(`${this.baseUrl}/signals?limit=5`);
			this.assert(signalsResponse.status === 200, 'Signals endpoint should return 200');
			this.assert(Array.isArray(signalsResponse.data), 'Should return array of signals');

			// Test getting stats
			const statsResponse = await axios.get(`${this.baseUrl}/stats`);
			this.assert(statsResponse.status === 200, 'Stats endpoint should return 200');
			this.assert(statsResponse.data.total_signals !== undefined, 'Should return total signals');

			console.log('✅ Database Operations: PASSED\n');
			this.testResults.push({ test: 'Database Operations', status: 'PASSED' });
		} catch (error) {
			this.fail('Database Operations', error.message);
		}
	}

	async testWebSocketConnection() {
		console.log('🔌 Testing WebSocket Connection...');
		return new Promise((resolve) => {
			try {
				const ws = new WebSocket(this.wsUrl);
				let connected = false;

				ws.on('open', () => {
					connected = true;
					console.log('   WebSocket connected');
				});

				ws.on('message', (data) => {
					try {
						const message = JSON.parse(data);
						console.log(`   Received message: ${message.type}`);
					} catch (error) {
						console.log(`   Received non-JSON message: ${data}`);
					}
				});

				ws.on('error', (error) => {
					this.fail('WebSocket Connection', error.message);
					ws.close();
					resolve();
				});

				// Test for 3 seconds
				setTimeout(() => {
					this.assert(connected, 'WebSocket should connect');
					ws.close();
					console.log('✅ WebSocket Connection: PASSED\n');
					this.testResults.push({ test: 'WebSocket Connection', status: 'PASSED' });
					resolve();
				}, 3000);

			} catch (error) {
				this.fail('WebSocket Connection', error.message);
				resolve();
			}
		});
	}

	async testAnalytics() {
		console.log('📈 Testing Analytics...');
		try {
			const response = await axios.get(`${this.baseUrl}/analytics`);
			this.assert(response.status === 200, 'Analytics endpoint should return 200');
			this.assert(response.data.totalSignals !== undefined, 'Should return total signals');
			this.assert(response.data.successRate !== undefined, 'Should return success rate');
			this.assert(Array.isArray(response.data.performanceByCrypto), 'Should return crypto performance');
			this.assert(Array.isArray(response.data.signalDistribution), 'Should return signal distribution');

			console.log('✅ Analytics: PASSED\n');
			this.testResults.push({ test: 'Analytics', status: 'PASSED' });
		} catch (error) {
			this.fail('Analytics', error.message);
		}
	}

	async testSignalGeneratorControl() {
		console.log('🎛️ Testing Signal Generator Control...');
		try {
			// Test status
			const statusResponse = await axios.get(`${this.baseUrl}/signal-generator/status`);
			this.assert(statusResponse.status === 200, 'Generator status should return 200');

			// Test start
			const startResponse = await axios.post(`${this.baseUrl}/signal-generator/start`);
			this.assert(startResponse.status === 200, 'Generator start should return 200');

			// Wait a bit
			await this.sleep(2000);

			// Test stop
			const stopResponse = await axios.post(`${this.baseUrl}/signal-generator/stop`);
			this.assert(stopResponse.status === 200, 'Generator stop should return 200');

			console.log('✅ Signal Generator Control: PASSED\n');
			this.testResults.push({ test: 'Signal Generator Control', status: 'PASSED' });
		} catch (error) {
			this.fail('Signal Generator Control', error.message);
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

	async sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	printResults() {
		console.log('📋 Core Test Results Summary:');
		console.log('=============================');

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
			console.log('\n🎉 All core tests passed! The Crypto Bot is working correctly.');
		} else {
			console.log('\n⚠️ Some tests failed. Please check the errors above.');
		}
	}
}

// Run the tests
async function main() {
	const tester = new SimpleCryptoBotTester();
	await tester.runCoreTests();
}

// Check if server is running before starting tests
async function checkServer() {
	try {
		await axios.get('http://localhost:3001/api/status');
		return true;
	} catch (error) {
		return false;
	}
}

// Main execution
async function runTests() {
	console.log('🔍 Checking if server is running...');
	const serverRunning = await checkServer();

	if (!serverRunning) {
		console.log('❌ Server is not running. Please start the server first:');
		console.log('   node src/server.js');
		process.exit(1);
	}

	console.log('✅ Server is running. Starting core tests...\n');
	await main();
}

runTests().catch(console.error);
