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
			// Initialize database
			await this.db.init();
			console.log('Database initialized successfully');

			// Initialize signal generator
			this.signalGenerator = new SignalGenerator({
				telegramToken: process.env.TELEGRAM_BOT_TOKEN,
				binance: {
					apiKey: process.env.BINANCE_API_KEY,
					apiSecret: process.env.BINANCE_API_SECRET
				},
				openai: {
					apiKey: process.env.OPENAI_API_KEY
				}
			});

			// Initialize paper trading service
			this.paperTradingService = new PaperTradingService({ db: this.db });

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
					const { key, value } = payload;
					if (key === 'cryptocurrencies' && this.signalGenerator) {
						// For cryptocurrencies, save directly to database without validation
						this.db.setConfig(key, value);

						// Emit config_updated with the saved data for frontend refresh
						if (global.serverInstance && global.serverInstance.broadcast) {
							global.serverInstance.broadcast({
								type: 'config_updated',
								data: {
									key: key,
									value: value,
									timestamp: new Date().toISOString(),
									message: `⚙️ Configuration updated: ${key}`
								}
							});
						}
					} else {
						// Save to database first
						this.db.setConfig(key, value);

						// Get the saved value from database to ensure consistency
						const savedValue = this.db.getConfig(key);

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
					}
					ws.send(JSON.stringify({
						type: 'config_updated_response',
						data: { success: true, message: 'Configuration updated' },
						requestId
					}));
					break;

				case 'get_signals':
					const { limit = 50, offset = 0 } = payload || {};
					const signals = this.db.getSignals(limit, offset);
					ws.send(JSON.stringify({
						type: 'signals_response',
						data: signals,
						requestId
					}));
					break;

				case 'generate_signal':
					const { cryptocurrency, timeframe } = payload;
					const signal = await this.signalGenerator.generateManualSignal(cryptocurrency, timeframe);
					ws.send(JSON.stringify({
						type: 'signal_generated_response',
						data: signal,
						requestId
					}));
					break;

				case 'get_stats':
					const stats = this.signalGenerator.getSignalStats();
					ws.send(JSON.stringify({
						type: 'stats_response',
						data: stats,
						requestId
					}));
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
					// Get all accounts for all users
					const allAccounts = [];
					try {
						const user1Accounts = await this.paperTradingService.getUserAccounts('user1');
						const user2Accounts = await this.paperTradingService.getUserAccounts('user2');
						allAccounts.push(...user1Accounts, ...user2Accounts);
					} catch (error) {
						console.error('Error fetching paper trading accounts:', error);
					}
					ws.send(JSON.stringify({
						type: 'paper_trading_accounts_response',
						data: allAccounts,
						requestId
					}));
					break;

				case 'get_paper_trading_positions':
					const { accountId } = payload;
					const positions = this.paperTradingService.getPositions(accountId || 'default');
					ws.send(JSON.stringify({
						type: 'paper_trading_positions_response',
						data: positions,
						requestId
					}));
					break;

				case 'get_paper_trading_orders':
					const { accountId: orderAccountId, limit: orderLimit } = payload;
					const orders = this.paperTradingService.getOrders(orderAccountId || 'default', orderLimit);
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
						ws.send(JSON.stringify({
							type: 'error',
							data: {
								message: `Failed to fetch market data for ${marketSymbol}`,
								timestamp: new Date().toISOString()
							},
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
		const signals = this.db.getAllSignals();

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
			signalTypes[signal.signal_type] = (signalTypes[signal.signal_type] || 0) + 1;

			// Monthly performance
			const month = new Date(signal.created_at).toLocaleString('en-US', { month: 'short' });
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
		const signals = this.db.getAllSignals();

		// Group signals by date
		const dailyData = {};

		signals.forEach(signal => {
			const date = new Date(signal.created_at).toISOString().split('T')[0];

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

	// Start server
	async start() {
		try {
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
			process.exit(1);
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

		process.exit(0);
	}
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
	server.shutdown();
});

process.on('SIGINT', () => {
	server.shutdown();
});

// Start server
const server = new CryptoBotServer();
global.serverInstance = server;
server.start();

module.exports = CryptoBotServer;
