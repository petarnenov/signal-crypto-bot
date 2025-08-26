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
	const [ordersLimit, setOrdersLimit] = useState('all'); // 'all' or number
	const [showLimitSelector, setShowLimitSelector] = useState(false);



	// Separate state for orders count to ensure it updates
	// const [ordersCount, setOrdersCount] = useState(0);

	// Fetch paper trading data (no retry)
	const fetchPaperTradingData = useCallback(async () => {
		console.log(`🔄 [DEBUG] ===== fetchPaperTradingData START =====`);
		console.log(`🔄 [DEBUG] sendMessage available: ${!!sendMessage}`);
		console.log(`🔄 [DEBUG] Current ordersLimit: ${ordersLimit}`);
		console.log(`🔄 [DEBUG] Current selectedAccount: ${selectedAccount}`);

		if (!sendMessage) {
			console.log('⚠️ sendMessage not available');
			return;
		}

		setIsLoading(true);
		try {
			console.log('🔄 [DEBUG] Fetching accounts...');
			// Fetch accounts
			const accountsResponse = await sendMessage('get_paper_trading_accounts');
			if (Array.isArray(accountsResponse)) {
				setAccounts(accountsResponse);
			} else if (accountsResponse?.data) {
				setAccounts(accountsResponse.data);
			}
			console.log('🔄 [DEBUG] Accounts fetched');

			console.log('🔄 [DEBUG] Fetching positions...');
			// Fetch positions
			const positionsResponse = await sendMessage('get_paper_trading_positions');
			if (Array.isArray(positionsResponse)) {
				setPositions(positionsResponse);
			} else if (positionsResponse?.data) {
				setPositions(positionsResponse.data);
			}
			console.log('🔄 [DEBUG] Positions fetched');

			console.log('🔄 [DEBUG] Fetching orders...');
			// Fetch orders for selected account (if selected) or all orders
			const ordersParams = {
				...(selectedAccount && { accountId: selectedAccount }),
				limit: ordersLimit === 'all' ? 1000 : parseInt(ordersLimit) || 100
			};
			console.log('🔄 [DEBUG] Orders params:', ordersParams);

			const ordersResponse = await sendMessage('get_paper_trading_orders', ordersParams);
			const ordersData = Array.isArray(ordersResponse) ? ordersResponse : (ordersResponse?.data || []);
			console.log(`🔄 [DEBUG] Orders fetched: ${ordersData.length} orders`);

			setOrders(ordersData);

			console.log('✅ [DEBUG] Paper trading data fetched successfully');
		} catch (error) {
			console.error('❌ [DEBUG] Error fetching paper trading data:', error);
			// NO RETRY - just show error and continue
		} finally {
			setIsLoading(false);
			console.log(`🔄 [DEBUG] ===== fetchPaperTradingData END =====`);
		}
	}, [sendMessage, ordersLimit, selectedAccount]);

	// Load user settings
	const loadUserSettings = useCallback(async () => {
		if (!sendMessage) {
			console.log('⚠️ [DEBUG] sendMessage not available in loadUserSettings');
			return;
		}

		try {
			console.log('🔄 [DEBUG] Loading user settings...');
			console.log('🔄 [DEBUG] Sending get_user_setting message...');
			const response = await sendMessage('get_user_setting', {
				userId: 'default',
				settingKey: 'orders_limit'
			});

			console.log('🔄 [DEBUG] User settings response:', response);
			console.log('🔄 [DEBUG] Response type:', typeof response);
			console.log('🔄 [DEBUG] Response keys:', Object.keys(response || {}));

			if (response?.settingValue) {
				console.log(`🔄 [DEBUG] Setting orders limit to: ${response.settingValue}`);
				setOrdersLimit(response.settingValue);
			} else {
				console.log('🔄 [DEBUG] No setting value found, using default: all');
				console.log('🔄 [DEBUG] Response settingValue:', response?.settingValue);
				setOrdersLimit('all');
			}
		} catch (error) {
			console.error('❌ [DEBUG] Error loading user settings:', error);
		}
	}, [sendMessage]);

	// Save user setting
	const saveUserSetting = useCallback(async (settingKey, settingValue) => {
		console.log(`🔄 [DEBUG] ===== saveUserSetting START =====`);
		console.log(`🔄 [DEBUG] Setting key: ${settingKey}`);
		console.log(`🔄 [DEBUG] Setting value: ${settingValue}`);
		console.log(`🔄 [DEBUG] sendMessage available: ${!!sendMessage}`);

		if (!sendMessage) {
			console.log('⚠️ [DEBUG] sendMessage not available');
			return;
		}

		try {
			console.log('🔄 [DEBUG] Sending set_user_setting message...');
			const response = await sendMessage('set_user_setting', {
				userId: 'default',
				settingKey,
				settingValue
			});
			console.log('🔄 [DEBUG] set_user_setting response:', response);
			console.log('✅ [DEBUG] User setting saved successfully');
		} catch (error) {
			console.error('❌ [DEBUG] Error saving user setting:', error);
		}
		console.log(`🔄 [DEBUG] ===== saveUserSetting END =====`);
	}, [sendMessage]);

	// Handle orders limit change
	const handleOrdersLimitChange = useCallback(async (newLimit) => {
		console.log(`🔄 [DEBUG] ===== handleOrdersLimitChange START =====`);
		console.log(`🔄 [DEBUG] New limit requested: ${newLimit}`);
		console.log(`🔄 [DEBUG] Current ordersLimit: ${ordersLimit}`);

		// Update state immediately for UI responsiveness
		setOrdersLimit(newLimit);
		console.log(`🔄 [DEBUG] Set ordersLimit state to: ${newLimit}`);

		try {
			await saveUserSetting('orders_limit', newLimit);
			console.log(`🔄 [DEBUG] ✅ User setting saved successfully`);
		} catch (error) {
			console.error('❌ [DEBUG] Error saving user setting:', error);
		}

		console.log(`🔄 [DEBUG] ===== handleOrdersLimitChange END =====`);
	}, [saveUserSetting]);

	// Refresh data
	const handleRefresh = () => {
		fetchPaperTradingData();
	};

	// Load settings first, then data
	useEffect(() => {
		console.log('🔄 [DEBUG] useEffect for loadUserSettings triggered');
		console.log('🔄 [DEBUG] sendMessage available:', !!sendMessage);
		loadUserSettings();
	}, [loadUserSettings]);

	// Load data after settings are loaded
	useEffect(() => {
		if (ordersLimit) {
			fetchPaperTradingData();
		}
	}, [fetchPaperTradingData, selectedAccount]);

	// Refresh data when orders limit changes
	useEffect(() => {
		if (ordersLimit && sendMessage) {
			console.log(`🔄 [DEBUG] ===== useEffect triggered by ordersLimit change =====`);
			console.log(`🔄 [DEBUG] New ordersLimit: ${ordersLimit}`);
			console.log(`🔄 [DEBUG] sendMessage available: ${!!sendMessage}`);
			console.log(`🔄 [DEBUG] Calling fetchPaperTradingData...`);
			fetchPaperTradingData();
		}
	}, [ordersLimit, sendMessage]);

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

	// Close limit selector when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			console.log(`🔄 [DEBUG] Click outside detected, target:`, event.target);
			console.log(`🔄 [DEBUG] showLimitSelector: ${showLimitSelector}`);
			console.log(`🔄 [DEBUG] Is orders-limit-button: ${event.target.closest('[data-testid="orders-limit-button"]')}`);
			console.log(`🔄 [DEBUG] Is orders-limit-dropdown: ${event.target.closest('[data-testid="orders-limit-dropdown"]')}`);

			if (showLimitSelector && !event.target.closest('[data-testid="orders-limit-button"]') && !event.target.closest('[data-testid="orders-limit-dropdown"]')) {
				console.log('🔄 [DEBUG] Closing dropdown - clicked outside');
				setShowLimitSelector(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showLimitSelector]);

	// Listen for WebSocket updates
	useEffect(() => {
		const handleWebSocketEvent = (event) => {
			if (event.detail && event.detail.type) {
				const message = event.detail;

				// Update data when new orders are executed or errors occur
				if (message.type === 'paper_trading_order_executed' ||
					message.type === 'paper_trading_executed' ||
					message.type === 'paper_trading_error') {
					console.log('🔄 Paper trading update received, refreshing data from database...');
					console.log(`🔍 [DEBUG] WebSocket message type: ${message.type}`);
					console.log(`🔍 [DEBUG] WebSocket message data:`, message.data);

					// Refresh all data from database after order execution
					setTimeout(async () => {
						console.log('🔄 Refreshing all data from database after order execution...');
						await fetchPaperTradingData();
					}, 1000); // Wait 1 second for backend to process the order
				}
			}
		};

		// Add event listener for WebSocket messages
		window.addEventListener('websocket_message', handleWebSocketEvent);

		return () => {
			window.removeEventListener('websocket_message', handleWebSocketEvent);
		};
	}, [sendMessage, fetchPaperTradingData]);

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

		console.log(`🔍 [DEBUG] Filtering orders: total=${orders.length}, selectedAccount=${selectedAccount}, limit=${ordersLimit}`);

		// Filter by account and remove duplicates
		const uniqueOrders = orders.filter((order, index, self) => {
			// First check if it's for the selected account
			if (order.accountId !== selectedAccount) {
				return false;
			}

			const firstIndex = self.findIndex(o => o.id === order.id && o.accountId === selectedAccount);
			return index === firstIndex;
		});

		// Sort by date (newest first)
		const sortedOrders = uniqueOrders.sort((a, b) => {
			const dateA = new Date(a.createdAt || a.created_at || 0);
			const dateB = new Date(b.createdAt || b.created_at || 0);
			return dateB - dateA; // Sort by date descending (newest first)
		});

		console.log(`🔍 [DEBUG] Filtered orders result: ${sortedOrders.length} orders for account ${selectedAccount}`);

		return sortedOrders;
	}, [orders, selectedAccount, ordersLimit]);

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
							{/* Orders Limit Selector */}
							<div className="relative">
								<button
									data-testid="orders-limit-button"
									onClick={() => {
										console.log(`🔄 [DEBUG] Orders limit button clicked, current ordersLimit: ${ordersLimit}`);
										console.log(`🔄 [DEBUG] Current showLimitSelector: ${showLimitSelector}`);
										setShowLimitSelector(!showLimitSelector);
									}}
									className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
								>
									<span>Orders Limit: {ordersLimit === 'all' ? 'All' : ordersLimit}</span>
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
									</svg>
								</button>

								{showLimitSelector && (
									<div
										data-testid="orders-limit-dropdown"
										className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
										onClick={(e) => {
											e.stopPropagation();
											console.log('🔄 [DEBUG] Dropdown container clicked');
										}}
									>
										<div className="py-2">
											<button
												data-testid="limit-all"
												onClick={() => {
													console.log('🔄 [DEBUG] limit-all button clicked');
													handleOrdersLimitChange('all').then(() => {
														setShowLimitSelector(false);
													}).catch(error => {
														console.error('Error in handleOrdersLimitChange:', error);
														setShowLimitSelector(false);
													});
												}}
												className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${ordersLimit === 'all' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
											>
												All Orders
											</button>
											<button
												data-testid="limit-10"
												onClick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													console.log('🔄 [DEBUG] ===== limit-10 button clicked =====');
													console.log('🔄 [DEBUG] Current ordersLimit before change:', ordersLimit);
													console.log('🔄 [DEBUG] Calling handleOrdersLimitChange...');
													handleOrdersLimitChange('10').then(() => {
														console.log('🔄 [DEBUG] ✅ handleOrdersLimitChange completed successfully');
														setShowLimitSelector(false);
													}).catch(error => {
														console.error('❌ [DEBUG] Error in handleOrdersLimitChange:', error);
														setShowLimitSelector(false);
													});
												}}
												onMouseDown={(e) => {
													e.preventDefault();
													console.log('🔄 [DEBUG] limit-10 button mousedown');
												}}
												className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${ordersLimit === '10' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
											>
												10 Orders
											</button>
											<button
												data-testid="limit-20"
												onClick={() => {
													console.log('🔄 [DEBUG] limit-20 button clicked');
													handleOrdersLimitChange('20').then(() => {
														setShowLimitSelector(false);
													}).catch(error => {
														console.error('Error in handleOrdersLimitChange:', error);
														setShowLimitSelector(false);
													});
												}}
												className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${ordersLimit === '20' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
											>
												20 Orders
											</button>
											<button
												data-testid="limit-50"
												onClick={() => {
													console.log('🔄 [DEBUG] limit-50 button clicked');
													handleOrdersLimitChange('50').then(() => {
														setShowLimitSelector(false);
													}).catch(error => {
														console.error('Error in handleOrdersLimitChange:', error);
														setShowLimitSelector(false);
													});
												}}
												className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${ordersLimit === '50' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
											>
												50 Orders
											</button>
										</div>
									</div>
								)}
							</div>

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
						data-testid="account-selector"
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