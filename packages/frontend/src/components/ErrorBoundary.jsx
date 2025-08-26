import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false, error: null, errorInfo: null };
	}

	static getDerivedStateFromError(_error) {
		return { hasError: true };
	}

	componentDidCatch(error, errorInfo) {
		console.error('Error caught by boundary:', error, errorInfo);
		this.setState({
			error: error,
			errorInfo: errorInfo
		});
	}

	handleRetry = () => {
		this.setState({ hasError: false, error: null, errorInfo: null });
		if (this.props.onRetry) {
			this.props.onRetry();
		} else {
			window.location.reload();
		}
	};

	render() {
		if (this.state.hasError) {
			return (
				<div data-testid="error-boundary" className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
					<div data-testid="error-boundary-container" className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
						<div data-testid="error-boundary-icon" className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
							<AlertTriangle className="w-6 h-6 text-red-600" />
						</div>

						<h2 data-testid="error-boundary-title" className="text-xl font-semibold text-gray-900 text-center mb-2">
							Something went wrong
						</h2>

						<p data-testid="error-boundary-message" className="text-gray-600 text-center mb-6">
							An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
						</p>

						{process.env.NODE_ENV === 'development' && this.state.error && (
							<details data-testid="error-boundary-details" className="mb-4 p-3 bg-gray-100 rounded text-sm">
								<summary data-testid="error-boundary-details-summary" className="cursor-pointer font-medium text-gray-700 mb-2">
									Error Details (Development)
								</summary>
								<pre data-testid="error-boundary-error-text" className="text-red-600 overflow-auto max-h-32">
									{this.state.error.toString()}
								</pre>
								{this.state.errorInfo && (
									<pre data-testid="error-boundary-stack-trace" className="text-gray-600 overflow-auto max-h-32 mt-2">
										{this.state.errorInfo.componentStack}
									</pre>
								)}
							</details>
						)}

						<div data-testid="error-boundary-actions" className="flex gap-3">
							<button
								data-testid="error-boundary-retry-button"
								onClick={this.handleRetry}
								className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
							>
								<RefreshCw className="w-4 h-4" />
								Retry
							</button>

							<button
								data-testid="error-boundary-home-button"
								onClick={() => window.location.href = '/'}
								className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
							>
								Go Home
							</button>
						</div>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

export default ErrorBoundary;
