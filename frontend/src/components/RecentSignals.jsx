
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

function RecentSignals({ signals = [], 'data-testid': testId = 'recent-signals' }) {
	const getSignalIcon = (signalType) => {
		switch (signalType.toLowerCase()) {
			case 'buy':
				return <ArrowUp className="w-4 h-4 text-green-500" />;
			case 'sell':
				return <ArrowDown className="w-4 h-4 text-red-500" />;
			case 'hold':
				return <Minus className="w-4 h-4 text-yellow-500" />;
			default:
				return <Minus className="w-4 h-4 text-gray-500" />;
		}
	};

	const getSignalColor = (signalType) => {
		switch (signalType.toLowerCase()) {
			case 'buy':
				return 'text-green-600 bg-green-50 border-green-200';
			case 'sell':
				return 'text-red-600 bg-red-50 border-red-200';
			case 'hold':
				return 'text-yellow-600 bg-yellow-50 border-yellow-200';
			default:
				return 'text-gray-600 bg-gray-50 border-gray-200';
		}
	};

	if (signals.length === 0) {
		return (
			<div data-testid={`${testId}-empty`} className="text-center py-8">
				<p data-testid={`${testId}-empty-message`} className="text-gray-500">No signals found</p>
			</div>
		);
	}

	return (
		<div data-testid={testId} className="space-y-3">
			{signals.map((signal) => (
				<div key={signal.id} data-testid={`${testId}-item-${signal.id}`} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
					<div className="flex items-center space-x-3">
						<div data-testid={`${testId}-icon-${signal.id}`}>
							{getSignalIcon(signal.signalType)}
						</div>
						<div>
							<div className="flex items-center space-x-2">
								<span data-testid={`${testId}-cryptocurrency-${signal.id}`} className="font-medium text-gray-900">
									{signal.cryptocurrency}
								</span>
								<span data-testid={`${testId}-type-${signal.id}`} className={`px-2 py-1 text-xs font-medium rounded-full border ${getSignalColor(signal.signalType)}`}>
									{signal.signalType.toUpperCase()}
								</span>
							</div>
							<div data-testid={`${testId}-details-${signal.id}`} className="text-sm text-gray-500">
								{signal.timeframe} • {new Date(signal.createdAt).toLocaleString()}
							</div>
						</div>
					</div>
					<div className="text-right">
						<div data-testid={`${testId}-price-${signal.id}`} className="text-sm font-medium text-gray-900">
							${signal.price || 'N/A'}
						</div>
						<div data-testid={`${testId}-confidence-${signal.id}`} className="text-xs text-gray-500">
							{(signal.confidence * 100).toFixed(1)}% confidence
						</div>
					</div>
				</div>
			))}
		</div>
	);
}

export default RecentSignals;
