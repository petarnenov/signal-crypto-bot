import { useState, useEffect, useCallback } from 'react';
import useModal from '../hooks/useModal';
import useWebSocket from '../hooks/useWebSocket';
import { SignalContext } from './SignalContext.js';

export function SignalProvider({ children, modalFunctions }) {
	const [signals, setSignals] = useState([]);
	const [stats, setStats] = useState({});
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);
	const modalHook = useModal();
	const { showSuccess, showError } = modalFunctions || modalHook;
	const { sendMessage } = useWebSocket();

	const fetchSignals = useCallback(async (limit = 50) => {
		if (!sendMessage) {
			return;
		}
		setError(null);
		try {
			const data = await sendMessage('get_signals', { limit });
			setSignals(data);
		} catch (err) {
			setError(err.message);
		}
	}, [sendMessage]);

	const fetchStats = useCallback(async () => {
		if (!sendMessage) {
			return;
		}
		try {
			const data = await sendMessage('get_stats');
			setStats(data);
		} catch (err) {
			console.error('Error fetching stats:', err);
			// Don't throw error, just log it
		}
	}, [sendMessage]);

	const generateManualSignal = async (cryptocurrency, timeframe) => {
		if (!sendMessage) {
			throw new Error('WebSocket not connected');
		}
		try {
			const newSignal = await sendMessage('generate_signal', { cryptocurrency, timeframe });
			setSignals(prev => [newSignal, ...(Array.isArray(prev) ? prev : [])]);
			showSuccess('Success', `Signal generated successfully for ${cryptocurrency} (${timeframe})`);
			return newSignal;
		} catch (err) {
			setError(err.message);
			showError('Error', `Failed to generate signal: ${err.message}`);
			throw err;
		}
	};

	const updateConfig = async (key, value) => {
		if (!sendMessage) {
			return false;
		}
		try {
			await sendMessage('update_config', { key, value });
			// Refresh stats after config update
			await fetchStats();

			// Show specific message for cryptocurrencies
			if (key === 'cryptocurrencies') {
				showSuccess('Success', `Cryptocurrencies updated: ${value.join(', ')}`);
			} else {
				showSuccess('Success', 'Configuration updated successfully');
			}
			return true;
		} catch (err) {
			setError(err.message);
			showError('Error', `Failed to update configuration: ${err.message}`);
			throw err;
		}
	};

	const refreshSignals = async () => {
		setIsLoading(true);
		const startTime = Date.now();
		try {
			await fetchSignals();

			// Ensure loader shows for at least 300ms
			const elapsed = Date.now() - startTime;
			if (elapsed < 300) {
				await new Promise(resolve => setTimeout(resolve, 300 - elapsed));
			}
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		// Try to fetch data when sendMessage is available
		const tryFetchData = async () => {
			setIsLoading(true);
			const startTime = Date.now();
			try {
				await fetchSignals();
				await fetchStats();

				// Ensure loader shows for at least 500ms
				const elapsed = Date.now() - startTime;
				if (elapsed < 500) {
					await new Promise(resolve => setTimeout(resolve, 500 - elapsed));
				}
				setIsLoading(false);
			} catch (error) {
				console.log('Failed to fetch signals/stats data, will retry in 2 seconds:', error.message);
				setIsLoading(false);
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
	}, [sendMessage, fetchSignals, fetchStats]);

	// Listen for new signals from WebSocket
	useEffect(() => {
		const handleSignalGenerated = (event) => {
			console.log('🔄 SignalContext: New signal received via WebSocket:', event.detail);
			// Refresh signals to get the latest data
			refreshSignals();
		};

		const handleDataUpdated = (event) => {
			console.log('Data updated via WebSocket:', event.detail);
			// Refresh signals when data is updated
			refreshSignals();
		};

		// Add event listeners for real-time updates
		window.addEventListener('signalGenerated', handleSignalGenerated);
		window.addEventListener('dataUpdated', handleDataUpdated);

		// Cleanup event listeners
		return () => {
			window.removeEventListener('signalGenerated', handleSignalGenerated);
			window.removeEventListener('dataUpdated', handleDataUpdated);
		};
	}, [refreshSignals]);

	const value = {
		signals,
		stats,
		isLoading,
		error,
		fetchSignals,
		fetchStats,
		generateManualSignal,
		updateConfig,
		refreshSignals,
	};

	return (
		<SignalContext.Provider value={value}>
			{children}
		</SignalContext.Provider>
	);
}


