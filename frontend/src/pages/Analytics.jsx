import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import useWebSocket from '../hooks/useWebSocket';

function Analytics() {
  const [analytics, setAnalytics] = useState({
    performanceByCrypto: [],
    performanceByTimeframe: [],
    signalDistribution: [],
    monthlyPerformance: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const { sendMessage } = useWebSocket();

  const fetchAnalytics = useCallback(async () => {
    if (!sendMessage) {
      return;
    }
    try {
      const data = await sendMessage('get_analytics');
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  }, [sendMessage]);

  useEffect(() => {
    // Try to fetch data when sendMessage is available
    const tryFetchData = async () => {
      try {
        await fetchAnalytics();
        setIsLoading(false);
      } catch (error) {
        console.log('Failed to fetch analytics data, will retry in 2 seconds:', error.message);
        // Retry after 2 seconds
        setTimeout(() => {
          if (sendMessage) {
            tryFetchData();
          }
        }, 2000);
      }
    };

    if (sendMessage) {
      tryFetchData();
    }
  }, [sendMessage, fetchAnalytics]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600">Detailed performance analysis and insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance by Cryptocurrency */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Performance by Cryptocurrency</h2>
          {analytics.performanceByCrypto && analytics.performanceByCrypto.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.performanceByCrypto}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="cryptocurrency" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}%`, 'Success Rate']} />
                <Bar dataKey="successRate" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-4xl mb-2">📈</div>
                <p className="text-lg font-medium">No performance data available</p>
                <p className="text-sm">Generate signals to see cryptocurrency performance</p>
              </div>
            </div>
          )}
        </div>

        {/* Performance by Timeframe */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Performance by Timeframe</h2>
          {analytics.performanceByTimeframe && analytics.performanceByTimeframe.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.performanceByTimeframe}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timeframe" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}%`, 'Success Rate']} />
                <Bar dataKey="successRate" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-4xl mb-2">⏰</div>
                <p className="text-lg font-medium">No timeframe data available</p>
                <p className="text-sm">Generate signals with different timeframes to see performance</p>
              </div>
            </div>
          )}
        </div>

        {/* Signal Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Signal Distribution</h2>
          {analytics.signalDistribution && analytics.signalDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.signalDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.signalDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-lg font-medium">No signal data available</p>
                <p className="text-sm">Generate some signals to see the distribution</p>
              </div>
            </div>
          )}
        </div>

        {/* Monthly Performance */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Monthly Performance</h2>
          {analytics.monthlyPerformance && analytics.monthlyPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.monthlyPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}%`, 'Profit/Loss']} />
                <Bar dataKey="profitLoss" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-4xl mb-2">📅</div>
                <p className="text-lg font-medium">No monthly data available</p>
                <p className="text-sm">Generate signals over time to see monthly performance</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Signals</h3>
          <p className="text-3xl font-bold text-primary-600">
            {analytics.totalSignals || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Success Rate</h3>
          <p className="text-3xl font-bold text-green-600">
            {(analytics.successRate || 0).toFixed(1)}%
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Avg Profit/Loss</h3>
          <p className={`text-3xl font-bold ${(analytics.avgProfitLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(analytics.avgProfitLoss || 0).toFixed(2)}%
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Best Performer</h3>
          <p className="text-xl font-bold text-primary-600">
            {analytics.bestPerformer || 'N/A'}
          </p>
        </div>
      </div>

      {/* Recommendations */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">AI Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Top Performing Cryptocurrencies</h4>
            <ul className="space-y-1 text-blue-700">
              {analytics.topCryptos?.map((crypto, index) => (
                <li key={index} className="flex justify-between">
                  <span>{crypto.name}</span>
                  <span className="font-medium">{crypto.successRate}%</span>
                </li>
              )) || <li>No data available</li>}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Optimal Timeframes</h4>
            <ul className="space-y-1 text-blue-700">
              {analytics.optimalTimeframes?.map((tf, index) => (
                <li key={index} className="flex justify-between">
                  <span>{tf.timeframe}</span>
                  <span className="font-medium">{tf.successRate}%</span>
                </li>
              )) || <li>No data available</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
