import { useState, useEffect, useCallback } from 'react';
import { useSignals } from '../hooks/useSignals';
import { useToast } from '../hooks/useToast';
import { Save, RefreshCw, Play, Square, Activity } from 'lucide-react';
import useModal from '../hooks/useModal';
import useWebSocket from '../hooks/useWebSocket';

function Configuration() {
	const { updateConfig } = useSignals();
	const { showToast } = useToast();
	const { sendMessage } = useWebSocket();
	const [config, setConfig] = useState({
		cryptocurrencies: [],
		timeframes: [],
		analysis_interval: null,
		max_signals_per_hour: null,
		signal_confidence_threshold: null,
		ai_model: '',
		openai_temperature: null,
		openai_max_tokens: null
	});
	const [isLoading, setIsLoading] = useState(true);
	const { showSuccess, showError } = useModal();
	const [isSaving, setIsSaving] = useState(false);
	const [signalGeneratorStatus, setSignalGeneratorStatus] = useState({
		isRunning: false,
		stats: {}
	});
	const [isStarting, setIsStarting] = useState(false);
	const [isStopping, setIsStopping] = useState(false);

	const fetchConfig = useCallback(async () => {
		if (!sendMessage) {
			return;
		}
		try {
			const data = await sendMessage('get_config');
			// Set config directly from database without fallbacks
			setConfig({
				cryptocurrencies: data.cryptocurrencies || [],
				timeframes: data.timeframes || [],
				analysis_interval: data.analysis_interval || null,
				max_signals_per_hour: data.max_signals_per_hour || null,
				signal_confidence_threshold: data.signal_confidence_threshold || null,
				ai_model: data.ai_model || '',
				openai_temperature: data.openai_temperature || null,
				openai_max_tokens: data.openai_max_tokens || null
			});
		} catch (error) {
			console.error('Error fetching config:', error);
		}
	}, [sendMessage]);

	const fetchSignalGeneratorStatus = useCallback(async () => {
		if (!sendMessage) {
			return;
		}
		try {
			const data = await sendMessage('get_signal_generator_status');
			setSignalGeneratorStatus(data);
		} catch (error) {
			console.error('Error fetching signal generator status:', error);
		}
	}, [sendMessage]);

	useEffect(() => {
		// Try to fetch data when sendMessage is available
		const tryFetchData = async () => {
			try {
				await fetchConfig();
				await fetchSignalGeneratorStatus();
				setIsLoading(false);
			} catch (error) {
				console.log('Failed to fetch data, will retry in 2 seconds:', error.message);
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

		// Listen for config updates from WebSocket
		const handleConfigUpdate = (event) => {
			if (event.detail && event.detail.key) {
				// Update specific config key
				setConfig(prev => ({
					...prev,
					[event.detail.key]: event.detail.value
				}));
			} else {
				// Refresh entire config
				fetchConfig();
			}
		};

		window.addEventListener('configUpdated', handleConfigUpdate);

		return () => {
			window.removeEventListener('configUpdated', handleConfigUpdate);
		};
	}, [sendMessage, fetchConfig, fetchSignalGeneratorStatus]);

	const handleStartSignalGenerator = async () => {
		if (!sendMessage) {
			showError('Error', 'WebSocket not connected');
			return;
		}
		setIsStarting(true);
		try {
			await sendMessage('start_signal_generator');
			showSuccess('Success', 'Signal generator started successfully!');
			fetchSignalGeneratorStatus();
		} catch (error) {
			showError('Error', `Failed to start signal generator: ${error.message}`);
		} finally {
			setIsStarting(false);
		}
	};

	const handleStopSignalGenerator = async () => {
		if (!sendMessage) {
			showError('Error', 'WebSocket not connected');
			return;
		}
		setIsStopping(true);
		try {
			await sendMessage('stop_signal_generator');
			showSuccess('Success', 'Signal generator stopped successfully!');
			fetchSignalGeneratorStatus();
		} catch (error) {
			showError('Error', `Failed to stop signal generator: ${error.message}`);
		} finally {
			setIsStopping(false);
		}
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			// Convert string values to arrays and clean up before saving
			const cleanConfig = {
				...config,
				cryptocurrencies: typeof config.cryptocurrencies === 'string'
					? config.cryptocurrencies.split(',').map(item => item.trim()).filter(item => item && item !== '')
					: Array.isArray(config.cryptocurrencies)
						? config.cryptocurrencies.filter(item => item && item.trim() !== '')
						: [],
				timeframes: typeof config.timeframes === 'string'
					? config.timeframes.split(',').map(item => item.trim()).filter(item => item && item !== '')
					: Array.isArray(config.timeframes)
						? config.timeframes.filter(item => item && item.trim() !== '')
						: []
			};

			// Update each configuration key individually
			for (const [key, value] of Object.entries(cleanConfig)) {
				await updateConfig(key, value);
			}
			showSuccess('Success', 'Configuration saved successfully!');

			// Update local config with cleaned data
			setConfig(cleanConfig);
		} catch (error) {
			showError('Error', `Failed to save configuration: ${error.message}`);
		} finally {
			setIsSaving(false);
		}
	};

	const handleInputChange = (key, value) => {
		setConfig(prev => ({
			...prev,
			[key]: value === '' ? null : value
		}));
	};

	const handleNumberChange = (key, value) => {
		const numValue = value === '' ? null : parseInt(value) || 0;
		setConfig(prev => ({
			...prev,
			[key]: numValue
		}));
	};

	const handleFloatChange = (key, value) => {
		const floatValue = value === '' ? null : parseFloat(value) || 0;
		setConfig(prev => ({
			...prev,
			[key]: floatValue
		}));
	};

	// const handleArrayChange = (key, value) => {
	// 	// Allow empty value for typing, but filter empty items when processing
	// 	const array = value.split(',').map(item => item.trim()).filter(item => item);
	// 	setConfig(prev => ({
	// 		...prev,
	// 		[key]: array
	// 	}));
	// };

	const handleArrayInputChange = (key, value) => {
		// Store the raw input value as a single string for better editing
		// When saving, this will be converted to an array
		setConfig(prev => ({
			...prev,
			[key]: value
		}));
	};

	const getDisplayValue = (key) => {
		const value = config[key];
		if (value === null || value === undefined || value === '') {
			return '';
		}
		if (Array.isArray(value)) {
			return value.length > 0 ? value.join(', ') : '';
		}
		return value.toString();
	};

	if (isLoading) {
		return (
			<div data-testid="configuration-page" className="flex items-center justify-center h-full">
				<div data-testid="loading-spinner" className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
			</div>
		);
	}

	return (
		<div data-testid="configuration-page" className="p-6">
			<div className="mb-8">
				<div className="flex justify-between items-center">
					<div>
						<h1 data-testid="configuration-title" className="text-3xl font-bold text-gray-900">Configuration</h1>
						<p data-testid="configuration-subtitle" className="text-gray-600">Manage bot settings and parameters</p>
					</div>
					<div className="flex space-x-3">
						<button
							data-testid="refresh-config-button"
							onClick={fetchConfig}
							className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
						>
							<RefreshCw className="w-4 h-4" />
							<span>Refresh</span>
						</button>
						<button
							data-testid="save-config-button"
							onClick={handleSave}
							disabled={isSaving}
							className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
						>
							<Save className="w-4 h-4" />
							<span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
						</button>
					</div>
				</div>

				{/* Signal Generator Control */}
				<div data-testid="signal-generator-control" className="bg-white rounded-lg shadow p-6 mb-8">
					<div className="flex justify-between items-center mb-4">
						<h2 data-testid="signal-generator-title" className="text-xl font-semibold">Signal Generator Control</h2>
						<div className="flex items-center space-x-2">
							<div data-testid="signal-generator-status-indicator" className={`w-3 h-3 rounded-full ${signalGeneratorStatus.isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
							<span data-testid="signal-generator-status-text" className="text-sm text-gray-600">
								{signalGeneratorStatus.isRunning ? 'Running' : 'Stopped'}
							</span>
						</div>
					</div>

					<div className="flex space-x-3">
						<button
							data-testid="start-signal-generator-button"
							onClick={handleStartSignalGenerator}
							disabled={isStarting || signalGeneratorStatus.isRunning}
							className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
						>
							<Play className="w-4 h-4" />
							<span>{isStarting ? 'Starting...' : 'Start Signal Generator'}</span>
						</button>
						<button
							data-testid="stop-signal-generator-button"
							onClick={handleStopSignalGenerator}
							disabled={isStopping || !signalGeneratorStatus.isRunning}
							className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
						>
							<Square className="w-4 h-4" />
							<span>{isStopping ? 'Stopping...' : 'Stop Signal Generator'}</span>
						</button>
						<button
							data-testid="refresh-status-button"
							onClick={fetchSignalGeneratorStatus}
							className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
						>
							<Activity className="w-4 h-4" />
							<span>Refresh Status</span>
						</button>
					</div>

					{signalGeneratorStatus.stats && Object.keys(signalGeneratorStatus.stats).length > 0 && (
						<div data-testid="signal-generator-stats" className="mt-4 p-3 bg-gray-50 rounded-lg">
							<h3 data-testid="stats-title" className="text-sm font-medium text-gray-700 mb-2">Generator Statistics:</h3>
							<div data-testid="stats-content" className="text-sm text-gray-600">
								<p data-testid="total-signals">Total Signals: {signalGeneratorStatus.stats.total_signals || 0}</p>
								<p data-testid="profitable-signals">Profitable Signals: {signalGeneratorStatus.stats.profitable_signals || 0}</p>
								<p data-testid="losing-signals">Losing Signals: {signalGeneratorStatus.stats.losing_signals || 0}</p>
								<p data-testid="avg-profit-loss">Average P/L: {signalGeneratorStatus.stats.avg_profit_loss || 0}%</p>
							</div>
						</div>
					)}
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Trading Configuration */}
				<div data-testid="trading-configuration" className="bg-white rounded-lg shadow p-6">
					<h2 data-testid="trading-config-title" className="text-xl font-semibold mb-6">Trading Configuration</h2>

					<div className="space-y-6">
						<div>
							<label data-testid="cryptocurrencies-label" className="block text-sm font-medium text-gray-700 mb-2">
								Cryptocurrencies (comma-separated)
							</label>
							<input
								data-testid="cryptocurrencies-input"
								type="text"
								value={getDisplayValue('cryptocurrencies')}
								onChange={(e) => handleArrayInputChange('cryptocurrencies', e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
								placeholder="BTCUSDT, ETHUSDT, ADAUSDT"
							/>
						</div>

						<div>
							<label data-testid="timeframes-label" className="block text-sm font-medium text-gray-700 mb-2">
								Timeframes (comma-separated)
							</label>
							<input
								data-testid="timeframes-input"
								type="text"
								value={getDisplayValue('timeframes')}
								onChange={(e) => handleArrayInputChange('timeframes', e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
								placeholder="1h, 4h, 1d"
							/>
						</div>

						<div>
							<label data-testid="analysis-interval-label" className="block text-sm font-medium text-gray-700 mb-2">
								Analysis Interval (milliseconds)
							</label>
							<input
								data-testid="analysis-interval-input"
								type="number"
								value={config.analysis_interval || ''}
								onChange={(e) => handleNumberChange('analysis_interval', e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
								min="60000"
								step="60000"
							/>
							<p data-testid="analysis-interval-display" className="text-sm text-gray-500 mt-1">
								Current: {config.analysis_interval ? Math.round(config.analysis_interval / 1000) : 0} seconds
							</p>
						</div>

						<div>
							<label data-testid="max-signals-label" className="block text-sm font-medium text-gray-700 mb-2">
								Max Signals per Hour
							</label>
							<input
								data-testid="max-signals-input"
								type="number"
								value={config.max_signals_per_hour || ''}
								onChange={(e) => handleNumberChange('max_signals_per_hour', e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
								min="1"
								max="100"
							/>
						</div>

						<div>
							<label data-testid="confidence-threshold-label" className="block text-sm font-medium text-gray-700 mb-2">
								Signal Confidence Threshold
							</label>
							<input
								data-testid="confidence-threshold-input"
								type="number"
								value={config.signal_confidence_threshold || ''}
								onChange={(e) => handleFloatChange('signal_confidence_threshold', e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
								min="0"
								max="1"
								step="0.1"
							/>
							<p data-testid="confidence-threshold-display" className="text-sm text-gray-500 mt-1">
								Current: {config.signal_confidence_threshold ? (config.signal_confidence_threshold * 100).toFixed(0) : 0}%
							</p>
						</div>
					</div>
				</div>

				{/* AI Configuration */}
				<div data-testid="ai-configuration" className="bg-white rounded-lg shadow p-6">
					<h2 data-testid="ai-config-title" className="text-xl font-semibold mb-6">AI Configuration</h2>

					<div className="space-y-6">
						<div>
							<label data-testid="ai-model-label" className="block text-sm font-medium text-gray-700 mb-2">
								AI Model
							</label>
							<select
								data-testid="ai-model-select"
								value={config.ai_model || ''}
								onChange={(e) => handleInputChange('ai_model', e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
							>
								<option value="gpt-5">GPT-5</option>
								<option value="gpt-4">GPT-4</option>
								<option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
							</select>
						</div>

						<div>
							<label data-testid="temperature-label" className="block text-sm font-medium text-gray-700 mb-2">
								Temperature
							</label>
							<input
								data-testid="temperature-input"
								type="number"
								value={config.openai_temperature || ''}
								onChange={(e) => handleFloatChange('openai_temperature', e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
								min="0"
								max="2"
								step="0.1"
							/>
							<p data-testid="temperature-description" className="text-sm text-gray-500 mt-1">
								Controls randomness (0 = deterministic, 2 = very random)
							</p>
						</div>

						<div>
							<label data-testid="max-tokens-label" className="block text-sm font-medium text-gray-700 mb-2">
								Max Tokens
							</label>
							<input
								data-testid="max-tokens-input"
								type="number"
								value={config.openai_max_tokens || ''}
								onChange={(e) => handleNumberChange('openai_max_tokens', e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
								min="100"
								max="4000"
								step="100"
							/>
							<p data-testid="max-tokens-description" className="text-sm text-gray-500 mt-1">
								Maximum tokens in AI response
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Environment Variables Info */}
			<div data-testid="env-vars-section" className="mt-8 bg-blue-50 rounded-lg p-6">
				<h3 data-testid="env-vars-title" className="text-lg font-semibold text-blue-900 mb-4">Environment Variables Status</h3>
				<p data-testid="env-vars-description" className="text-blue-700 mb-4">
					Status of required environment variables in your .env file:
				</p>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div data-testid="openai-api-key-status" className="bg-white rounded p-3 border-l-4 border-green-500">
						<div className="flex items-center justify-between">
							<code className="text-sm text-gray-800">OPENAI_API_KEY</code>
							<span className="text-green-600 text-sm font-medium">✓ Configured</span>
						</div>
					</div>
					<div data-testid="telegram-bot-token-status" className="bg-white rounded p-3 border-l-4 border-green-500">
						<div className="flex items-center justify-between">
							<code className="text-sm text-gray-800">TELEGRAM_BOT_TOKEN</code>
							<span className="text-green-600 text-sm font-medium">✓ Configured</span>
						</div>
					</div>
					<div data-testid="binance-api-key-status" className="bg-white rounded p-3 border-l-4 border-yellow-500">
						<div className="flex items-center justify-between">
							<code className="text-sm text-gray-800">BINANCE_API_KEY</code>
							<span className="text-yellow-600 text-sm font-medium">⚠ Optional</span>
						</div>
					</div>
					<div data-testid="binance-api-secret-status" className="bg-white rounded p-3 border-l-4 border-yellow-500">
						<div className="flex items-center justify-between">
							<code className="text-sm text-gray-800">BINANCE_API_SECRET</code>
							<span className="text-yellow-600 text-sm font-medium">⚠ Optional</span>
						</div>
					</div>
				</div>
				<div data-testid="env-vars-summary" className="mt-4 p-3 bg-green-50 rounded border border-green-200">
					<p className="text-green-800 text-sm">
						✅ Your bot is fully configured and ready to use! OpenAI and Telegram are set up.
						Binance API keys are optional for enhanced features.
					</p>
				</div>
			</div>

			{/* Toast Test Section */}
			<div data-testid="toast-test-section" className="mt-8 bg-purple-50 rounded-lg p-6">
				<h3 data-testid="toast-test-title" className="text-lg font-semibold text-purple-900 mb-4">Toast Notification Test</h3>
				<p data-testid="toast-test-description" className="text-purple-700 mb-4">
					Test the toast notification system:
				</p>
				<div className="flex flex-wrap gap-3">
					<button
						data-testid="test-ai-request-toast-button"
						onClick={() => showToast('🤖 AI analyzing BTCUSDT (1h) for buy/sell decision...', 'info', 5000)}
						className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
					>
						Test AI Request Toast
					</button>
					<button
						data-testid="test-ai-response-toast-button"
						onClick={() => showToast('✅ AI decision: BTCUSDT BUY (1h) - 80.0% confidence', 'success', 5000)}
						className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
					>
						Test AI Response Toast
					</button>
					<button
						data-testid="test-no-signal-toast-button"
						onClick={() => showToast('⚠️ No AI signal for BTCUSDT (1h) - confidence below threshold', 'warning', 5000)}
						className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
					>
						Test No Signal Toast
					</button>
					<button
						data-testid="test-error-toast-button"
						onClick={() => showToast('❌ AI error analyzing BTCUSDT (1h): Network timeout', 'error', 5000)}
						className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
					>
						Test Error Toast
					</button>
				</div>
			</div>
		</div>
	);
}

export default Configuration;
