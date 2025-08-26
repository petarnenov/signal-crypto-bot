
import { Component } from 'react';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

class PageErrorBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false, error: null, errorInfo: null };
	}

	static getDerivedStateFromError(_error) {
		return { hasError: true };
	}

	componentDidCatch(_error, errorInfo) {
		console.error('Page error caught:', _error, errorInfo);
		this.setState({
			error: _error,
			errorInfo: errorInfo
		});
	}

	render() {
		if (this.state.hasError) {
			return <PageErrorFallback
				error={this.state.error}
				errorInfo={this.state.errorInfo}
				pageName={this.props.pageName}
			/>;
		}

		return this.props.children;
	}
}

function PageErrorFallback({ error, errorInfo, pageName }) {
	const navigate = useNavigate();

	const handleRetry = () => {
		window.location.reload();
	};

	const handleGoHome = () => {
		navigate('/');
	};

	const handleGoBack = () => {
		navigate(-1);
	};

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
			<div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
				<div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
					<AlertTriangle className="w-6 h-6 text-red-600" />
				</div>

				<h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
					{pageName ? `${pageName} Error` : 'Page Error'}
				</h2>

				<p className="text-gray-600 text-center mb-6">
					Something went wrong while loading this page. Please try again or navigate to a different page.
				</p>

				{process.env.NODE_ENV === 'development' && error && (
					<details className="mb-4 p-3 bg-gray-100 rounded text-sm">
						<summary className="cursor-pointer font-medium text-gray-700 mb-2">
							Error Details (Development)
						</summary>
						<pre className="text-red-600 overflow-auto max-h-32">
							{error.toString()}
						</pre>
						{errorInfo && (
							<pre className="text-gray-600 overflow-auto max-h-32 mt-2">
								{errorInfo.componentStack}
							</pre>
						)}
					</details>
				)}

				<div className="flex flex-col gap-2">
					<button
						onClick={handleRetry}
						className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
					>
						Retry Page
					</button>

					<div className="flex gap-2">
						<button
							onClick={handleGoBack}
							className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
						>
							<ArrowLeft className="w-4 h-4" />
							Go Back
						</button>

						<button
							onClick={handleGoHome}
							className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
						>
							<Home className="w-4 h-4" />
							Home
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default PageErrorBoundary;
