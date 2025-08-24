#!/usr/bin/env node

require('dotenv').config();
const CryptoBotDatabase = require('./database/db');

async function seedDatabase() {
    const db = new CryptoBotDatabase();
    
    try {
        console.log('🔄 Starting database seeding...');
        
        // Seed the database with default configuration
        db.seedDatabase();
        
        console.log('✅ Database seeded successfully!');
        console.log('📊 Default configuration has been added:');
        console.log('   - Timeframes: 1m, 5m, 15m, 1h, 4h, 1d');
        console.log('   - Cryptocurrencies: BTCUSDT, ETHUSDT, ADAUSDT, DOTUSDT, XRPUSDT');
        console.log('   - AI Model: gpt-4');
        console.log('   - Signal confidence threshold: 0.7');
        console.log('   - Max signals per hour: 10');
        
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

// Run the seeding
seedDatabase();
