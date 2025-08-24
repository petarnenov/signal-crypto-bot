const CryptoBotDatabase = require('../database/db');
const BinanceService = require('./binance-service');
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
			const accountId = `paper_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
			const account = {
				id: accountId,
				userId: userId,
				balance: initialBalance,
				currency: currency,
				equity: initialBalance,
				unrealizedPnL: 0,
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
				unrealizedPnL: 0,
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

	// Place a market order
	async placeMarketOrder(accountId, symbol, side, quantity, price = null) {
		try {
			const account = await this.getAccount(accountId);
			if (!account) {
				throw new Error('Account not found');
			}

			// Get current market price if not provided
			if (!price) {
				const marketData = await this.binance.getMarketData(symbol, '1m');
				price = marketData.current_price;
			}

			// Apply slippage
			const executionPrice = side === 'BUY' ?
				price * (1 + this.slippage) :
				price * (1 - this.slippage);

			// Calculate order details
			const orderAmount = quantity * executionPrice;
			const commission = orderAmount * this.commission;
			const totalCost = orderAmount + commission;

			// Validate balance for buy orders
			if (side === 'BUY' && account.balance < totalCost) {
				throw new Error('Insufficient balance');
			}

			// Create order
			const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			const order = {
				id: orderId,
				accountId: accountId,
				symbol: symbol,
				side: side,
				type: 'MARKET',
				quantity: quantity,
				price: price,
				executionPrice: executionPrice,
				amount: orderAmount,
				commission: commission,
				status: 'FILLED',
				createdAt: new Date().toISOString(),
				filledAt: new Date().toISOString()
			};

			// Execute the order
			await this.executeOrder(order, account);

			// Save order
			this.orders.set(orderId, order);
			await this.saveOrder(order);

			console.log(`Executed ${side} order for ${quantity} ${symbol} at $${executionPrice}`);
			return order;

		} catch (error) {
			console.error('Error placing market order:', error);
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
			const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

	// Execute an order
	async executeOrder(order, account) {
		try {
			if (order.side === 'BUY') {
				// Buy order - deduct balance, add position
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
							accountId: dbPosition.account_id,
							symbol: dbPosition.symbol,
							side: dbPosition.side,
							quantity: dbPosition.quantity,
							avgPrice: dbPosition.avg_price,
							unrealizedPnL: dbPosition.unrealized_pnl,
							createdAt: dbPosition.created_at,
							updatedAt: dbPosition.updated_at
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
					position.updatedAt = new Date().toISOString();
				} else {
					// Create new position
					position = {
						id: positionKey,
						accountId: account.id,
						symbol: order.symbol,
						side: 'LONG',
						quantity: order.quantity,
						avgPrice: order.executionPrice,
						unrealizedPnL: 0,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					};
					this.positions.set(positionKey, position);
					console.log('Created new position:', position);
				}

			} else if (order.side === 'SELL') {
				// Sell order - add balance, reduce/close position
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
						// Delete position from database
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

			// Update account
			account.updatedAt = new Date().toISOString();
			await this.updateAccount(account);

			// Save position to database
			if (order.side === 'BUY') {
				const positionKey = `${account.id}_${order.symbol}`;
				const position = this.positions.get(positionKey);
				if (position) {
					await this.updatePosition(position);
				}
			}

		} catch (error) {
			console.error('Error executing order:', error);
			throw error;
		}
	}

	// Update unrealized P&L for all positions
	async updateUnrealizedPnL(accountId) {
		try {
			const account = await this.getAccount(accountId);
			if (!account) return;

			let totalUnrealizedPnL = 0;

			// Get all positions for this account
			const positions = Array.from(this.positions.values())
				.filter(pos => pos.accountId === accountId);

			for (const position of positions) {
				// Get current market price
				const marketData = await this.binance.getMarketData(position.symbol, '1m');
				const currentPrice = marketData.current_price;

				// Calculate unrealized P&L
				const unrealizedPnL = (currentPrice - position.avgPrice) * position.quantity;
				position.unrealizedPnL = unrealizedPnL;
				totalUnrealizedPnL += unrealizedPnL;

				// Update position
				position.updatedAt = new Date().toISOString();
				await this.updatePosition(position);
			}

			// Update account equity
			account.unrealizedPnL = totalUnrealizedPnL;
			account.equity = account.balance + totalUnrealizedPnL;
			account.updatedAt = new Date().toISOString();

			await this.updateAccount(account);

		} catch (error) {
			console.error('Error updating unrealized P&L:', error);
		}
	}

	// Get account positions
	async getPositions(accountId) {
		try {
			// Get positions from database
			const dbPositions = this.db.getPaperTradingPositions(accountId);

			// Update unrealized P&L for each position
			for (const position of dbPositions) {
				try {
					const marketData = await this.binance.getMarketData(position.symbol, '1m');
					const currentPrice = marketData.current_price;
					position.unrealizedPnL = (currentPrice - position.avg_price) * position.quantity;
					position.currentPrice = currentPrice;
				} catch (error) {
					console.warn(`Could not get market data for ${position.symbol}:`, error);
					position.unrealizedPnL = 0;
					position.currentPrice = position.avg_price;
				}
			}

			return dbPositions;
		} catch (error) {
			console.error('Error getting positions:', error);
			throw error;
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

	// Get orders (alias for getOrderHistory for compatibility)
	async getOrders(accountId, limit = 100) {
		try {
			const orders = this.db.getPaperTradingOrders(accountId, limit);
			return orders;
		} catch (error) {
			console.error('Error getting orders:', error);
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
				totalUnrealizedPnL: positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0).toFixed(2),
				portfolioValue: account.equity.toFixed(2)
			};

			return stats;
		} catch (error) {
			console.error('Error getting account stats:', error);
			throw error;
		}
	}

	// Database operations
	async saveAccount(account) {
		try {
			this.db.createPaperTradingAccount(account);
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
			this.db.createPaperTradingOrder(order);
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
			this.db.updatePaperTradingPosition(position);
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
			console.log('Loading positions from database...');
			const stmt = this.db.db.prepare(`
				SELECT * FROM paper_trading_positions
			`);
			const allPositions = stmt.all();

			allPositions.forEach(dbPosition => {
				const position = {
					id: dbPosition.id,
					accountId: dbPosition.account_id,
					symbol: dbPosition.symbol,
					side: dbPosition.side,
					quantity: dbPosition.quantity,
					avgPrice: dbPosition.avg_price,
					unrealizedPnL: dbPosition.unrealized_pnl,
					createdAt: dbPosition.created_at,
					updatedAt: dbPosition.updated_at
				};

				const positionKey = `${position.accountId}_${position.symbol}`;
				this.positions.set(positionKey, position);
			});

			console.log(`Loaded ${allPositions.length} positions from database`);
		} catch (error) {
			console.error('Error loading positions from database:', error);
		}
	}
}

module.exports = PaperTradingService;
