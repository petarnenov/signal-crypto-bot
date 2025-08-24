import React, { useState, useEffect, useCallback } from 'react';
import useWebSocket from '../hooks/useWebSocket';
import { useToast } from '../context/ToastContext';
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
	const { showToast } = useToast();
	const [isLoading, setIsLoading] = useState(true);
	const [accounts, setAccounts] = useState([]);
	const [positions, setPositions] = useState([]);
	const [orders, setOrders] = useState([]);
	const [selectedAccount, setSelectedAccount] = useState('');

	// Fetch paper trading data
	const fetchPaperTradingData = useCallback(async () => {
		if (!sendMessage) return;

		setIsLoading(true);
		try {
			// Fetch accounts
			const accountsResponse = await sendMessage('get_paper_trading_accounts');
			if (Array.isArray(accountsResponse)) {
				setAccounts(accountsResponse);
			} else if (accountsResponse?.data) {
				setAccounts(accountsResponse.data);
			}
		} catch (error) {
			console.error('Error fetching paper trading data:', error);
			showToast('Error fetching paper trading data', 'error');
		} finally {
			setIsLoading(false);
		}
	}, [sendMessage, showToast]);

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
		if (accounts.length > 0 && !selectedAccount) {
			setSelectedAccount(accounts[0].id);
		}
	}, [accounts, selectedAccount]);

	// Calculate total P&L
	const calculateTotalPnL = () => {
		return positions.reduce((total, position) => {
			return total + (position.unrealized_pnl || 0);
		}, 0);
	};

	// Calculate total equity
	const calculateTotalEquity = () => {
		const account = accounts.find(acc => acc.id === selectedAccount);
		return account ? account.equity : 0;
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
			</div>
		);
	}

	return (
		<div className="p-6">
			<div className="mb-8">
				<div className="flex justify-between items-center">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Paper Trading</h1>
						<p className="text-gray-600">Simulate trading with virtual funds</p>
					</div>
					<div className="flex space-x-3">
						<button
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
			<div className="mb-6">
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Select Account
				</label>
				<select
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
									{account.id} - ${account.balance?.toFixed(2)}
								</option>
							))}
						</>
					)}
				</select>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
				<div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Total Equity</p>
							<p className="text-2xl font-bold text-gray-900">
								${calculateTotalEquity().toFixed(2)}
							</p>
						</div>
						<DollarSign className="w-8 h-8 text-green-500" />
					</div>
				</div>

				<div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Unrealized P&L</p>
							<p className={`text-2xl font-bold ${calculateTotalPnL() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
								{calculateTotalPnL() >= 0 ? '+' : ''}${calculateTotalPnL().toFixed(2)}
							</p>
						</div>
						{calculateTotalPnL() >= 0 ? (
							<TrendingUp className="w-8 h-8 text-green-500" />
						) : (
							<TrendingDown className="w-8 h-8 text-red-500" />
						)}
					</div>
				</div>

				<div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Active Positions</p>
							<p className="text-2xl font-bold text-gray-900">
								{positions.length}
							</p>
						</div>
						<Package className="w-8 h-8 text-blue-500" />
					</div>
				</div>
			</div>

			{/* Positions */}
			<div className="bg-white rounded-lg shadow-md border border-gray-200 mb-8">
				<div className="p-6 border-b border-gray-200">
					<h2 className="text-xl font-semibold text-gray-900">Active Positions</h2>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Symbol
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Side
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Quantity
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Entry Price
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Current Price
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Unrealized P&L
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{positions.length === 0 ? (
								<tr>
									<td colSpan="7" className="px-6 py-4 text-center text-gray-500">
										No active positions
									</td>
								</tr>
							) : (
								positions.map((position) => (
									<tr key={position.id}>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
											{position.symbol}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${position.side === 'BUY'
												? 'bg-green-100 text-green-800'
												: 'bg-red-100 text-red-800'
												}`}>
												{position.side === 'BUY' ? <Plus className="w-3 h-3 mr-1" /> : <Minus className="w-3 h-3 mr-1" />}
												{position.side}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{position.quantity}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											${position.entry_price?.toFixed(2)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											${position.current_price?.toFixed(2)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm">
											<span className={position.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
												{position.unrealized_pnl >= 0 ? '+' : ''}${position.unrealized_pnl?.toFixed(2)}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											<button className="text-primary-600 hover:text-primary-900">
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
			<div className="bg-white rounded-lg shadow-md border border-gray-200">
				<div className="p-6 border-b border-gray-200">
					<h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Symbol
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Side
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Quantity
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Price
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Status
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Date
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{orders.length === 0 ? (
								<tr>
									<td colSpan="6" className="px-6 py-4 text-center text-gray-500">
										No orders found
									</td>
								</tr>
							) : (
								orders.map((order) => (
									<tr key={order.id}>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
											{order.symbol}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.side === 'BUY'
												? 'bg-green-100 text-green-800'
												: 'bg-red-100 text-red-800'
												}`}>
												{order.side === 'BUY' ? <Plus className="w-3 h-3 mr-1" /> : <Minus className="w-3 h-3 mr-1" />}
												{order.side}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{order.quantity}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											${order.price?.toFixed(2)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status === 'FILLED'
												? 'bg-green-100 text-green-800'
												: order.status === 'PENDING'
													? 'bg-yellow-100 text-yellow-800'
													: 'bg-red-100 text-red-800'
												}`}>
												{order.status}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{new Date(order.created_at).toLocaleDateString()}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}

export default PaperTrading;
