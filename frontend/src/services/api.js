import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Producer API
export const produceMessage = async (topic, key, value, partition = null) => {
  const payload = {
    topic,
    key,
    value,
    ...(partition !== null && { partition }),
  };
  return api.post('/api/produce', payload);
};

export const produceBatchMessages = async (topic, messages) => {
  return api.post('/api/produce/batch', { topic, messages });
};

// Consumer API
export const consumeMessages = async (topic, partition = 0, offset = null) => {
  const params = new URLSearchParams({ topic, partition });
  if (offset !== null) {
    params.append('offset', offset);
  }
  return api.get(`/api/consume?${params}`);
};

// WebSocket Consumer
export const createConsumerWebSocket = (topic, group, onMessage, onError) => {
  const wsUrl = API_BASE_URL.replace(/^http/, 'ws');
  const ws = new WebSocket(`${wsUrl}/api/consume/ws?topic=${topic}&group=${group}`);

  ws.onopen = () => {
    console.log('WebSocket connected');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    if (onError) onError(error);
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
  };

  return ws;
};

// Topic Management API
export const listTopics = async () => {
  return api.get('/api/topics');
};

export const createTopic = async (name, partitions, replicationFactor) => {
  return api.post('/api/topics', {
    name,
    partitions,
    replicationFactor,
  });
};

export const getTopicDetails = async (name) => {
  return api.get(`/api/topics/${name}`);
};

export const deleteTopic = async (name) => {
  return api.delete(`/api/topics/${name}`);
};

// Metrics API
export const getConsumerGroups = async () => {
  return api.get('/api/metrics/consumer-groups');
};

export const getConsumerLag = async (topic, group) => {
  return api.get(`/api/metrics/lag?topic=${topic}&group=${group}`);
};

export const getBrokers = async () => {
  return api.get('/api/brokers');
};

export const getClusterMetrics = async () => {
  return api.get('/api/metrics/cluster');
};

// Health Check
export const healthCheck = async () => {
  return api.get('/health');
};

export default api;
