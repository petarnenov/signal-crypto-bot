// import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Signals from './pages/Signals.jsx';
import Configuration from './pages/Configuration.jsx';
import Analytics from './pages/Analytics.jsx';
import PaperTrading from './pages/PaperTrading.jsx';
import { SignalProvider } from './context/SignalContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import Modal from './components/Modal.jsx';
import useModal from './hooks/useModal.js';
// import useWebSocket from './hooks/useWebSocket';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import PageErrorBoundary from './components/PageErrorBoundary.jsx';

function App() {
	// const [isOnline, setIsOnline] = useState(false);
	const { modalState, hideModal, showSuccess, showError, showInfo, showWarning, showConfirm } = useModal();

	// WebSocket connection status will be handled by useWebSocket hook
	// and passed to AppContent component

	return (
		<ErrorBoundary>
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
		</ErrorBoundary>
	);
}

function AppContent({ modalState, hideModal, showSuccess, showError, showInfo, showWarning, showConfirm }) {
	// Initialize WebSocket connection inside ToastProvider
	// const { ws, sendMessage } = useWebSocket();
	// const [isOnline, setIsOnline] = useState(false);

	// Check if WebSocket is connected
	// useEffect(() => {
	// 	if (ws && ws.readyState === WebSocket.OPEN) {
	// 		setIsOnline(true);
	// 	} else if (sendMessage) {
	// 		// If sendMessage is available, we can assume connection is ready
	// 		setIsOnline(true);
	// 	} else {
	// 		setIsOnline(false);
	// 	}
	// }, [ws, sendMessage]);

	return (
		<SignalProvider modalFunctions={{ showSuccess, showError, showInfo, showWarning, showConfirm }}>
			<Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
				<div className="flex h-screen bg-gray-100">
					<Sidebar isOnline={true} />
					<main className="flex-1 overflow-auto">
						<Routes>
							<Route path="/" element={
								<PageErrorBoundary pageName="Dashboard">
									<Dashboard />
								</PageErrorBoundary>
							} />
							<Route path="/signals" element={
								<PageErrorBoundary pageName="Signals">
									<Signals />
								</PageErrorBoundary>
							} />
							<Route path="/configuration" element={
								<PageErrorBoundary pageName="Configuration">
									<Configuration />
								</PageErrorBoundary>
							} />
							<Route path="/analytics" element={
								<PageErrorBoundary pageName="Analytics">
									<Analytics />
								</PageErrorBoundary>
							} />
							<Route path="/paper-trading" element={
								<PageErrorBoundary pageName="Paper Trading">
									<PaperTrading />
								</PageErrorBoundary>
							} />
						</Routes>
					</main>
				</div>
			</Router>
			<Modal {...modalState} onClose={hideModal} />
		</SignalProvider>
	);
}

export default App;
