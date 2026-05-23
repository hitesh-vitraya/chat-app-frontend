import api from './api';

const getPayload = (data) => data?.data || data;

const normalizeConversations = (data) => {
  const payload = getPayload(data);

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.conversations)) {
    return payload.conversations;
  }

  if (Array.isArray(payload?.chats)) {
    return payload.chats;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  return [];
};

export const getConversations = async () => {
  const response = await api.get('/chat/conversations');
  return normalizeConversations(response.data);
};

export const startConversation = async (receiverId) => {
  const response = await api.post('/chat/start', { receiverId });
  const payload = getPayload(response.data);

  return payload?.conversation || payload?.chat || payload;
};
