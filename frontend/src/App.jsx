import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Signals from './pages/Signals';
import Configuration from './pages/Configuration';
import Analytics from './pages/Analytics';
import PaperTrading from './pages/PaperTrading';
import { SignalProvider } from './context/SignalContext';
import { ToastProvider } from './context/ToastContext';
import Modal from './components/Modal';
import useModal from './hooks/useModal';
import useWebSocket from './hooks/useWebSocket';

function App() {
	const [isOnline, setIsOnline] = useState(false);
	const { modalState, hideModal, showSuccess, showError, showInfo, showWarning, showConfirm } = useModal();

	// WebSocket connection status will be handled by useWebSocket hook
	// and passed to AppContent component

	return (
		<ToastProvider>
			<AppContent
				modalState={modalState}
				hideModal={hideModal}
				showSuccess={showSuccess}
				showError={showError}
				showInfo={showInfo}
				showWarning={showWarning}
				showConfirm={showConfirm}
			/>
		</ToastProvider>
	);
}

function AppContent({ modalState, hideModal, showSuccess, showError, showInfo, showWarning, showConfirm }) {
	// Initialize WebSocket connection inside ToastProvider
	const { ws, sendMessage } = useWebSocket();
	const [isOnline, setIsOnline] = useState(false);

	// Check if WebSocket is connected
	useEffect(() => {
		if (ws && ws.readyState === WebSocket.OPEN) {
			setIsOnline(true);
		} else if (sendMessage) {
			// If sendMessage is available, we can assume connection is ready
			setIsOnline(true);
		} else {
			setIsOnline(false);
		}
	}, [ws, sendMessage]);

	return (
		<SignalProvider modalFunctions={{ showSuccess, showError, showInfo, showWarning, showConfirm }}>
			<Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
				<div className="flex h-screen bg-gray-100">
					<Sidebar isOnline={isOnline} />
					<main className="flex-1 overflow-auto">
						<Routes>
							<Route path="/" element={<Dashboard />} />
							<Route path="/signals" element={<Signals />} />
							<Route path="/configuration" element={<Configuration />} />
							<Route path="/analytics" element={<Analytics />} />
							<Route path="/paper-trading" element={<PaperTrading />} />
						</Routes>
					</main>
				</div>
			</Router>
			<Modal {...modalState} onClose={hideModal} />
		</SignalProvider>
	);
}

export default App;
