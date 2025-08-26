import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const Modal = ({
	isOpen,
	onClose,
	title,
	message,
	type = 'info',
	showCloseButton = true,
	onConfirm,
	confirmText = 'OK',
	cancelText = 'Cancel',
	showCancelButton = false
}) => {
	// Handle escape key
	useEffect(() => {
		const handleEscape = (e) => {
			if (e.key === 'Escape' && isOpen) {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener('keydown', handleEscape);
			document.body.style.overflow = 'hidden';
		}

		return () => {
			document.removeEventListener('keydown', handleEscape);
			document.body.style.overflow = 'unset';
		};
	}, [isOpen, onClose]);

	// Handle backdrop click
	const handleBackdropClick = (e) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	if (!isOpen) return null;

	const getIcon = () => {
		switch (type) {
			case 'success':
				return <CheckCircle className="w-6 h-6 text-green-500" />;
			case 'error':
				return <AlertCircle className="w-6 h-6 text-red-500" />;
			case 'warning':
				return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
			case 'info':
			default:
				return <Info className="w-6 h-6 text-blue-500" />;
		}
	};

	const getTitleColor = () => {
		switch (type) {
			case 'success':
				return 'text-green-800';
			case 'error':
				return 'text-red-800';
			case 'warning':
				return 'text-yellow-800';
			case 'info':
			default:
				return 'text-blue-800';
		}
	};

	const getButtonColor = () => {
		switch (type) {
			case 'success':
				return 'bg-green-500 hover:bg-green-600';
			case 'error':
				return 'bg-red-500 hover:bg-red-600';
			case 'warning':
				return 'bg-yellow-500 hover:bg-yellow-600';
			case 'info':
			default:
				return 'bg-blue-500 hover:bg-blue-600';
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
				onClick={handleBackdropClick}
			></div>

			{/* Modal */}
			<div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<div className="flex items-center space-x-3">
						{getIcon()}
						<h3 className={`text-lg font-semibold ${getTitleColor()}`}>
							{title}
						</h3>
					</div>
					{showCloseButton && (
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					)}
				</div>

				{/* Content */}
				<div className="p-6">
					<p className="text-gray-700 whitespace-pre-wrap">{message}</p>
				</div>

				{/* Footer */}
				<div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
					{showCancelButton && (
						<button
							onClick={onClose}
							className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
						>
							{cancelText}
						</button>
					)}
					<button
						onClick={() => {
							if (onConfirm) {
								onConfirm();
							}
							onClose();
						}}
						className={`px-4 py-2 text-white rounded-lg transition-colors ${getButtonColor()}`}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</div>
	);
};

export default Modal;
