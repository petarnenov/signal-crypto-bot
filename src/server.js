const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const WebSocket = require('ws');
require('dotenv').config();

const CryptoBotDatabase = require('../database/db');
const SignalGenerator = require('./signal-generator');
const CryptoSignalBot = require('./telegram-bot');
const PaperTradingService = require('./paper-trading-service');

class CryptoBotServer {
	constructor() {
		this.app = express();
		this.db = new CryptoBotDatabase();
		this.signalGenerator = null;
		this.telegramBot = null;
		this.paperTradingService = null;
		this.port = process.env.PORT || 3001;
		this.wss = null;
		this.clients = new Set();
	}

	// Initialize middleware and security
	initMiddleware() {
		// Security middleware
		this.app.use(helmet({
			contentSecurityPolicy: {
				directives: {
					defaultSrc: ["'self'"],
					styleSrc: ["'self'", "'unsafe-inline'"],
					scriptSrc: ["'self'"],
					imgSrc: ["'self'", "data:", "https:"],
				},
			},
		}));

		// Rate limiting
		const limiter = rateLimit({
			windowMs: 15 * 60 * 1000, // 15 minutes
			max: 1000, // limit each IP to 1000 requests per windowMs
			message: { error: 'Too many requests from this IP, please try again later.' },
			standardHeaders: true,
			legacyHeaders: false,
		});
		this.app.use('/api/', limiter);

		// CORS
		this.app.use(cors({
			origin: process.env.NODE_ENV === 'production'
				? ['http://localhost:3000', 'https://yourdomain.com']
				: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'],
			credentials: true
		}));

		// Compression
		this.app.use(compression());

		// Logging
		this.app.use(morgan('combined'));

		// Body parsing
		this.app.use(express.json({ limit: '10mb' }));
		this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

		// Static files for production
		if (process.env.NODE_ENV === 'production') {
			this.app.use(express.static(path.join(__dirname, '../frontend/dist')));
		}
	}

	// Initialize services
	async initServices() {
		try {
			// Database is auto-initialized on creation

			// Initialize signal generator with existing database and paper trading service instances
			this.signalGenerator = new SignalGenerator({
				telegramToken: process.env.TELEGRAM_BOT_TOKEN,
				binance: {
					apiKey: process.env.BINANCE_API_KEY,
					apiSecret: process.env.BINANCE_API_SECRET
				},
				openai: {
					apiKey: process.env.OPENAI_API_KEY
				},
				db: this.db, // Pass the existing database instance
				paperTradingService: this.paperTradingService // Pass the existing paper trading service instance
			});

			// Initialize paper trading service
			this.paperTradingService = new PaperTradingService({
				db: this.db,
				binance: {
					apiKey: process.env.BINANCE_API_KEY,
					apiSecret: process.env.BINANCE_API_SECRET,
					useSandbox: true
				},
				openai: {
					apiKey: process.env.OPENAI_API_KEY
				}
			});

			// Initialize Telegram bot (temporarily disabled for testing)
			console.log('Telegram bot temporarily disabled for testing');

		} catch (error) {
			console.error('Error initializing services:', error);
			throw error;
		}
	}

	// Setup API routes - ONLY health check endpoint
	setupRoutes() {
		// Health check endpoint (kept for external monitoring)
		this.app.get('/api/status', (req, res) => {
			res.json({
				status: 'ok',
				timestamp: new Date().toISOString(),
				version: '1.0.0',
				environment: process.env.NODE_ENV || 'development'
			});
		});

		// All other communication is now handled via WebSocket
		// REST API endpoints have been removed in favor of WebSocket communication
	}

	// Error handling middleware
	setupErrorHandling() {
		this.app.use((err, req, res, next) => {
			console.error(err.stack);
			res.status(500).json({
				error: 'Something went wrong!',
				message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
			});
		});

		// 404 handler
		this.app.use((req, res) => {
			res.status(404).json({ error: 'Route not found' });
		});
	}

