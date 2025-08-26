import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Configuration from '../../src/pages/Configuration.jsx';
import { SignalProvider } from '../../src/context/SignalContext.jsx';
import { useSignals } from '../../src/hooks/useSignals.js';
import { ToastProvider } from '../../src/context/ToastContext.jsx';
import '@testing-library/jest-dom'; // Import jest-dom matchers

// Mock the useWebSocket hook
const mockSendMessage = vi.fn();
const mockWs = { readyState: 1 };

vi.mock('../../src/hooks/useWebSocket.js', () => ({
	default: () => ({
		sendMessage: mockSendMessage,
		ws: mockWs
	})
}));

// Mock the useModal hook
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
const mockShowInfo = vi.fn();

vi.mock('../../src/hooks/useModal.js', () => ({
	default: () => ({
		showSuccess: mockShowSuccess,
		showError: mockShowError,
		showInfo: mockShowInfo
	})
}));

// Mock the useSignals hook
const mockUpdateConfig = vi.fn();

vi.mock('../../src/hooks/useSignals.js', () => ({
	useSignals: () => ({
		updateConfig: mockUpdateConfig
	})
}));

// Mock the useToast hook
const mockShowToast = vi.fn();

vi.mock('../../src/hooks/useToast.js', () => ({
	useToast: () => ({
		showToast: mockShowToast
	})
}));

vi.mock('../../src/context/ToastContext.jsx', () => ({
	ToastProvider: ({ children }) => children
}));

const renderConfiguration = () => {
	return render(
		<BrowserRouter>
			<ToastProvider>
				<SignalProvider>
					<Configuration />
				</SignalProvider>
			</ToastProvider>
		</BrowserRouter>
	);
};

