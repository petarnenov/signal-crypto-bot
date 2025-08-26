import { useEffect } from 'react';
import { X, Info, CheckCircle, AlertCircle } from 'lucide-react';

const Toast = ({ message, type = 'info', duration = 5000, onClose }) => {
	useEffect(() => {
		const timer = setTimeout(() => {
			onClose();
		}, duration);

		return () => clearTimeout(timer);
	}, [duration, onClose]);

	const getIcon = () => {
		switch (type) {
			case 'success':
				return <CheckCircle className="w-5 h-5 text-green-500" />;
			case 'error':
				return <AlertCircle className="w-5 h-5 text-red-500" />;
			case 'warning':
				return <AlertCircle className="w-5 h-5 text-yellow-500" />;
			default:
				return <Info className="w-5 h-5 text-blue-500" />;
		}
	};

	const getBgColor = () => {
		switch (type) {
			case 'success':
				return 'bg-green-50 border-green-200';
			case 'error':
				return 'bg-red-50 border-red-200';
			case 'warning':
				return 'bg-yellow-50 border-yellow-200';
			default:
				return 'bg-blue-50 border-blue-200';
		}
	};

	return (
		<div
			className={`max-w-sm w-full p-4 border rounded-lg shadow-lg ${getBgColor()} animate-slide-in`}
		>
			<div className="flex items-start space-x-3">
				{getIcon()}
				<div className="flex-1">
					<p className="text-sm font-medium text-gray-900">{message}</p>
				</div>
				<button
					onClick={onClose}
					className="text-gray-400 hover:text-gray-600 transition-colors"
				>
					<X className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
};

export default Toast;
