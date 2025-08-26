import { useEffect, useRef, useCallback, useState } from 'react';
import { useToast } from './useToast';

const useWebSocket = () => {
	const ws = useRef(null);
	const reconnectTimeoutRef = useRef(null);
	const isConnectingRef = useRef(false);
	const pendingRequests = useRef(new Map());
	const toastDebounceRef = useRef(new Map()); // Track recent toasts to prevent duplicates
	const [isOnline, setIsOnline] = useState(false);
	const { showToast } = useToast();

	// Debounced toast function to prevent duplicates
	const debouncedToast = useCallback((message, type, duration) => {
		const key = `${message}-${type}`;
		const now = Date.now();
		const lastShown = toastDebounceRef.current.get(key);

		// If same toast was shown in last 2 seconds, skip it
		if (lastShown && (now - lastShown) < 2000) {
			return;
		}

		toastDebounceRef.current.set(key, now);
		showToast(message, type, duration);
	}, [showToast]);

	const connect = useCallback(() => {
		// Prevent multiple simultaneous connection attempts
		if (isConnectingRef.current) {
			return;
		}

		// Clear any existing connection
		if (ws.current && ws.current.readyState === WebSocket.OPEN) {
			ws.current.close(1000, 'Reconnecting');
		}

		// Clear any existing reconnect timeout
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}

		isConnectingRef.current = true;

		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const wsUrl = `${protocol}//${window.location.host}/ws/`;

		try {
			ws.current = new WebSocket(wsUrl);

			ws.current.onopen = () => {
				console.log('WebSocket connected successfully');
				isConnectingRef.current = false;
				setIsOnline(true);
			};

			ws.current.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);

					// Handle toast notifications
					if (data.type === 'ai_request') {
						debouncedToast(data.data.message, 'info', 5000);
					} else if (data.type === 'ai_response') {
						debouncedToast(data.data.message, 'success', 5000);
					} else if (data.type === 'ai_no_signal') {
						debouncedToast(data.data.message, 'warning', 5000);
					} else if (data.type === 'ai_error') {
						debouncedToast(data.data.message, 'error', 5000);
					} else if (data.type === 'signal_generated' || data.type === 'signal_generated_response') {
						console.log('🔄 useWebSocket: signal_generated message received:', data);
						debouncedToast(data.data.message, 'success', 5000);
						window.dispatchEvent(new CustomEvent('signalGenerated', { detail: data.data }));
					} else if (data.type === 'validation_warning') {
						debouncedToast(data.data.message, 'warning', 8000);
					} else if (data.type === 'validation_success') {
						debouncedToast(data.data.message, 'success', 5000);
					} else if (data.type === 'config_updated') {
						// Handle real-time config updates
						console.log('Config updated via WebSocket:', data.data);
						debouncedToast(data.data.message, 'info', 3000);
						window.dispatchEvent(new CustomEvent('configUpdated', {
							detail: data.data
						}));
					} else if (data.type === 'data_updated') {
						debouncedToast(data.data.message, 'info', 3000);
						window.dispatchEvent(new CustomEvent('dataUpdated', { detail: data.data }));
					} else if (data.type === 'connection_status') {
						console.log('WebSocket connection status:', data.data.message);
					} else if (data.type === 'paper_trading_order_executed' ||
						data.type === 'paper_trading_executed' ||
						data.type === 'paper_trading_error') {
						// Dispatch custom event for paper trading updates
						window.dispatchEvent(new CustomEvent('websocket_message', {
							detail: data
						}));
					}

					// Handle response messages
					const requestId = data.requestId;
					if (requestId && pendingRequests.current.has(requestId)) {
						const { resolve, reject } = pendingRequests.current.get(requestId);
						pendingRequests.current.delete(requestId);

						if (data.type.endsWith('_response')) {
							resolve(data.data);
						} else if (data.type === 'error') {
							reject(new Error(data.data.message));
						}
					}
				} catch (error) {
					console.error('Error parsing WebSocket message:', error);
				}
			};

			ws.current.onclose = (event) => {
				console.log('WebSocket disconnected', event.code, event.reason);
				isConnectingRef.current = false;
				setIsOnline(false);

				// Only reject pending requests if it's not a clean close
				if (event.code !== 1000 && event.code !== 1001) {
					pendingRequests.current.forEach(({ reject }) => {
						reject(new Error('WebSocket connection closed'));
					});
					pendingRequests.current.clear();
				}

				// Only reconnect if it wasn't a clean close and we're not unmounting
				if (event.code !== 1000 && event.code !== 1001) {
					reconnectTimeoutRef.current = setTimeout(() => {
						console.log('Attempting to reconnect WebSocket...');
						connect();
					}, 3000);
				}
			};

			ws.current.onerror = (error) => {
				console.error('WebSocket error:', error);
				isConnectingRef.current = false;
				setIsOnline(false);
			};
		} catch (error) {
			console.error('Failed to create WebSocket connection:', error);
			isConnectingRef.current = false;
		}
	}, [debouncedToast]);

	const sendMessage = useCallback((type, payload = {}) => {
		return new Promise((resolve, reject) => {
			let attempts = 0;
			const maxAttempts = 50; // 5 seconds max wait time

			// Wait for WebSocket to be ready
			const checkConnection = () => {
				attempts++;

				if (attempts > maxAttempts) {
					reject(new Error('WebSocket connection timeout'));
					return;
				}

				if (!ws.current) {
					setTimeout(checkConnection, 100);
					return;
				}

				if (ws.current.readyState === WebSocket.CONNECTING) {
					setTimeout(checkConnection, 100);
					return;
				}

				if (ws.current.readyState === WebSocket.CLOSED) {
					// Try to reconnect if connection is closed
					console.log('WebSocket is closed, attempting to reconnect...');
					connect();
					setTimeout(checkConnection, 100);
					return;
				}

				if (ws.current.readyState !== WebSocket.OPEN) {
					// Wait a bit more if not open yet
					setTimeout(checkConnection, 100);
					return;
				}

				const requestId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
				const message = {
					type,
					payload,
					requestId
				};

				pendingRequests.current.set(requestId, { resolve, reject });

				// No timeout needed for WebSocket communication
				// Messages are processed asynchronously when they arrive

				ws.current.send(JSON.stringify(message));
			};

			checkConnection();
		});
	}, [connect]);

	useEffect(() => {
		// Connect immediately
		connect();

		// Capture the ref value at the time the effect runs
		const currentToastDebounceRef = toastDebounceRef.current;

		return () => {
			// Clean up on unmount
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
			}
			if (ws.current && ws.current.readyState === WebSocket.OPEN) {
				ws.current.close(1000, 'Component unmounting');
			}
			// Clear toast debounce cache using the captured ref
			currentToastDebounceRef.clear();
		};
	}, [connect]);

	return { ws: ws.current, sendMessage, isOnline };
};

export default useWebSocket;
