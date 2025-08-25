
import { Component } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

class WebSocketErrorBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false, error: null, errorInfo: null };
	}

	static getDerivedStateFromError(_error) {
		return { hasError: true };
	}

	componentDidCatch(_error, errorInfo) {
		console.error('WebSocket error caught:', _error, errorInfo);
		this.setState({
			error: _error,
			errorInfo: errorInfo
		});
	}

	handleRetry = () => {
		this.setState({ hasError: false, error: null, errorInfo: null });
		// Trigger WebSocket reconnection
		if (this.props.onRetry) {
			this.props.onRetry();
		} else {
			window.location.reload();
		}
	};

	render() {
		if (this.state.hasError) {
			return (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
					<div className="flex items-center gap-3">
						<div className="flex-shrink-0">
							<WifiOff className="w-5 h-5 text-red-600" />
						</div>

						<div className="flex-1">
							<h3 className="text-sm font-medium text-red-800">
								Connection Error
							</h3>
							<p className="text-sm text-red-700 mt-1">
								There was a problem with the connection. Please try again.
							</p>
						</div>

						<button
							onClick={this.handleRetry}
							className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-red-700 transition-colors"
						>
							<RefreshCw className="w-4 h-4" />
							Retry
						</button>
					</div>

					{process.env.NODE_ENV === 'development' && this.state.error && (
						<details className="mt-3">
							<summary className="cursor-pointer text-sm text-red-600 font-medium">
								Error Details
							</summary>
							<pre className="text-xs text-red-600 mt-2 bg-red-100 p-2 rounded overflow-auto max-h-24">
								{this.state.error.toString()}
							</pre>
						</details>
					)}
				</div>
			);
		}

		return this.props.children;
	}
}

export default WebSocketErrorBoundary;
