import React, { useState, useEffect } from 'react';
import { useSignals } from '../context/SignalContext';
import { Filter, Search, Plus, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import useModal from '../hooks/useModal';
import useWebSocket from '../hooks/useWebSocket';

function Signals() {
	const { signals, isLoading, generateManualSignal, refreshSignals } = useSignals();
	const { sendMessage } = useWebSocket();
	const [searchTerm, setSearchTerm] = useState('');
	const [filterType, setFilterType] = useState('all');
	const [showGenerateModal, setShowGenerateModal] = useState(false);
	const [generatingSignal, setGeneratingSignal] = useState(false);
	const [currentPrices, setCurrentPrices] = useState({});
	const [expectedSignals, setExpectedSignals] = useState([]);
	const { showSuccess, showError } = useModal();

	const filteredSignals = signals.filter(signal => {
		const matchesSearch = signal.cryptocurrency.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesFilter = filterType === 'all' || signal.signal_type.toLowerCase() === filterType;
		return matchesSearch && matchesFilter;
	});

	// Load current prices and expected signals
	const loadMarketData = async () => {
		if (!sendMessage) return;

		try {
			// Get current prices for all cryptocurrencies
			const cryptocurrencies = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT'];
			const pricePromises = cryptocurrencies.map(async (symbol) => {
				try {
					const response = await sendMessage('get_market_data', { symbol, timeframe: '1m' });
					return { symbol, price: response?.current_price || 0 };
				} catch (error) {
					console.error(`Error fetching price for ${symbol}:`, error);
					return { symbol, price: 0 };
				}
			});

			const prices = await Promise.all(pricePromises);
			const priceMap = {};
			prices.forEach(({ symbol, price }) => {
				priceMap[symbol] = price;
			});
			setCurrentPrices(priceMap);

			// Get recent signals from the database to show as "expected" signals
			const recentSignals = signals.slice(0, 5); // Get last 5 signals
			const expected = cryptocurrencies.map(symbol => {
				const price = priceMap[symbol];
				if (!price) return null;

				// Find the most recent signal for this symbol
				const recentSignal = recentSignals.find(signal => 
					signal.cryptocurrency === symbol
				);

				if (recentSignal) {
					return {
						symbol,
						expectedSignal: recentSignal.signal_type,
						confidence: recentSignal.confidence,
						currentPrice: price,
						lastSignal: recentSignal.created_at
					};
				}

				// If no recent signal, show as "no signal"
				return {
					symbol,
					expectedSignal: 'no signal',
					confidence: 0,
					currentPrice: price,
					lastSignal: null
				};
			}).filter(Boolean);

			setExpectedSignals(expected);
		} catch (error) {
			console.error('Error loading market data:', error);
		}
	};

	useEffect(() => {
		// Listen for data updates from WebSocket
		const handleDataUpdate = () => {
			refreshSignals();
		};

		window.addEventListener('dataUpdated', handleDataUpdate);

		return () => {
			window.removeEventListener('dataUpdated', handleDataUpdate);
		};
	}, [refreshSignals]);

	// Load market data when component mounts and when sendMessage is available
	useEffect(() => {
		if (sendMessage) {
			loadMarketData();
		}
	}, [sendMessage]);

	// Refresh market data every 30 seconds
	useEffect(() => {
		const interval = setInterval(() => {
			if (sendMessage) {
				loadMarketData();
			}
		}, 30000);

		return () => clearInterval(interval);
	}, [sendMessage]);

	const handleGenerateSignal = async (cryptocurrency, timeframe) => {
		setGeneratingSignal(true);
		try {
			await generateManualSignal(cryptocurrency, timeframe);
			setShowGenerateModal(false);
			showSuccess('Success', `Signal generated successfully for ${cryptocurrency} (${timeframe})`);
		} catch (error) {
			console.error('Error generating signal:', error);
			showError('Error', 'Failed to generate signal. Please try again.');
		} finally {
			setGeneratingSignal(false);
		}
	};

	return (
		<div className="p-6">
			<div className="mb-8">
				<div className="flex justify-between items-center">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Signals</h1>
						<p className="text-gray-600">View and manage trading signals</p>
					</div>
					<div className="flex space-x-3">
						<button
							onClick={loadMarketData}
							className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
						>
							<Filter className="w-4 h-4" />
							<span>Refresh Data</span>
						</button>
						<button
							onClick={() => setShowGenerateModal(true)}
							className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
						>
							<Plus className="w-4 h-4" />
							<span>Generate Signal</span>
						</button>
					</div>
				</div>
			</div>

			{/* Filters */}
			<div className="mb-6 flex flex-col sm:flex-row gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
					<input
						type="text"
						placeholder="Search cryptocurrencies..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
					/>
				</div>
				<select
					value={filterType}
					onChange={(e) => setFilterType(e.target.value)}
					className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
				>
					<option value="all">All Signals</option>
					<option value="buy">Buy Signals</option>
					<option value="sell">Sell Signals</option>
					<option value="hold">Hold Signals</option>
				</select>
			</div>

			{/* Expected Signals and Current Prices */}
			<div className="mb-8">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Recent Signals */}
					<div className="bg-white rounded-lg shadow-md border border-gray-200">
						<div className="p-6 border-b border-gray-200">
							<h2 className="text-xl font-semibold text-gray-900">Recent Signals</h2>
							<p className="text-sm text-gray-600 mt-1">Latest signals for each cryptocurrency</p>
						</div>
						<div className="p-6">
							{expectedSignals.length === 0 ? (
								<div className="text-center text-gray-500 py-4">
									Loading recent signals...
								</div>
							) : (
								<div className="space-y-3">
									{expectedSignals.map((signal) => (
										<div key={signal.symbol} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
											<div className="flex items-center space-x-3">
												<div className="text-sm font-medium text-gray-900">
													{signal.symbol}
												</div>
												<span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
													signal.expectedSignal === 'buy' ? 'bg-green-100 text-green-800' :
													signal.expectedSignal === 'sell' ? 'bg-red-100 text-red-800' :
													signal.expectedSignal === 'hold' ? 'bg-yellow-100 text-yellow-800' :
													'bg-gray-100 text-gray-800'
												}`}>
													{signal.expectedSignal === 'buy' && <TrendingUp className="w-3 h-3 mr-1" />}
													{signal.expectedSignal === 'sell' && <TrendingDown className="w-3 h-3 mr-1" />}
													{signal.expectedSignal === 'hold' && <Minus className="w-3 h-3 mr-1" />}
													{signal.expectedSignal === 'no signal' ? 'NO SIGNAL' : signal.expectedSignal.toUpperCase()}
												</span>
											</div>
											<div className="text-right">
												<div className="text-sm font-medium text-gray-900">
													{signal.expectedSignal === 'no signal' ? 'N/A' : (signal.confidence * 100).toFixed(0) + '%'}
												</div>
												<div className="text-xs text-gray-500">
													{signal.expectedSignal === 'no signal' ? 'No recent signal' : 'Confidence'}
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Current Prices */}
					<div className="bg-white rounded-lg shadow-md border border-gray-200">
						<div className="p-6 border-b border-gray-200">
							<h2 className="text-xl font-semibold text-gray-900">Current Prices</h2>
							<p className="text-sm text-gray-600 mt-1">Live cryptocurrency prices</p>
						</div>
						<div className="p-6">
							{Object.keys(currentPrices).length === 0 ? (
								<div className="text-center text-gray-500 py-4">
									Loading current prices...
								</div>
							) : (
								<div className="space-y-3">
									{Object.entries(currentPrices).map(([symbol, price]) => (
										<div key={symbol} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
											<div className="text-sm font-medium text-gray-900">
												{symbol}
											</div>
											<div className="text-right">
												<div className="text-sm font-semibold text-gray-900">
													${price ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}
												</div>
												<div className="text-xs text-gray-500">
													Current Price
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Signals Table */}
			<div className="bg-white rounded-lg shadow overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Cryptocurrency
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Signal
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Timeframe
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Price
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Confidence
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Date
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{isLoading ? (
								<tr>
									<td colSpan="6" className="px-6 py-4 text-center">
										<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
									</td>
								</tr>
							) : filteredSignals.length === 0 ? (
								<tr>
									<td colSpan="6" className="px-6 py-4 text-center text-gray-500">
										No signals found
									</td>
								</tr>
							) : (
								filteredSignals.map((signal) => (
									<tr key={signal.id} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm font-medium text-gray-900">
												{signal.cryptocurrency}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${signal.signal_type === 'buy' ? 'bg-green-100 text-green-800' :
												signal.signal_type === 'sell' ? 'bg-red-100 text-red-800' :
													'bg-yellow-100 text-yellow-800'
												}`}>
												{signal.signal_type.toUpperCase()}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{signal.timeframe}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											${signal.price || 'N/A'}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{(signal.confidence * 100).toFixed(1)}%
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{new Date(signal.created_at).toLocaleString()}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Generate Signal Modal */}
			{showGenerateModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 w-full max-w-md">
						<h3 className="text-lg font-semibold mb-4">Generate Manual Signal</h3>
						<form onSubmit={(e) => {
							e.preventDefault();
							const formData = new FormData(e.target);
							handleGenerateSignal(
								formData.get('cryptocurrency'),
								formData.get('timeframe')
							);
						}}>
							<div className="mb-4">
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Cryptocurrency
								</label>
								<input
									type="text"
									name="cryptocurrency"
									placeholder="e.g., BTCUSDT"
									required
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
								/>
							</div>
							<div className="mb-6">
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Timeframe
								</label>
								<select
									name="timeframe"
									required
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
								>
									<option value="1m">1 minute</option>
									<option value="5m">5 minutes</option>
									<option value="15m">15 minutes</option>
									<option value="1h">1 hour</option>
									<option value="4h">4 hours</option>
									<option value="1d">1 day</option>
								</select>
							</div>
							<div className="flex justify-end space-x-3">
								<button
									type="button"
									onClick={() => setShowGenerateModal(false)}
									className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={generatingSignal}
									className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
								>
									{generatingSignal ? 'Generating...' : 'Generate'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}

export default Signals;
