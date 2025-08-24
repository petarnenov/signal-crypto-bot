const CryptoBotDatabase = require('../database/db');
const BinanceService = require('./binance-service');
const OpenAIService = require('./openai-service');

class BacktestingService {
	constructor(options = {}) {
		this.db = new CryptoBotDatabase();
		this.binance = new BinanceService(options.binance);
		this.openai = new OpenAIService(options.openai);
		this.results = [];
		this.initialBalance = options.initialBalance || 10000; // $10,000 starting balance
		this.commission = options.commission || 0.001; // 0.1% commission
	}

	// Run backtest on historical data
	async runBacktest(config) {
		const {
			cryptocurrency,
			timeframe,
			startDate,
			endDate,
			strategy = 'ai'
		} = config;

		console.log(`Starting backtest for ${cryptocurrency} (${timeframe}) from ${startDate} to ${endDate}`);

		try {
			// Get historical data
			const historicalData = await this.getHistoricalData(cryptocurrency, timeframe, startDate, endDate);

			if (!historicalData || historicalData.length === 0) {
				throw new Error('No historical data available for the specified period');
			}

			// Initialize backtest state
			let balance = this.initialBalance;
			let position = null;
			let trades = [];
			let equity = [balance];

			// Process each candle
			for (let i = 50; i < historicalData.length; i++) { // Start from 50 to have enough data for indicators
				const currentCandle = historicalData[i];
				const currentPrice = currentCandle.close;
				const currentTime = new Date(currentCandle.timestamp);

				// Get technical indicators for current point
				const indicators = this.calculateIndicators(historicalData.slice(0, i + 1));

				// Generate signal based on strategy
				let signal = null;
				if (strategy === 'ai') {
					signal = await this.generateAISignal(cryptocurrency, timeframe, currentPrice, indicators);
				} else {
					signal = this.generateTechnicalSignal(indicators);
				}

				// Execute signal
				if (signal && signal.confidence >= 0.7) {
					const trade = this.executeSignal(signal, currentPrice, currentTime, balance, position);
					if (trade) {
						trades.push(trade);
						balance = trade.newBalance;
						position = trade.newPosition;
					}
				}

				equity.push(balance);
			}

			// Calculate final results
			const results = this.calculateResults(trades, equity, this.initialBalance);

			// Save backtest results
			await this.saveBacktestResults(config, results);

			return results;

		} catch (error) {
			console.error('Backtest error:', error);
			throw error;
		}
	}

	// Get historical data from Binance
	async getHistoricalData(cryptocurrency, timeframe, startDate, endDate) {
		try {
			const data = await this.binance.getHistoricalData(cryptocurrency, timeframe, startDate, endDate);
			return data;
		} catch (error) {
			console.error('Error fetching historical data:', error);
			throw error;
		}
	}

	// Calculate technical indicators
	calculateIndicators(data) {
		if (data.length < 50) return {};

		const closes = data.map(d => d.close);
		const highs = data.map(d => d.high);
		const lows = data.map(d => d.low);

		// SMA
		const sma20 = this.calculateSMA(closes, 20);
		const sma50 = this.calculateSMA(closes, 50);

		// RSI
		const rsi = this.calculateRSI(closes, 14);

		// MACD
		const macd = this.calculateMACD(closes);

		// Bollinger Bands
		const bb = this.calculateBollingerBands(closes, 20);

		// Stochastic
		const stoch = this.calculateStochastic(highs, lows, closes, 14);

		return {
			sma_20: sma20[sma20.length - 1],
			sma_50: sma50[sma50.length - 1],
			rsi: rsi[rsi.length - 1],
			macd: macd[macd.length - 1],
			bollinger_bands: bb[bb.length - 1],
			stochastic: stoch[stoch.length - 1]
		};
	}

