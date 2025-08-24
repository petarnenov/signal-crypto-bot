const Binance = require('binance-api-node').default;
const { SMA, RSI, MACD, BollingerBands, Stochastic } = require('technicalindicators');

class BinanceService {
	constructor(options = {}) {
		// Use API keys only if they are valid (not placeholder values)
		const apiKey = options.apiKey || process.env.BINANCE_API_KEY;
		const apiSecret = options.apiSecret || process.env.BINANCE_API_SECRET;

		const config = {
			useServerTime: true,
			...options
		};

		// Only add API credentials if they are not placeholder values
		if (apiKey && apiKey !== 'your_binance_api_key_here') {
			config.apiKey = apiKey;
		}
		if (apiSecret && apiSecret !== 'your_binance_api_secret_here') {
			config.apiSecret = apiSecret;
		}

		this.client = Binance(config);

		this.db = new (require('../database/db'))();
		this.cache = new Map();
		this.cacheTimeout = 30000; // 30 seconds
	}

	// Convert timeframe to Binance interval
	convertTimeframe(timeframe) {
		const mapping = {
			'1m': '1m',
			'5m': '5m',
			'15m': '15m',
			'1h': '1h',
			'4h': '4h',
			'1d': '1d'
		};
		return mapping[timeframe] || '1h';
	}

	// Get OHLCV data from Binance
	async getOHLCV(symbol, timeframe, limit = 100) {
		try {
			const interval = this.convertTimeframe(timeframe);
			const cacheKey = `${symbol}_${interval}_${limit}`;

			// Check cache first
			if (this.cache.has(cacheKey)) {
				const cached = this.cache.get(cacheKey);
				if (Date.now() - cached.timestamp < this.cacheTimeout) {
					return cached.data;
				}
			}

			const candles = await this.client.candles({
				symbol: symbol,
				interval: interval,
				limit: limit
			});

			const ohlcv = candles.map(candle => ({
				timestamp: candle.openTime,
				open: parseFloat(candle.open),
				high: parseFloat(candle.high),
				low: parseFloat(candle.low),
				close: parseFloat(candle.close),
				volume: parseFloat(candle.volume)
			}));

			// Cache the result
			this.cache.set(cacheKey, {
				data: ohlcv,
				timestamp: Date.now()
			});

			return ohlcv;
		} catch (error) {
			console.error(`Error fetching OHLCV for ${symbol}:`, error);
			throw error;
		}
	}

	// Get current price
	async getCurrentPrice(symbol) {
		try {
			const ticker = await this.client.prices({ symbol: symbol });
			return parseFloat(ticker[symbol]);
		} catch (error) {
			console.error(`Error fetching price for ${symbol}:`, error);
			throw error;
		}
	}

	// Get 24hr ticker statistics
	async get24hrTicker(symbol) {
		try {
			const ticker = await this.client.dailyStats({ symbol: symbol });
			return {
				symbol: ticker.symbol,
				priceChange: parseFloat(ticker.priceChange),
				priceChangePercent: parseFloat(ticker.priceChangePercent),
				weightedAvgPrice: parseFloat(ticker.weightedAvgPrice),
				prevClosePrice: parseFloat(ticker.prevClosePrice),
				lastPrice: parseFloat(ticker.lastPrice),
				lastQty: parseFloat(ticker.lastQty),
				bidPrice: parseFloat(ticker.bidPrice),
				askPrice: parseFloat(ticker.askPrice),
				openPrice: parseFloat(ticker.openPrice),
				highPrice: parseFloat(ticker.highPrice),
				lowPrice: parseFloat(ticker.lowPrice),
				volume: parseFloat(ticker.volume),
				quoteVolume: parseFloat(ticker.quoteVolume),
				openTime: ticker.openTime,
				closeTime: ticker.closeTime,
				count: ticker.count
			};
		} catch (error) {
			console.error(`Error fetching 24hr ticker for ${symbol}:`, error);
			throw error;
		}
	}