	// Initialize WebSocket server
	initWebSocket() {
		this.wss = new WebSocket.Server({ server: this.server });

		this.wss.on('connection', (ws) => {
			console.log('WebSocket client connected');
			this.clients.add(ws);
			console.log(`Total WebSocket clients: ${this.clients.size}`);

			// Send initial connection message
			ws.send(JSON.stringify({
				type: 'connection_status',
				data: {
					message: 'Connected to Crypto Signal Bot',
					timestamp: new Date().toISOString()
				}
			}));

			// Handle WebSocket messages
			ws.on('message', async (message) => {
				try {
					const data = JSON.parse(message);
					await this.handleWebSocketMessage(ws, data);
				} catch (error) {
					console.error('Error handling WebSocket message:', error);
					ws.send(JSON.stringify({
						type: 'error',
						data: {
							message: 'Invalid message format',
							timestamp: new Date().toISOString()
						}
					}));
				}
			});

			ws.on('close', () => {
				console.log('WebSocket client disconnected');
				this.clients.delete(ws);
				console.log(`Total WebSocket clients: ${this.clients.size}`);
			});
		});
	}

	// Handle WebSocket messages
	async handleWebSocketMessage(ws, data) {
		const { type, payload, requestId } = data;

		try {
			switch (type) {
				case 'get_config':
					const config = this.db.getAllConfig();
					ws.send(JSON.stringify({
						type: 'config_response',
						data: config,
						requestId
					}));
					break;

				case 'update_config':
					try {
						// Validate payload
						if (!payload) {
							throw new Error('Invalid payload');
						}

						const { key, value } = payload;

						// Validate required fields
						if (!key) {
							throw new Error('Missing key');
						}
						if (value === undefined) {
							throw new Error('Missing value');
						}

						console.log('🔧 [DEBUG] update_config received:', { key, value, type: typeof value, isArray: Array.isArray(value) });

						// Convert value to proper format if needed
						let processedValue = value;
						if ((key === 'cryptocurrencies' || key === 'timeframes') && Array.isArray(value)) {
							processedValue = JSON.stringify(value);
						} else if (typeof value === 'object' && value !== null) {
							// Convert all objects (including arrays, nested objects, etc.) to JSON string
							processedValue = JSON.stringify(value);
						} else if (typeof value === 'boolean') {
							// Convert boolean to string for SQLite compatibility
							processedValue = value.toString();
						} else if (typeof value === 'number') {
							// Convert number to string for SQLite compatibility
							processedValue = value.toString();
						} else if (value === null) {
							// Convert null to empty string for SQLite compatibility
							processedValue = '';
						}

						// Save to database first
						this.db.setConfig(key, processedValue);

						// Get the saved value from database to ensure consistency
						const savedValue = this.db.getConfigRaw(key);

						// Emit WebSocket notification for config change
						if (global.serverInstance && global.serverInstance.broadcast) {
							global.serverInstance.broadcast({
								type: 'config_updated',
								data: {
									key: key,
									value: savedValue,
									timestamp: new Date().toISOString(),
									message: `⚙️ Configuration updated: ${key}`
								}
							});
						}
						ws.send(JSON.stringify({
							type: 'config_updated_response',
							data: { success: true, message: 'Configuration updated' },
							requestId
						}));
					} catch (error) {
						console.error('Error handling update_config:', error);
						console.error('Error stack:', error.stack);
						console.error('Error details:', {
							key: payload?.key,
							value: payload?.value,
							valueType: typeof payload?.value,
							isArray: Array.isArray(payload?.value)
						});
						ws.send(JSON.stringify({
							type: 'error',
							data: {
								message: `Failed to update configuration: ${error.message}`,
								timestamp: new Date().toISOString()
							},
							requestId
						}));
					}
					break;

				case 'get_signals':
					try {
						const { limit = 50 } = payload || {};
						const signals = this.db.getSignals(limit);
						ws.send(JSON.stringify({
							type: 'signals_response',
							data: signals,
							requestId
						}));
					} catch (error) {
						console.error('Error getting signals:', error);
						ws.send(JSON.stringify({
							type: 'error',
							data: {
								message: `Error getting signals: ${error.message}`,
								code: error.code || 'UNKNOWN_ERROR'
							},
							requestId
						}));
					}
					break;

				case 'generate_signal':
					const { cryptocurrency, timeframe } = payload;
					const signal = await this.signalGenerator.generateManualSignal(cryptocurrency, timeframe);

					// Send response to the requesting client
					ws.send(JSON.stringify({
						type: 'signal_generated_response',
						data: signal,
						requestId
					}));

					// Broadcast signal generated after successful database save
					if (signal && signal.signalId) {
						this.broadcast({
							type: 'signal_generated',
							data: {
								cryptocurrency: signal.cryptocurrency,
								signalType: signal.signalType,
								timeframe: signal.timeframe,
								price: signal.price,
								confidence: signal.confidence,
								timestamp: new Date().toISOString(),
								message: `🚨 MANUAL ${signal.signalType.toUpperCase()} ${signal.cryptocurrency} (${signal.timeframe}) - $${signal.price?.toFixed(2) || 'N/A'} - ${(signal.confidence * 100).toFixed(1)}% confidence`
							}
						});
					}
					break;

				case 'get_stats':
					try {
						if (!this.signalGenerator) {
							throw new Error('Signal generator not initialized');
						}
						const stats = this.signalGenerator.getSignalStats();
						ws.send(JSON.stringify({
							type: 'stats_response',
							data: stats,
							requestId
						}));
					} catch (error) {
						console.error('Error getting stats:', error);
						ws.send(JSON.stringify({
							type: 'stats_response',
							data: {
								total_signals: 0,
								avg_profit_loss: 0,
								profitable_signals: 0,
								losing_signals: 0,
								recent_signals: [],
								cache_stats: {},
								is_running: false
							},
							requestId
						}));
					}
					break;

				case 'get_analytics':
					const analytics = await this.getAnalyticsData();
					ws.send(JSON.stringify({
						type: 'analytics_response',
						data: analytics,
						requestId
					}));
					break;

				case 'get_signals_chart':
					const chartData = await this.getSignalsChartData();
					ws.send(JSON.stringify({
						type: 'signals_chart_response',
						data: chartData,
						requestId
					}));
					break;

				case 'start_signal_generator':
					await this.signalGenerator.start();
					ws.send(JSON.stringify({
						type: 'signal_generator_response',
						data: { success: true, message: 'Signal generator started' },
						requestId
					}));
					break;

				case 'stop_signal_generator':
					this.signalGenerator.stop();
					ws.send(JSON.stringify({
						type: 'signal_generator_response',
						data: { success: true, message: 'Signal generator stopped' },
						requestId
					}));
					break;

				case 'get_signal_generator_status':
					const generatorStats = this.signalGenerator.getSignalStats();
					ws.send(JSON.stringify({
						type: 'signal_generator_status_response',
						data: {
							isRunning: generatorStats.is_running,
							stats: generatorStats
						},
						requestId
					}));
					break;

				case 'ping':
					ws.send(JSON.stringify({
						type: 'pong_response',
						data: { timestamp: new Date().toISOString() },
						requestId
					}));
					break;

				case 'get_paper_trading_accounts':
					console.log('🔍 [SERVER] Handling get_paper_trading_accounts request');
					// Get all accounts for all users
					const allAccounts = [];
					try {
						const user1Accounts = await this.paperTradingService.getUserAccounts('user1');
						const user2Accounts = await this.paperTradingService.getUserAccounts('user2');
						allAccounts.push(...user1Accounts, ...user2Accounts);
						console.log('✅ [SERVER] Found', allAccounts.length, 'accounts');
					} catch (error) {
						console.error('❌ [SERVER] Error fetching paper trading accounts:', error);
					}
					const response = {
						type: 'paper_trading_accounts_response',
						data: allAccounts,
						requestId
					};
					console.log('📤 [SERVER] Sending response:', response.type);
					ws.send(JSON.stringify(response));
					break;

				case 'get_paper_trading_positions':
					console.log('🔍 [SERVER] Handling get_paper_trading_positions request');
					const { accountId } = payload;
					let positions = [];
					try {
						if (accountId) {
							const accountPositions = await this.paperTradingService.getPositions(accountId);
							positions = accountPositions || [];
						} else {
							// Get positions for all accounts
							const allAccounts = [];
							const user1Accounts = await this.paperTradingService.getUserAccounts('user1');
							const user2Accounts = await this.paperTradingService.getUserAccounts('user2');
							allAccounts.push(...user1Accounts, ...user2Accounts);

							for (const account of allAccounts) {
								const accountPositions = await this.paperTradingService.getPositions(account.id);
								if (accountPositions && Array.isArray(accountPositions)) {
									positions.push(...accountPositions);
								}
							}
						}
						console.log('✅ [SERVER] Found', positions.length, 'positions');
					} catch (error) {
						console.error('❌ [SERVER] Error fetching paper trading positions:', error);
						positions = [];
					}
					const positionsResponse = {
						type: 'paper_trading_positions_response',
						data: positions,
						requestId
					};
					console.log('📤 [SERVER] Sending response:', positionsResponse.type);
					ws.send(JSON.stringify(positionsResponse));
					break;

				case 'get_paper_trading_orders':
					const { accountId: orderAccountId, limit: orderLimit } = payload;
					let orders = [];
					try {
						if (orderAccountId) {
							// Get orders for specific account
							const accountOrders = await this.paperTradingService.getOrders(orderAccountId, orderLimit);
							orders = accountOrders || [];
						} else {
							// Get all orders directly from database
							const allOrders = this.db.getPaperTradingOrders(null, orderLimit);
							orders = allOrders || [];

							// Sort orders by creation date (newest first)
							orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
						}
					} catch (error) {
						console.error('Error fetching paper trading orders:', error);
						orders = [];
					}
					ws.send(JSON.stringify({
						type: 'paper_trading_orders_response',
						data: orders,
						requestId
					}));
					break;

				case 'create_paper_trading_order':
					const { orderData } = payload;
					const orderResult = await this.paperTradingService.executeOrder(orderData);
					ws.send(JSON.stringify({
						type: 'paper_trading_order_response',
						data: orderResult,
						requestId
					}));
					break;

				case 'get_user_setting':
					const { userId: settingUserId, settingKey } = payload;
					try {
						console.log(`🔍 [SERVER] Getting user setting: userId=${settingUserId}, settingKey=${settingKey}`);
						const settingValue = await this.paperTradingService.getUserSetting(settingUserId, settingKey);
						console.log(`🔍 [SERVER] User setting value: ${settingValue}`);
						ws.send(JSON.stringify({
							type: 'user_setting_response',
							data: { settingKey, settingValue },
							requestId
						}));
					} catch (error) {
						console.error('Error getting user setting:', error);
						ws.send(JSON.stringify({
							type: 'error',
							data: { message: 'Error getting user setting' },
							requestId
						}));
					}
					break;

				case 'set_user_setting':
					const { userId: setSettingUserId, settingKey: setSettingKey, settingValue } = payload;
					try {
						await this.paperTradingService.setUserSetting(setSettingUserId, setSettingKey, settingValue);
						ws.send(JSON.stringify({
							type: 'user_setting_updated_response',
							data: { settingKey: setSettingKey, settingValue },
							requestId
						}));
					} catch (error) {
						console.error('Error setting user setting:', error);
						ws.send(JSON.stringify({
							type: 'error',
							data: { message: 'Error setting user setting' },
							requestId
						}));
					}
					break;

				case 'broadcast':
					// Allow clients to broadcast messages to all connected clients
					const { message: broadcastMessage } = payload;
					if (broadcastMessage && broadcastMessage.type) {
						this.broadcast(broadcastMessage);
					}
					break;

				case 'get_market_data':
					const { symbol: marketSymbol, timeframe: marketTimeframe } = payload;
					try {
						if (!this.signalGenerator || !this.signalGenerator.binance) {
							throw new Error('Binance service not available');
						}
						const marketData = await this.signalGenerator.binance.getMarketData(marketSymbol, marketTimeframe);
						ws.send(JSON.stringify({
							type: 'market_data_response',
							data: marketData,
							requestId
						}));
					} catch (error) {
						console.error('Error fetching market data:', error);
						// Send fallback data instead of error
						const fallbackData = {
							symbol: marketSymbol,
							timeframe: marketTimeframe,
							currentPrice: 0,
							ohlcv: [],
							ticker_24hr: {},
							technical_indicators: {},
							full_indicators: {},
							timestamp: Date.now()
						};
						ws.send(JSON.stringify({
							type: 'market_data_response',
							data: fallbackData,
							requestId
						}));
					}
					break;

				default:
					ws.send(JSON.stringify({
						type: 'error',
						data: {
							message: `Unknown message type: ${type}`,
							timestamp: new Date().toISOString()
						},
						requestId
					}));
			}
		} catch (error) {
			console.error(`Error handling ${type}:`, error);
			ws.send(JSON.stringify({
				type: 'error',
				data: {
					message: error.message,
					timestamp: new Date().toISOString()
				},
				requestId
			}));
		}
	}

