import React, { useState, useEffect } from 'react';
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
				// Retry after 2 seconds if failed
				setTimeout(() => {
					if (sendMessage) {
						fetchDashboardData();
					}
				}, 2000);
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
	}, [sendMessage]);

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
				<h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
				<p className="text-gray-600">Crypto Signal Bot Overview</p>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
				<StatusCard
					title="Total Signals"
					value={stats.totalSignals || 0}
					icon={<Activity className="w-6 h-6" />}
					color="blue"
				/>
				<StatusCard
					title="Profitable Signals"
					value={stats.profitableSignals || 0}
					icon={<TrendingUp className="w-6 h-6" />}
					color="green"
				/>
				<StatusCard
					title="Losing Signals"
					value={stats.losingSignals || 0}
					icon={<TrendingDown className="w-6 h-6" />}
					color="red"
				/>
				<StatusCard
					title="Avg P/L"
					value={`${(stats.avgProfitLoss || 0).toFixed(2)}%`}
					icon={<DollarSign className="w-6 h-6" />}
					color={(stats.avgProfitLoss || 0) >= 0 ? "green" : "red"}
				/>
			</div>

			{/* Charts and Recent Signals */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="bg-white rounded-lg shadow p-6">
					<h2 className="text-xl font-semibold mb-4">Signal Performance</h2>
					<SignalChart />
				</div>

				<div className="bg-white rounded-lg shadow p-6">
					<h2 className="text-xl font-semibold mb-4">Recent Signals</h2>
					<RecentSignals signals={recentSignals} />
				</div>
			</div>

			{/* Quick Actions */}
			<div className="mt-8 bg-white rounded-lg shadow p-6">
				<h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<button className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
						<Activity className="w-5 h-5 mr-2" />
						Generate Manual Signal
					</button>
					<button className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
						<Users className="w-5 h-5 mr-2" />
						Manage Telegram Chats
					</button>
					<button className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
						<Clock className="w-5 h-5 mr-2" />
						View Analysis History
					</button>
				</div>
			</div>
		</div>
	);
}

export default Dashboard;
