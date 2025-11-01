import React from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';

const MessageLog = ({ messages, onClear }) => {
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  const getMessageTypeColor = (type) => {
    switch (type) {
      case 'produced':
        return 'bg-green-50 border-green-200';
      case 'consumed':
        return 'bg-blue-50 border-blue-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getMessageTypeIcon = (type) => {
    switch (type) {
      case 'produced':
        return '📤';
      case 'consumed':
        return '📥';
      case 'error':
        return '❌';
      default:
        return '📨';
    }
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="card-header">
          <MessageSquare className="w-6 h-6" />
          메시지 로그
        </h2>
        <button
          onClick={onClear}
          className="btn-secondary flex items-center gap-2"
          disabled={messages.length === 0}
        >
          <Trash2 className="w-4 h-4" />
          Clear
        </button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            메시지가 없습니다
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`p-3 border rounded-lg fade-in ${getMessageTypeColor(msg.type)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getMessageTypeIcon(msg.type)}</span>
                    <span className="font-semibold text-sm">
                      {msg.type === 'produced' ? 'Produced' : msg.type === 'consumed' ? 'Consumed' : 'Error'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Topic:</span>
                      <span className="ml-2 text-gray-900">{msg.topic}</span>
                    </div>
                    {msg.partition !== undefined && (
                      <div>
                        <span className="font-medium text-gray-700">Partition:</span>
                        <span className="ml-2 text-gray-900">{msg.partition}</span>
                      </div>
                    )}
                    {msg.key && (
                      <div>
                        <span className="font-medium text-gray-700">Key:</span>
                        <span className="ml-2 text-gray-900 font-mono text-xs">{msg.key}</span>
                      </div>
                    )}
                    {msg.offset !== undefined && (
                      <div>
                        <span className="font-medium text-gray-700">Offset:</span>
                        <span className="ml-2 text-gray-900">{msg.offset}</span>
                      </div>
                    )}
                  </div>

                  {msg.value && (
                    <div className="mt-2">
                      <span className="font-medium text-gray-700 text-sm">Value:</span>
                      <div className="mt-1 p-2 bg-white rounded border border-gray-200">
                        <code className="text-xs text-gray-800 break-all">
                          {msg.value}
                        </code>
                      </div>
                    </div>
                  )}

                  {msg.error && (
                    <div className="mt-2 text-red-600 text-sm">
                      <span className="font-medium">Error:</span> {msg.error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {messages.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          총 {messages.length}개의 메시지
        </div>
      )}
    </div>
  );
};

export default MessageLog;