	// Generate AI signal
	async generateAISignal(cryptocurrency, timeframe, price, indicators) {
		try {
			const marketData = {
				current_price: price,
				ohlcv: null,
				technical_indicators: indicators
			};

			const signal = await this.openai.generateSignal(cryptocurrency, timeframe, marketData, indicators);
			return signal;
		} catch (error) {
			console.error('Error generating AI signal:', error);
			return null;
		}
	}

	// Generate technical signal based on indicators
	generateTechnicalSignal(indicators) {
		const { rsi, macd, sma_20, sma_50 } = indicators;

		let signal = null;
		let confidence = 0;

		// RSI strategy
		if (rsi < 30) {
			signal = 'BUY';
			confidence = 0.8;
		} else if (rsi > 70) {
			signal = 'SELL';
			confidence = 0.8;
		}

		// MACD strategy
		if (macd && macd.MACD > macd.signal && signal === 'BUY') {
			confidence += 0.1;
		} else if (macd && macd.MACD < macd.signal && signal === 'SELL') {
			confidence += 0.1;
		}

		// Moving average strategy
		if (sma_20 > sma_50 && signal === 'BUY') {
			confidence += 0.1;
		} else if (sma_20 < sma_50 && signal === 'SELL') {
			confidence += 0.1;
		}

		return signal ? { signal, confidence: Math.min(confidence, 1) } : null;
	}

	// Execute trading signal
	executeSignal(signal, price, time, balance, position) {
		const { signal: signalType, confidence } = signal;

		if (signalType === 'BUY' && !position) {
			// Open long position
			const amount = balance * 0.95; // Use 95% of balance
			const quantity = amount / price;
			const commissionCost = amount * this.commission;
			const newBalance = balance - commissionCost;

			return {
				type: 'BUY',
				price,
				quantity,
				amount,
				commission: commissionCost,
				time,
				confidence,
				oldBalance: balance,
				newBalance,
				oldPosition: null,
				newPosition: { type: 'LONG', quantity, entryPrice: price }
			};

		} else if (signalType === 'SELL' && position && position.type === 'LONG') {
			// Close long position
			const amount = position.quantity * price;
			const commissionCost = amount * this.commission;
			const profit = amount - (position.quantity * position.entryPrice);
			const newBalance = balance + profit - commissionCost;

			return {
				type: 'SELL',
				price,
				quantity: position.quantity,
				amount,
				commission: commissionCost,
				profit,
				time,
				confidence,
				oldBalance: balance,
				newBalance,
				oldPosition: position,
				newPosition: null
			};
		}

		return null;
	}

	// Calculate backtest results
	calculateResults(trades, equity, initialBalance) {
		const totalTrades = trades.length;
		const winningTrades = trades.filter(t => t.profit > 0).length;
		const losingTrades = trades.filter(t => t.profit < 0).length;
		const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
		const totalCommission = trades.reduce((sum, t) => sum + t.commission, 0);
		const finalBalance = equity[equity.length - 1];
		const totalReturn = ((finalBalance - initialBalance) / initialBalance) * 100;

		// Calculate max drawdown
		let maxDrawdown = 0;
		let peak = initialBalance;
		for (const balance of equity) {
			if (balance > peak) {
				peak = balance;
			}
			const drawdown = (peak - balance) / peak * 100;
			if (drawdown > maxDrawdown) {
				maxDrawdown = drawdown;
			}
		}

		return {
			initialBalance,
			finalBalance,
			totalReturn: totalReturn.toFixed(2) + '%',
			totalTrades,
			winningTrades,
			losingTrades,
			winRate: totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(2) + '%' : '0%',
			totalProfit: totalProfit.toFixed(2),
			totalCommission: totalCommission.toFixed(2),
			maxDrawdown: maxDrawdown.toFixed(2) + '%',
			trades,
			equity
		};
	}

