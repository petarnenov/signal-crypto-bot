const CryptoBotDatabase = require('@signal-crypto-bot/database');
const BinanceService = require('./binance-service');
const { v4: uuidv4 } = require('uuid');
const OpenAIService = require('./openai-service');

class PaperTradingService {
	constructor(options = {}) {
		// Use the passed database instance or create a new one
		this.db = options.db || new CryptoBotDatabase();
		this.binance = new BinanceService(options.binance);
		this.openai = new OpenAIService(options.openai);
		this.accounts = new Map(); // Virtual trading accounts
		this.positions = new Map(); // Open positions
		this.orders = new Map(); // Order history
		this.commission = options.commission || 0.001; // 0.1% commission
		this.slippage = options.slippage || 0.0005; // 0.05% slippage

		// Load existing positions from database
		this.loadPositionsFromDatabase();

		// Initialize with some test accounts if none exist
		this.initializeTestAccounts();
	}

	// Initialize test accounts if none exist
	async initializeTestAccounts() {
		try {
			const user1Accounts = await this.getUserAccounts('user1');
			const user2Accounts = await this.getUserAccounts('user2');

			// Create test accounts if none exist
			if (user1Accounts.length === 0) {
				await this.createTestAccount('user1', 10000, 'USDT');
				await this.createTestAccount('user1', 5000, 'USDT');
			}

			if (user2Accounts.length === 0) {
				await this.createTestAccount('user2', 15000, 'USDT');
				await this.createTestAccount('user2', 7500, 'USDT');
			}

			console.log('Test accounts initialized');
		} catch (error) {
			console.error('Error initializing test accounts:', error);
		}
	}

