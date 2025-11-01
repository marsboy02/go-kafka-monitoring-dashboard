import React, { useState } from 'react';
import { Send, Layers } from 'lucide-react';
import { produceMessage, produceBatchMessages } from '../services/api';

const ProducerPanel = ({ topics, onMessageSent }) => {
  const [topic, setTopic] = useState('');
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [partition, setPartition] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [batchMode, setBatchMode] = useState(false);
  const [batchCount, setBatchCount] = useState(5);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!topic || !value) {
      setError('토픽과 메시지 값은 필수입니다');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const partitionNum = partition ? parseInt(partition) : null;
      await produceMessage(topic, key, value, partitionNum);

      onMessageSent({
        type: 'produced',
        topic,
        key,
        value,
        partition: partitionNum,
        timestamp: new Date().toISOString(),
      });

      // 폼 초기화 (토픽과 키는 유지)
      setValue('');
      setError('');
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || '메시지 전송 실패';
      setError(errorMsg);
      onMessageSent({
        type: 'error',
        topic,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendBatch = async () => {
    if (!topic || batchCount < 1) {
      setError('토픽과 유효한 배치 개수가 필요합니다');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const messages = Array.from({ length: batchCount }, (_, i) => ({
        key: `${key || 'batch'}-${i}`,
        value: `${value || 'Message'} ${i + 1}`,
      }));

      await produceBatchMessages(topic, messages);

      onMessageSent({
        type: 'produced',
        topic,
        value: `${batchCount}개의 배치 메시지 전송됨`,
        timestamp: new Date().toISOString(),
      });

      setError('');
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || '배치 전송 실패';
      setError(errorMsg);
      onMessageSent({
        type: 'error',
        topic,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="card-header">
        <Send className="w-6 h-6" />
        Producer
      </h2>

      <form onSubmit={handleSendMessage} className="space-y-4">
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
              required
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
              required
            />
          )}
        </div>

        {/* 배치 모드 토글 */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="batchMode"
            checked={batchMode}
            onChange={(e) => setBatchMode(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="batchMode" className="text-sm font-medium text-gray-700">
            배치 모드
          </label>
        </div>

        {batchMode ? (
          /* 배치 모드 UI */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                배치 개수
              </label>
              <input
                type="number"
                value={batchCount}
                onChange={(e) => setBatchCount(parseInt(e.target.value) || 1)}
                min="1"
                max="1000"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Key 접두사
              </label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="batch"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Value 접두사
              </label>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Message"
                className="input-field"
              />
            </div>

            <button
              type="button"
              onClick={handleSendBatch}
              disabled={loading || !topic}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Layers className="w-4 h-4" />
              {loading ? '전송 중...' : `배치 전송 (${batchCount}개)`}
            </button>
          </div>
        ) : (
          /* 단일 메시지 모드 UI */
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Key
              </label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="메시지 키 (선택사항)"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Value *
              </label>
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="메시지 내용을 입력하세요"
                className="input-field"
                rows="4"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Partition (선택사항)
              </label>
              <input
                type="number"
                value={partition}
                onChange={(e) => setPartition(e.target.value)}
                placeholder="자동 할당"
                className="input-field"
                min="0"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !topic || !value}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {loading ? '전송 중...' : '메시지 전송'}
            </button>
          </>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </form>
    </div>
  );
};

export default ProducerPanel;
