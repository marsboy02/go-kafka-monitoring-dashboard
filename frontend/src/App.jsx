import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import ProducerPanel from './components/ProducerPanel';
import ConsumerPanel from './components/ConsumerPanel';
import TopicManager from './components/TopicManager';
import MetricsDisplay from './components/MetricsDisplay';
import MessageLog from './components/MessageLog';
import { listTopics, healthCheck } from './services/api';

function App() {
  const [topics, setTopics] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [activeTab, setActiveTab] = useState('producer');

  useEffect(() => {
    checkBackendHealth();
    fetchTopics();

    // 주기적으로 헬스체크
    const healthInterval = setInterval(checkBackendHealth, 30000);

    return () => clearInterval(healthInterval);
  }, []);

  const checkBackendHealth = async () => {
    try {
      await healthCheck();
      setBackendStatus('healthy');
    } catch (err) {
      console.error('Backend health check failed:', err);
      setBackendStatus('error');
    }
  };

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const response = await listTopics();
      setTopics(response.data.topics || []);
    } catch (err) {
      console.error('Failed to fetch topics:', err);
      setTopics([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageSent = (message) => {
    setMessages((prev) => [message, ...prev].slice(0, 100)); // 최대 100개 유지
  };

  const handleMessageReceived = (message) => {
    setMessages((prev) => [message, ...prev].slice(0, 100));
  };

  const handleClearMessages = () => {
    setMessages([]);
  };

  const tabs = [
    { id: 'producer', label: 'Producer' },
    { id: 'consumer', label: 'Consumer' },
    { id: 'topics', label: 'Topics' },
    { id: 'metrics', label: 'Metrics' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Kafka Monitoring Dashboard
                </h1>
                <p className="text-sm text-gray-600">
                  실시간 Kafka 모니터링 및 테스트 도구
                </p>
              </div>
            </div>

            {/* Backend Status */}
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  backendStatus === 'healthy'
                    ? 'bg-green-500'
                    : backendStatus === 'error'
                    ? 'bg-red-500'
                    : 'bg-yellow-500'
                }`}
              />
              <span className="text-sm font-medium text-gray-700">
                {backendStatus === 'healthy'
                  ? 'Backend Connected'
                  : backendStatus === 'error'
                  ? 'Backend Disconnected'
                  : 'Checking...'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex gap-1 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'producer' && (
              <ProducerPanel topics={topics} onMessageSent={handleMessageSent} />
            )}

            {activeTab === 'consumer' && (
              <ConsumerPanel topics={topics} onMessageReceived={handleMessageReceived} />
            )}

            {activeTab === 'topics' && (
              <TopicManager topics={topics} onTopicsChange={fetchTopics} />
            )}

            {activeTab === 'metrics' && <MetricsDisplay topics={topics} />}

            {/* Message Log - 모든 탭에서 표시 */}
            {(activeTab === 'producer' || activeTab === 'consumer') && (
              <MessageLog messages={messages} onClear={handleClearMessages} />
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-blue-700 font-medium">토픽 수</span>
                  <span className="text-xl font-bold text-blue-900">
                    {loading ? '...' : topics.length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-green-700 font-medium">메시지 로그</span>
                  <span className="text-xl font-bold text-green-900">{messages.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm text-purple-700 font-medium">상태</span>
                  <span className="text-sm font-bold text-purple-900">
                    {backendStatus === 'healthy' ? '정상' : '오류'}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Topics */}
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">토픽 목록</h3>
              {loading ? (
                <div className="text-center text-gray-500 py-4">Loading...</div>
              ) : topics.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  토픽이 없습니다
                  <br />
                  <button
                    onClick={() => setActiveTab('topics')}
                    className="mt-2 text-blue-600 hover:underline text-sm"
                  >
                    토픽 생성하기
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {topics.map((topic) => (
                    <div
                      key={topic}
                      className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-800">{topic}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Help */}
            <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-3">사용 가이드</h3>
              <div className="space-y-2 text-sm text-blue-800">
                <div className="flex gap-2">
                  <span className="font-medium">1.</span>
                  <span>Topics 탭에서 토픽을 생성하세요</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-medium">2.</span>
                  <span>Producer 탭에서 메시지를 전송하세요</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-medium">3.</span>
                  <span>Consumer 탭에서 실시간으로 소비하세요</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-medium">4.</span>
                  <span>Metrics 탭에서 성능을 모니터링하세요</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-600">
          <p>Kafka Monitoring Dashboard - Built with React + Vite + Go + Kafka</p>
          <p className="mt-1">For learning and testing purposes</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