	// Create a test account (internal method to avoid recursion)
	async createTestAccount(userId, initialBalance = 10000, currency = 'USDT') {
		try {
			const accountId = `paper_${userId}_${uuidv4()}`;
			const account = {
				id: accountId,
				userId: userId,
				balance: initialBalance,
				currency: currency,
				equity: initialBalance,
				unrealizedPnl: 0,
				realizedPnL: 0,
				totalTrades: 0,
				winningTrades: 0,
				losingTrades: 0,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			this.accounts.set(accountId, account);
			await this.saveAccount(account);

			console.log(`Created test paper trading account ${accountId} with $${initialBalance} balance`);
			return account;
		} catch (error) {
			console.error('Error creating test paper trading account:', error);
			throw error;
		}
	}

	// Create a new paper trading account
	async createAccount(userId, initialBalance = 10000, currency = 'USDT') {
		try {
			const accountId = `paper_${userId}_${Date.now()}`;
			const account = {
				id: accountId,
				userId: userId,
				balance: initialBalance,
				currency: currency,
				equity: initialBalance,
				unrealizedPnl: 0,
				realizedPnL: 0,
				totalTrades: 0,
				winningTrades: 0,
				losingTrades: 0,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			this.accounts.set(accountId, account);
			await this.saveAccount(account);

			console.log(`Created paper trading account ${accountId} with $${initialBalance} balance`);
			return account;
		} catch (error) {
			console.error('Error creating paper trading account:', error);
			throw error;
		}
	}

	// Get account information
	async getAccount(accountId) {
		try {
			// Try to get from memory first
			if (this.accounts.has(accountId)) {
				return this.accounts.get(accountId);
			}

			// Load from database
			const account = this.db.getPaperTradingAccount(accountId);

			if (account) {
				this.accounts.set(accountId, account);
				return account;
			}

			return null;
		} catch (error) {
			console.error('Error getting account:', error);
			throw error;
		}
	}



	// Get all accounts for a user
	async getUserAccounts(userId) {
		try {
			const accounts = this.db.getUserPaperTradingAccounts(userId);
			return accounts;
		} catch (error) {
			console.error('Error getting user accounts:', error);
			throw error;
		}
	}

	// Get all paper trading accounts
	async getAllAccounts() {
		try {
			const user1Accounts = await this.getUserAccounts('user1');
			const user2Accounts = await this.getUserAccounts('user2');
			return [...user1Accounts, ...user2Accounts];
		} catch (error) {
			console.error('Error getting all accounts:', error);
			throw error;
		}
	}

	// Validate order parameters and account balance
	validateOrder(account, symbol, side, quantity, price) {
		if (!account) {
			throw new Error('Account not found');
		}

		if (side === 'BUY') {
			const orderAmount = quantity * price;
			const commission = orderAmount * this.commission;
			const totalCost = orderAmount + commission;

			if (account.balance < totalCost) {
				throw new Error('Insufficient balance');
			}
		}
	}

	// Create a market order (either real or simulated)
	async createMarketOrder(symbol, side, quantity, price) {
		try {
			console.log(`🌐 [PAPER TRADING] Attempting to place real order to Binance sandbox...`);
			const binanceOrder = await this.binance.placeMarketOrder(symbol, side, quantity);

			console.log(`✅ [PAPER TRADING] Real order placed to Binance:`, {
				binanceOrderId: binanceOrder.orderId,
				symbol: binanceOrder.symbol,
				side: binanceOrder.side,
				quantity: binanceOrder.quantity,
				executionPrice: binanceOrder.executionPrice,
				amount: binanceOrder.amount,
				commission: binanceOrder.commission
			});

			return {
				order: binanceOrder,
				isRealOrder: true
			};
		} catch (error) {
			console.log(`⚠️ [PAPER TRADING] Could not place real order to Binance: ${error.message}`);
			console.log(`📝 [PAPER TRADING] Simulating order locally with real market price`);

			// Simulate order execution with real price
			const executionPrice = price;
			const simulatedAmount = quantity * executionPrice;
			const simulatedCommission = simulatedAmount * this.commission;

			const simulatedOrder = {
				orderId: `sim_${uuidv4()}`,
				symbol: symbol,
				side: side,
				quantity: quantity,
				executionPrice: executionPrice,
				amount: simulatedAmount,
				commission: simulatedCommission,
				status: 'FILLED',
				createdAt: new Date(),
				filledAt: new Date()
			};

			return {
				order: simulatedOrder,
				isRealOrder: false
			};
		}
	}

	// Create local order record
	createLocalOrder(binanceOrder, accountId, symbol, side, quantity, price, isRealOrder) {
		const timestamp = Date.now();
		const orderId = `order_${accountId}_${timestamp}_${uuidv4()}`;

		// Check if order with this ID already exists
		if (this.orders.has(orderId)) {
			throw new Error(`Order with ID ${orderId} already exists`);
		}

		return {
			id: orderId,
			binanceOrderId: binanceOrder.orderId,
			accountId: accountId,
			symbol: symbol,
			side: side,
			type: 'MARKET',
			quantity: quantity,
			price: price,
			executionPrice: binanceOrder.executionPrice,
			amount: binanceOrder.amount,
			commission: binanceOrder.commission,
			status: binanceOrder.status,
			createdAt: binanceOrder.createdAt instanceof Date ? binanceOrder.createdAt.toISOString() : binanceOrder.createdAt,
			filledAt: binanceOrder.filledAt instanceof Date ? binanceOrder.filledAt.toISOString() : binanceOrder.filledAt,
			isRealOrder: isRealOrder
		};
	}

	// Send WebSocket notifications
	sendOrderNotification(order, binanceOrder, isRealOrder) {
		const orderType = isRealOrder ? 'REAL' : 'SIMULATED';

		if (global.serverInstance && global.serverInstance.broadcast) {
			global.serverInstance.broadcast({
				type: 'paper_trading_order_executed',
				data: {
					orderId: order.id,
					binanceOrderId: binanceOrder.orderId,
					accountId: order.accountId,
					symbol: order.symbol,
					side: order.side,
					quantity: order.quantity,
					executionPrice: binanceOrder.executionPrice,
					amount: binanceOrder.amount,
					commission: binanceOrder.commission,
					isRealOrder: isRealOrder,
					timestamp: new Date().toISOString(), // Use current time to ensure it's the newest
					message: `📊 Paper Trading: ${order.side} ${order.quantity} ${order.symbol} executed @ $${binanceOrder.executionPrice} (${orderType})`
				}
			});
		}
	}

	// Send error notification
	sendErrorNotification(accountId, symbol, side, error) {
		if (global.serverInstance && global.serverInstance.broadcast) {
			global.serverInstance.broadcast({
				type: 'paper_trading_error',
				data: {
					accountId: accountId,
					symbol: symbol,
					side: side,
					error: error.message,
					timestamp: new Date().toISOString(),
					message: `❌ Paper Trading Error: ${error.message}`
				}
			});
		}
	}

	// Place a market order (refactored)
	async placeMarketOrder(accountId, symbol, side, quantity, price = null) {
		try {
			console.log(`🚀 [PAPER TRADING] Placing ${side} market order for account ${accountId}: ${quantity} ${symbol}`);

			// Get account
			const account = await this.getAccount(accountId);

			// Get current market price if not provided
			if (!price) {
				try {
					const currentPrice = await this.binance.getCurrentPrice(symbol);
					price = currentPrice;
					console.log(`💰 [PAPER TRADING] Current ${symbol} price: $${price}`);
				} catch (error) {
					console.log(`⚠️ [PAPER TRADING] Could not get real price for ${symbol}, using provided price or default`);
					if (!price) {
						price = 50000; // Default price for BTC, will be adjusted based on symbol
						if (symbol === 'ETHUSDT') price = 3000;
						if (symbol === 'ADAUSDT') price = 0.5;
						if (symbol === 'DOTUSDT') price = 7;
					}
				}
			}

			// Validate order
			this.validateOrder(account, symbol, side, quantity, price);

			// Create market order (real or simulated)
			const { order: binanceOrder, isRealOrder } = await this.createMarketOrder(symbol, side, quantity, price);

			// Create local order record
			const order = this.createLocalOrder(binanceOrder, accountId, symbol, side, quantity, price, isRealOrder);

			// Execute the order locally (update account balance and positions)
			await this.executeOrder(order, account);

			// Save order to database
			this.orders.set(order.id, order);
			await this.saveOrder(order);

			// Send notification
			this.sendOrderNotification(order, binanceOrder, isRealOrder);

			const orderType = isRealOrder ? 'REAL' : 'SIMULATED';
			console.log(`✅ [PAPER TRADING] ${orderType} order executed successfully for account ${accountId}: ${side} ${quantity} ${symbol} @ $${binanceOrder.executionPrice}`);

			return order;

		} catch (error) {
			console.error(`❌ [PAPER TRADING] Error placing market order:`, error);
			this.sendErrorNotification(accountId, symbol, side, error);
			throw error;
		}
	}

	// Place a limit order
	async placeLimitOrder(accountId, symbol, side, quantity, price) {
		try {
			const account = await this.getAccount(accountId);
			if (!account) {
				throw new Error('Account not found');
			}

			// Validate balance for buy orders
			if (side === 'BUY') {
				const orderAmount = quantity * price;
				const commission = orderAmount * this.commission;
				const totalCost = orderAmount + commission;

				if (account.balance < totalCost) {
					throw new Error('Insufficient balance');
				}
			}

			// Create pending order
			const timestamp = Date.now();
			const orderId = `order_${accountId}_${timestamp}_${uuidv4()}`;
			const order = {
				id: orderId,
				accountId: accountId,
				symbol: symbol,
				side: side,
				type: 'LIMIT',
				quantity: quantity,
				price: price,
				executionPrice: null,
				amount: null,
				commission: null,
				status: 'PENDING',
				createdAt: new Date().toISOString(),
				filledAt: null
			};

			// Save order
			this.orders.set(orderId, order);
			await this.saveOrder(order);

			console.log(`Placed ${side} limit order for ${quantity} ${symbol} at $${price}`);
			return order;

		} catch (error) {
			console.error('Error placing limit order:', error);
			throw error;
		}
	}

	// Cancel an order
	async cancelOrder(orderId) {
		try {
			const order = this.orders.get(orderId);
			if (!order) {
				throw new Error('Order not found');
			}

			if (order.status !== 'PENDING') {
				throw new Error('Order cannot be cancelled');
			}

			order.status = 'CANCELLED';
			order.cancelledAt = new Date().toISOString();

			await this.updateOrder(order);
			console.log(`Cancelled order ${orderId}`);

			return order;
		} catch (error) {
			console.error('Error cancelling order:', error);
			throw error;
		}
	}

	// Handle buy order execution
	async executeBuyOrder(order, account) {
		// Deduct balance
		const totalCost = order.amount + order.commission;
		account.balance -= totalCost;

		// Update or create position
		const positionKey = `${account.id}_${order.symbol}`;
		let position = this.positions.get(positionKey);

		// If not in memory, try to load from database
		if (!position) {
			const dbPositions = this.db.getPaperTradingPositions(account.id);
			const dbPosition = dbPositions.find(p => p.symbol === order.symbol);
			if (dbPosition) {
				position = {
					id: dbPosition.id,
					accountId: dbPosition.accountId,
					symbol: dbPosition.symbol,
					side: dbPosition.side,
					quantity: dbPosition.quantity,
					avgPrice: dbPosition.avgPrice,
					currentPrice: dbPosition.currentPrice || dbPosition.avgPrice,
					unrealizedPnl: dbPosition.unrealizedPnl,
					createdAt: dbPosition.createdAt,
					updatedAt: dbPosition.updatedAt
				};
				this.positions.set(positionKey, position);
			}
		}

		if (position) {
			// Add to existing position
			const totalQuantity = position.quantity + order.quantity;
			const totalCost = (position.quantity * position.avgPrice) + order.amount;
			position.avgPrice = totalCost / totalQuantity;
			position.quantity = totalQuantity;
			position.currentPrice = order.executionPrice;
			position.updatedAt = new Date().toISOString();
		} else {
			// Create new position
			const positionId = `position_${uuidv4()}`;
			position = {
				id: positionId,
				accountId: account.id,
				symbol: order.symbol,
				side: 'LONG',
				quantity: order.quantity,
				avgPrice: order.executionPrice,
				currentPrice: order.executionPrice,
				unrealizedPnl: 0,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};
			this.positions.set(positionKey, position);

			// Save position to database immediately
			try {
				await this.updatePosition(position);
				console.log('Created new position and saved to database:', position);
			} catch (error) {
				console.error('Error saving position to database:', error);
			}
		}
	}

	// Handle sell order execution
	async executeSellOrder(order, account) {
		// Add balance
		const totalReceived = order.amount - order.commission;
		account.balance += totalReceived;

		// Update position
		const positionKey = `${account.id}_${order.symbol}`;
		const position = this.positions.get(positionKey);

		if (position) {
			if (order.quantity >= position.quantity) {
				// Close position completely
				const realizedPnL = (order.executionPrice - position.avgPrice) * position.quantity;
				account.realizedPnL += realizedPnL;
				account.totalTrades++;

				if (realizedPnL > 0) {
					account.winningTrades++;
				} else {
					account.losingTrades++;
				}

				console.log('Closing position completely:', position.id);
				this.positions.delete(positionKey);
				await this.deletePosition(position.id);
			} else {
				// Partial close
				const realizedPnL = (order.executionPrice - position.avgPrice) * order.quantity;
				account.realizedPnL += realizedPnL;
				account.totalTrades++;

				if (realizedPnL > 0) {
					account.winningTrades++;
				} else {
					account.losingTrades++;
				}

				position.quantity -= order.quantity;
				position.updatedAt = new Date().toISOString();
			}
		}
	}

	// Execute an order (refactored)
	async executeOrder(order, account) {
		try {
			if (order.side === 'BUY') {
				await this.executeBuyOrder(order, account);
			} else if (order.side === 'SELL') {
				await this.executeSellOrder(order, account);
			}

			// Update account
			account.updatedAt = new Date().toISOString();
			await this.updateAccount(account);

			// Save position to database first
			if (order.side === 'BUY') {
				const positionKey = `${account.id}_${order.symbol}`;
				const position = this.positions.get(positionKey);
				if (position) {
					await this.updatePosition(position);
				}
			}

			// Update unrealized P&L and equity after position is saved
			await this.updateAccountUnrealizedPnL(account.id);
		} catch (error) {
			console.error('Error executing order:', error);
			throw error;
		}
	}

	// Update unrealized P&L for all positions of an account
	async updateAccountUnrealizedPnL(accountId) {
		try {
			const account = await this.getAccount(accountId);
			if (!account) return;

			let totalUnrealizedPnL = 0;

			// Get all positions for this account from database
			const dbPositions = this.db.getPaperTradingPositions(accountId);

			for (const position of dbPositions) {
				try {
					// Get current market price
					const marketData = await this.binance.getMarketData(position.symbol, '1m');
					const currentPrice = marketData.currentPrice;

					// Calculate unrealized P&L
					const unrealizedPnL = (currentPrice - position.avgPrice) * position.quantity;

					// Update position with correct field names
					const updatedPosition = {
						id: position.id,
						accountId: position.accountId,
						symbol: position.symbol,
						side: position.side,
						quantity: position.quantity,
						avgPrice: position.avgPrice,
						unrealizedPnl: unrealizedPnL,
						createdAt: position.createdAt,
						updatedAt: new Date().toISOString()
					};

					// Update in database
					this.db.updatePaperTradingPosition(updatedPosition);

					// Also update in memory for consistency
					const positionKey = `${position.accountId}_${position.symbol}`;
					const memoryPosition = this.positions.get(positionKey);
					if (memoryPosition) {
						memoryPosition.unrealizedPnl = unrealizedPnL;
						memoryPosition.updatedAt = new Date().toISOString();
					}

					totalUnrealizedPnL += unrealizedPnL;
				} catch (error) {
					console.warn(`Could not get market data for ${position.symbol}:`, error);
					// Update position with zero unrealized P&L
					const updatedPosition = {
						id: position.id,
						accountId: position.accountId,
						symbol: position.symbol,
						side: position.side,
						quantity: position.quantity,
						avgPrice: position.avgPrice,
						unrealizedPnl: 0,
						createdAt: position.createdAt,
						updatedAt: new Date().toISOString()
					};
					this.db.updatePaperTradingPosition(updatedPosition);

					// Also update in memory for consistency
					const positionKey = `${position.accountId}_${position.symbol}`;
					const memoryPosition = this.positions.get(positionKey);
					if (memoryPosition) {
						memoryPosition.unrealizedPnl = 0;
						memoryPosition.updatedAt = new Date().toISOString();
					}
				}
			}

			// Update account equity
			account.equity = account.balance + totalUnrealizedPnL;
			account.unrealizedPnl = totalUnrealizedPnL;
			await this.updateAccount(account);

			console.log(`Updated unrealized P&L for account ${accountId}: $${totalUnrealizedPnL.toFixed(2)}`);

		} catch (error) {
			console.error('Error updating position unrealized P&L:', error);
			throw error;
		}
	}

	// Update unrealized P&L for a position
	async updateUnrealizedPnL(positionId, newPrice = null) {
		try {
			// Find position by ID - try both positionKey and actual ID
			let position = null;

			// First try to find by positionKey (accountId_symbol)
			position = this.positions.get(positionId);

			// If not found, try to find by actual ID
			if (!position) {
				for (const [_key, pos] of this.positions.entries()) {
					if (pos.id === positionId) {
						position = pos;
						break;
					}
				}
			}

			if (!position) {
				throw new Error(`Position with ID ${positionId} not found`);
			}

			// Use provided price or get from market
			let currentPrice;
			if (newPrice !== null) {
				currentPrice = newPrice;
			} else {
				const marketData = await this.binance.getMarketData(position.symbol, '1m');
				currentPrice = marketData.currentPrice;
			}

			// Calculate unrealized P&L
			position.unrealizedPnl = (currentPrice - position.avgPrice) * position.quantity;
			position.currentPrice = currentPrice;
			position.updatedAt = new Date().toISOString();

			// Update in database
			await this.db.updatePaperTradingPosition(position);

			return position;
		} catch (error) {
			console.error('Error updating position unrealized P&L:', error);
			throw error;
		}
	}

	// Close a position
	async closePosition(positionId, closePrice) {
		try {
			// Find position by ID
			let position = null;
			let positionKey = null;
			for (const [key, pos] of this.positions.entries()) {
				if (pos.id === positionId) {
					position = pos;
					positionKey = key;
					break;
				}
			}

			if (!position) {
				throw new Error(`Position with ID ${positionId} not found`);
			}

			// Calculate realized P&L
			const realizedPnl = (closePrice - position.avgPrice) * position.quantity;

			// Create closing order
			const orderData = {
				accountId: position.accountId,
				symbol: position.symbol,
				side: position.side === 'LONG' ? 'SELL' : 'BUY',
				type: 'MARKET',
				quantity: position.quantity,
				price: closePrice,
				executionPrice: closePrice,
				amount: position.quantity * closePrice,
				commission: 0,
				status: 'FILLED',
				realizedPnl: realizedPnl
			};

			const order = await this.createOrder(orderData);

			// Update account balance
			const account = await this.getAccount(position.accountId);
			if (account) {
				const newBalance = account.balance + realizedPnl;
				await this.updateAccount({
					...account,
					balance: newBalance,
					realizedPnl: account.realizedPnl + realizedPnl,
					totalTrades: account.totalTrades + 1,
					winningTrades: realizedPnl > 0 ? account.winningTrades + 1 : account.winningTrades,
					updatedAt: new Date().toISOString()
				});
			}

			// Remove position from memory and database
			this.positions.delete(positionKey);
			await this.db.deletePaperTradingPosition(positionId);

			return {
				success: true,
				position: position,
				order: order,
				realizedPnl: realizedPnl
			};
		} catch (error) {
			console.error('Error closing position:', error);
			throw error;
		}
	}

	// Get positions for an account
	getPositions(accountId) {
		try {
			const dbPositions = this.db.getPaperTradingPositions(accountId);
			return dbPositions;
		} catch (error) {
			console.error('Error getting positions:', error);
			return [];
		}
	}

	// Get order history
	async getOrderHistory(accountId, limit = 100) {
		try {
			const orders = this.db.getPaperTradingOrders(accountId, limit);
			return orders;
		} catch (error) {
			console.error('Error getting order history:', error);
			throw error;
		}
	}

	// Get orders for specific account (alias for getOrderHistory for compatibility)
	async getOrders(accountId, limit = 100) {
		try {
			// Handle "all" limit
			if (limit === 'all') {
				limit = 1000; // Use a large number to get all orders
			}

			const orders = this.db.getPaperTradingOrders(accountId, limit);
			return orders;
		} catch (error) {
			console.error('Error getting orders:', error);
			throw error;
		}
	}

	// Update order status
	async updateOrderStatus(orderId, newStatus) {
		try {
			// Find order by ID
			let order = null;
			for (const [_key, ord] of this.orders.entries()) {
				if (ord.id === orderId) {
					order = ord;
					break;
				}
			}

			if (!order) {
				throw new Error(`Order with ID ${orderId} not found`);
			}

			// Update status
			order.status = newStatus;
			order.updatedAt = new Date().toISOString();

			// Update in database
			await this.db.updatePaperTradingOrder(order);

			return order;
		} catch (error) {
			console.error('Error updating order status:', error);
			throw error;
		}
	}

	// Get all orders (for admin view)
	async getAllOrders(limit = 100) {
		try {
			const allOrders = [];
			const accounts = this.db.getPaperTradingAccounts();

			for (const account of accounts) {
				if (account && account.id) {
					const orders = this.db.getPaperTradingOrders(account.id, limit);
					allOrders.push(...orders);
				}
			}

			// Sort by creation date descending
			const sortedOrders = allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

			// Apply limit after sorting
			if (limit && limit !== 'all' && typeof limit === 'number' && limit > 0) {
				return sortedOrders.slice(0, limit);
			}

			return sortedOrders;
		} catch (error) {
			console.error('Error getting all orders:', error);
			throw error;
		}
	}

	// Get account performance statistics
	async getAccountStats(accountId) {
		try {
			const account = await this.getAccount(accountId);
			if (!account) return null;

			// Update unrealized P&L
			await this.updateUnrealizedPnL(accountId);

			const positions = await this.getPositions(accountId);
			const orders = await this.getOrderHistory(accountId);

			const stats = {
				account: account,
				positions: positions,
				totalPositions: positions.length,
				totalOrders: orders.length,
				winRate: account.totalTrades > 0 ?
					(account.winningTrades / account.totalTrades * 100).toFixed(2) + '%' : '0%',
				avgProfitPerTrade: account.totalTrades > 0 ?
					(account.realizedPnL / account.totalTrades).toFixed(2) : '0',
				totalUnrealizedPnL: positions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0).toFixed(2),
				portfolioValue: account.equity.toFixed(2)
			};

			return stats;
		} catch (error) {
			console.error('Error getting account stats:', error);
			throw error;
		}
	}

	// Calculate account equity
	async calculateAccountEquity(accountId) {
		try {
			const account = await this.getAccount(accountId);
			if (!account) return 0;

			const positions = await this.getPositions(accountId);
			const totalUnrealizedPnL = positions.reduce((sum, pos) => sum + (pos.unrealizedPnl || 0), 0);

			const equity = account.balance + totalUnrealizedPnL;
			return equity;
		} catch (error) {
			console.error('Error calculating account equity:', error);
			throw error;
		}
	}

	// Calculate total PnL (realized + unrealized)
	async calculateTotalPnL(accountId) {
		try {
			const account = await this.getAccount(accountId);
			if (!account) return 0;

			const positions = await this.getPositions(accountId);
			const totalUnrealizedPnL = positions.reduce((sum, pos) => sum + (pos.unrealizedPnl || 0), 0);

			const totalPnL = (account.realizedPnl || 0) + totalUnrealizedPnL;
			return totalPnL;
		} catch (error) {
			console.error('Error calculating total PnL:', error);
			throw error;
		}
	}

	// User settings methods
	async getUserSetting(userId, settingKey) {
		try {
			return this.db.getUserSetting(userId, settingKey);
		} catch (error) {
			console.error('Error getting user setting:', error);
			return null;
		}
	}

	async setUserSetting(userId, settingKey, settingValue) {
		try {
			return this.db.setUserSetting(userId, settingKey, settingValue);
		} catch (error) {
			console.error('Error setting user setting:', error);
			throw error;
		}
	}

	async getAllUserSettings(userId) {
		try {
			return this.db.getAllUserSettings(userId);
		} catch (error) {
			console.error('Error getting all user settings:', error);
			return [];
		}
	}

	// Database operations
	async saveAccount(account) {
		try {
			return this.db.createPaperTradingAccount(account);
		} catch (error) {
			console.error('Error saving account:', error);
			throw error;
		}
	}

	async updateAccount(account) {
		try {
			this.db.updatePaperTradingAccount(account);
		} catch (error) {
			console.error('Error updating account:', error);
			throw error;
		}
	}

	async saveOrder(order) {
		try {
			console.log('Saving order to database:', order);

			// Check if order already exists in database
			const existingOrder = this.db.getPaperTradingOrder(order.id);
			if (existingOrder) {
				throw new Error(`Order with ID ${order.id} already exists in database`);
			}

			// Ensure all required fields are present and have correct types
			const orderData = {
				id: order.id,
				accountId: order.accountId,
				symbol: order.symbol,
				side: order.side,
				type: order.type,
				quantity: parseFloat(order.quantity),
				price: parseFloat(order.price || 0),
				executionPrice: parseFloat(order.executionPrice || order.price || 0),
				amount: parseFloat(order.amount || 0),
				commission: parseFloat(order.commission || 0),
				status: order.status,
				isRealOrder: order.isRealOrder ? 1 : 0,
				binanceOrderId: order.binanceOrderId || null,
				createdAt: order.createdAt || new Date().toISOString(),
				filledAt: order.filledAt || null
			};

			console.log('Processed order data:', orderData);
			this.db.createPaperTradingOrder(orderData);
			console.log('Order saved successfully');
		} catch (error) {
			console.error('Error saving order:', error);
			throw error;
		}
	}

	async updateOrder(order) {
		try {
			this.db.updatePaperTradingOrder(order);
		} catch (error) {
			console.error('Error updating order:', error);
			throw error;
		}
	}

	async updatePosition(position) {
		try {
			console.log('Saving position to database:', position);

			// Ensure all required fields are present and have correct types
			const positionData = {
				id: position.id,
				accountId: position.accountId,
				symbol: position.symbol,
				side: position.side,
				quantity: parseFloat(position.quantity),
				avgPrice: parseFloat(position.avgPrice),
				currentPrice: parseFloat(position.currentPrice || position.avgPrice),
				unrealizedPnl: parseFloat(position.unrealizedPnl || 0),
				createdAt: position.createdAt || new Date().toISOString(),
				updatedAt: position.updatedAt || new Date().toISOString()
			};

			console.log('Processed position data:', positionData);
			this.db.updatePaperTradingPosition(positionData);
			console.log('Position saved successfully');
		} catch (error) {
			console.error('Error updating position:', error);
			throw error;
		}
	}

	async deletePosition(positionId) {
		try {
			console.log('Deleting position from database:', positionId);
			this.db.deletePaperTradingPosition(positionId);
			console.log('Position deleted successfully');
		} catch (error) {
			console.error('Error deleting position:', error);
			throw error;
		}
	}

	loadPositionsFromDatabase() {
		try {
			const dbPositions = this.db.getPaperTradingPositions();

			for (const dbPosition of dbPositions) {
				const position = {
					id: dbPosition.id,
					accountId: dbPosition.accountId,
					symbol: dbPosition.symbol,
					side: dbPosition.side,
					quantity: dbPosition.quantity,
					avgPrice: dbPosition.avgPrice,
					unrealizedPnl: dbPosition.unrealizedPnl,
					createdAt: dbPosition.createdAt,
					updatedAt: dbPosition.updatedAt
				};

				// Use positionKey as the key for consistency
				const positionKey = `${position.accountId}_${position.symbol}`;
				this.positions.set(positionKey, position);
			}

			console.log(`Loaded ${this.positions.size} positions from database`);
		} catch (error) {
			console.error('Error loading positions from database:', error);
		}
	}

	// Create a position directly (for testing and manual position creation)
	async createPosition(positionData) {
		try {
			const { accountId, symbol, side, quantity, avgPrice, currentPrice } = positionData;

			// Validate account exists
			const account = await this.getAccount(accountId);
			if (!account) {
				throw new Error('Account not found');
			}

			// Create position key
			const positionKey = `${accountId}_${symbol}`;

			// Check if position already exists
			if (this.positions.has(positionKey)) {
				throw new Error('Position already exists for this symbol');
			}

			// Create position
			const position = {
				id: `position_${uuidv4()}`,
				accountId: accountId,
				symbol: symbol,
				side: side || 'LONG',
				quantity: quantity,
				avgPrice: avgPrice,
				currentPrice: currentPrice || avgPrice,
				unrealizedPnl: 0,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			// Add to memory
			this.positions.set(positionKey, position);

			// Save to database
			await this.updatePosition(position);

			console.log(`Created position: ${symbol} ${side} ${quantity} @ $${avgPrice}`);
			return position;
		} catch (error) {
			console.error('Error creating position:', error);
			throw error;
		}
	}

	// Create an order directly (for testing and manual order creation)
	async createOrder(orderData) {
		try {
			const { accountId, symbol, side, type, quantity, price, executionPrice, amount, commission } = orderData;

			// Validate account exists
			const account = await this.getAccount(accountId);
			if (!account) {
				throw new Error('Account not found');
			}

			// Create order ID
			const timestamp = Date.now();
			const orderId = `order_${accountId}_${timestamp}_${uuidv4()}`;

			// Check if order with this ID already exists
			if (this.orders.has(orderId)) {
				throw new Error(`Order with ID ${orderId} already exists`);
			}

			// Create order
			const order = {
				id: orderId,
				accountId: accountId,
				symbol: symbol,
				side: side,
				type: type || 'MARKET',
				quantity: quantity,
				price: price,
				executionPrice: executionPrice || price,
				amount: amount || (quantity * (executionPrice || price)),
				commission: commission || ((amount || (quantity * (executionPrice || price))) * this.commission),
				status: 'FILLED',
				createdAt: new Date().toISOString(),
				filledAt: new Date().toISOString(),
				isRealOrder: false
			};

			// Add to memory
			this.orders.set(orderId, order);

			// Save to database
			await this.saveOrder(order);

			console.log(`Created order: ${side} ${quantity} ${symbol} @ $${executionPrice || price}`);
			return order;
		} catch (error) {
			console.error('Error creating order:', error);
			throw error;
		}
	}
}

module.exports = PaperTradingService;
