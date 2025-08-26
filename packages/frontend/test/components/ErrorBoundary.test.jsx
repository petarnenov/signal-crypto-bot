import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from '../../src/components/ErrorBoundary.jsx';

// Component that throws an error
const ThrowError = ({ shouldThrow }) => {
	if (shouldThrow) {
		throw new Error('Test error');
	}
	return <div data-testid="no-error-message">No error</div>;
};

describe('ErrorBoundary', () => {
	it('should render children when no error occurs', () => {
		render(
			<ErrorBoundary>
				<ThrowError shouldThrow={false} />
			</ErrorBoundary>
		);

		expect(screen.getByTestId('no-error-message')).toBeInTheDocument();
	});

	it('should render error UI when error occurs', () => {
		// Mock console.error to avoid noise in tests
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		render(
			<ErrorBoundary>
				<ThrowError shouldThrow={true} />
			</ErrorBoundary>
		);

		expect(screen.getByTestId('error-boundary-title')).toBeInTheDocument();
		expect(screen.getByTestId('error-boundary-message')).toBeInTheDocument();
		expect(screen.getByTestId('error-boundary-retry-button')).toBeInTheDocument();

		consoleSpy.mockRestore();
	});

	it('should call onRetry when retry button is clicked', () => {
		const onRetry = vi.fn();
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		render(
			<ErrorBoundary onRetry={onRetry}>
				<ThrowError shouldThrow={true} />
			</ErrorBoundary>
		);

		const retryButton = screen.getByTestId('error-boundary-retry-button');
		fireEvent.click(retryButton);

		expect(onRetry).toHaveBeenCalledTimes(1);

		consoleSpy.mockRestore();
	});

	it('should show development details in development mode', () => {
		const originalEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = 'development';

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		render(
			<ErrorBoundary>
				<ThrowError shouldThrow={true} />
			</ErrorBoundary>
		);

		expect(screen.getByTestId('error-boundary-details-summary')).toBeInTheDocument();
		expect(screen.getByTestId('error-boundary-error-text')).toBeInTheDocument();

		process.env.NODE_ENV = originalEnv;
		consoleSpy.mockRestore();
	});

	it('should not show development details in production mode', () => {
		const originalEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = 'production';

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		render(
			<ErrorBoundary>
				<ThrowError shouldThrow={true} />
			</ErrorBoundary>
		);

		expect(screen.queryByTestId('error-boundary-details-summary')).not.toBeInTheDocument();
		expect(screen.queryByTestId('error-boundary-error-text')).not.toBeInTheDocument();

		process.env.NODE_ENV = originalEnv;
		consoleSpy.mockRestore();
	});
});
