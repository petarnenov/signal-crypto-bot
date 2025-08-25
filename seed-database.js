const CryptoBotDatabase = require('./database/db.js');
const { v4: uuidv4 } = require('uuid');

async function seedDatabase() {
	console.log('🌱 Starting database seeding...');

	const db = new CryptoBotDatabase('crypto_bot.db');

	try {
		// Database is auto-initialized in constructor
		console.log('✅ Database initialized');

		// Clear existing data (in correct order due to foreign keys)
		console.log('🧹 Clearing existing data...');
		db.db.exec('DELETE FROM paper_trading_orders');
		db.db.exec('DELETE FROM paper_trading_positions');
		db.db.exec('DELETE FROM paper_trading_accounts');
		db.db.exec('DELETE FROM signals');
		console.log('✅ Existing data cleared');

		// Create 2 new paper trading accounts
		console.log('👤 Creating 2 new paper trading accounts...');

		const account1 = {
			id: `paper_user1_${uuidv4()}`,
			userId: 'user1',
			balance: 10000,
			equity: 10000,
			createdAt: new Date().toISOString()
		};

		const account2 = {
			id: `paper_user2_${uuidv4()}`,
			userId: 'user2',
			balance: 10000,
			equity: 10000,
			createdAt: new Date().toISOString()
		};

		await db.createPaperTradingAccount(account1);
		await db.createPaperTradingAccount(account2);

		console.log('✅ Created account 1:', account1.id, 'with balance $', account1.balance);
		console.log('✅ Created account 2:', account2.id, 'with balance $', account2.balance);

		// Verify accounts were created
		const accounts = await db.getPaperTradingAccounts();
		console.log(`📊 Total accounts in database: ${accounts.length}`);

		console.log('🎉 Database seeding completed successfully!');

	} catch (error) {
		console.error('❌ Error seeding database:', error);
		throw error;
	} finally {
		// Close database connection
		if (db.db) {
			db.db.close();
		}
	}
}

// Run the seeding
if (require.main === module) {
	seedDatabase()
		.then(() => {
			console.log('✅ Seed script completed');
			process.exit(0);
		})
		.catch((error) => {
			console.error('❌ Seed script failed:', error);
			process.exit(1);
		});
}

module.exports = { seedDatabase };
