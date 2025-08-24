import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useWebSocket from '../hooks/useWebSocket';

function SignalChart() {
	const [data, setData] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const { sendMessage, ws } = useWebSocket();

	const fetchChartData = useCallback(async () => {
		if (!sendMessage) {
			return;
		}
		try {
			const chartData = await sendMessage('get_signals_chart');
			setData(chartData);
		} catch (error) {
			console.error('Error fetching chart data:', error);
		}
	}, [sendMessage]);

	useEffect(() => {
		// Try to fetch data when sendMessage is available
		const tryFetchData = async () => {
			try {
				await fetchChartData();
				setIsLoading(false);
			} catch (error) {
				console.log('Failed to fetch chart data, will retry in 2 seconds:', error.message);
				// Retry after 2 seconds
				setTimeout(() => {
					if (sendMessage) {
						tryFetchData();
					}
				}, 2000);
			}
		};

		if (sendMessage) {
			tryFetchData();
		}
	}, [sendMessage, fetchChartData]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-[300px]">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
			</div>
		);
	}

	if (data.length === 0) {
		return (
			<div className="flex items-center justify-center h-[300px] text-gray-500">
				No signal data available
			</div>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={300}>
			<LineChart data={data}>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis
					dataKey="date"
					tickFormatter={(value) => new Date(value).toLocaleDateString()}
				/>
				<YAxis />
				<Tooltip
					labelFormatter={(value) => new Date(value).toLocaleDateString()}
					formatter={(value, name) => [value, name === 'profitable' ? 'Profitable' : name === 'losing' ? 'Losing' : 'Total']}
				/>
				<Line
					type="monotone"
					dataKey="signals"
					stroke="#3b82f6"
					strokeWidth={2}
					name="Total Signals"
				/>
				<Line
					type="monotone"
					dataKey="profitable"
					stroke="#22c55e"
					strokeWidth={2}
					name="Profitable"
				/>
				<Line
					type="monotone"
					dataKey="losing"
					stroke="#ef4444"
					strokeWidth={2}
					name="Losing"
				/>
			</LineChart>
		</ResponsiveContainer>
	);
}

export default SignalChart;