	// Get analytics data
	async getAnalyticsData() {
		const signals = this.db.getSignals(1000); // Use getSignals instead of getAllSignals

		// Calculate performance by cryptocurrency
		const cryptoStats = {};
		const timeframeStats = {};
		const signalTypes = { buy: 0, sell: 0, hold: 0 };
		const monthlyData = {};

		signals.forEach(signal => {
			// Count by cryptocurrency
			if (!cryptoStats[signal.cryptocurrency]) {
				cryptoStats[signal.cryptocurrency] = { total: 0, successful: 0 };
			}
			cryptoStats[signal.cryptocurrency].total++;
			if (signal.status === 'completed' && signal.profit_loss > 0) {
				cryptoStats[signal.cryptocurrency].successful++;
			}

			// Count by timeframe
			if (!timeframeStats[signal.timeframe]) {
				timeframeStats[signal.timeframe] = { total: 0, successful: 0 };
			}
			timeframeStats[signal.timeframe].total++;
			if (signal.status === 'completed' && signal.profit_loss > 0) {
				timeframeStats[signal.timeframe].successful++;
			}

			// Count signal types
			signalTypes[signal.signalType] = (signalTypes[signal.signalType] || 0) + 1;

			// Monthly performance
			let month;
			try {
				if (!signal.createdAt) {
					month = 'Unknown';
				} else {
					const signalDate = new Date(signal.createdAt);
					if (isNaN(signalDate.getTime())) {
						month = 'Unknown';
					} else {
						month = signalDate.toLocaleString('en-US', { month: 'short' });
					}
				}
			} catch (error) {
				month = 'Unknown';
			}
			if (!monthlyData[month]) {
				monthlyData[month] = { profitLoss: 0, count: 0 };
			}
			monthlyData[month].profitLoss += signal.profit_loss || 0;
			monthlyData[month].count++;
		});

		// Calculate success rates
		const performanceByCrypto = Object.entries(cryptoStats).map(([crypto, stats]) => ({
			cryptocurrency: crypto,
			totalSignals: stats.total,
			successfulSignals: stats.successful,
			successRate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0
		}));

		const performanceByTimeframe = Object.entries(timeframeStats).map(([timeframe, stats]) => ({
			timeframe: timeframe,
			totalSignals: stats.total,
			successfulSignals: stats.successful,
			successRate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0
		}));

		const signalDistribution = Object.entries(signalTypes).map(([type, count]) => ({
			type: type,
			count: count,
			percentage: signals.length > 0 ? (count / signals.length) * 100 : 0
		}));

		const monthlyPerformance = Object.entries(monthlyData).map(([month, data]) => ({
			month: month,
			profitLoss: data.profitLoss,
			signalCount: data.count,
			avgProfitLoss: data.count > 0 ? data.profitLoss / data.count : 0
		}));

		const totalSignals = signals.length;
		const successfulSignals = signals.filter(s => s.status === 'completed' && s.profit_loss > 0).length;
		const successRate = totalSignals > 0 ? (successfulSignals / totalSignals) * 100 : 0;
		const avgProfitLoss = signals.length > 0 ? signals.reduce((sum, s) => sum + (s.profit_loss || 0), 0) / signals.length : 0;

		const bestPerformer = performanceByCrypto.length > 0 ?
			performanceByCrypto.reduce((best, current) =>
				current.successRate > best.successRate ? current : best
			).cryptocurrency : 'N/A';

		return {
			performanceByCrypto,
			performanceByTimeframe,
			signalDistribution,
			monthlyPerformance,
			totalSignals,
			successRate,
			avgProfitLoss,
			bestPerformer,
			topCryptos: performanceByCrypto.slice(0, 3),
			optimalTimeframes: performanceByTimeframe.slice(0, 3)
		};
	}

