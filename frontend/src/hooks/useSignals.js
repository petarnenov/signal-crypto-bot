import { useContext } from 'react';
import { SignalContext } from '../context/SignalContext.js';

export function useSignals() {
	const context = useContext(SignalContext);
	if (context === undefined) {
		throw new Error('useSignals must be used within a SignalProvider');
	}
	return context;
}
