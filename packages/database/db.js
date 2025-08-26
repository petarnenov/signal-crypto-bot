const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class CryptoBotDatabase {
	constructor(dbPath = 'crypto_bot.db') {
		this.dbPath = dbPath;
		this.db = null;
		this.init();
	}

	init() {
		try {
			// Handle in-memory database
			if (this.dbPath.startsWith(':memory:')) {
				this.db = new Database(':memory:');
			} else {
				// Create database directory if it doesn't exist
				const dbDir = path.dirname(this.dbPath);
				if (!fs.existsSync(dbDir)) {
					fs.mkdirSync(dbDir, { recursive: true });
				}
				this.db = new Database(this.dbPath);
			}

			this.db.pragma('journal_mode = WAL');
			this.db.pragma('foreign_keys = ON');

			// Initialize schema
			this.initSchema();

			console.log('Database initialized successfully');
		} catch (error) {
			console.error('Database initialization failed:', error);
			throw error;
		}
	}

	initSchema() {
		try {
			const schemaPath = path.join(__dirname, 'schema.sql');
			const schema = fs.readFileSync(schemaPath, 'utf8');

			// Split schema into individual statements
			const statements = schema
				.split(';')
				.map(stmt => stmt.trim())
				.filter(stmt => stmt.length > 0);

			// Execute each statement (excluding INSERT statements)
			statements.forEach(statement => {
				if (statement.length > 0 && !statement.toUpperCase().startsWith('INSERT')) {
					try {
						this.db.exec(statement);
					} catch (error) {
						console.warn(`Failed to execute schema statement: ${statement.substring(0, 50)}...`, error.message);
					}
				}
			});
		} catch (error) {
			console.error('Failed to initialize schema:', error);
			throw error;
		}
	}

	// Signal methods
	createSignal(signalData) {
		const stmt = this.db.prepare(`
			INSERT INTO signals (
				cryptocurrency, signalType, timeframe, price, confidence,
				aiReasoning, technicalIndicators, createdAt
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`);

		return stmt.run(
			signalData.cryptocurrency,
			signalData.signalType,
			signalData.timeframe,
			signalData.price,
			signalData.confidence,
			signalData.aiReasoning,
			signalData.technicalIndicators ? JSON.stringify(signalData.technicalIndicators) : null,
			signalData.createdAt || new Date().toISOString()
		);
	}

	getSignals(limit = 100) {
		const stmt = this.db.prepare(`
			SELECT * FROM signals 
			ORDER BY createdAt DESC 
			LIMIT ?
		`);
		return stmt.all(limit);
	}

	getSignalsByCryptocurrency(cryptocurrency, limit = 100) {
		const stmt = this.db.prepare(`
			SELECT * FROM signals 
			WHERE cryptocurrency = ? 
			ORDER BY createdAt DESC 
			LIMIT ?
		`);
		return stmt.all(cryptocurrency, limit);
	}

	getSignalsByTimeframe(timeframe, limit = 100) {
		const stmt = this.db.prepare(`
			SELECT * FROM signals 
			WHERE timeframe = ? 
			ORDER BY createdAt DESC 
			LIMIT ?
		`);
		return stmt.all(timeframe, limit);
	}

	updateSignalStatus(signalId, status) {
		const stmt = this.db.prepare(`
			UPDATE signals 
			SET status = ?, executedAt = CASE WHEN ? = 'executed' THEN CURRENT_TIMESTAMP ELSE executedAt END
			WHERE id = ?
		`);
		return stmt.run(status, status, signalId);
	}

	// Configuration methods
	getConfig(key) {
		const stmt = this.db.prepare('SELECT value FROM config WHERE key = ?');
		const result = stmt.get(key);
		if (!result) return null;

		try {
			// Try to parse as JSON first
			return JSON.parse(result.value);
		} catch (error) {
			// If parsing fails, it might be a simple string
			// Check if it looks like a JSON string (starts with [ or {)
			if (result.value.trim().startsWith('[') || result.value.trim().startsWith('{')) {
				console.warn(`Failed to parse JSON for config key '${key}':`, error.message);
			}
			return result.value;
		}
	}

	getConfigRaw(key) {
		const stmt = this.db.prepare('SELECT value FROM config WHERE key = ?');
		const result = stmt.get(key);
		return result ? result.value : null;
	}

	getAllConfig() {
		const stmt = this.db.prepare('SELECT key, value FROM config');
		const results = stmt.all();

		const config = {};
		results.forEach(row => {
			try {
				// Try to parse as JSON first
				config[row.key] = JSON.parse(row.value);
			} catch (error) {
				// If parsing fails, check if it's a number
				const trimmedValue = row.value.trim();
				if (!isNaN(trimmedValue) && trimmedValue !== '') {
					// Convert to number if it's numeric
					config[row.key] = Number(trimmedValue);
				} else if (trimmedValue.startsWith('[') || trimmedValue.startsWith('{')) {
					console.warn(`Failed to parse JSON for config key '${row.key}':`, error.message);
					config[row.key] = row.value;
				} else {
					// Keep as string
					config[row.key] = row.value;
				}
			}
		});

		return config;
	}

	setConfig(key, value) {
		try {
			const stmt = this.db.prepare(`
				INSERT OR REPLACE INTO config (key, value) 
				VALUES (?, ?)
			`);
			return stmt.run(key, value);
		} catch (error) {
			console.error(`Failed to set config for key '${key}':`, error);
			throw error;
		}
	}

	updateConfig(key, value) {
		const stmt = this.db.prepare(`
			UPDATE config SET value = ?, updatedAt = ? WHERE key = ?
		`);
		return stmt.run(value, new Date().toISOString(), key);
	}

	// Telegram chat methods
	addTelegramChat(chatData) {
		const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO telegram_chats (chat_id, chat_type, chat_title, notification_types)
            VALUES (?, ?, ?, ?)
        `);

		return stmt.run(
			chatData.chat_id,
			chatData.chat_type,
			chatData.chat_title,
			JSON.stringify(chatData.notification_types)
		);
	}

	getActiveTelegramChats() {
		const stmt = this.db.prepare(`
            SELECT * FROM telegram_chats 
            WHERE is_active = 1
        `);

		return stmt.all();
	}

	// AI analysis methods
	saveAIAnalysis(analysisData) {
		const stmt = this.db.prepare(`
            INSERT INTO ai_analysis (cryptocurrency, timeframe, marketData, aiResponse, tokensUsed, cost, analysisTimeMs)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

		const result = stmt.run(
			analysisData.cryptocurrency,
			analysisData.timeframe,
			JSON.stringify(analysisData.marketData),
			analysisData.aiResponse,
			analysisData.tokensUsed,
			analysisData.cost,
			analysisData.analysisTimeMs
		);

		return result.lastInsertRowid;
	}

	getAIAnalysisHistory(cryptocurrency, limit = 50) {
		const stmt = this.db.prepare(`
            SELECT * FROM ai_analysis 
            WHERE cryptocurrency = ? 
            ORDER BY createdAt DESC 
            LIMIT ?
        `);

		return stmt.all(cryptocurrency, limit);
	}

	// Performance metrics methods
	addPerformanceMetric(metricData) {
		const stmt = this.db.prepare(`
            INSERT INTO performance_metrics (signalId, cryptocurrency, entryPrice, exitPrice, profitLoss, profitLossPercent, durationHours)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

		return stmt.run(
			metricData.signalId,
			metricData.cryptocurrency,
			metricData.entryPrice,
			metricData.exitPrice,
			metricData.profitLoss,
			metricData.profitLossPercent,
			metricData.durationHours
		);
	}

	getPerformanceStats(cryptocurrency = null) {
		let query = `
            SELECT 
                COUNT(*) as total_signals,
                AVG(profitLossPercent) as avg_profit_loss,
                SUM(CASE WHEN profitLossPercent > 0 THEN 1 ELSE 0 END) as profitable_signals,
                SUM(CASE WHEN profitLossPercent <= 0 THEN 1 ELSE 0 END) as losing_signals
            FROM performance_metrics
        `;

		if (cryptocurrency) {
			query += ' WHERE cryptocurrency = ?';
			const stmt = this.db.prepare(query);
			return stmt.get(cryptocurrency);
		} else {
			const stmt = this.db.prepare(query);
			return stmt.get();
		}
	}

	// Paper trading methods
	createPaperTradingAccount(accountData) {
		const stmt = this.db.prepare(`
			INSERT OR REPLACE INTO paper_trading_accounts (
				id, userId, balance, currency, equity, unrealizedPnl, realizedPnl,
				totalTrades, winningTrades, losingTrades, createdAt, updatedAt
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		return stmt.run(
			accountData.id,
			accountData.userId,
			accountData.balance,
			accountData.currency || 'USDT',
			accountData.equity,
			accountData.unrealizedPnl || 0,
			accountData.realizedPnl || 0,
			accountData.totalTrades || 0,
			accountData.winningTrades || 0,
			accountData.losingTrades || 0,
			accountData.createdAt || new Date().toISOString(),
			accountData.updatedAt || new Date().toISOString()
		);
	}

	updatePaperTradingAccount(accountData) {
		const stmt = this.db.prepare(`
			UPDATE paper_trading_accounts SET
				balance = ?, equity = ?, unrealizedPnl = ?, realizedPnl = ?,
				totalTrades = ?, winningTrades = ?, losingTrades = ?, updatedAt = ?
			WHERE id = ?
		`);

		return stmt.run(
			accountData.balance,
			accountData.equity,
			accountData.unrealizedPnl || 0,
			accountData.realizedPnl || 0,
			accountData.totalTrades || 0,
			accountData.winningTrades || 0,
			accountData.losingTrades || 0,
			accountData.updatedAt || new Date().toISOString(),
			accountData.id
		);
	}

	createPaperTradingPosition(positionData) {
		const stmt = this.db.prepare(`
			INSERT INTO paper_trading_positions (
				id, accountId, symbol, side, quantity, avgPrice, unrealizedPnl, createdAt, updatedAt
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		return stmt.run(
			positionData.id,
			positionData.accountId,
			positionData.symbol,
			positionData.side,
			positionData.quantity,
			positionData.avgPrice,
			positionData.unrealizedPnl || 0,
			positionData.createdAt || new Date().toISOString(),
			positionData.updatedAt || new Date().toISOString()
		);
	}

	getPaperTradingAccounts() {
		const stmt = this.db.prepare(`
			SELECT * FROM paper_trading_accounts ORDER BY createdAt DESC
		`);
		return stmt.all();
	}

	getPaperTradingAccount(accountId) {
		const stmt = this.db.prepare(`
			SELECT * FROM paper_trading_accounts WHERE id = ?
		`);
		return stmt.get(accountId);
	}

	getUserPaperTradingAccounts(userId) {
		const stmt = this.db.prepare(`
			SELECT * FROM paper_trading_accounts WHERE userId = ? ORDER BY createdAt DESC
		`);
		return stmt.all(userId);
	}

	createPaperTradingOrder(orderData) {
		const stmt = this.db.prepare(`
			INSERT INTO paper_trading_orders (
				id, accountId, symbol, side, type, quantity, price, executionPrice,
				amount, commission, status, isRealOrder, binanceOrderId, createdAt, filledAt
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		return stmt.run(
			orderData.id,
			orderData.accountId,
			orderData.symbol,
			orderData.side,
			orderData.type,
			orderData.quantity,
			orderData.price,
			orderData.executionPrice,
			orderData.amount,
			orderData.commission,
			orderData.status,
			orderData.isRealOrder || 0,
			orderData.binanceOrderId,
			orderData.createdAt || new Date().toISOString(),
			orderData.filledAt
		);
	}

	updatePaperTradingOrder(orderData) {
		const stmt = this.db.prepare(`
			UPDATE paper_trading_orders SET
				executionPrice = ?, amount = ?, commission = ?, status = ?,
				filledAt = ?
			WHERE id = ?
		`);

		return stmt.run(
			orderData.executionPrice,
			orderData.amount,
			orderData.commission,
			orderData.status,
			orderData.filledAt || orderData.filledAt,
			orderData.id
		);
	}

	getPaperTradingOrders(accountId, limit = 100) {
		let stmt;
		if (accountId) {
			// Get orders for specific account
			stmt = this.db.prepare(`
				SELECT * FROM paper_trading_orders 
				WHERE accountId = ? 
				ORDER BY createdAt DESC 
				LIMIT ?
			`);
			return stmt.all(accountId, parseInt(limit) || 100);
		} else {
			// Get all orders
			stmt = this.db.prepare(`
				SELECT * FROM paper_trading_orders 
				ORDER BY createdAt DESC 
				LIMIT ?
			`);
			return stmt.all(parseInt(limit) || 100);
		}
	}

	getPaperTradingOrder(orderId) {
		const stmt = this.db.prepare(`
			SELECT * FROM paper_trading_orders 
			WHERE id = ?
		`);
		return stmt.get(orderId);
	}

	updatePaperTradingPosition(positionData) {
		const stmt = this.db.prepare(`
			INSERT OR REPLACE INTO paper_trading_positions (
				id, accountId, symbol, side, quantity, avgPrice, currentPrice,
				unrealizedPnl, createdAt, updatedAt
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		return stmt.run(
			positionData.id,
			positionData.accountId,
			positionData.symbol,
			positionData.side,
			positionData.quantity,
			positionData.avgPrice,
			positionData.currentPrice,
			positionData.unrealizedPnl || 0,
			positionData.createdAt || new Date().toISOString(),
			positionData.updatedAt || new Date().toISOString()
		);
	}

	getPaperTradingPositions(accountId) {
		const stmt = this.db.prepare(`
			SELECT * FROM paper_trading_positions WHERE accountId = ?
		`);
		return stmt.all(accountId);
	}

	deletePaperTradingPosition(positionId) {
		const stmt = this.db.prepare(`
			DELETE FROM paper_trading_positions WHERE id = ?
		`);
		return stmt.run(positionId);
	}

	// User settings methods
	getUserSetting(userId, settingKey) {
		const stmt = this.db.prepare(`
			SELECT settingValue FROM user_settings 
			WHERE userId = ? AND settingKey = ?
		`);
		const result = stmt.get(userId, settingKey);
		return result ? result.settingValue : null;
	}

	setUserSetting(userId, settingKey, settingValue) {
		const stmt = this.db.prepare(`
			INSERT OR REPLACE INTO user_settings (userId, settingKey, settingValue, updatedAt)
			VALUES (?, ?, ?, ?)
		`);
		return stmt.run(userId, settingKey, settingValue, new Date().toISOString());
	}

	getAllUserSettings(userId) {
		const stmt = this.db.prepare(`
			SELECT settingKey, settingValue FROM user_settings 
			WHERE userId = ?
		`);
		return stmt.all(userId);
	}

	// Utility methods
	close() {
		if (this.db) {
			this.db.close();
		}
	}

	backup(backupPath) {
		const backupDb = new Database(backupPath);
		this.db.backup(backupDb);
		backupDb.close();
	}
}

module.exports = CryptoBotDatabase;