	// Get signals chart data
	async getSignalsChartData() {
		const signals = this.db.getSignals(1000); // Use getSignals instead of getAllSignals

		// Group signals by date
		const dailyData = {};

		signals.forEach(signal => {
			// Handle invalid dates safely
			let date;
			try {
				// Check if createdAt exists and is not null/undefined
				if (!signal.createdAt) {
					return;
				}

				const signalDate = new Date(signal.createdAt);
				if (isNaN(signalDate.getTime())) {
					// Invalid date, skip this signal
					return;
				}
				date = signalDate.toISOString().split('T')[0];
			} catch (error) {
				// Invalid date, skip this signal
				return;
			}

			if (!dailyData[date]) {
				dailyData[date] = {
					date: date,
					signals: 0,
					profitable: 0,
					losing: 0
				};
			}

			dailyData[date].signals++;

			if (signal.status === 'completed') {
				if (signal.profit_loss > 0) {
					dailyData[date].profitable++;
				} else if (signal.profit_loss < 0) {
					dailyData[date].losing++;
				}
			}
		});

		// Convert to array and sort by date
		const chartData = Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date));

		return chartData;
	}

	// Broadcast message to all connected clients
	broadcast(message) {
		console.log(`Broadcasting WebSocket message: ${message.type}`, message.data);
		this.clients.forEach(client => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(message));
			}
		});
		console.log(`Message sent to ${this.clients.size} clients`);
	}

	// Broadcast signal generated after successful database save
	broadcastSignalGenerated(signal) {
		this.broadcast({
			type: 'signal_generated',
			data: {
				cryptocurrency: signal.cryptocurrency,
				signalType: signal.signalType,
				timeframe: signal.timeframe,
				price: signal.price,
				confidence: signal.confidence,
				timestamp: new Date().toISOString(),
				message: `🚨 ${signal.signalType.toUpperCase()} ${signal.cryptocurrency} (${signal.timeframe}) - $${signal.price?.toFixed(2) || 'N/A'} - ${(signal.confidence * 100).toFixed(1)}% confidence`
			}
		});
	}

	// Start server
	async start() {
		try {
			// Set global server instance early so services can access it
			global.serverInstance = this;

			this.initMiddleware();
			await this.initServices();
			this.setupRoutes();
			this.setupErrorHandling();

			this.server = this.app.listen(this.port, () => {
				console.log(`🚀 Crypto Signal Bot server running on port ${this.port}`);
				console.log(`📊 API available at http://localhost:${this.port}/api`);
				console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
			});

			// Initialize WebSocket after server starts
			this.initWebSocket();
		} catch (error) {
			console.error('Failed to start server:', error);
			// Don't call process.exit in tests
			if (process.env.NODE_ENV !== 'test') {
				process.exit(1);
			}
			throw error;
		}
	}

	// Graceful shutdown
	async shutdown() {
		console.log('Shutting down server...');

		if (this.signalGenerator) {
			this.signalGenerator.stop();
		}

		if (this.telegramBot) {
			this.telegramBot.stop();
		}

		if (this.db) {
			this.db.close();
		}

		// Don't call process.exit in tests
		if (process.env.NODE_ENV !== 'test') {
			process.exit(0);
		}
	}
}

// Start server only if not in test environment
let server;
if (process.env.NODE_ENV !== 'test') {
	server = new CryptoBotServer();
	server.start();
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
	if (server) {
		server.shutdown();
	}
});

process.on('SIGINT', () => {
	if (server) {
		server.shutdown();
	}
});

module.exports = CryptoBotServer;
