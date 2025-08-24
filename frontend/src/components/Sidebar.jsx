import React from 'react';
import { NavLink } from 'react-router-dom';
import {
	Home,
	Activity,
	Settings,
	BarChart3,
	Bot,
	Wifi,
	WifiOff,
	TrendingUp
} from 'lucide-react';

function Sidebar({ isOnline }) {
	const navItems = [
		{ path: '/', icon: <Home className="w-5 h-5" />, label: 'Dashboard' },
		{ path: '/signals', icon: <Activity className="w-5 h-5" />, label: 'Signals' },
		{ path: '/analytics', icon: <BarChart3 className="w-5 h-5" />, label: 'Analytics' },
		{ path: '/paper-trading', icon: <TrendingUp className="w-5 h-5" />, label: 'Paper Trading' },
		{ path: '/configuration', icon: <Settings className="w-5 h-5" />, label: 'Configuration' },
	];

	return (
		<div className="w-64 bg-white shadow-lg">
			{/* Header */}
			<div className="p-6 border-b border-gray-200">
				<div className="flex items-center space-x-3">
					<div className="p-2 bg-primary-500 rounded-lg">
						<Bot className="w-6 h-6 text-white" />
					</div>
					<div>
						<h1 className="text-lg font-semibold text-gray-900">Crypto Bot</h1>
						<div className="flex items-center space-x-2">
							{isOnline ? (
								<Wifi className="w-4 h-4 text-green-500" />
							) : (
								<WifiOff className="w-4 h-4 text-red-500" />
							)}
							<span className={`text-sm ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
								{isOnline ? 'Online' : 'Offline'}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Navigation */}
			<nav className="p-4">
				<ul className="space-y-2">
					{navItems.map((item) => (
						<li key={item.path}>
							<NavLink
								to={item.path}
								className={({ isActive }) =>
									`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${isActive
										? 'bg-primary-50 text-primary-700 border border-primary-200'
										: 'text-gray-700 hover:bg-gray-50'
									}`
								}
							>
								{item.icon}
								<span className="font-medium">{item.label}</span>
							</NavLink>
						</li>
					))}
				</ul>
			</nav>

			{/* Footer */}
			<div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
				<div className="text-center">
					<p className="text-sm text-gray-500">Crypto Signal Bot</p>
					<p className="text-xs text-gray-400">v1.0.0</p>
				</div>
			</div>
		</div>
	);
}

export default Sidebar;