describe('Configuration Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Mock successful responses
		mockSendMessage.mockImplementation((type, _data) => {
			if (type === 'get_config') {
				return Promise.resolve({
					cryptocurrencies: ['BTCUSDT', 'ETHUSDT'],
					timeframes: ['1h', '4h'],
					analysis_interval: 300000,
					max_signals_per_hour: 10,
					signal_confidence_threshold: 0.7,
					ai_model: 'gpt-4',
					openai_temperature: 0.7,
					openai_max_tokens: 500
				});
			}
			if (type === 'get_signal_generator_status') {
				return Promise.resolve({
					isRunning: false,
					stats: {
						total_signals: 100,
						profitable_signals: 60,
						losing_signals: 40,
						avg_profit_loss: 2.5
					}
				});
			}
			if (type === 'update_config') {
				return Promise.resolve({ success: true });
			}
			if (type === 'start_signal_generator') {
				return Promise.resolve({ success: true });
			}
			if (type === 'stop_signal_generator') {
				return Promise.resolve({ success: true });
			}
			return Promise.resolve({});
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Initial Rendering', () => {
		it('should render configuration page with loading state initially', async () => {
			renderConfiguration();

			// Should show loading spinner initially
			expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

			// Wait for loading to complete
			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});
		});

		it('should render configuration page with all sections after loading', async () => {
			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			expect(screen.getByTestId('trading-configuration')).toBeInTheDocument();
			expect(screen.getByTestId('ai-configuration')).toBeInTheDocument();
			expect(screen.getByTestId('signal-generator-control')).toBeInTheDocument();
		});

		it('should display signal generator status correctly', async () => {
			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('signal-generator-status-text')).toHaveTextContent('Stopped');
			});

			expect(screen.getByTestId('total-signals')).toHaveTextContent('Total Signals: 100');
			expect(screen.getByTestId('profitable-signals')).toHaveTextContent('Profitable Signals: 60');
			expect(screen.getByTestId('losing-signals')).toHaveTextContent('Losing Signals: 40');
			expect(screen.getByTestId('avg-profit-loss')).toHaveTextContent('Average P/L: 2.5%');
		});
	});

	describe('Configuration Form Fields', () => {
		it('should render all trading configuration fields', async () => {
			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			expect(screen.getByTestId('cryptocurrencies-input')).toHaveValue('BTCUSDT, ETHUSDT');
			expect(screen.getByTestId('timeframes-input')).toHaveValue('1h, 4h');
			expect(screen.getByTestId('analysis-interval-input')).toHaveValue(300000);
			expect(screen.getByTestId('max-signals-input')).toHaveValue(10);
			expect(screen.getByTestId('confidence-threshold-input')).toHaveValue(0.7);
		});

		it('should render all AI configuration fields', async () => {
			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			expect(screen.getByTestId('ai-model-select')).toHaveValue('gpt-4');
			expect(screen.getByTestId('temperature-input')).toHaveValue(0.7);
			expect(screen.getByTestId('max-tokens-input')).toHaveValue(500);
		});

		it('should display current configuration values', async () => {
			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			const cryptocurrenciesInput = screen.getByTestId('cryptocurrencies-input');
			expect(cryptocurrenciesInput).toHaveValue('BTCUSDT, ETHUSDT');

			const timeframesInput = screen.getByTestId('timeframes-input');
			expect(timeframesInput).toHaveValue('1h, 4h');

			const analysisIntervalInput = screen.getByTestId('analysis-interval-input');
			expect(analysisIntervalInput).toHaveValue(300000);

			const maxSignalsInput = screen.getByTestId('max-signals-input');
			expect(maxSignalsInput).toHaveValue(10);

			const confidenceInput = screen.getByTestId('confidence-threshold-input');
			expect(confidenceInput).toHaveValue(0.7);

			const aiModelSelect = screen.getByTestId('ai-model-select');
			expect(aiModelSelect).toHaveValue('gpt-4');

			const temperatureInput = screen.getByTestId('temperature-input');
			expect(temperatureInput).toHaveValue(0.7);

			const maxTokensInput = screen.getByTestId('max-tokens-input');
			expect(maxTokensInput).toHaveValue(500);
		});
	});

	describe('Form Input Handling', () => {
		it('should handle cryptocurrencies input change', async () => {
			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			const cryptocurrenciesInput = screen.getByTestId('cryptocurrencies-input');
			fireEvent.change(cryptocurrenciesInput, { target: { value: 'BTCUSDT, ETHUSDT, ADAUSDT' } });
			expect(cryptocurrenciesInput).toHaveValue('BTCUSDT, ETHUSDT, ADAUSDT');
		});

		it('should handle timeframes input change', async () => {
			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			const timeframesInput = screen.getByTestId('timeframes-input');
			fireEvent.change(timeframesInput, { target: { value: '1h, 4h, 1d' } });
			expect(timeframesInput).toHaveValue('1h, 4h, 1d');
		});

		it('should handle numeric input changes', async () => {
			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			const analysisIntervalInput = screen.getByTestId('analysis-interval-input');
			fireEvent.change(analysisIntervalInput, { target: { value: '600000' } });
			expect(analysisIntervalInput).toHaveValue(600000);
		});

		it('should handle float input changes', async () => {
			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			const confidenceInput = screen.getByTestId('confidence-threshold-input');
			fireEvent.change(confidenceInput, { target: { value: '0.8' } });
			expect(confidenceInput).toHaveValue(0.8);
		});

		it('should handle AI model selection', async () => {
			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			const aiModelSelect = screen.getByTestId('ai-model-select');
			fireEvent.change(aiModelSelect, { target: { value: 'gpt-5' } });
			expect(aiModelSelect).toHaveValue('gpt-5');
		});
	});

	describe('Save Configuration', () => {
		it('should save configuration successfully', async () => {
			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			const saveButton = screen.getByTestId('save-config-button');
			fireEvent.click(saveButton);

			await waitFor(() => {
				expect(mockUpdateConfig).toHaveBeenCalledWith('cryptocurrencies', ['BTCUSDT', 'ETHUSDT']);
			});

			expect(mockShowSuccess).toHaveBeenCalledWith('Success', 'Configuration saved successfully!');
		});

		it('should handle save configuration error', async () => {
			mockUpdateConfig.mockRejectedValue(new Error('Database error'));

			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			const saveButton = screen.getByTestId('save-config-button');
			fireEvent.click(saveButton);

			await waitFor(() => {
				expect(mockShowError).toHaveBeenCalledWith('Error', 'Failed to save configuration: Database error');
			});
		});

		it('should show saving state during save operation', async () => {
			mockUpdateConfig.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)));

			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			const saveButton = screen.getByTestId('save-config-button');
			fireEvent.click(saveButton);

			expect(screen.getByTestId('save-config-button')).toHaveTextContent('Saving...');
		});

		it('should clean array values before saving', async () => {
			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			const cryptocurrenciesInput = screen.getByTestId('cryptocurrencies-input');
			fireEvent.change(cryptocurrenciesInput, { target: { value: 'BTCUSDT, , ETHUSDT, , ADAUSDT' } });

			const saveButton = screen.getByTestId('save-config-button');
			fireEvent.click(saveButton);

			await waitFor(() => {
				expect(mockUpdateConfig).toHaveBeenCalledWith('cryptocurrencies', ['BTCUSDT', 'ETHUSDT', 'ADAUSDT']);
			});
		});
	});

	describe('Signal Generator Control', () => {
		it('should start signal generator successfully', async () => {
			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			const startButton = screen.getByTestId('start-signal-generator-button');
			fireEvent.click(startButton);

			await waitFor(() => {
				expect(mockSendMessage).toHaveBeenCalledWith('start_signal_generator');
				expect(mockShowSuccess).toHaveBeenCalledWith('Success', 'Signal generator started successfully!');
			});
		});

		it('should stop signal generator successfully', async () => {
			mockSendMessage.mockImplementation((type) => {
				if (type === 'get_signal_generator_status') {
					return Promise.resolve({ isRunning: true, stats: {} });
				}
				return Promise.resolve({});
			});

			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('signal-generator-status-text')).toHaveTextContent('Running');
			});

			const stopButton = screen.getByTestId('stop-signal-generator-button');
			fireEvent.click(stopButton);

			await waitFor(() => {
				expect(mockSendMessage).toHaveBeenCalledWith('stop_signal_generator');
				expect(mockShowSuccess).toHaveBeenCalledWith('Success', 'Signal generator stopped successfully!');
			});
		});

		it('should handle signal generator start error', async () => {
			mockSendMessage.mockImplementation((type) => {
				if (type === 'start_signal_generator') {
					return Promise.reject(new Error('Start failed'));
				}
				return Promise.resolve({});
			});

			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			const startButton = screen.getByTestId('start-signal-generator-button');
			fireEvent.click(startButton);

			await waitFor(() => {
				expect(mockShowError).toHaveBeenCalledWith('Error', 'Failed to start signal generator: Start failed');
			});
		});

		it('should handle signal generator stop error', async () => {
			mockSendMessage.mockImplementation((type) => {
				if (type === 'get_signal_generator_status') {
					return Promise.resolve({ isRunning: true, stats: {} });
				}
				if (type === 'stop_signal_generator') {
					return Promise.reject(new Error('Stop failed'));
				}
				return Promise.resolve({});
			});

			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('signal-generator-status-text')).toHaveTextContent('Running');
			});

			const stopButton = screen.getByTestId('stop-signal-generator-button');
			fireEvent.click(stopButton);

			await waitFor(() => {
				expect(mockShowError).toHaveBeenCalledWith('Error', 'Failed to stop signal generator: Stop failed');
			});
		});

		it('should refresh signal generator status', async () => {
			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			const refreshButton = screen.getByTestId('refresh-status-button');
			fireEvent.click(refreshButton);

			await waitFor(() => {
				expect(mockSendMessage).toHaveBeenCalledWith('get_signal_generator_status');
			});
		});
	});

	describe('Refresh Configuration', () => {
		it('should refresh configuration data', async () => {
			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			const refreshButton = screen.getByTestId('refresh-config-button');
			fireEvent.click(refreshButton);

			await waitFor(() => {
				expect(mockSendMessage).toHaveBeenCalledWith('get_config');
			});
		});
	});

	describe('Toast Test Section', () => {
		it('should test AI request toast', async () => {
			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			const testButton = screen.getByTestId('test-ai-request-toast-button');
			fireEvent.click(testButton);

			expect(mockShowToast).toHaveBeenCalledWith('🤖 AI analyzing BTCUSDT (1h) for buy/sell decision...', 'info', 5000);
		});

		it('should test AI response toast', async () => {
			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			const testButton = screen.getByTestId('test-ai-response-toast-button');
			fireEvent.click(testButton);

			expect(mockShowToast).toHaveBeenCalledWith('✅ AI decision: BTCUSDT BUY (1h) - 80.0% confidence', 'success', 5000);
		});

		it('should test no signal toast', async () => {
			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			const testButton = screen.getByTestId('test-no-signal-toast-button');
			fireEvent.click(testButton);

			expect(mockShowToast).toHaveBeenCalledWith('⚠️ No AI signal for BTCUSDT (1h) - confidence below threshold', 'warning', 5000);
		});

		it('should test error toast', async () => {
			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			const testButton = screen.getByTestId('test-error-toast-button');
			fireEvent.click(testButton);

			expect(mockShowToast).toHaveBeenCalledWith('❌ AI error analyzing BTCUSDT (1h): Network timeout', 'error', 5000);
		});
	});

	describe('Error Handling', () => {
		it('should handle WebSocket connection error', async () => {
			mockSendMessage.mockImplementation(() => {
				throw new Error('WebSocket not connected');
			});

			renderConfiguration();

			// The error should be handled gracefully and the page should still render
			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			// The page should still be functional even with WebSocket errors
			expect(screen.getByTestId('save-config-button')).toBeInTheDocument();
		});

		it('should handle missing configuration data', async () => {
			mockSendMessage.mockImplementation((type) => {
				if (type === 'get_config') {
					return Promise.resolve({}); // Empty config
				}
				return Promise.resolve({});
			});

			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			const cryptocurrenciesInput = screen.getByTestId('cryptocurrencies-input');
			expect(cryptocurrenciesInput).toHaveValue(''); // Empty value
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty array inputs', async () => {
			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			const cryptocurrenciesInput = screen.getByTestId('cryptocurrencies-input');
			fireEvent.change(cryptocurrenciesInput, { target: { value: '' } });

			const saveButton = screen.getByTestId('save-config-button');
			fireEvent.click(saveButton);

			await waitFor(() => {
				expect(mockUpdateConfig).toHaveBeenCalledWith('cryptocurrencies', []);
			});
		});

		it('should handle null values in configuration', async () => {
			mockSendMessage.mockImplementation((type) => {
				if (type === 'get_config') {
					return Promise.resolve({
						cryptocurrencies: null,
						timeframes: null,
						analysis_interval: null
					});
				}
				return Promise.resolve({});
			});

			renderConfiguration();

			await waitFor(() => {
				expect(screen.getByTestId('configuration-title')).toBeInTheDocument();
			});

			const cryptocurrenciesInput = screen.getByTestId('cryptocurrencies-input');
			expect(cryptocurrenciesInput).toHaveValue(''); // Empty value
		});
	});
});
