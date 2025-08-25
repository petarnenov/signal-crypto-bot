const BinanceService = require('./binance-service');
const OpenAIService = require('./openai-service');
const CryptoSignalBot = require('./telegram-bot');
const CryptoBotDatabase = require('../database/db');
const PaperTradingService = require('./paper-trading-service');

class SignalGenerator {
	constructor(options = {}) {
		// Configure Binance service with sandbox mode
		const binanceOptions = {
			...options.binance,
			useSandbox: true // Enable sandbox mode for paper trading
		};

		this.binance = new BinanceService(binanceOptions);
		this.openai = new OpenAIService(process.env.OPENAI_API_KEY, options.openai);
		this.telegramBot = options.telegramToken ? new CryptoSignalBot(options.telegramToken, options.telegram) : null;
		this.db = options.db || new CryptoBotDatabase();

		// Initialize Paper Trading Service with sandbox Binance
		this.paperTradingService = new PaperTradingService({
			db: this.db,
			binance: binanceOptions,
			openai: options.openai
		});

		// Ensure test accounts exist (async)
		setTimeout(() => {
			this.ensurePaperTradingAccounts();
		}, 1000);

		this.isRunning = false;
		this.analysisInterval = null;
		this.lastSignalTime = new Map(); // Track last signal time per crypto
		this.currentAnalysis = null; // Track current analysis to stop it
		this.stopRequested = false; // Flag to stop current analysis
	}

	// Start signal generation
	async start() {
		if (this.isRunning) {
			console.log('Signal generator is already running');
			return;
		}

		console.log('Starting Signal Generator...');

		// Test connections
		await this.testConnections();

		this.isRunning = true;
		this.stopRequested = false; // Reset stop flag when starting

		// Start periodic analysis
		const interval = this.db.getConfig('analysis_interval') || 300000; // 5 minutes default
		this.analysisInterval = setInterval(() => {
			this.runAnalysis();
		}, interval);

		console.log(`Signal generator started. Analysis interval: ${interval / 1000}s`);

		// Emit WebSocket notification for signal generator started
		if (global.serverInstance && global.serverInstance.broadcast) {
			global.serverInstance.broadcast({
				type: 'signal_generator_started',
				data: {
					timestamp: new Date().toISOString(),
					message: '🚀 Signal generator started successfully'
				}
			});
		}
	}

	// Stop signal generation
	stop() {
		if (!this.isRunning) {
			console.log('Signal generator is not running');
			return;
		}

		console.log('Stopping Signal Generator...');

		this.isRunning = false;
		this.stopRequested = true;

		// Clear the interval for future analyses
		if (this.analysisInterval) {
			clearInterval(this.analysisInterval);
			this.analysisInterval = null;
		}

		// Stop current analysis if running
		if (this.currentAnalysis) {
			console.log('Stopping current analysis...');
			// The current analysis will check stopRequested flag and exit
		}

		console.log('Signal generator stopped');

		// Emit WebSocket notification for signal generator stopped
		if (global.serverInstance && global.serverInstance.broadcast) {
			global.serverInstance.broadcast({
				type: 'signal_generator_stopped',
				data: {
					timestamp: new Date().toISOString(),
					message: '🛑 Signal generator stopped by user request'
				}
			});
		}
	}

	// Test all connections
	async testConnections() {
		console.log('Testing connections...');

		// Test Binance
		const binanceConnected = await this.binance.testConnection();
		if (!binanceConnected) {
			throw new Error('Binance API connection failed');
		}

		// Test OpenAI
		const openaiConnected = await this.openai.testConnection();
		if (!openaiConnected) {
			throw new Error('OpenAI API connection failed');
		}

		// Test Database
		try {
			this.db.getConfig('test');
			console.log('Database connection successful');
		} catch (error) {
			throw new Error('Database connection failed');
		}

		console.log('All connections successful');
	}

