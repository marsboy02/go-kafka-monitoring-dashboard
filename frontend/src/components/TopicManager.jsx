import React, { useState } from 'react';
import { FolderPlus, Trash2, Info, RefreshCw } from 'lucide-react';
import { createTopic, deleteTopic, getTopicDetails } from '../services/api';

const TopicManager = ({ topics, onTopicsChange }) => {
  const [newTopicName, setNewTopicName] = useState('');
  const [partitions, setPartitions] = useState('3');
  const [replicationFactor, setReplicationFactor] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [topicDetails, setTopicDetails] = useState(null);

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!newTopicName) {
      setError('토픽 이름을 입력하세요');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createTopic(
        newTopicName,
        parseInt(partitions),
        parseInt(replicationFactor)
      );

      setNewTopicName('');
      setPartitions('3');
      setReplicationFactor('1');

      // 토픽 목록 새로고침
      onTopicsChange();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || '토픽 생성 실패';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTopic = async (topicName) => {
    if (!confirm(`정말로 토픽 "${topicName}"을 삭제하시겠습니까?`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await deleteTopic(topicName);

      if (selectedTopic === topicName) {
        setSelectedTopic(null);
        setTopicDetails(null);
      }

      // 토픽 목록 새로고침
      onTopicsChange();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || '토픽 삭제 실패';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (topicName) => {
    setLoading(true);
    setError('');
    setSelectedTopic(topicName);

    try {
      const response = await getTopicDetails(topicName);
      setTopicDetails(response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || '상세 정보 조회 실패';
      setError(errorMsg);
      setTopicDetails(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="card-header">
        <FolderPlus className="w-6 h-6" />
        Topic 관리
      </h2>

      {/* 토픽 생성 폼 */}
      <form onSubmit={handleCreateTopic} className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            토픽 이름 *
          </label>
          <input
            type="text"
            value={newTopicName}
            onChange={(e) => setNewTopicName(e.target.value)}
            placeholder="my-topic"
            className="input-field"
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              파티션 수 *
            </label>
            <input
              type="number"
              value={partitions}
              onChange={(e) => setPartitions(e.target.value)}
              min="1"
              max="100"
              className="input-field"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              복제 계수 *
            </label>
            <input
              type="number"
              value={replicationFactor}
              onChange={(e) => setReplicationFactor(e.target.value)}
              min="1"
              max="5"
              className="input-field"
              disabled={loading}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !newTopicName}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <FolderPlus className="w-4 h-4" />
          {loading ? '생성 중...' : '토픽 생성'}
        </button>
      </form>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* 토픽 목록 */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800">토픽 목록</h3>
          <button
            onClick={onTopicsChange}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {topics.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            토픽이 없습니다
          </div>
        ) : (
          <div className="space-y-2">
            {topics.map((topic) => (
              <div
                key={topic}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <span className="font-medium text-gray-800">{topic}</span>
                  {selectedTopic === topic && topicDetails && (
                    <div className="mt-2 text-xs text-gray-600">
                      {topicDetails.partitions?.length || 0} 파티션
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewDetails(topic)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="상세 정보"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTopic(topic)}
                    disabled={loading}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 토픽 상세 정보 */}
      {selectedTopic && topicDetails && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-3">{selectedTopic} 상세 정보</h4>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-blue-700">파티션 수:</div>
              <div className="font-medium text-blue-900">
                {topicDetails.partitions?.length || 0}
              </div>
            </div>

            {topicDetails.partitions && topicDetails.partitions.length > 0 && (
              <div className="mt-3">
                <div className="font-medium text-blue-900 mb-2">파티션 정보:</div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {topicDetails.partitions.map((partition) => (
                    <div
                      key={partition.id}
                      className="p-2 bg-white rounded border border-blue-200 text-xs"
                    >
                      <div className="grid grid-cols-2 gap-1">
                        <div>
                          <span className="text-gray-600">Partition:</span>
                          <span className="ml-1 font-medium">{partition.id}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Leader:</span>
                          <span className="ml-1 font-medium">{partition.leader}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">First Offset:</span>
                          <span className="ml-1 font-medium">{partition.offsets?.first}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Last Offset:</span>
                          <span className="ml-1 font-medium">{partition.offsets?.last}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicManager;