	// Calculate technical indicators
	calculateTechnicalIndicators(ohlcv) {
		const closes = ohlcv.map(candle => candle.close);
		const highs = ohlcv.map(candle => candle.high);
		const lows = ohlcv.map(candle => candle.low);
		const volumes = ohlcv.map(candle => candle.volume);

		const indicators = {};

		// Simple Moving Average (SMA)
		try {
			indicators.sma_20 = SMA.calculate({ period: 20, values: closes });
			indicators.sma_50 = SMA.calculate({ period: 50, values: closes });
		} catch (error) {
			console.warn('Error calculating SMA:', error);
		}

		// Relative Strength Index (RSI)
		try {
			indicators.rsi = RSI.calculate({ period: 14, values: closes });
		} catch (error) {
			console.warn('Error calculating RSI:', error);
		}

		// MACD
		try {
			indicators.macd = MACD.calculate({
				fastPeriod: 12,
				slowPeriod: 26,
				signalPeriod: 9,
				values: closes
			});
		} catch (error) {
			console.warn('Error calculating MACD:', error);
		}

		// Bollinger Bands
		try {
			indicators.bollinger_bands = BollingerBands.calculate({
				period: 20,
				stdDev: 2,
				values: closes
			});
		} catch (error) {
			console.warn('Error calculating Bollinger Bands:', error);
		}

		// Stochastic
		try {
			indicators.stochastic = Stochastic.calculate({
				high: highs,
				low: lows,
				close: closes,
				period: 14,
				signalPeriod: 3
			});
		} catch (error) {
			console.warn('Error calculating Stochastic:', error);
		}

		// Get latest values
		const latest = {
			current_price: closes[closes.length - 1],
			sma_20: indicators.sma_20 ? indicators.sma_20[indicators.sma_20.length - 1] : null,
			sma_50: indicators.sma_50 ? indicators.sma_50[indicators.sma_50.length - 1] : null,
			rsi: indicators.rsi ? indicators.rsi[indicators.rsi.length - 1] : null,
			macd: indicators.macd ? indicators.macd[indicators.macd.length - 1] : null,
			bollinger_bands: indicators.bollinger_bands ? indicators.bollinger_bands[indicators.bollinger_bands.length - 1] : null,
			stochastic: indicators.stochastic ? indicators.stochastic[indicators.stochastic.length - 1] : null,
			volume_24h: volumes.slice(-24).reduce((sum, vol) => sum + vol, 0),
			price_change_24h: ((closes[closes.length - 1] - closes[closes.length - 25]) / closes[closes.length - 25]) * 100
		};

		return {
			latest: latest,
			full: indicators
		};
	}

	// Get market data for analysis
	async getMarketData(symbol, timeframe) {
		try {
			const ohlcv = await this.getOHLCV(symbol, timeframe, 100);
			const currentPrice = await this.getCurrentPrice(symbol);
			const ticker24hr = await this.get24hrTicker(symbol);
			const indicators = this.calculateTechnicalIndicators(ohlcv);

			return {
				symbol: symbol,
				timeframe: timeframe,
				current_price: currentPrice,
				ohlcv: ohlcv,
				ticker_24hr: ticker24hr,
				technical_indicators: indicators.latest,
				full_indicators: indicators.full,
				timestamp: Date.now()
			};
		} catch (error) {
			console.error(`Error getting market data for ${symbol}:`, error);
			throw error;
		}
	}

	// Get supported trading pairs
	async getSupportedPairs() {
		try {
			const exchangeInfo = await this.client.exchangeInfo();
			return exchangeInfo.symbols
				.filter(symbol => symbol.status === 'TRADING')
				.map(symbol => symbol.symbol);
		} catch (error) {
			console.error('Error fetching supported pairs:', error);
			throw error;
		}
	}

	// Get order book
	async getOrderBook(symbol, limit = 10) {
		try {
			const orderBook = await this.client.book({ symbol: symbol, limit: limit });
			return {
				symbol: symbol,
				bids: orderBook.bids.map(bid => ({
					price: parseFloat(bid.price),
					quantity: parseFloat(bid.quantity)
				})),
				asks: orderBook.asks.map(ask => ({
					price: parseFloat(ask.price),
					quantity: parseFloat(ask.quantity)
				}))
			};
		} catch (error) {
			console.error(`Error fetching order book for ${symbol}:`, error);
			throw error;
		}
	}

	// Get historical data for backtesting
	async getHistoricalData(symbol, interval, startDate, endDate, limit = 1000) {
		try {
			console.log(`Fetching historical data for ${symbol} (${interval}) from ${startDate} to ${endDate}`);

			// Use existing getOHLCV method for now
			const data = await this.getOHLCV(symbol, interval, limit);

			// Filter by date range
			const startTime = new Date(startDate).getTime();
			const endTime = new Date(endDate).getTime();

			const filteredData = data.filter(candle =>
				candle.timestamp >= startTime && candle.timestamp <= endTime
			);

			console.log(`Fetched ${filteredData.length} candles for ${symbol}`);
			return filteredData;
		} catch (error) {
			console.error(`Error fetching historical data for ${symbol}:`, error);
			throw error;
		}
	}

	// Get recent trades
	async getRecentTrades(symbol, limit = 50) {
		try {
			const trades = await this.client.trades({ symbol: symbol, limit: limit });
			return trades.map(trade => ({
				id: trade.id,
				price: parseFloat(trade.price),
				quantity: parseFloat(trade.qty),
				time: trade.time,
				isBuyerMaker: trade.isBuyerMaker
			}));
		} catch (error) {
			console.error(`Error fetching recent trades for ${symbol}:`, error);
			throw error;
		}
	}

	// Test connection
	async testConnection() {
		try {
			await this.client.ping();
			console.log('Binance API connection successful');
			return true;
		} catch (error) {
			console.error('Binance API connection failed:', error);
			return false;
		}
	}

	// Clear cache
	clearCache() {
		this.cache.clear();
		console.log('Binance service cache cleared');
	}

	// Get cache statistics
	getCacheStats() {
		return {
			size: this.cache.size,
			keys: Array.from(this.cache.keys())
		};
	}
}

module.exports = BinanceService;
