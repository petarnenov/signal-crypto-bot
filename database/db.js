const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class CryptoBotDatabase {
	constructor(dbPath = 'crypto_bot.db') {
		this.dbPath = path.join(__dirname, '..', dbPath);
		this.db = null;
		this.init();
	}

	init() {
		try {
			// Create database directory if it doesn't exist
			const dbDir = path.dirname(this.dbPath);
			if (!fs.existsSync(dbDir)) {
				fs.mkdirSync(dbDir, { recursive: true });
			}

			this.db = new Database(this.dbPath);
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
				this.db.exec(statement);
			}
		});
	}

	// Signal methods
	createSignal(signalData) {
		const stmt = this.db.prepare(`
            INSERT INTO signals (cryptocurrency, signal_type, timeframe, price, confidence, ai_reasoning, technical_indicators)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

		const result = stmt.run(
			signalData.cryptocurrency,
			signalData.signal_type,
			signalData.timeframe,
			signalData.price,
			signalData.confidence,
			signalData.ai_reasoning,
			JSON.stringify(signalData.technical_indicators)
		);

		// Emit WebSocket notification for new signal
		if (global.serverInstance && global.serverInstance.broadcast) {
			global.serverInstance.broadcast({
				type: 'data_updated',
				data: {
					table: 'signals',
					action: 'created',
					signal_id: result.lastInsertRowid,
					timestamp: new Date().toISOString(),
					message: `📊 New signal added: ${signalData.cryptocurrency} ${signalData.signal_type.toUpperCase()}`
				}
			});
		}

		return result.lastInsertRowid;
	}

	getSignals(limit = 100, offset = 0) {
		const stmt = this.db.prepare(`
            SELECT * FROM signals 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `);

		return stmt.all(limit, offset);
	}

	getSignalsByCrypto(cryptocurrency, limit = 50) {
		const stmt = this.db.prepare(`
            SELECT * FROM signals 
            WHERE cryptocurrency = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        `);

		return stmt.all(cryptocurrency, limit);
	}

	getAllSignals() {
		const stmt = this.db.prepare(`
            SELECT * FROM signals 
            ORDER BY created_at DESC
        `);

		return stmt.all();
	}

	updateSignalStatus(signalId, status) {
		const stmt = this.db.prepare(`
            UPDATE signals 
            SET status = ?, executed_at = CASE WHEN ? = 'executed' THEN CURRENT_TIMESTAMP ELSE executed_at END
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

	getAllConfig() {
		const stmt = this.db.prepare('SELECT key, value, description FROM config');
		const results = stmt.all();

		const config = {};
		results.forEach(row => {
			try {
				// Try to parse as JSON first
				config[row.key] = JSON.parse(row.value);
			} catch (error) {
				// If parsing fails, it might be a simple string
				// Check if it looks like a JSON string (starts with [ or {)
				if (row.value.trim().startsWith('[') || row.value.trim().startsWith('{')) {
					console.warn(`Failed to parse JSON for config key '${row.key}':`, error.message);
				}
				config[row.key] = row.value;
			}
		});

		return config;
	}

	setConfig(key, value, description = null) {
		const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO config (key, value, description, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `);

		// For simple strings, don't double-encode them
		const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
		const result = stmt.run(key, stringValue, description);

		return result;
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
            INSERT INTO ai_analysis (cryptocurrency, timeframe, market_data, ai_response, tokens_used, cost, analysis_time_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

		const result = stmt.run(
			analysisData.cryptocurrency,
			analysisData.timeframe,
			JSON.stringify(analysisData.market_data),
			analysisData.ai_response,
			analysisData.tokens_used,
			analysisData.cost,
			analysisData.analysis_time_ms
		);

		return result.lastInsertRowid;
	}

	getAIAnalysisHistory(cryptocurrency, limit = 50) {
		const stmt = this.db.prepare(`
            SELECT * FROM ai_analysis 
            WHERE cryptocurrency = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        `);

		return stmt.all(cryptocurrency, limit);
	}

	// Performance metrics methods
	addPerformanceMetric(metricData) {
		const stmt = this.db.prepare(`
            INSERT INTO performance_metrics (signal_id, cryptocurrency, entry_price, exit_price, profit_loss, profit_loss_percent, duration_hours)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

		return stmt.run(
			metricData.signal_id,
			metricData.cryptocurrency,
			metricData.entry_price,
			metricData.exit_price,
			metricData.profit_loss,
			metricData.profit_loss_percent,
			metricData.duration_hours
		);
	}

	getPerformanceStats(cryptocurrency = null) {
		let query = `
            SELECT 
                COUNT(*) as total_signals,
                AVG(profit_loss_percent) as avg_profit_loss,
                SUM(CASE WHEN profit_loss_percent > 0 THEN 1 ELSE 0 END) as profitable_signals,
                SUM(CASE WHEN profit_loss_percent <= 0 THEN 1 ELSE 0 END) as losing_signals
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
			INSERT INTO paper_trading_accounts (
				id, user_id, balance, currency, equity, unrealized_pnl, 
				realized_pnl, total_trades, winning_trades, losing_trades, 
				created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		return stmt.run(
			accountData.id,
			accountData.userId || accountData.user_id,
			accountData.balance,
			accountData.currency,
			accountData.equity,
			accountData.unrealizedPnL,
			accountData.realizedPnL,
			accountData.totalTrades,
			accountData.winningTrades,
			accountData.losingTrades,
			accountData.createdAt,
			accountData.updatedAt
		);
	}

	updatePaperTradingAccount(accountData) {
		const stmt = this.db.prepare(`
			UPDATE paper_trading_accounts SET
				balance = ?, equity = ?, unrealized_pnl = ?, realized_pnl = ?,
				total_trades = ?, winning_trades = ?, losing_trades = ?, updated_at = ?
			WHERE id = ?
		`);

		return stmt.run(
			accountData.balance,
			accountData.equity,
			accountData.unrealizedPnL,
			accountData.realizedPnL,
			accountData.totalTrades,
			accountData.winningTrades,
			accountData.losingTrades,
			accountData.updatedAt,
			accountData.id
		);
	}

	getPaperTradingAccount(accountId) {
		const stmt = this.db.prepare(`
			SELECT * FROM paper_trading_accounts WHERE id = ?
		`);
		return stmt.get(accountId);
	}

	getUserPaperTradingAccounts(userId) {
		const stmt = this.db.prepare(`
			SELECT * FROM paper_trading_accounts WHERE user_id = ? ORDER BY created_at DESC
		`);
		return stmt.all(userId);
	}

	createPaperTradingOrder(orderData) {
		const stmt = this.db.prepare(`
			INSERT INTO paper_trading_orders (
				id, account_id, symbol, side, type, quantity, price,
				execution_price, amount, commission, status, created_at, filled_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
			orderData.createdAt,
			orderData.filledAt
		);
	}

	updatePaperTradingOrder(orderData) {
		const stmt = this.db.prepare(`
			UPDATE paper_trading_orders SET
				execution_price = ?, amount = ?, commission = ?, status = ?, filled_at = ?
			WHERE id = ?
		`);

		return stmt.run(
			orderData.executionPrice,
			orderData.amount,
			orderData.commission,
			orderData.status,
			orderData.filledAt,
			orderData.id
		);
	}

	getPaperTradingOrders(accountId, limit = 100) {
		const stmt = this.db.prepare(`
			SELECT * FROM paper_trading_orders 
			WHERE account_id = ? 
			ORDER BY created_at DESC 
			LIMIT ?
		`);
		return stmt.all(accountId, limit);
	}

	updatePaperTradingPosition(positionData) {
		const stmt = this.db.prepare(`
			INSERT OR REPLACE INTO paper_trading_positions (
				id, account_id, symbol, side, quantity, avg_price,
				unrealized_pnl, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		return stmt.run(
			positionData.id,
			positionData.accountId,
			positionData.symbol,
			positionData.side,
			positionData.quantity,
			positionData.avgPrice,
			positionData.unrealizedPnL,
			positionData.createdAt,
			positionData.updatedAt
		);
	}

	getPaperTradingPositions(accountId) {
		const stmt = this.db.prepare(`
			SELECT * FROM paper_trading_positions WHERE account_id = ?
		`);
		return stmt.all(accountId);
	}

	deletePaperTradingPosition(positionId) {
		const stmt = this.db.prepare(`
			DELETE FROM paper_trading_positions WHERE id = ?
		`);
		return stmt.run(positionId);
	}

	// Seed database with default data (call manually when needed)
	seedDatabase() {
		try {
			console.log('Seeding database with default configuration...');

			// Insert default configuration
			const defaultConfig = [
				['timeframes', '["1m", "5m", "15m", "1h", "4h", "1d"]', 'Available timeframes for analysis'],
				['cryptocurrencies', '["BTCUSDT", "ETHUSDT", "ADAUSDT", "DOTUSDT", "XRPUSDT"]', 'Supported cryptocurrencies'],
				['ai_model', 'gpt-4', 'OpenAI model to use'],
				['ai_temperature', '0.7', 'AI temperature setting'],
				['ai_max_tokens', '500', 'Maximum tokens for AI response'],
				['signal_confidence_threshold', '0.7', 'Minimum confidence to send signal'],
				['max_signals_per_hour', '10', 'Rate limiting for signals']
			];

			const stmt = this.db.prepare(`
				INSERT OR REPLACE INTO config (key, value, description) VALUES (?, ?, ?)
			`);

			defaultConfig.forEach(([key, value, description]) => {
				stmt.run(key, value, description);
			});

			console.log('Database seeded successfully');
		} catch (error) {
			console.error('Error seeding database:', error);
			throw error;
		}
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
