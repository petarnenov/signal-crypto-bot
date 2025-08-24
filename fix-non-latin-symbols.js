#!/usr/bin/env node

require('dotenv').config();
const CryptoBotDatabase = require('./database/db');

function isLatinString(str) {
	if (typeof str !== 'string') return false;
	// Check if string contains only Latin letters, numbers, and common symbols
	const latinRegex = /^[A-Za-z0-9]+$/;
	return latinRegex.test(str);
}

async function fixNonLatinSymbols() {
	console.log('🔧 Fixing non-Latin symbols in database...\n');

	try {
		// Initialize database
		const db = new CryptoBotDatabase();
		console.log('✅ Database initialized');

		// Get current cryptocurrencies configuration
		const currentConfig = db.getConfig('cryptocurrencies');
		console.log('📋 Current cryptocurrencies config:', currentConfig);

		if (!currentConfig || !Array.isArray(currentConfig)) {
			console.log('❌ No cryptocurrencies config found or invalid format');
			return;
		}

		// Check for non-Latin symbols
		const validSymbols = [];
		const nonLatinSymbols = [];
		const invalidSymbols = [];

		for (const symbol of currentConfig) {
			if (typeof symbol !== 'string') {
				invalidSymbols.push(symbol);
				continue;
			}

			if (!isLatinString(symbol)) {
				nonLatinSymbols.push(symbol);
				continue;
			}

			if (symbol.endsWith('USDT')) {
				validSymbols.push(symbol);
			} else {
				invalidSymbols.push(symbol);
			}
		}

		// Report findings
		console.log('\n📊 Analysis results:');
		console.log(`✅ Valid symbols: ${validSymbols.length} - ${validSymbols.join(', ')}`);
		console.log(`⚠️ Non-Latin symbols: ${nonLatinSymbols.length} - ${nonLatinSymbols.join(', ')}`);
		console.log(`❌ Invalid symbols: ${invalidSymbols.length} - ${invalidSymbols.join(', ')}`);

		// Fix non-Latin symbols
		if (nonLatinSymbols.length > 0) {
			console.log('\n🔧 Fixing non-Latin symbols...');
			
			for (const nonLatinSymbol of nonLatinSymbols) {
				// Try to fix common issues
				let fixedSymbol = nonLatinSymbol;
				
				// Replace Cyrillic Т with Latin T
				fixedSymbol = fixedSymbol.replace(/Т/g, 'T');
				fixedSymbol = fixedSymbol.replace(/т/g, 't');
				
				// Replace other common Cyrillic characters
				fixedSymbol = fixedSymbol.replace(/А/g, 'A');
				fixedSymbol = fixedSymbol.replace(/а/g, 'a');
				fixedSymbol = fixedSymbol.replace(/Е/g, 'E');
				fixedSymbol = fixedSymbol.replace(/е/g, 'e');
				fixedSymbol = fixedSymbol.replace(/О/g, 'O');
				fixedSymbol = fixedSymbol.replace(/о/g, 'o');
				fixedSymbol = fixedSymbol.replace(/Р/g, 'P');
				fixedSymbol = fixedSymbol.replace(/р/g, 'p');
				fixedSymbol = fixedSymbol.replace(/С/g, 'C');
				fixedSymbol = fixedSymbol.replace(/с/g, 'c');
				fixedSymbol = fixedSymbol.replace(/У/g, 'Y');
				fixedSymbol = fixedSymbol.replace(/у/g, 'y');
				fixedSymbol = fixedSymbol.replace(/Х/g, 'X');
				fixedSymbol = fixedSymbol.replace(/х/g, 'x');

				if (isLatinString(fixedSymbol) && fixedSymbol.endsWith('USDT')) {
					console.log(`  ✅ Fixed: ${nonLatinSymbol} → ${fixedSymbol}`);
					validSymbols.push(fixedSymbol);
				} else {
					console.log(`  ❌ Could not fix: ${nonLatinSymbol}`);
				}
			}
		}

		// Update database with valid symbols only
		if (validSymbols.length > 0) {
			console.log('\n💾 Updating database with valid symbols...');
			db.setConfig('cryptocurrencies', validSymbols, 'Fixed non-Latin symbols');
			console.log(`✅ Database updated with ${validSymbols.length} valid symbols: ${validSymbols.join(', ')}`);
		} else {
			console.log('\n⚠️ No valid symbols found, using defaults...');
			const defaultSymbols = ['BTCUSDT', 'ETHUSDT'];
			db.setConfig('cryptocurrencies', defaultSymbols, 'Using default symbols after fixing non-Latin symbols');
			console.log(`✅ Database updated with default symbols: ${defaultSymbols.join(', ')}`);
		}

		// Verify the fix
		const newConfig = db.getConfig('cryptocurrencies');
		console.log('\n🔍 Verification - New config:', newConfig);

		console.log('\n✅ Non-Latin symbols fix completed!');

	} catch (error) {
		console.error('❌ Error fixing non-Latin symbols:', error);
		process.exit(1);
	}
}

// Run the fix
fixNonLatinSymbols();
