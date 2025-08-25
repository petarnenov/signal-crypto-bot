import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, DollarSign, Users, Clock } from 'lucide-react';
import SignalChart from '../components/SignalChart';
import RecentSignals from '../components/RecentSignals';
import StatusCard from '../components/StatusCard';
import useWebSocket from '../hooks/useWebSocket';

function Dashboard() {
	const [stats, setStats] = useState({
		totalSignals: 0,
		profitableSignals: 0,
		losingSignals: 0,
		avgProfitLoss: 0,
		totalVolume: 0,
		activeTime: 0
	});

	const [recentSignals, setRecentSignals] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [lastUpdate, setLastUpdate] = useState(0);
	const [retryCount, setRetryCount] = useState(0);
	const { sendMessage } = useWebSocket();

	useEffect(() => {
		// Try to fetch data when sendMessage is available
		const fetchDashboardData = async () => {
			try {
				const [statsData, signalsData] = await Promise.all([
					sendMessage('get_stats'),
					sendMessage('get_signals', { limit: 10 })
				]);

				// Map backend field names to frontend expected names
				setStats({
					totalSignals: statsData.total_signals || 0,
					profitableSignals: statsData.profitable_signals || 0,
					losingSignals: statsData.losing_signals || 0,
					avgProfitLoss: statsData.avg_profit_loss || 0,
					totalVolume: statsData.total_volume || 0,
					activeTime: statsData.active_time || 0
				});

				setRecentSignals(signalsData);
				setIsLoading(false);
				setLastUpdate(Date.now());
			} catch (error) {
				console.error('Error fetching dashboard data:', error);
				// Retry after 2 seconds if failed, but limit retries
				if (retryCount < 3) {
					setRetryCount(prev => prev + 1);
					setTimeout(() => {
						if (sendMessage) {
							fetchDashboardData();
						}
					}, 2000);
				} else {
					// Stop retrying and show error state
					console.error('Max retries reached for dashboard data');
					setIsLoading(false);
					setRetryCount(0); // Reset for next attempt
				}
			}
		};

		if (sendMessage) {
			fetchDashboardData();
		}

		// Listen for all WebSocket updates with debounce
		const handleWebSocketUpdate = () => {
			const now = Date.now();
			if (now - lastUpdate > 1000) { // Debounce to 1 second
				setLastUpdate(now);
				if (sendMessage) {
					fetchDashboardData();
				}
			}
		};

		// Listen for various WebSocket events
		window.addEventListener('dataUpdated', handleWebSocketUpdate);
		window.addEventListener('signalGenerated', handleWebSocketUpdate);
		window.addEventListener('configUpdated', handleWebSocketUpdate);

		return () => {
			window.removeEventListener('dataUpdated', handleWebSocketUpdate);
			window.removeEventListener('signalGenerated', handleWebSocketUpdate);
			window.removeEventListener('configUpdated', handleWebSocketUpdate);
		};
	}, [sendMessage, lastUpdate, retryCount]);

	if (isLoading) {
		return (
			<div data-testid="dashboard-page" className="flex items-center justify-center h-full">
				<div data-testid="loading-spinner" className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
			</div>
		);
	}

	return (
		<div data-testid="dashboard-page" className="p-6">
			<div className="mb-8">
				<h1 data-testid="dashboard-title" className="text-3xl font-bold text-gray-900">Dashboard</h1>
				<p data-testid="dashboard-subtitle" className="text-gray-600">Crypto Signal Bot Overview</p>
			</div>

			{/* Stats Cards */}
			<div data-testid="stats-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
				<StatusCard
					data-testid="total-signals-card"
					title="Total Signals"
					value={stats.totalSignals || 0}
					icon={<Activity className="w-6 h-6" />}
					color="blue"
				/>
				<StatusCard
					data-testid="profitable-signals-card"
					title="Profitable Signals"
					value={stats.profitableSignals || 0}
					icon={<TrendingUp className="w-6 h-6" />}
					color="green"
				/>
				<StatusCard
					data-testid="losing-signals-card"
					title="Losing Signals"
					value={stats.losingSignals || 0}
					icon={<TrendingDown className="w-6 h-6" />}
					color="red"
				/>
				<StatusCard
					data-testid="avg-profit-loss-card"
					title="Avg P/L"
					value={`${(stats.avgProfitLoss || 0).toFixed(2)}%`}
					icon={<DollarSign className="w-6 h-6" />}
					color={(stats.avgProfitLoss || 0) >= 0 ? "green" : "red"}
				/>
			</div>

			{/* Charts and Recent Signals */}
			<div data-testid="charts-section" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div data-testid="signal-performance-card" className="bg-white rounded-lg shadow p-6">
					<h2 data-testid="signal-performance-title" className="text-xl font-semibold mb-4">Signal Performance</h2>
					<SignalChart data-testid="signal-performance-chart" />
				</div>

				<div data-testid="recent-signals-card" className="bg-white rounded-lg shadow p-6">
					<h2 data-testid="recent-signals-title" className="text-xl font-semibold mb-4">Recent Signals</h2>
					<RecentSignals data-testid="dashboard-recent-signals" signals={recentSignals} />
				</div>
			</div>

			{/* Quick Actions */}
			<div data-testid="quick-actions-section" className="mt-8 bg-white rounded-lg shadow p-6">
				<h2 data-testid="quick-actions-title" className="text-xl font-semibold mb-4">Quick Actions</h2>
				<div data-testid="quick-actions-grid" className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<button data-testid="generate-manual-signal-button" className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
						<Activity className="w-5 h-5 mr-2" />
						Generate Manual Signal
					</button>
					<button data-testid="manage-telegram-chats-button" className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
						<Users className="w-5 h-5 mr-2" />
						Manage Telegram Chats
					</button>
					<button data-testid="view-analysis-history-button" className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
						<Clock className="w-5 h-5 mr-2" />
						View Analysis History
					</button>
				</div>
			</div>
		</div>
	);
}

export default Dashboard;
