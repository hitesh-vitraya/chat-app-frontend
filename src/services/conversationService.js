import api from './api';

const CONVERSATION_ENDPOINTS = [
  process.env.EXPO_PUBLIC_CONVERSATIONS_PATH,
  '/conversations',
  '/chats',
  '/chat',
  '/messages/conversations'
].filter(Boolean);

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
  let routeError;

  for (const endpoint of CONVERSATION_ENDPOINTS) {
    try {
      const response = await api.get(endpoint);
      return normalizeConversations(response.data);
    } catch (error) {
      if (error.response?.status !== 404) {
        throw error;
      }

      routeError = error;
    }
  }

  if (routeError) {
    return [];
  }

  return [];
};
