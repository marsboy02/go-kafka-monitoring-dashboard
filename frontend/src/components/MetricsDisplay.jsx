import React, { useState, useEffect } from 'react';
import { Activity, Server, TrendingUp, Database } from 'lucide-react';
import { getClusterMetrics, getBrokers, getConsumerLag } from '../services/api';

const MetricsDisplay = ({ topics }) => {
  const [clusterMetrics, setClusterMetrics] = useState(null);
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Lag 조회를 위한 상태
  const [selectedTopic, setSelectedTopic] = useState('');
  const [consumerGroup, setConsumerGroup] = useState('');
  const [lagInfo, setLagInfo] = useState(null);

  useEffect(() => {
    fetchMetrics();

    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchMetrics = async () => {
    setLoading(true);
    setError('');

    try {
      const [clusterResponse, brokersResponse] = await Promise.all([
        getClusterMetrics(),
        getBrokers(),
      ]);

      setClusterMetrics(clusterResponse.data);
      setBrokers(brokersResponse.data.brokers || []);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || '메트릭 조회 실패';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const fetchLagInfo = async () => {
    if (!selectedTopic || !consumerGroup) {
      setError('토픽과 Consumer Group을 입력하세요');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await getConsumerLag(selectedTopic, consumerGroup);
      setLagInfo(response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Lag 조회 실패';
      setError(errorMsg);
      setLagInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* 클러스터 개요 */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-header">
            <Activity className="w-6 h-6" />
            클러스터 메트릭
          </h2>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4"
              />
              자동 새로고침 (5초)
            </label>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {clusterMetrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <Server className="w-5 h-5" />
                <span className="text-sm font-medium">브로커</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {clusterMetrics.broker_count || 0}
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <Database className="w-5 h-5" />
                <span className="text-sm font-medium">토픽</span>
              </div>
              <div className="text-2xl font-bold text-green-900">
                {clusterMetrics.topic_count || 0}
              </div>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2 text-purple-700 mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm font-medium">파티션</span>
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {clusterMetrics.partition_count || 0}
              </div>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2 text-orange-700 mb-2">
                <Activity className="w-5 h-5" />
                <span className="text-sm font-medium">상태</span>
              </div>
              <div className="text-sm font-bold text-orange-900">
                {loading ? 'Loading...' : 'Healthy'}
              </div>
            </div>
          </div>
        )}

        {/* 브로커 정보 */}
        {brokers.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-gray-800 mb-3">브로커 정보</h3>
            <div className="space-y-2">
              {brokers.map((broker) => (
                <div
                  key={broker.id}
                  className="p-3 bg-gray-50 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="badge-info">Broker {broker.id}</span>
                    <span className="text-sm text-gray-700 font-mono">
                      {broker.host}:{broker.port}
                    </span>
                  </div>
                  <span className="badge-success">Active</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 토픽별 메트릭 */}
        {clusterMetrics?.topics && clusterMetrics.topics.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-gray-800 mb-3">토픽별 메트릭</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      토픽
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      파티션
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      메시지 수
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clusterMetrics.topics.map((topic) => (
                    <tr key={topic.name} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {topic.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {topic.partition_count}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatNumber(topic.total_messages)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Consumer Lag 조회 */}
      <div className="card">
        <h2 className="card-header">
          <TrendingUp className="w-6 h-6" />
          Consumer Lag
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic
              </label>
              {topics.length > 0 ? (
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="input-field"
                >
                  <option value="">토픽 선택</option>
                  {topics.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  placeholder="토픽 이름"
                  className="input-field"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consumer Group
              </label>
              <input
                type="text"
                value={consumerGroup}
                onChange={(e) => setConsumerGroup(e.target.value)}
                placeholder="my-group"
                className="input-field"
              />
            </div>
          </div>

          <button
            onClick={fetchLagInfo}
            disabled={loading || !selectedTopic || !consumerGroup}
            className="btn-primary w-full"
          >
            {loading ? 'Loading...' : 'Lag 조회'}
          </button>

          {lagInfo && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="mb-3">
                <div className="text-lg font-bold text-yellow-900">
                  Total Lag: {formatNumber(lagInfo.total_lag)}
                </div>
                <div className="text-sm text-yellow-700">
                  Topic: {lagInfo.topic} | Group: {lagInfo.group}
                </div>
              </div>

              {lagInfo.partition_lags && lagInfo.partition_lags.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium text-yellow-900 text-sm">파티션별 Lag:</div>
                  {lagInfo.partition_lags.map((pLag) => (
                    <div
                      key={pLag.partition}
                      className="p-2 bg-white rounded border border-yellow-300 text-xs"
                    >
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <span className="text-gray-600">Partition:</span>
                          <span className="ml-1 font-medium">{pLag.partition}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Current:</span>
                          <span className="ml-1 font-medium">{formatNumber(pLag.current_offset)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">End:</span>
                          <span className="ml-1 font-medium">{formatNumber(pLag.log_end_offset)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Lag:</span>
                          <span className="ml-1 font-medium text-yellow-700">{formatNumber(pLag.lag)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetricsDisplay;
