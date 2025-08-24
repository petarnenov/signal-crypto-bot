#!/usr/bin/env node

require('dotenv').config();
const SignalGenerator = require('./src/signal-generator');
const CryptoBotDatabase = require('./database/db');

async function testPaperTradingSignal() {
	console.log('🧪 Starting Paper Trading Signal Test...\n');

	try {
		// Initialize database
		const db = new CryptoBotDatabase();
		console.log('✅ Database initialized');

		// Initialize Signal Generator with Paper Trading
		const signalGenerator = new SignalGenerator({
			binance: {
				apiKey: process.env.BINANCE_API_KEY,
				apiSecret: process.env.BINANCE_API_SECRET
			},
			openai: {
				apiKey: process.env.OPENAI_API_KEY
			}
		});
		console.log('✅ Signal Generator initialized with Paper Trading');

		// Test signal data
		const testSignal = {
			cryptocurrency: 'BTCUSDT',
			signal_type: 'buy',
			timeframe: '5m',
			price: 114000.00,
			confidence: 0.85,
			ai_reasoning: 'Test signal for paper trading',
			technical_indicators: {
				rsi: 65,
				macd: 'positive',
				sma_20: 113500
			}
		};

		console.log('\n📊 Test Signal Data:');
		console.log(JSON.stringify(testSignal, null, 2));

		// Execute signal in Paper Trading
		console.log('\n🔄 Executing signal in Paper Trading...');
		await signalGenerator.executeSignalInPaperTrading(testSignal);

		// Wait a moment for processing
		await new Promise(resolve => setTimeout(resolve, 2000));

		// Check if orders were created
		console.log('\n🔍 Checking for created orders...');
		const orders = db.getPaperTradingOrders('default', 10);
		console.log(`📋 Found ${orders.length} orders:`);
		orders.forEach(order => {
			console.log(`  - ${order.side} ${order.quantity} ${order.symbol} @ $${order.price} (${order.status})`);
		});

		// Check if positions were created
		console.log('\n🔍 Checking for active positions...');
		const positions = db.getPaperTradingPositions('default');
		console.log(`📋 Found ${positions.length} positions:`);
		positions.forEach(position => {
			console.log(`  - ${position.side} ${position.quantity} ${position.symbol} @ $${position.avg_price}`);
		});

		// Check account balances
		console.log('\n🔍 Checking account balances...');
		const accounts = db.getUserPaperTradingAccounts('user1');
		accounts.forEach(account => {
			console.log(`  - Account ${account.id}: $${account.balance} balance, $${account.equity} equity`);
		});

		console.log('\n✅ Paper Trading Signal Test completed!');

	} catch (error) {
		console.error('❌ Test failed:', error);
		process.exit(1);
	}
}

// Run the test
testPaperTradingSignal();
