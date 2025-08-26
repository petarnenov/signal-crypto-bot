const Binance = require('binance-api-node').default;
const { SMA, RSI, MACD, BollingerBands, Stochastic } = require('technicalindicators');

class BinanceService {
	constructor(options = {}) {
		// Use API keys only if they are valid (not placeholder values)
		const apiKey = options.apiKey || process.env.BINANCE_API_KEY;
		const apiSecret = options.apiSecret || process.env.BINANCE_API_SECRET;
		const useSandbox = options.useSandbox || process.env.BINANCE_USE_SANDBOX === 'true';

		const config = {
			useServerTime: true,
			...options
		};

		// Configure for sandbox if enabled
		if (useSandbox) {
			config.baseUrl = 'https://testnet.binance.vision';
			console.log('🔧 Binance service configured for SANDBOX mode');
		}

		// Only add API credentials if they are not placeholder values
		if (apiKey && apiKey !== 'your_binance_api_key_here') {
			config.apiKey = apiKey;
		}
		if (apiSecret && apiSecret !== 'your_binance_api_secret_here') {
			config.apiSecret = apiSecret;
		}

		this.client = Binance(config);
		this.useSandbox = useSandbox;

		this.db = new (require('@signal-crypto-bot/database'))();
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
			// Return mock OHLCV data for testing
			return this.getMockOHLCV(symbol, timeframe, limit);
		}
	}

	// Get current price
	async getCurrentPrice(symbol) {
		try {
			const ticker = await this.client.prices({ symbol: symbol });
			return parseFloat(ticker[symbol]);
		} catch (error) {
			console.error(`Error fetching price for ${symbol}:`, error);
			// Fallback to public API if Binance API fails
			return await this.getCurrentPriceFromPublicAPI(symbol);
		}
	}

	// Fallback method to get current price from public API
	async getCurrentPriceFromPublicAPI(symbol) {
		try {
			console.log(`Using fallback API for ${symbol}`);

			const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			return parseFloat(data.price);
		} catch (error) {
			console.error(`Error fetching price from public API for ${symbol}:`, error);
			// Return mock data for testing
			const mockPrices = {
				'BTCUSDT': 45000 + Math.random() * 5000,
				'ETHUSDT': 2800 + Math.random() * 400,
				'ADAUSDT': 0.5 + Math.random() * 0.1,
				'DOTUSDT': 7 + Math.random() * 1,
				'LINKUSDT': 15 + Math.random() * 2
			};
			return mockPrices[symbol] || 0;
		}
	}

	// Generate mock OHLCV data for testing
	getMockOHLCV(symbol, timeframe, limit = 100) {
		const mockPrices = {
			'BTCUSDT': 45000,
			'ETHUSDT': 2800,
			'ADAUSDT': 0.5,
			'DOTUSDT': 7,
			'LINKUSDT': 15
		};

		const basePrice = mockPrices[symbol] || 100;
		const ohlcv = [];
		const now = Date.now();
		const intervalMs = this.getIntervalMs(timeframe);

		for (let i = 0; i < limit; i++) {
			const timestamp = now - (limit - i) * intervalMs;
			const priceVariation = (Math.random() - 0.5) * 0.02; // ±1% variation
			const open = basePrice * (1 + priceVariation);
			const high = open * (1 + Math.random() * 0.01);
			const low = open * (1 - Math.random() * 0.01);
			const close = open * (1 + (Math.random() - 0.5) * 0.005);
			const volume = Math.random() * 1000;

			ohlcv.push({
				timestamp,
				open,
				high,
				low,
				close,
				volume
			});
		}

		return ohlcv;
	}

	// Get interval in milliseconds
	getIntervalMs(timeframe) {
		const intervals = {
			'1m': 60 * 1000,
			'5m': 5 * 60 * 1000,
			'15m': 15 * 60 * 1000,
			'1h': 60 * 60 * 1000,
			'4h': 4 * 60 * 60 * 1000,
			'1d': 24 * 60 * 60 * 1000
		};
		return intervals[timeframe] || 60 * 60 * 1000;
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
			// Return mock ticker data for testing
			return this.getMock24hrTicker(symbol);
		}
	}

	// Generate mock 24hr ticker data for testing
	getMock24hrTicker(symbol) {
		const mockPrices = {
			'BTCUSDT': 45000,
			'ETHUSDT': 2800,
			'ADAUSDT': 0.5,
			'DOTUSDT': 7,
			'LINKUSDT': 15
		};

		const basePrice = mockPrices[symbol] || 100;
		const priceChange = (Math.random() - 0.5) * basePrice * 0.1; // ±5% change
		const currentPrice = basePrice + priceChange;

		return {
			symbol: symbol,
			priceChange: priceChange,
			priceChangePercent: (priceChange / basePrice) * 100,
			weightedAvgPrice: currentPrice,
			prevClosePrice: basePrice,
			lastPrice: currentPrice,
			lastQty: Math.random() * 10,
			bidPrice: currentPrice * 0.999,
			askPrice: currentPrice * 1.001,
			openPrice: basePrice,
			highPrice: currentPrice * 1.02,
			lowPrice: currentPrice * 0.98,
			volume: Math.random() * 1000000,
			quoteVolume: Math.random() * 50000000,
			openTime: Date.now() - 24 * 60 * 60 * 1000,
			closeTime: Date.now(),
			count: Math.floor(Math.random() * 10000)
		};
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
			currentPrice: closes[closes.length - 1],
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
				currentPrice: currentPrice,
				ohlcv: ohlcv,
				ticker_24hr: ticker24hr,
				technical_indicators: indicators.latest,
				full_indicators: indicators.full,
				timestamp: Date.now()
			};
		} catch (error) {
			console.error(`Error getting market data for ${symbol}:`, error);

			// Return fallback data instead of throwing
			return {
				symbol: symbol,
				timeframe: timeframe,
				currentPrice: 0,
				ohlcv: [],
				ticker_24hr: {},
				technical_indicators: {},
				full_indicators: {},
				timestamp: Date.now(),
				error: error.message
			};
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

	// Place a market order
	async placeMarketOrder(symbol, side, quantity, options = {}) {
		try {
			console.log(`🚀 [BINANCE] Placing ${side} market order: ${quantity} ${symbol}`);

			const orderParams = {
				symbol: symbol,
				side: side,
				type: 'MARKET',
				quantity: quantity.toString(),
				...options
			};

			console.log(`📋 [BINANCE] Order params:`, orderParams);

			const order = await this.client.order(orderParams);

			console.log(`✅ [BINANCE] Order placed successfully:`, {
				orderId: order.orderId,
				symbol: order.symbol,
				side: order.side,
				quantity: order.executedQty,
				price: order.price,
				status: order.status
			});

			return {
				orderId: order.orderId,
				symbol: order.symbol,
				side: order.side,
				type: order.type,
				quantity: parseFloat(order.executedQty),
				price: parseFloat(order.price),
				executionPrice: parseFloat(order.price),
				amount: parseFloat(order.executedQty) * parseFloat(order.price),
				commission: parseFloat(order.commission || 0),
				status: order.status,
				createdAt: new Date(order.time),
				filledAt: new Date(order.updateTime)
			};

		} catch (error) {
			console.error(`❌ [BINANCE] Error placing market order:`, error);
			throw error;
		}
	}

	// Place a limit order
	async placeLimitOrder(symbol, side, quantity, price, options = {}) {
		try {
			console.log(`🚀 [BINANCE] Placing ${side} limit order: ${quantity} ${symbol} @ $${price}`);

			const orderParams = {
				symbol: symbol,
				side: side,
				type: 'LIMIT',
				timeInForce: 'GTC',
				quantity: quantity.toString(),
				price: price.toString(),
				...options
			};

			console.log(`📋 [BINANCE] Order params:`, orderParams);

			const order = await this.client.order(orderParams);

			console.log(`✅ [BINANCE] Limit order placed successfully:`, {
				orderId: order.orderId,
				symbol: order.symbol,
				side: order.side,
				quantity: order.origQty,
				price: order.price,
				status: order.status
			});

			return {
				orderId: order.orderId,
				symbol: order.symbol,
				side: order.side,
				type: order.type,
				quantity: parseFloat(order.origQty),
				price: parseFloat(order.price),
				executionPrice: null,
				amount: null,
				commission: null,
				status: order.status,
				createdAt: new Date(order.time),
				filledAt: null
			};

		} catch (error) {
			console.error(`❌ [BINANCE] Error placing limit order:`, error);
			throw error;
		}
	}

	// Cancel an order
	async cancelOrder(symbol, orderId) {
		try {
			console.log(`🚫 [BINANCE] Cancelling order ${orderId} for ${symbol}`);

			const result = await this.client.cancelOrder({
				symbol: symbol,
				orderId: orderId
			});

			console.log(`✅ [BINANCE] Order cancelled successfully:`, {
				orderId: result.orderId,
				symbol: result.symbol,
				status: result.status
			});

			return result;

		} catch (error) {
			console.error(`❌ [BINANCE] Error cancelling order:`, error);
			throw error;
		}
	}

	// Get account information
	async getAccountInfo() {
		try {
			const account = await this.client.accountInfo();

			return {
				balances: account.balances.map(balance => ({
					asset: balance.asset,
					free: parseFloat(balance.free),
					locked: parseFloat(balance.locked)
				})),
				permissions: account.permissions,
				updateTime: account.updateTime
			};

		} catch (error) {
			console.error(`❌ [BINANCE] Error getting account info:`, error);
			throw error;
		}
	}

	// Get open orders
	async getOpenOrders(symbol = null) {
		try {
			const params = symbol ? { symbol: symbol } : {};
			const orders = await this.client.openOrders(params);

			return orders.map(order => ({
				orderId: order.orderId,
				symbol: order.symbol,
				side: order.side,
				type: order.type,
				quantity: parseFloat(order.origQty),
				price: parseFloat(order.price),
				status: order.status,
				createdAt: new Date(order.time),
				updateTime: new Date(order.updateTime)
			}));

		} catch (error) {
			console.error(`❌ [BINANCE] Error getting open orders:`, error);
			throw error;
		}
	}

	// Get order status
	async getOrderStatus(symbol, orderId) {
		try {
			const order = await this.client.orderStatus({
				symbol: symbol,
				orderId: orderId
			});

			return {
				orderId: order.orderId,
				symbol: order.symbol,
				side: order.side,
				type: order.type,
				quantity: parseFloat(order.origQty),
				executedQty: parseFloat(order.executedQty),
				price: parseFloat(order.price),
				executionPrice: parseFloat(order.price),
				status: order.status,
				commission: parseFloat(order.commission || 0),
				createdAt: new Date(order.time),
				updateTime: new Date(order.updateTime)
			};

		} catch (error) {
			console.error(`❌ [BINANCE] Error getting order status:`, error);
			throw error;
		}
	}
}

module.exports = BinanceService;