	// Save backtest results to database
	async saveBacktestResults(config, results) {
		try {
			const backtestData = {
				cryptocurrency: config.cryptocurrency,
				timeframe: config.timeframe,
				start_date: config.startDate,
				end_date: config.endDate,
				strategy: config.strategy,
				initial_balance: results.initialBalance,
				final_balance: results.finalBalance,
				total_return: results.totalReturn,
				total_trades: results.totalTrades,
				win_rate: results.winRate,
				max_drawdown: results.maxDrawdown,
				results: JSON.stringify(results),
				created_at: new Date().toISOString()
			};

			await this.db.execute(`
				INSERT INTO backtest_results (
					cryptocurrency, timeframe, start_date, end_date, strategy,
					initial_balance, final_balance, total_return, total_trades,
					win_rate, max_drawdown, results, created_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`, Object.values(backtestData));

			console.log('Backtest results saved to database');
		} catch (error) {
			console.error('Error saving backtest results:', error);
		}
	}

	// Get all backtest results
	async getBacktestResults(limit = 50) {
		try {
			const results = await this.db.all(`
				SELECT * FROM backtest_results 
				ORDER BY created_at DESC 
				LIMIT ?
			`, [limit]);

			return results;
		} catch (error) {
			console.error('Error fetching backtest results:', error);
			return [];
		}
	}

	// Technical indicator calculations
	calculateSMA(data, period) {
		const sma = [];
		for (let i = period - 1; i < data.length; i++) {
			const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
			sma.push(sum / period);
		}
		return sma;
	}

	calculateRSI(data, period) {
		const rsi = [];
		for (let i = 1; i < data.length; i++) {
			const gains = [];
			const losses = [];

			for (let j = Math.max(0, i - period + 1); j <= i; j++) {
				const change = data[j] - data[j - 1];
				gains.push(change > 0 ? change : 0);
				losses.push(change < 0 ? Math.abs(change) : 0);
			}

			const avgGain = gains.reduce((a, b) => a + b, 0) / gains.length;
			const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;

			const rs = avgGain / avgLoss;
			const rsiValue = 100 - (100 / (1 + rs));
			rsi.push(rsiValue);
		}
		return rsi;
	}

	calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
		const ema12 = this.calculateEMA(data, fastPeriod);
		const ema26 = this.calculateEMA(data, slowPeriod);

		const macdLine = ema12.map((fast, i) => fast - ema26[i]);
		const signalLine = this.calculateEMA(macdLine, signalPeriod);

		return macdLine.map((macd, i) => ({
			MACD: macd,
			signal: signalLine[i],
			histogram: macd - signalLine[i]
		}));
	}

	calculateEMA(data, period) {
		const ema = [];
		const multiplier = 2 / (period + 1);

		// First EMA is SMA
		let sum = 0;
		for (let i = 0; i < period; i++) {
			sum += data[i];
		}
		ema.push(sum / period);

		// Calculate EMA
		for (let i = period; i < data.length; i++) {
			const newEMA = (data[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
			ema.push(newEMA);
		}

		return ema;
	}

	calculateBollingerBands(data, period, stdDev = 2) {
		const bb = [];
		for (let i = period - 1; i < data.length; i++) {
			const slice = data.slice(i - period + 1, i + 1);
			const sma = slice.reduce((a, b) => a + b, 0) / period;

			const variance = slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
			const std = Math.sqrt(variance);

			bb.push({
				middle: sma,
				upper: sma + (stdDev * std),
				lower: sma - (stdDev * std)
			});
		}
		return bb;
	}

	calculateStochastic(highs, lows, closes, period) {
		const stoch = [];
		for (let i = period - 1; i < closes.length; i++) {
			const highSlice = highs.slice(i - period + 1, i + 1);
			const lowSlice = lows.slice(i - period + 1, i + 1);
			const close = closes[i];

			const highestHigh = Math.max(...highSlice);
			const lowestLow = Math.min(...lowSlice);

			const k = ((close - lowestLow) / (highestHigh - lowestLow)) * 100;
			stoch.push({ k, d: k }); // Simplified D calculation
		}
		return stoch;
	}
}

module.exports = BacktestingService;
