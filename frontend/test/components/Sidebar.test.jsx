import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from '../../src/components/Sidebar';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
	Home: () => <div data-testid="home-icon">Home</div>,
	Activity: () => <div data-testid="activity-icon">Activity</div>,
	Settings: () => <div data-testid="settings-icon">Settings</div>,
	BarChart3: () => <div data-testid="barchart-icon">BarChart3</div>,
	Bot: () => <div data-testid="bot-icon">Bot</div>,
	Wifi: () => <div data-testid="wifi-icon">Wifi</div>,
	WifiOff: () => <div data-testid="wifi-off-icon">WifiOff</div>,
	TrendingUp: () => <div data-testid="trending-up-icon">TrendingUp</div>
}));

// Wrapper component to provide router context
const renderWithRouter = (component) => {
	return render(
		<BrowserRouter>
			{component}
		</BrowserRouter>
	);
};

describe('Sidebar Component', () => {
	describe('Online Status Display', () => {
		it('should display online status when isOnline is true', () => {
			renderWithRouter(<Sidebar isOnline={true} />);
			
			expect(screen.getByTestId('wifi-icon')).toBeInTheDocument();
			expect(screen.getByText('Online')).toBeInTheDocument();
			expect(screen.getByText('Online')).toHaveClass('text-green-600');
		});

		it('should display offline status when isOnline is false', () => {
			renderWithRouter(<Sidebar isOnline={false} />);
			
			expect(screen.getByTestId('wifi-off-icon')).toBeInTheDocument();
			expect(screen.getByText('Offline')).toBeInTheDocument();
			expect(screen.getByText('Offline')).toHaveClass('text-red-600');
		});

		it('should show correct icon for online status', () => {
			renderWithRouter(<Sidebar isOnline={true} />);
			
			// Should show Wifi icon (online)
			expect(screen.getByTestId('wifi-icon')).toBeInTheDocument();
			// Should not show WifiOff icon
			expect(screen.queryByTestId('wifi-off-icon')).not.toBeInTheDocument();
		});

		it('should show correct icon for offline status', () => {
			renderWithRouter(<Sidebar isOnline={false} />);
			
			// Should show WifiOff icon (offline)
			expect(screen.getByTestId('wifi-off-icon')).toBeInTheDocument();
			// Should not show Wifi icon
			expect(screen.queryByTestId('wifi-icon')).not.toBeInTheDocument();
		});
	});

	describe('Navigation Items', () => {
		it('should render all navigation items', () => {
			renderWithRouter(<Sidebar isOnline={true} />);
			
			expect(screen.getByText('Dashboard')).toBeInTheDocument();
			expect(screen.getByText('Signals')).toBeInTheDocument();
			expect(screen.getByText('Analytics')).toBeInTheDocument();
			expect(screen.getByText('Paper Trading')).toBeInTheDocument();
			expect(screen.getByText('Configuration')).toBeInTheDocument();
		});

		it('should have correct test IDs for navigation items', () => {
			renderWithRouter(<Sidebar isOnline={true} />);
			
			expect(screen.getByTestId('sidebar-')).toBeInTheDocument(); // Dashboard
			expect(screen.getByTestId('sidebar-signals')).toBeInTheDocument();
			expect(screen.getByTestId('sidebar-analytics')).toBeInTheDocument();
			expect(screen.getByTestId('sidebar-paper-trading')).toBeInTheDocument();
			expect(screen.getByTestId('sidebar-configuration')).toBeInTheDocument();
		});

		it('should render all navigation icons', () => {
			renderWithRouter(<Sidebar isOnline={true} />);
			
			expect(screen.getByTestId('home-icon')).toBeInTheDocument();
			expect(screen.getByTestId('activity-icon')).toBeInTheDocument();
			expect(screen.getByTestId('barchart-icon')).toBeInTheDocument();
			expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();
			expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
		});
	});

	describe('Header Section', () => {
		it('should display the bot title', () => {
			renderWithRouter(<Sidebar isOnline={true} />);
			
			expect(screen.getByText('Crypto Bot')).toBeInTheDocument();
		});

		it('should display the bot icon', () => {
			renderWithRouter(<Sidebar isOnline={true} />);
			
			expect(screen.getByTestId('bot-icon')).toBeInTheDocument();
		});

		it('should display version information in footer', () => {
			renderWithRouter(<Sidebar isOnline={true} />);
			
			expect(screen.getByText('Crypto Signal Bot')).toBeInTheDocument();
			expect(screen.getByText('v1.0.0')).toBeInTheDocument();
		});
	});

	describe('Status Color Classes', () => {
		it('should apply green color classes for online status', () => {
			renderWithRouter(<Sidebar isOnline={true} />);
			
			const statusText = screen.getByText('Online');
			expect(statusText).toHaveClass('text-green-600');
		});

		it('should apply red color classes for offline status', () => {
			renderWithRouter(<Sidebar isOnline={false} />);
			
			const statusText = screen.getByText('Offline');
			expect(statusText).toHaveClass('text-red-600');
		});
	});

	describe('Component Structure', () => {
		it('should render the sidebar container with correct classes', () => {
			renderWithRouter(<Sidebar isOnline={true} />);
			
			const sidebar = screen.getByText('Crypto Bot').closest('.w-64');
			expect(sidebar).toHaveClass('w-64', 'bg-white', 'shadow-lg');
		});

		it('should have proper layout structure', () => {
			renderWithRouter(<Sidebar isOnline={true} />);
			
			// Check that main sections exist
			expect(screen.getByText('Crypto Bot')).toBeInTheDocument(); // Header
			expect(screen.getByText('Dashboard')).toBeInTheDocument(); // Navigation
			expect(screen.getByText('Crypto Signal Bot')).toBeInTheDocument(); // Footer
		});
	});
});
