

function StatusCard({ title, value, icon, color = 'blue', 'data-testid': testId }) {
	const colorClasses = {
		blue: 'bg-blue-50 text-blue-600 border-blue-200',
		green: 'bg-green-50 text-green-600 border-green-200',
		red: 'bg-red-50 text-red-600 border-red-200',
		yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
	};

	const valueColorClasses = {
		blue: 'text-blue-900',
		green: 'text-green-900',
		red: 'text-red-900',
		yellow: 'text-yellow-900',
	};

	return (
		<div data-testid={testId} className="bg-white rounded-lg shadow p-6">
			<div className="flex items-center justify-between">
				<div>
					<p data-testid={`${testId}-title`} className="text-sm font-medium text-gray-600">{title}</p>
					<p data-testid={`${testId}-value`} className={`text-2xl font-bold ${valueColorClasses[color]}`}>
						{value}
					</p>
				</div>
				<div data-testid={`${testId}-icon`} className={`p-3 rounded-lg border ${colorClasses[color]}`}>
					{icon}
				</div>
			</div>
		</div>
	);
}

export default StatusCard;
