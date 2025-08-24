require('dotenv').config();

console.log('🧪 Simple Paper Trading Test');

// Test basic imports
try {
	const db = require('./database/db');
	console.log('✅ Database module loaded');

	const PaperTradingService = require('./src/paper-trading-service');
	console.log('✅ Paper Trading Service loaded');

	// Test database connection
	const database = new db();
	console.log('✅ Database initialized');

	// Test paper trading service
	const paperTrading = new PaperTradingService({ db: database });
	console.log('✅ Paper Trading Service initialized');

	// Test getting accounts
	paperTrading.getAllAccounts().then(accounts => {
		console.log(`📋 Found ${accounts.length} accounts:`, accounts);

		if (accounts.length > 0) {
			console.log('✅ Paper Trading accounts exist');
		} else {
			console.log('❌ No Paper Trading accounts found');
		}
	}).catch(error => {
		console.error('❌ Error getting accounts:', error);
	});

} catch (error) {
	console.error('❌ Test failed:', error);
}
