import { useState, useEffect, useCallback } from 'react';
import { useSignals } from '../hooks/useSignals';
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
		const matchesFilter = filterType === 'all' || signal.signalType.toLowerCase() === filterType;
		return matchesSearch && matchesFilter;
	});

	// Load current prices and expected signals
	const loadMarketData = useCallback(async () => {
		if (!sendMessage) return;

		try {
			// Get current prices for all cryptocurrencies
			const cryptocurrencies = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT'];
			const pricePromises = cryptocurrencies.map(async (symbol) => {
				try {
					const response = await sendMessage('get_market_data', { symbol, timeframe: '1m' });
					return { symbol, price: response?.currentPrice || 0 };
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
						expectedSignal: recentSignal.signalType,
						confidence: recentSignal.confidence,
						currentPrice: price,
						lastSignal: recentSignal.createdAt
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
	}, [sendMessage, signals]);

	useEffect(() => {
		// Listen for data updates and signal generation from WebSocket
		const handleDataUpdate = () => {
			refreshSignals();
		};

		const handleSignalGenerated = () => {
			console.log('🔄 Signals page: signalGenerated event received, refreshing data...');
			refreshSignals();
			loadMarketData(); // Also refresh market data when new signal is generated
		};

		window.addEventListener('dataUpdated', handleDataUpdate);
		window.addEventListener('signalGenerated', handleSignalGenerated);

		return () => {
			window.removeEventListener('dataUpdated', handleDataUpdate);
			window.removeEventListener('signalGenerated', handleSignalGenerated);
		};
	}, [refreshSignals, loadMarketData]);

	// Load market data when component mounts and when sendMessage is available
	useEffect(() => {
		if (sendMessage) {
			loadMarketData();
		}
	}, [sendMessage, loadMarketData]);

	// Refresh market data every 30 seconds
	useEffect(() => {
		const interval = setInterval(() => {
			if (sendMessage) {
				loadMarketData();
			}
		}, 30000);

		return () => clearInterval(interval);
	}, [sendMessage, loadMarketData]);

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
		<div data-testid="signals-page" className="p-6">
			<div className="mb-8">
				<div className="flex justify-between items-center">
					<div>
						<h1 data-testid="signals-title" className="text-3xl font-bold text-gray-900">Signals</h1>
						<p data-testid="signals-subtitle" className="text-gray-600">View and manage trading signals</p>
					</div>
					<div className="flex space-x-3">
						<button
							data-testid="refresh-data-button"
							onClick={loadMarketData}
							className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
						>
							<Filter className="w-4 h-4" />
							<span>Refresh Data</span>
						</button>
						<button
							data-testid="generate-signal-button"
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
			<div data-testid="filters-section" className="mb-6 flex flex-col sm:flex-row gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
					<input
						data-testid="search-input"
						type="text"
						placeholder="Search cryptocurrencies..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
					/>
				</div>
				<select
					data-testid="filter-select"
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
			<div data-testid="market-data-section" className="mb-8">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Recent Signals */}
					<div data-testid="recent-signals-card" className="bg-white rounded-lg shadow-md border border-gray-200">
						<div className="p-6 border-b border-gray-200">
							<h2 data-testid="recent-signals-title" className="text-xl font-semibold text-gray-900">Recent Signals</h2>
							<p data-testid="recent-signals-subtitle" className="text-sm text-gray-600 mt-1">Latest signals for each cryptocurrency</p>
						</div>
						<div className="p-6">
							{expectedSignals.length === 0 ? (
								<div data-testid="loading-recent-signals" className="text-center text-gray-500 py-4">
									Loading recent signals...
								</div>
							) : (
								<div data-testid="recent-signals-list" className="space-y-3">
									{expectedSignals.map((signal) => (
										<div key={signal.symbol} data-testid={`recent-signal-${signal.symbol}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
											<div className="flex items-center space-x-3">
												<div data-testid={`recent-signal-symbol-${signal.symbol}`} className="text-sm font-medium text-gray-900">
													{signal.symbol}
												</div>
												<span data-testid={`recent-signal-type-${signal.symbol}`} className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${signal.expectedSignal === 'buy' ? 'bg-green-100 text-green-800' :
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
												<div data-testid={`recent-signal-confidence-${signal.symbol}`} className="text-sm font-medium text-gray-900">
													{signal.expectedSignal === 'no signal' ? 'N/A' : (signal.confidence * 100).toFixed(0) + '%'}
												</div>
												<div data-testid={`recent-signal-confidence-label-${signal.symbol}`} className="text-xs text-gray-500">
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
					<div data-testid="current-prices-card" className="bg-white rounded-lg shadow-md border border-gray-200">
						<div className="p-6 border-b border-gray-200">
							<h2 data-testid="current-prices-title" className="text-xl font-semibold text-gray-900">Current Prices</h2>
							<p data-testid="current-prices-subtitle" className="text-sm text-gray-600 mt-1">Live cryptocurrency prices</p>
						</div>
						<div className="p-6">
							{Object.keys(currentPrices).length === 0 ? (
								<div data-testid="loading-current-prices" className="text-center text-gray-500 py-4">
									Loading current prices...
								</div>
							) : (
								<div data-testid="current-prices-list" className="space-y-3">
									{Object.entries(currentPrices).map(([symbol, price]) => (
										<div key={symbol} data-testid={`current-price-${symbol}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
											<div data-testid={`current-price-symbol-${symbol}`} className="text-sm font-medium text-gray-900">
												{symbol}
											</div>
											<div className="text-right">
												<div data-testid={`current-price-value-${symbol}`} className="text-sm font-semibold text-gray-900">
													${price ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}
												</div>
												<div data-testid={`current-price-label-${symbol}`} className="text-xs text-gray-500">
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
			<div data-testid="signals-table-section" className="bg-white rounded-lg shadow overflow-hidden">
				<div className="overflow-x-auto">
					<table data-testid="signals-table" className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th data-testid="signals-cryptocurrency-header" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Cryptocurrency
								</th>
								<th data-testid="signals-signal-header" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Signal
								</th>
								<th data-testid="signals-timeframe-header" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Timeframe
								</th>
								<th data-testid="signals-price-header" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Price
								</th>
								<th data-testid="signals-confidence-header" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Confidence
								</th>
								<th data-testid="signals-date-header" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Date
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{isLoading ? (
								<tr>
									<td colSpan="6" data-testid="signals-loading" className="px-6 py-4 text-center">
										<div data-testid="signals-loading-spinner" className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
									</td>
								</tr>
							) : filteredSignals.length === 0 ? (
								<tr>
									<td colSpan="6" data-testid="no-signals-found" className="px-6 py-4 text-center text-gray-500">
										No signals found
									</td>
								</tr>
							) : (
								filteredSignals.map((signal) => (
									<tr key={signal.id} data-testid={`signal-row-${signal.id}`} className="hover:bg-gray-50">
										<td data-testid={`signal-cryptocurrency-${signal.id}`} className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm font-medium text-gray-900">
												{signal.cryptocurrency}
											</div>
										</td>
										<td data-testid={`signal-type-${signal.id}`} className="px-6 py-4 whitespace-nowrap">
											<span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${signal.signalType === 'buy' ? 'bg-green-100 text-green-800' :
												signal.signalType === 'sell' ? 'bg-red-100 text-red-800' :
													'bg-yellow-100 text-yellow-800'
												}`}>
												{signal.signalType.toUpperCase()}
											</span>
										</td>
										<td data-testid={`signal-timeframe-${signal.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{signal.timeframe}
										</td>
										<td data-testid={`signal-price-${signal.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											${signal.price || 'N/A'}
										</td>
										<td data-testid={`signal-confidence-${signal.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{(signal.confidence * 100).toFixed(1)}%
										</td>
										<td data-testid={`signal-date-${signal.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{new Date(signal.createdAt).toLocaleString()}
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
				<div data-testid="generate-signal-modal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div data-testid="generate-signal-modal-content" className="bg-white rounded-lg p-6 w-full max-w-md">
						<h3 data-testid="generate-signal-modal-title" className="text-lg font-semibold mb-4">Generate Manual Signal</h3>
						<form data-testid="generate-signal-form" onSubmit={(e) => {
							e.preventDefault();
							const formData = new FormData(e.target);
							handleGenerateSignal(
								formData.get('cryptocurrency'),
								formData.get('timeframe')
							);
						}}>
							<div className="mb-4">
								<label data-testid="generate-signal-cryptocurrency-label" className="block text-sm font-medium text-gray-700 mb-2">
									Cryptocurrency
								</label>
								<input
									data-testid="generate-signal-cryptocurrency-input"
									type="text"
									name="cryptocurrency"
									placeholder="e.g., BTCUSDT"
									required
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
								/>
							</div>
							<div className="mb-6">
								<label data-testid="generate-signal-timeframe-label" className="block text-sm font-medium text-gray-700 mb-2">
									Timeframe
								</label>
								<select
									data-testid="generate-signal-timeframe-select"
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
									data-testid="generate-signal-cancel-button"
									type="button"
									onClick={() => setShowGenerateModal(false)}
									className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
								>
									Cancel
								</button>
								<button
									data-testid="generate-signal-submit-button"
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