	// Run analysis for all configured cryptocurrencies
	async runAnalysis() {
		if (!this.isRunning) return;

		// Reset stop flag for new analysis cycle
		this.stopRequested = false;
		this.currentAnalysis = true;

		try {
			const cryptocurrencies = this.db.getConfig('cryptocurrencies') || ['BTCUSDT', 'ETHUSDT'];
			const timeframes = this.db.getConfig('timeframes') || ['1h', '4h'];

			// Validate cryptocurrencies for use without overwriting database
			const validatedCryptocurrencies = await this.validateCryptocurrenciesForUse(cryptocurrencies);

			console.log(`Running analysis for ${validatedCryptocurrencies.length} cryptocurrencies...`);

			for (const crypto of validatedCryptocurrencies) {
				// Check if stop was requested
				if (this.stopRequested) {
					console.log('Analysis stopped by user request');
					break;
				}

				for (const timeframe of timeframes) {
					// Check if stop was requested
					if (this.stopRequested) {
						console.log('Analysis stopped by user request');
						break;
					}

					try {
						await this.analyzeCryptocurrency(crypto, timeframe);

						// Rate limiting - wait between analyses
						await this.sleep(1000);
					} catch (error) {
						console.error(`Error analyzing ${crypto} (${timeframe}):`, error);

						// Emit WebSocket notification for analysis error
						if (global.serverInstance && global.serverInstance.broadcast) {
							global.serverInstance.broadcast({
								type: 'ai_error',
								data: {
									cryptocurrency: crypto,
									timeframe: timeframe,
									error: error.message,
									timestamp: new Date().toISOString(),
									message: `❌ Error analyzing ${crypto} (${timeframe}): ${error.message}`
								}
							});
						}
					}
				}
			}

			console.log('Analysis cycle completed');
		} catch (error) {
			console.error('Error in analysis cycle:', error);
		} finally {
			this.currentAnalysis = null;
		}
	}

