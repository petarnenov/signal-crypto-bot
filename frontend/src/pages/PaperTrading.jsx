import { useState, useEffect, useCallback, useMemo } from 'react';
import useWebSocket from '../hooks/useWebSocket';
// import { useToast } from '../context/ToastContext';
import WebSocketErrorBoundary from '../components/WebSocketErrorBoundary';
import {
	TrendingUp,
	TrendingDown,
	DollarSign,
	Package,
	RefreshCw,
	Plus,
	Minus,
	Eye
} from 'lucide-react';

function PaperTrading() {
	const { sendMessage } = useWebSocket();
	// const { showToast } = useToast();
	const [isLoading, setIsLoading] = useState(true);
	const [accounts, setAccounts] = useState([]);
	const [positions, setPositions] = useState([]);
	const [orders, setOrders] = useState([]);
	const [selectedAccount, setSelectedAccount] = useState(() => {
		// Try to restore selected account from localStorage
		const saved = localStorage.getItem('paperTradingSelectedAccount');
		return saved || '';
	});

	// Track processed order IDs to prevent duplicates
	const [processedOrderIds, setProcessedOrderIds] = useState(new Set());

	// Separate state for orders count to ensure it updates
	// const [ordersCount, setOrdersCount] = useState(0);

	// Fetch paper trading data (no retry)
	const fetchPaperTradingData = useCallback(async () => {
		if (!sendMessage) {
			console.log('⚠️ sendMessage not available');
			return;
		}

		setIsLoading(true);
		try {
			console.log('🔄 Fetching paper trading data...');

			// Fetch accounts
			const accountsResponse = await sendMessage('get_paper_trading_accounts');
			if (Array.isArray(accountsResponse)) {
				setAccounts(accountsResponse);
			} else if (accountsResponse?.data) {
				setAccounts(accountsResponse.data);
			}

			// Fetch positions
			const positionsResponse = await sendMessage('get_paper_trading_positions');
			if (Array.isArray(positionsResponse)) {
				setPositions(positionsResponse);
			} else if (positionsResponse?.data) {
				setPositions(positionsResponse.data);
			}

			// Fetch orders
			const ordersResponse = await sendMessage('get_paper_trading_orders', { limit: 20 });
			if (Array.isArray(ordersResponse)) {
				setOrders(ordersResponse);
			} else if (ordersResponse?.data) {
				setOrders(ordersResponse.data);
			}

			// Initialize processed order IDs with existing orders to prevent duplicates
			const ordersData = Array.isArray(ordersResponse) ? ordersResponse : (ordersResponse?.data || []);
			const existingOrderIds = ordersData.map(order => order.id);
			setProcessedOrderIds(prev => new Set([...prev, ...existingOrderIds]));

			console.log('✅ Paper trading data fetched successfully');
		} catch (error) {
			console.error('Error fetching paper trading data:', error);
			// NO RETRY - just show error and continue
		} finally {
			setIsLoading(false);
		}
	}, [sendMessage]);

	// Refresh data
	const handleRefresh = () => {
		fetchPaperTradingData();
	};

	// Load data on mount
	useEffect(() => {
		fetchPaperTradingData();
	}, [fetchPaperTradingData]);

	// Auto-select first account when accounts are loaded
	useEffect(() => {
		if (accounts.length > 0) {
			// Check if current selected account still exists
			const accountExists = accounts.find(acc => acc.id === selectedAccount);

			if (!selectedAccount || !accountExists) {
				console.log('🔄 Auto-selecting first account:', accounts[0].id);
				setSelectedAccount(accounts[0].id);
			}
		}
	}, [accounts, selectedAccount]);

	// Save selected account to localStorage when it changes
	useEffect(() => {
		if (selectedAccount) {
			localStorage.setItem('paperTradingSelectedAccount', selectedAccount);
		}
	}, [selectedAccount]);

	// Listen for WebSocket updates
	useEffect(() => {
		const handleWebSocketEvent = (event) => {
			if (event.detail && event.detail.type) {
				const message = event.detail;

				// Update data when new orders are executed
				if (message.type === 'paper_trading_order_executed' ||
					message.type === 'paper_trading_executed') {
					console.log('🔄 Paper trading update received, updating specific data...');

					// Update only the specific data that changed
					if (message.type === 'paper_trading_order_executed') {
						const orderId = message.data.orderId;

						// Check if we've already processed this order
						if (processedOrderIds.has(orderId)) {
							console.log('🔄 Order already processed, skipping:', orderId);
							return;
						}

						// Mark this order as processed
						setProcessedOrderIds(prev => new Set([...prev, orderId]));

						// Add new order to the orders list
						const newOrder = {
							id: orderId,
							accountId: message.data.accountId,
							symbol: message.data.symbol,
							side: message.data.side,
							quantity: message.data.quantity,
							price: message.data.executionPrice, // Use 'price' to match database
							executionPrice: message.data.executionPrice,
							amount: message.data.amount,
							commission: message.data.commission,
							status: 'FILLED',
							created_at: message.data.timestamp, // Use the timestamp from the message
							createdAt: message.data.timestamp,
							filledAt: message.data.timestamp,
							isRealOrder: message.data.isRealOrder
						};

						console.log('🆕 New order created with timestamp:', message.data.timestamp);

						console.log('➕ Adding new order:', orderId);
						setOrders(prevOrders => {
							// Check if order already exists to prevent duplicates
							const orderExists = prevOrders.some(order => order.id === orderId);
							if (orderExists) {
								console.log('🔄 Order already exists in list, skipping:', orderId);
								return prevOrders;
							}

							// Add new order at the beginning - it will be sorted correctly by filteredOrders
							const newOrders = [newOrder, ...prevOrders];
							// Keep only the latest 50 orders to prevent memory issues
							return newOrders.slice(0, 50);
						});
					}

					// Update accounts and positions after order execution to refresh Total Equity
					// This is needed to show updated balances and positions
					setTimeout(async () => {
						console.log('🔄 Refreshing accounts and positions after order execution...');
						try {
							// Fetch only accounts and positions, not orders
							const accountsResponse = await sendMessage('get_paper_trading_accounts', {});
							if (Array.isArray(accountsResponse)) {
								setAccounts(accountsResponse);
							} else if (accountsResponse?.data) {
								setAccounts(accountsResponse.data);
							}

							const positionsResponse = await sendMessage('get_paper_trading_positions', {});
							if (Array.isArray(positionsResponse)) {
								setPositions(positionsResponse);
							} else if (positionsResponse?.data) {
								setPositions(positionsResponse.data);
							}
						} catch (error) {
							console.error('Error refreshing accounts and positions:', error);
							// Don't retry - just log the error
						}
					}, 1000); // Wait 1 second for backend to process the order
				}
			}
		};

		// Add event listener for WebSocket messages
		window.addEventListener('websocket_message', handleWebSocketEvent);

		return () => {
			window.removeEventListener('websocket_message', handleWebSocketEvent);
		};
	}, [processedOrderIds, sendMessage]);

	// Calculate current balance (cash balance)
	const calculateCurrentBalance = () => {
		if (!accounts.length || !selectedAccount) return 0;
		const account = accounts.find(acc => acc.id === selectedAccount);
		return account ? (account.balance || 0) : 0;
	};

	// Calculate total equity
	const calculateTotalEquity = () => {
		if (!accounts.length || !selectedAccount) return 0;
		const account = accounts.find(acc => acc.id === selectedAccount);
		return account ? (account.equity || 0) : 0;
	};

	// Calculate total P&L
	const calculateTotalPnL = () => {
		if (!accounts.length || !selectedAccount) return 0;
		const account = accounts.find(acc => acc.id === selectedAccount);
		return account ? (account.unrealizedPnl || 0) : 0;
	};

	// Calculate initial balance
	const calculateInitialBalance = () => {
		if (!accounts.length || !selectedAccount) return 0;
		const account = accounts.find(acc => acc.id === selectedAccount);
		return account ? 1000 : 0; // Initial balance is always $1000
	};

	// Filter positions by selected account
	const filteredPositions = useMemo(() => {
		if (!positions.length || !selectedAccount) return [];
		return positions.filter(position => position.accountId === selectedAccount);
	}, [positions, selectedAccount]);

	// Filter orders by selected account and sort by date (newest first)
	const filteredOrders = useMemo(() => {
		if (!orders.length || !selectedAccount) return [];
		return orders
			.filter(order => order.accountId === selectedAccount)
			.sort((a, b) => {
				const dateA = new Date(a.createdAt || a.created_at || 0);
				const dateB = new Date(b.createdAt || b.created_at || 0);
				return dateB - dateA; // Sort by date descending (newest first)
			});
	}, [orders, selectedAccount]);

	// Update orders count whenever orders array changes
	// useEffect(() => {
	// 	setOrdersCount(orders.length);
	// }, [orders]);

	if (isLoading) {
		return (
			<div data-testid="paper-trading-page" className="flex items-center justify-center h-full">
				<div data-testid="loading-spinner" className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
			</div>
		);
	}

	return (
		<WebSocketErrorBoundary onRetry={handleRefresh}>
			<div data-testid="paper-trading-page" className="p-6">
				<div className="mb-8">
					<div className="flex justify-between items-center">
						<div>
							<h1 data-testid="paper-trading-title" className="text-3xl font-bold text-gray-900">Paper Trading</h1>
							<p data-testid="paper-trading-subtitle" className="text-gray-600">Simulate trading with virtual funds</p>
						</div>
						<div className="flex space-x-3">
							<button
								data-testid="refresh-button"
								onClick={handleRefresh}
								className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
							>
								<RefreshCw className="w-4 h-4" />
								<span>Refresh</span>
							</button>
						</div>
					</div>
				</div>

				{/* Account Selection */}
				<div data-testid="account-selection" className="mb-6">
					<label data-testid="account-selection-label" className="block text-sm font-medium text-gray-700 mb-2">
						Select Account
					</label>
					<select
						data-testid="account-select"
						value={selectedAccount}
						onChange={(e) => setSelectedAccount(e.target.value)}
						className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
						disabled={accounts.length === 0}
					>
						{accounts.length === 0 ? (
							<option value="">No accounts available</option>
						) : (
							<>
								<option value="">Select an account</option>
								{accounts.map((account) => (
									<option key={account.id} value={account.id}>
										{account.id} - ${(account.balance || 0).toFixed(2)}
									</option>
								))}
							</>
						)}
					</select>
				</div>

				{/* Summary Cards */}
				<div data-testid="summary-cards" className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
					<div data-testid="initial-balance-card" className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
						<div className="flex items-center justify-between">
							<div>
								<p data-testid="initial-balance-label" className="text-sm font-medium text-gray-600">Initial Balance</p>
								<p data-testid="initial-balance-value" className="text-2xl font-bold text-gray-900">
									${(calculateInitialBalance() || 0).toFixed(2)}
								</p>
							</div>
							<DollarSign className="w-8 h-8 text-gray-500" />
						</div>
					</div>

					<div data-testid="current-balance-card" className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
						<div className="flex items-center justify-between">
							<div>
								<p data-testid="current-balance-label" className="text-sm font-medium text-gray-600">Current Balance</p>
								<p data-testid="current-balance-value" className="text-2xl font-bold text-blue-600">
									${(calculateCurrentBalance() || 0).toFixed(2)}
								</p>
							</div>
							<DollarSign className="w-8 h-8 text-blue-500" />
						</div>
					</div>

					<div data-testid="total-equity-card" className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
						<div className="flex items-center justify-between">
							<div>
								<p data-testid="total-equity-label" className="text-sm font-medium text-gray-600">Total Equity</p>
								<p data-testid="total-equity-value" className="text-2xl font-bold text-gray-900">
									${(calculateTotalEquity() || 0).toFixed(2)}
								</p>
							</div>
							<DollarSign className="w-8 h-8 text-green-500" />
						</div>
					</div>

					<div data-testid="unrealized-pnl-card" className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
						<div className="flex items-center justify-between">
							<div>
								<p data-testid="unrealized-pnl-label" className="text-sm font-medium text-gray-600">Unrealized P&L</p>
								<p data-testid="unrealized-pnl-value" className={`text-2xl font-bold ${(calculateTotalPnL() || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
									{(calculateTotalPnL() || 0) >= 0 ? '+' : ''}${(calculateTotalPnL() || 0).toFixed(2)}
								</p>
							</div>
							{(calculateTotalPnL() || 0) >= 0 ? (
								<TrendingUp className="w-8 h-8 text-green-500" />
							) : (
								<TrendingDown className="w-8 h-8 text-red-500" />
							)}
						</div>
					</div>

					<div data-testid="active-positions-card" className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
						<div className="flex items-center justify-between">
							<div>
								<p data-testid="active-positions-label" className="text-sm font-medium text-gray-600">Active Positions</p>
								<p data-testid="active-positions-value" className="text-2xl font-bold text-gray-900">
									{selectedAccount ? filteredPositions.length : 0}
								</p>
							</div>
							<Package className="w-8 h-8 text-blue-500" />
						</div>
					</div>
				</div>

				{/* Positions */}
				<div data-testid="positions-section" className="bg-white rounded-lg shadow-md border border-gray-200 mb-8">
					<div className="p-6 border-b border-gray-200">
						<h2 data-testid="positions-title" className="text-xl font-semibold text-gray-900">
							Active Positions
							<span data-testid="positions-count" className="ml-2 text-sm font-normal text-gray-500">
								({selectedAccount ? filteredPositions.length : 0})
							</span>
						</h2>
					</div>
					<div className="overflow-x-auto">
						<table data-testid="positions-table" className="w-full">
							<thead className="bg-gray-50">
								<tr>
									<th data-testid="positions-symbol-header" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Symbol
									</th>
									<th data-testid="positions-side-header" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Side
									</th>
									<th data-testid="positions-quantity-header" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Quantity
									</th>
									<th data-testid="positions-entry-price-header" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Entry Price
									</th>
									<th data-testid="positions-current-price-header" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Current Price
									</th>
									<th data-testid="positions-current-value-header" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Current Value
									</th>
									<th data-testid="positions-unrealized-pnl-header" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Unrealized P&L
									</th>
									<th data-testid="positions-actions-header" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{!selectedAccount ? (
									<tr>
										<td colSpan="8" data-testid="no-account-selected" className="px-6 py-4 text-center text-gray-500">
											Please select an account
										</td>
									</tr>
								) : filteredPositions.length === 0 ? (
									<tr>
										<td colSpan="8" data-testid="no-positions" className="px-6 py-4 text-center text-gray-500">
											No active positions
										</td>
									</tr>
								) : (
									filteredPositions.map((position) => (
										<tr key={position.id} data-testid={`position-row-${position.id}`}>
											<td data-testid={`position-symbol-${position.id}`} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
												{position.symbol}
											</td>
											<td data-testid={`position-side-${position.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${position.side === 'LONG'
													? 'bg-green-100 text-green-800'
													: 'bg-red-100 text-red-800'
													}`}>
													{position.side === 'LONG' ? <Plus className="w-3 h-3 mr-1" /> : <Minus className="w-3 h-3 mr-1" />}
													{position.side}
												</span>
											</td>
											<td data-testid={`position-quantity-${position.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												{position.quantity}
											</td>
											<td data-testid={`position-entry-price-${position.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												${position.avgPrice?.toFixed(2) || 'N/A'}
											</td>
											<td data-testid={`position-current-price-${position.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												${position.currentPrice?.toFixed(2) || 'N/A'}
											</td>
											<td data-testid={`position-current-value-${position.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												${((position.quantity || 0) * (position.currentPrice || 0))?.toFixed(2) || 'N/A'}
											</td>
											<td data-testid={`position-unrealized-pnl-${position.id}`} className="px-6 py-4 whitespace-nowrap text-sm">
												<span className={(position.unrealizedPnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
													{(position.unrealizedPnl || 0) >= 0 ? '+' : ''}${(position.unrealizedPnl || 0)?.toFixed(2) || '0.00'}
												</span>
											</td>
											<td data-testid={`position-actions-${position.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												<button data-testid={`position-view-button-${position.id}`} className="text-primary-600 hover:text-primary-900">
													<Eye className="w-4 h-4" />
												</button>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>

				{/* Recent Orders */}
				<div data-testid="orders-section" className="bg-white rounded-lg shadow-md border border-gray-200">
					<div className="p-6 border-b border-gray-200">
						<h2 data-testid="orders-title" className="text-xl font-semibold text-gray-900">
							Recent Orders
							<span data-testid="orders-count" className="ml-2 text-sm font-normal text-gray-500">
								({selectedAccount ? filteredOrders.length : 0})
							</span>
						</h2>
					</div>
					<div className="overflow-x-auto">
						<table data-testid="orders-table" className="w-full">
							<thead className="bg-gray-50">
								<tr>
									<th data-testid="orders-symbol-header" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Symbol
									</th>
									<th data-testid="orders-side-header" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Side
									</th>
									<th data-testid="orders-quantity-header" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Quantity
									</th>
									<th data-testid="orders-price-header" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Price
									</th>
									<th data-testid="orders-status-header" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Status
									</th>
									<th data-testid="orders-date-header" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Date
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{!selectedAccount ? (
									<tr>
										<td colSpan="6" data-testid="no-account-selected-orders" className="px-6 py-4 text-center text-gray-500">
											Please select an account
										</td>
									</tr>
								) : filteredOrders.length === 0 ? (
									<tr>
										<td colSpan="6" data-testid="no-orders" className="px-6 py-4 text-center text-gray-500">
											No orders found
										</td>
									</tr>
								) : (
									filteredOrders.map((order) => (
										<tr key={order.id} data-testid={`order-row-${order.id}`}>
											<td data-testid={`order-symbol-${order.id}`} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
												{order.symbol}
											</td>
											<td data-testid={`order-side-${order.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.side === 'BUY'
													? 'bg-green-100 text-green-800'
													: 'bg-red-100 text-red-800'
													}`}>
													{order.side === 'BUY' ? <Plus className="w-3 h-3 mr-1" /> : <Minus className="w-3 h-3 mr-1" />}
													{order.side}
												</span>
											</td>
											<td data-testid={`order-quantity-${order.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												{order.quantity}
											</td>
											<td data-testid={`order-price-${order.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												${order.executionPrice?.toFixed(2) || 'N/A'}
											</td>
											<td data-testid={`order-status-${order.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status === 'FILLED'
													? 'bg-green-100 text-green-800'
													: order.status === 'PENDING'
														? 'bg-yellow-100 text-yellow-800'
														: 'bg-red-100 text-red-800'
													}`}>
													{order.status}
												</span>
											</td>
											<td data-testid={`order-date-${order.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</WebSocketErrorBoundary>
	);
}

export default PaperTrading;