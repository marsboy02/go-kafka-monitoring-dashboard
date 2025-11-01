import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Wifi, WifiOff } from 'lucide-react';
import { createConsumerWebSocket, consumeMessages } from '../services/api';

const ConsumerPanel = ({ topics, onMessageReceived }) => {
  const [topic, setTopic] = useState('');
  const [group, setGroup] = useState('default-group');
  const [isConsuming, setIsConsuming] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const wsRef = useRef(null);

  // HTTP 모드 상태
  const [httpMode, setHttpMode] = useState(false);
  const [partition, setPartition] = useState('0');
  const [offset, setOffset] = useState('');

  useEffect(() => {
    // 컴포넌트 언마운트 시 WebSocket 정리
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const handleStartConsuming = () => {
    if (!topic) {
      setError('토픽을 선택하세요');
      return;
    }

    if (httpMode) {
      startHttpConsumer();
    } else {
      startWebSocketConsumer();
    }
  };

  const startWebSocketConsumer = () => {
    if (!group) {
      setError('Consumer Group을 입력하세요');
      return;
    }

    setError('');
    setConnectionStatus('connecting');

    try {
      wsRef.current = createConsumerWebSocket(
        topic,
        group,
        (message) => {
          setConnectionStatus('connected');
          onMessageReceived({
            type: 'consumed',
            topic: message.topic,
            partition: message.partition,
            offset: message.offset,
            key: message.key,
            value: message.value,
            timestamp: message.timestamp || new Date().toISOString(),
          });
        },
        (error) => {
          setError('WebSocket 연결 오류');
          setConnectionStatus('error');
          setIsConsuming(false);
        }
      );

      setIsConsuming(true);
    } catch (err) {
      setError(err.message || 'WebSocket 시작 실패');
      setConnectionStatus('error');
    }
  };

  const startHttpConsumer = async () => {
    setError('');
    setIsConsuming(true);

    try {
      const offsetNum = offset ? parseInt(offset) : null;
      const partitionNum = parseInt(partition);

      const response = await consumeMessages(topic, partitionNum, offsetNum);
      const messages = response.data.messages || [];

      messages.forEach((msg) => {
        onMessageReceived({
          type: 'consumed',
          topic: msg.topic,
          partition: msg.partition,
          offset: msg.offset,
          key: msg.key,
          value: msg.value,
          timestamp: msg.timestamp,
        });
      });

      if (messages.length === 0) {
        setError('메시지가 없습니다');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'HTTP 소비 실패';
      setError(errorMsg);
      onMessageReceived({
        type: 'error',
        topic,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsConsuming(false);
    }
  };

  const handleStopConsuming = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConsuming(false);
    setConnectionStatus('disconnected');
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    if (connectionStatus === 'connected') {
      return <Wifi className={`w-5 h-5 ${getStatusColor()}`} />;
    }
    return <WifiOff className={`w-5 h-5 ${getStatusColor()}`} />;
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="card-header">
          {getStatusIcon()}
          Consumer
        </h2>
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {connectionStatus === 'connected' && 'Connected'}
          {connectionStatus === 'connecting' && 'Connecting...'}
          {connectionStatus === 'error' && 'Error'}
          {connectionStatus === 'disconnected' && 'Disconnected'}
        </span>
      </div>

      <div className="space-y-4">
        {/* Topic 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Topic *
          </label>
          {topics.length > 0 ? (
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="input-field"
              disabled={isConsuming}
            >
              <option value="">토픽을 선택하세요</option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="토픽 이름을 입력하세요"
              className="input-field"
              disabled={isConsuming}
            />
          )}
        </div>

        {/* HTTP/WebSocket 모드 토글 */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="httpMode"
            checked={httpMode}
            onChange={(e) => setHttpMode(e.target.checked)}
            disabled={isConsuming}
            className="w-4 h-4"
          />
          <label htmlFor="httpMode" className="text-sm font-medium text-gray-700">
            HTTP 모드 (WebSocket 대신)
          </label>
        </div>

        {httpMode ? (
          /* HTTP 모드 UI */
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Partition
                </label>
                <input
                  type="number"
                  value={partition}
                  onChange={(e) => setPartition(e.target.value)}
                  min="0"
                  className="input-field"
                  disabled={isConsuming}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Offset (선택사항)
                </label>
                <input
                  type="number"
                  value={offset}
                  onChange={(e) => setOffset(e.target.value)}
                  placeholder="최신"
                  className="input-field"
                  disabled={isConsuming}
                />
              </div>
            </div>
          </>
        ) : (
          /* WebSocket 모드 UI */
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Consumer Group *
            </label>
            <input
              type="text"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="Consumer Group 이름"
              className="input-field"
              disabled={isConsuming}
            />
          </div>
        )}

        {/* 시작/중지 버튼 */}
        {!isConsuming ? (
          <button
            onClick={handleStartConsuming}
            disabled={!topic}
            className="btn-success w-full flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            소비 시작
          </button>
        ) : (
          <button
            onClick={handleStopConsuming}
            className="btn-danger w-full flex items-center justify-center gap-2"
            disabled={httpMode}
          >
            <Square className="w-4 h-4" />
            소비 중지
          </button>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* 정보 표시 */}
        {isConsuming && !httpMode && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <div className="font-medium text-blue-900 mb-1">실시간 소비 중</div>
            <div className="text-blue-700 space-y-1">
              <div>Topic: <span className="font-mono">{topic}</span></div>
              <div>Group: <span className="font-mono">{group}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsumerPanel;