	// Analyze single cryptocurrency
	async analyzeCryptocurrency(cryptocurrency, timeframe) {
		try {
			console.log(`Analyzing ${cryptocurrency} (${timeframe})...`);

			// Check if stop was requested
			if (this.stopRequested) {
				console.log(`Analysis stopped for ${cryptocurrency} (${timeframe})`);
				return;
			}

			// Validate cryptocurrency symbol
			if (!cryptocurrency.endsWith('USDT')) {
				throw new Error(`Invalid cryptocurrency symbol: ${cryptocurrency}. Must end with USDT`);
			}

			// Check rate limiting
			if (!this.shouldGenerateSignal(cryptocurrency, timeframe)) {
				console.log(`Rate limit reached for ${cryptocurrency} (${timeframe})`);
				return;
			}

			// Get market data from Binance
			console.log(`Fetching market data for ${cryptocurrency}...`);
			const marketData = await this.binance.getMarketData(cryptocurrency, timeframe);
			console.log(`Market data received for ${cryptocurrency}:`, {
				current_price: marketData.currentPrice,
				has_ohlcv: !!marketData.ohlcv,
				has_indicators: !!marketData.technical_indicators
			});

			// Prepare data for AI analysis
			const analysisData = this.prepareAnalysisData(marketData);
			console.log(`Analysis data prepared for ${cryptocurrency}`);

			// Generate signal using OpenAI
			console.log(`Generating AI signal for ${cryptocurrency}...`);
			const signal = await this.openai.generateSignal(
				cryptocurrency,
				timeframe,
				analysisData.marketData,
				analysisData.technicalIndicators
			);

			if (signal) {
				// Convert NEUTRAL signals to HOLD for database compatibility
				if (signal.signalType && signal.signalType.toLowerCase() === 'neutral') {
					signal.signalType = 'hold';
					console.log(`Converted NEUTRAL signal to HOLD for ${cryptocurrency}`);
				}

				// Send signal to Telegram
				if (this.telegramBot) {
					await this.telegramBot.sendSignal(signal);
				}

				// Execute signal in Paper Trading
				try {
					await this.executeSignalInPaperTrading(signal);
				} catch (error) {
					console.error('Error executing signal in Paper Trading:', error);
				}

				// Update last signal time
				this.updateLastSignalTime(cryptocurrency, timeframe);

				// Emit WebSocket notification for signal generated
				if (global.serverInstance && global.serverInstance.broadcast) {
					global.serverInstance.broadcast({
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

				console.log(`Signal generated and sent: ${cryptocurrency} ${signal.signalType.toUpperCase()} (${timeframe})`);
			} else {
				console.log(`No signal generated for ${cryptocurrency} (${timeframe}) - confidence below threshold`);
			}

		} catch (error) {
			console.error(`Error analyzing ${cryptocurrency} (${timeframe}):`, error);
			throw error;
		}
	}

	// Prepare data for AI analysis
	prepareAnalysisData(marketData) {
		const { ohlcv, technical_indicators, ticker_24hr } = marketData;

		// Prepare market data for AI
		const marketDataForAI = {
			symbol: marketData.symbol,
			timeframe: marketData.timeframe,
			currentPrice: marketData.currentPrice,
			ohlcv: ohlcv,
			indicators: technical_indicators
		};

		// Prepare technical indicators for AI
		const technicalIndicatorsForAI = {
			sma_20: technical_indicators.sma_20,
			sma_50: technical_indicators.sma_50,
			rsi: technical_indicators.rsi,
			macd: technical_indicators.macd,
			bollinger_bands: technical_indicators.bollinger_bands,
			stochastic: technical_indicators.stochastic
		};

		return {
			marketData: marketDataForAI,
			technicalIndicators: technicalIndicatorsForAI
		};
	}

	// Check if should generate signal (rate limiting)
	shouldGenerateSignal(cryptocurrency, timeframe) {
		const key = `${cryptocurrency}_${timeframe}`;
		const lastTime = this.lastSignalTime.get(key);
		const maxSignalsPerHour = this.db.getConfig('max_signals_per_hour') || 10;
		const minInterval = 3600000 / maxSignalsPerHour; // Convert to milliseconds

		if (!lastTime) return true;

		const timeSinceLastSignal = Date.now() - lastTime;
		return timeSinceLastSignal >= minInterval;
	}

	// Update last signal time
	updateLastSignalTime(cryptocurrency, timeframe) {
		const key = `${cryptocurrency}_${timeframe}`;
		this.lastSignalTime.set(key, Date.now());
	}

	// Manual signal generation
	async generateManualSignal(cryptocurrency, timeframe) {
		try {
			console.log(`Generating manual signal for ${cryptocurrency} (${timeframe})...`);

			// Check if stop was requested
			if (this.stopRequested) {
				console.log(`Manual signal generation stopped for ${cryptocurrency} (${timeframe})`);
				return { message: 'Signal generation stopped by user request' };
			}

			// Validate cryptocurrency symbol
			if (!cryptocurrency.endsWith('USDT')) {
				throw new Error(`Invalid cryptocurrency symbol: ${cryptocurrency}. Must end with USDT`);
			}

			// Emit WebSocket notification for AI request
			if (global.serverInstance && global.serverInstance.broadcast) {
				global.serverInstance.broadcast({
					type: 'ai_request',
					data: {
						cryptocurrency,
						timeframe,
						timestamp: new Date().toISOString(),
						message: `🤖 AI analyzing ${cryptocurrency} (${timeframe}) for buy/sell decision...`
					}
				});
			}

			// Get market data from Binance
			console.log(`Fetching market data for ${cryptocurrency}...`);
			const marketData = await this.binance.getMarketData(cryptocurrency, timeframe);
			console.log(`Market data received for ${cryptocurrency}:`, {
				current_price: marketData.currentPrice,
				has_ohlcv: !!marketData.ohlcv,
				has_indicators: !!marketData.technical_indicators
			});

			// Prepare data for AI analysis
			const analysisData = this.prepareAnalysisData(marketData);
			console.log(`Analysis data prepared for ${cryptocurrency}`);

			// Generate signal using OpenAI
			console.log(`Generating AI signal for ${cryptocurrency}...`);
			const signal = await this.openai.generateSignal(
				cryptocurrency,
				timeframe,
				analysisData.marketData,
				analysisData.technicalIndicators
			);

			if (signal) {
				console.log(`Signal generated: ${cryptocurrency} ${signal.signalType.toUpperCase()} (${timeframe})`);

				// Execute signal in Paper Trading
				try {
					await this.executeSignalInPaperTrading(signal);
				} catch (error) {
					console.error('Error executing signal in Paper Trading:', error);
				}

				// Emit WebSocket notification for AI response
				if (global.serverInstance && global.serverInstance.broadcast) {
					global.serverInstance.broadcast({
						type: 'ai_response',
						data: {
							cryptocurrency,
							timeframe,
							signalType: signal.signalType,
							confidence: signal.confidence,
							timestamp: new Date().toISOString(),
							message: `✅ AI decision: ${cryptocurrency} ${cryptocurrency} ${signal.signalType.toUpperCase()} (${timeframe}) - ${(signal.confidence * 100).toFixed(1)}% confidence`
						}
					});
				}

				// Emit WebSocket notification for manual signal generated
				if (global.serverInstance && global.serverInstance.broadcast) {
					global.serverInstance.broadcast({
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

				return signal;
			} else {
				console.log(`No signal generated for ${cryptocurrency} (${timeframe}) - confidence below threshold`);

				// Emit WebSocket notification for no signal
				if (global.serverInstance && global.serverInstance.broadcast) {
					global.serverInstance.broadcast({
						type: 'ai_no_signal',
						data: {
							cryptocurrency,
							timeframe,
							timestamp: new Date().toISOString(),
							message: `⚠️ No AI signal for ${cryptocurrency} (${timeframe}) - confidence below threshold`
						}
					});
				}

				return { message: 'No signal generated - confidence below threshold' };
			}
		} catch (error) {
			console.error('Error generating manual signal:', error);

			// Emit WebSocket notification for AI error
			if (global.serverInstance && global.serverInstance.broadcast) {
				global.serverInstance.broadcast({
					type: 'ai_error',
					data: {
						cryptocurrency,
						timeframe,
						error: error.message,
						timestamp: new Date().toISOString(),
						message: `❌ AI error analyzing ${cryptocurrency} (${timeframe}): ${error.message}`
					}
				});
			}

			throw error;
		}
	}

	// Get signal statistics
	getSignalStats() {
		try {
			const allSignals = this.db.getSignals(1000); // Get all signals for stats
			const recentSignals = this.db.getSignals(10);

			// Calculate stats from signals table
			const totalSignals = allSignals.length;
			const buySignals = allSignals.filter(s => s.signalType === 'buy').length;
			const sellSignals = allSignals.filter(s => s.signalType === 'sell').length;
			const holdSignals = allSignals.filter(s => s.signalType === 'hold').length;

			return {
				total_signals: totalSignals,
				avg_profit_loss: 0, // Will be calculated when performance metrics are available
				profitable_signals: buySignals, // For now, count buy signals as potentially profitable
				losing_signals: sellSignals, // For now, count sell signals as potentially losing
				recent_signals: recentSignals,
				cache_stats: this.binance.getCacheStats(),
				is_running: this.isRunning
			};
		} catch (error) {
			console.error('Error getting signal stats:', error);
			throw error;
		}
	}

	// Execute signal in Paper Trading
	async executeSignalInPaperTrading(signal) {
		try {
			// Convert NEUTRAL signals to HOLD for database compatibility
			if (signal.signalType && signal.signalType.toLowerCase() === 'neutral') {
				signal.signalType = 'hold';
				console.log(`Converted NEUTRAL signal to HOLD for ${signal.cryptocurrency}`);
			}

			console.log(`🔄 [PAPER TRADING] Starting execution for signal: ${signal.signalType.toUpperCase()} ${signal.cryptocurrency}`);
			console.log(`📊 [PAPER TRADING] Signal details:`, signal);

			// Only execute BUY and SELL signals, skip HOLD signals
			if (signal.signalType.toLowerCase() === 'hold') {
				console.log(`⏸️ [PAPER TRADING] Skipping HOLD signal for ${signal.cryptocurrency}`);
				return { success: true, message: 'HOLD signal skipped' };
			}

			// Get all paper trading accounts
			const accounts = await this.paperTradingService.getAllAccounts();
			console.log(`🔍 [PAPER TRADING] Fetching paper trading accounts...`);
			console.log(`📋 [PAPER TRADING] Found ${accounts.length} accounts:`, accounts);

			// Execute signal for each account
			for (const account of accounts) {
				try {
					console.log(`💰 [PAPER TRADING] Account ${account.id} balance: $${account.balance}, required: $${(account.balance * 0.25).toFixed(2)}`);

					// Calculate order quantity based on account balance and signal
					const quantity = await this.calculateOrderQuantity(account, signal);

					// Check if quantity is valid (greater than 0)
					if (quantity <= 0) {
						console.log(`⚠️ [PAPER TRADING] Insufficient balance for account ${account.id}`);
						return { success: false, error: 'Insufficient balance' };
					}

					// Get current price for the order
					const currentPrice = await this.binance.getCurrentPrice(signal.cryptocurrency);
					console.log(`🚀 [PAPER TRADING] Executing order for account ${account.id}: ${signal.signalType.toUpperCase()} ${quantity} ${signal.cryptocurrency} @ $${currentPrice}`);

					// Place market order
					await this.paperTradingService.placeMarketOrder(
						account.id,
						signal.cryptocurrency,
						signal.signalType.toUpperCase(),
						quantity,
						currentPrice
					);

				} catch (error) {
					console.error(`Error executing signal for account ${account.id}:`, error);
					if (error.message.includes('Insufficient balance')) {
						return { success: false, error: 'Insufficient balance' };
					}
				}
			}

		} catch (error) {
			console.error('Error executing signal in paper trading:', error);
			return { success: false, error: error.message };
		}

		return { success: true, message: 'Signal executed successfully' };
	}

	// Ensure Paper Trading accounts exist
	async ensurePaperTradingAccounts() {
		try {
			console.log('🔧 Ensuring Paper Trading accounts exist...');

			// Check if user1 has accounts
			const user1Accounts = await this.paperTradingService.getUserAccounts('user1');
			const user2Accounts = await this.paperTradingService.getUserAccounts('user2');

			if (user1Accounts.length === 0) {
				console.log('📝 Creating test Paper Trading account for user1...');
				await this.paperTradingService.createTestAccount('user1', 1000, 'USDT');
			} else {
				console.log(`✅ Found ${user1Accounts.length} existing accounts for user1`);
			}

			if (user2Accounts.length === 0) {
				console.log('📝 Creating test Paper Trading account for user2...');
				await this.paperTradingService.createTestAccount('user2', 1000, 'USDT');
			} else {
				console.log(`✅ Found ${user2Accounts.length} existing accounts for user2`);
			}

			const totalAccounts = user1Accounts.length + user2Accounts.length;
			console.log(`✅ Total Paper Trading accounts: ${totalAccounts}`);
		} catch (error) {
			console.error('❌ Error ensuring Paper Trading accounts:', error);
		}
	}

	// Calculate order quantity based on account balance and signal
	async calculateOrderQuantity(account, signal) {
		const balance = account.balance || 1000; // Default balance if not set
		const commission = 0.001; // 0.1% commission
		const maxAmount = balance * 0.25; // Use 25% of balance per trade

		// Get current price if signal price is null
		let price = signal.price;
		if (!price) {
			try {
				price = await this.binance.getCurrentPrice(signal.cryptocurrency);
				console.log(`💰 [PAPER TRADING] Got current price for ${signal.cryptocurrency}: $${price}`);
			} catch (error) {
				console.error(`❌ [PAPER TRADING] Error getting current price for ${signal.cryptocurrency}:`, error);
				return 0; // Return 0 if we can't get the price
			}
		}

		// Calculate quantity considering commission
		// totalCost = quantity * price + quantity * price * commission
		// totalCost = quantity * price * (1 + commission)
		// quantity = maxAmount / (price * (1 + commission))
		const quantity = maxAmount / (price * (1 + commission));

		return Math.round(quantity * 1000000) / 1000000; // Round to 6 decimal places
	}

	// Update configuration
	async updateConfig(key, value) {
		try {
			// For cryptocurrencies, validate and save only valid symbols to database
			if (key === 'cryptocurrencies') {
				const validatedValue = await this.validateCryptocurrencies(value);
				console.log(`Configuration validation successful: ${key} = ${JSON.stringify(validatedValue)}`);
				// Save only validated symbols to database as JSON string
				this.db.setConfig(key, JSON.stringify(validatedValue));
				console.log(`Configuration updated with validated symbols: ${key} = ${JSON.stringify(validatedValue)}`);
				return validatedValue;
			} else {
				// For other config keys, save normally
				this.db.setConfig(key, value);
				console.log(`Configuration updated: ${key} = ${JSON.stringify(value)}`);
			}

			// Restart if analysis interval changed
			if (key === 'analysis_interval' && this.isRunning) {
				this.stop();
				this.start();
			}
		} catch (error) {
			console.error('Error updating configuration:', error);
			throw error;
		}
	}

	// Check if string contains only Latin characters
	isLatinString(str) {
		if (typeof str !== 'string') return false;
		// Check if string contains only Latin letters, numbers, and common symbols
		const latinRegex = /^[A-Za-z0-9]+$/;
		return latinRegex.test(str);
	}

	// Validate cryptocurrencies configuration
	async validateCryptocurrencies(cryptocurrencies) {
		if (!Array.isArray(cryptocurrencies)) {
			throw new Error('Cryptocurrencies must be an array');
		}

		const validated = [];
		const invalid = [];
		const nonExistent = [];
		const nonLatinSymbols = [];

		// First check for Latin characters and USDT suffix
		for (const crypto of cryptocurrencies) {
			if (typeof crypto !== 'string') {
				invalid.push(crypto);
				continue;
			}

			// Check if symbol contains only Latin characters
			if (!this.isLatinString(crypto)) {
				nonLatinSymbols.push(crypto);
				continue;
			}

			// Check USDT suffix
			if (crypto.endsWith('USDT')) {
				validated.push(crypto);
			} else {
				invalid.push(crypto);
			}
		}

		// Then check existence on Binance
		const existenceChecks = validated.map(async (crypto) => {
			try {
				await this.binance.getCurrentPrice(crypto);
				return { crypto, exists: true };
			} catch (error) {
				return { crypto, exists: false };
			}
		});

		const results = await Promise.all(existenceChecks);

		const finalValidated = [];
		for (const result of results) {
			if (result.exists) {
				finalValidated.push(result.crypto);
			} else {
				nonExistent.push(result.crypto);
			}
		}

		// Log warnings
		if (nonLatinSymbols.length > 0) {
			console.warn(`Non-Latin cryptocurrency symbols found: ${nonLatinSymbols.join(', ')}. These symbols contain characters from other languages and will be skipped.`);
		}

		if (invalid.length > 0) {
			console.warn(`Invalid cryptocurrencies found: ${invalid.join(', ')}. They will be skipped.`);
		}

		if (nonExistent.length > 0) {
			console.warn(`Non-existent cryptocurrencies on Binance: ${nonExistent.join(', ')}. They will be skipped.`);
		}

		if (finalValidated.length > 0) {
			console.log(`Valid cryptocurrencies: ${finalValidated.join(', ')}`);
		}

		// Emit WebSocket notification for validation results
		if (global.serverInstance && global.serverInstance.broadcast) {
			const skippedSymbols = [...nonLatinSymbols, ...invalid, ...nonExistent];
			if (skippedSymbols.length > 0) {
				let message = '';
				if (nonLatinSymbols.length > 0) {
					message += `⚠️ Non-Latin symbols detected: ${nonLatinSymbols.join(', ')}. `;
				}
				if (invalid.length > 0) {
					message += `Invalid symbols: ${invalid.join(', ')}. `;
				}
				if (nonExistent.length > 0) {
					message += `Non-existent symbols: ${nonExistent.join(', ')}. `;
				}
				message += `Only ${finalValidated.length} valid symbols will be used for analysis.`;

				global.serverInstance.broadcast({
					type: 'validation_warning',
					data: {
						non_latin_symbols: nonLatinSymbols,
						invalid_symbols: invalid,
						non_existent_symbols: nonExistent,
						valid_symbols: finalValidated,
						timestamp: new Date().toISOString(),
						message: message
					}
				});
			} else if (finalValidated.length > 0) {
				// Show success message when all symbols are valid
				global.serverInstance.broadcast({
					type: 'validation_success',
					data: {
						valid_symbols: finalValidated,
						timestamp: new Date().toISOString(),
						message: `✅ All ${finalValidated.length} cryptocurrency symbols are valid: ${finalValidated.join(', ')}`
					}
				});
			}
		}

		if (finalValidated.length === 0) {
			throw new Error('No valid cryptocurrencies found. All symbols must be valid USDT pairs on Binance');
		}

		return finalValidated;
	}

	// Validate cryptocurrencies for use (without overwriting database)
	async validateCryptocurrenciesForUse(cryptocurrencies) {
		if (!Array.isArray(cryptocurrencies)) {
			console.warn('Cryptocurrencies must be an array, using default');
			return ['BTCUSDT', 'ETHUSDT'];
		}

		const validated = [];
		const invalid = [];
		const nonExistent = [];
		const nonLatinSymbols = [];

		// First check for Latin characters and USDT suffix
		for (const crypto of cryptocurrencies) {
			if (typeof crypto !== 'string') {
				invalid.push(crypto);
				continue;
			}

			// Check if symbol contains only Latin characters
			if (!this.isLatinString(crypto)) {
				nonLatinSymbols.push(crypto);
				continue;
			}

			// Check USDT suffix
			if (crypto.endsWith('USDT')) {
				validated.push(crypto);
			} else {
				invalid.push(crypto);
			}
		}

		// Then check existence on Binance
		const existenceChecks = validated.map(async (crypto) => {
			try {
				await this.binance.getCurrentPrice(crypto);
				return { crypto, exists: true };
			} catch (error) {
				return { crypto, exists: false };
			}
		});

		const results = await Promise.all(existenceChecks);

		const finalValidated = [];
		for (const result of results) {
			if (result.exists) {
				finalValidated.push(result.crypto);
			} else {
				nonExistent.push(result.crypto);
			}
		}

		// Log warnings (but don't overwrite database)
		if (nonLatinSymbols.length > 0) {
			console.warn(`Non-Latin cryptocurrency symbols found: ${nonLatinSymbols.join(', ')}. These symbols contain characters from other languages and will be skipped.`);
		}

		if (invalid.length > 0) {
			console.warn(`Invalid cryptocurrencies found: ${invalid.join(', ')}. They will be skipped.`);
		}

		if (nonExistent.length > 0) {
			console.warn(`Non-existent cryptocurrencies on Binance: ${nonExistent.join(', ')}. They will be skipped.`);
		}

		if (finalValidated.length > 0) {
			console.log(`Valid cryptocurrencies for analysis: ${finalValidated.join(', ')}`);
		}

		// Emit WebSocket notification for validation results (but don't overwrite database)
		if (global.serverInstance && global.serverInstance.broadcast) {
			const skippedSymbols = [...nonLatinSymbols, ...invalid, ...nonExistent];
			if (skippedSymbols.length > 0) {
				let message = '';
				if (nonLatinSymbols.length > 0) {
					message += `⚠️ Non-Latin symbols detected: ${nonLatinSymbols.join(', ')}. `;
				}
				if (invalid.length > 0) {
					message += `Invalid symbols: ${invalid.join(', ')}. `;
				}
				if (nonExistent.length > 0) {
					message += `Non-existent symbols: ${nonExistent.join(', ')}. `;
				}
				message += `Only ${finalValidated.length} valid symbols will be used for analysis.`;

				global.serverInstance.broadcast({
					type: 'validation_warning',
					data: {
						non_latin_symbols: nonLatinSymbols,
						invalid_symbols: invalid,
						non_existent_symbols: nonExistent,
						valid_symbols: finalValidated,
						timestamp: new Date().toISOString(),
						message: message
					}
				});
			} else if (finalValidated.length > 0) {
				// Show success message when all symbols are valid
				global.serverInstance.broadcast({
					type: 'validation_success',
					data: {
						valid_symbols: finalValidated,
						timestamp: new Date().toISOString(),
						message: `✅ All ${finalValidated.length} cryptocurrency symbols are valid for analysis: ${finalValidated.join(', ')}`
					}
				});
			}
		}

		if (finalValidated.length === 0) {
			console.warn('No valid cryptocurrencies found for analysis. Using defaults.');
			return ['BTCUSDT', 'ETHUSDT'];
		}

		return finalValidated;
	}

	// Clear cache
	clearCache() {
		this.binance.clearCache();
		this.lastSignalTime.clear();
		console.log('Signal generator cache cleared');
	}

	// Utility function for sleep
	sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	// Generate signal for cryptocurrency (alias for generateManualSignal)
	async generateSignalForCryptocurrency(cryptocurrency, timeframe) {
		return this.generateManualSignal(cryptocurrency, timeframe);
	}

	// Analyze market data
	async analyzeMarketData(cryptocurrency, timeframe) {
		try {
			const marketData = await this.binance.getMarketData(cryptocurrency, timeframe);
			if (!marketData) {
				throw new Error(`Failed to get market data for ${cryptocurrency}`);
			}

			return {
				cryptocurrency,
				timeframe,
				currentPrice: marketData.current_price || marketData.technical_indicators?.current_price,
				volume: marketData.ticker_24hr?.volume || 0,
				priceChange: marketData.ticker_24hr?.priceChange || 0,
				priceChangePercent: marketData.ticker_24hr?.priceChangePercent || 0,
				ohlcv: marketData.ohlcv,
				technicalIndicators: marketData.technical_indicators
			};
		} catch (error) {
			console.error(`Error analyzing market data for ${cryptocurrency}:`, error);
			throw error;
		}
	}

	// Track signal performance
	async trackSignalPerformance(signal, currentPrice) {
		try {
			const entryPrice = signal.price;
			const profitLoss = currentPrice - entryPrice;
			const profitLossPercent = (profitLoss / entryPrice) * 100;

			return {
				signalId: signal.id,
				cryptocurrency: signal.cryptocurrency,
				entryPrice,
				currentPrice,
				profitLoss,
				profitLossPercent,
				signalType: signal.signalType,
				timestamp: new Date().toISOString()
			};
		} catch (error) {
			console.error('Error tracking signal performance:', error);
			throw error;
		}
	}
}

module.exports = SignalGenerator;
