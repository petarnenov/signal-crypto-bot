import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext();

export function ToastProvider({ children }) {
	const [toasts, setToasts] = useState([]);

	const addToast = useCallback((message, type = 'info', duration = 3000) => {
		// Check if a toast with the same message already exists
		setToasts(prev => {
			const existingToast = prev.find(toast => toast.message === message && toast.type === type);
			if (existingToast) {
				// If exists, just return the existing toasts (don't add duplicate)
				return prev;
			}

			const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
			const newToast = { id, message, type, duration };
			return [...prev, newToast];
		});

		// Return a unique ID for the new toast
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}, []);

	const removeToast = useCallback((id) => {
		setToasts(prev => prev.filter(toast => toast.id !== id));
	}, []);

	const showToast = useCallback((message, type = 'info', duration = 3000) => {
		// Prevent duplicate toasts with the same message and type
		setToasts(prev => {
			const existingToast = prev.find(toast => toast.message === message && toast.type === type);
			if (existingToast) {
				// If exists, just return the existing toasts (don't add duplicate)
				return prev;
			}

			// Generate unique ID using crypto.randomUUID if available, fallback to timestamp + random
			const id = typeof crypto !== 'undefined' && crypto.randomUUID
				? crypto.randomUUID()
				: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

			const newToast = { id, message, type, duration };

			// Auto-remove toast after duration
			if (duration > 0) {
				setTimeout(() => {
					removeToast(id);
				}, duration);
			}

			return [...prev, newToast];
		});

		// Return a unique ID for the new toast
		return typeof crypto !== 'undefined' && crypto.randomUUID
			? crypto.randomUUID()
			: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}, [removeToast]);

	const value = {
		showToast,
		addToast,
		removeToast
	};

	return (
		<ToastContext.Provider value={value}>
			{children}
			<div className="fixed top-4 right-4 z-50 flex flex-col gap-1">
				{toasts.map((toast) => (
					<Toast
						key={toast.id}
						message={toast.message}
						type={toast.type}
						duration={toast.duration}
						onClose={() => removeToast(toast.id)}
					/>
				))}
			</div>
		</ToastContext.Provider>
	);
}

export function useToast() {
	const context = useContext(ToastContext);
	if (context === undefined) {
		throw new Error('useToast must be used within a ToastProvider');
	}
	return context;
}
