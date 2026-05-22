import api from './api';

const getPayload = (data) => data?.data || data;

const isMissingRoute = (error) => [404, 405].includes(error.response?.status);

const buildMessageEndpoints = (conversationId) => {
  const encodedId = encodeURIComponent(conversationId);

  return [
    process.env.EXPO_PUBLIC_MESSAGES_PATH?.replace(':conversationId', encodedId),
    `/conversations/${encodedId}/messages`,
    `/chats/${encodedId}/messages`,
    `/chat/${encodedId}/messages`,
    `/messages?conversationId=${encodedId}`
  ].filter(Boolean);
};

const normalizeMessages = (data) => {
  const payload = getPayload(data);

  if (Array.isArray(payload)) {
    return {
      messages: payload,
      hasMore: payload.length > 0
    };
  }

  const messages = payload?.messages || payload?.items || payload?.results || [];

  return {
    messages: Array.isArray(messages) ? messages : [],
    hasMore: Boolean(payload?.hasMore || payload?.nextCursor || payload?.nextPage),
    nextCursor: payload?.nextCursor || payload?.cursor || payload?.nextPage
  };
};

export const getMessages = async ({ conversationId, cursor, limit = 30 }) => {
  let routeError;
  const params = { limit };

  if (cursor) {
    params.cursor = cursor;
    params.before = cursor;
  }

  for (const endpoint of buildMessageEndpoints(conversationId)) {
    try {
      const response = await api.get(endpoint, { params });
      return normalizeMessages(response.data);
    } catch (error) {
      if (!isMissingRoute(error)) {
        throw error;
      }

      routeError = error;
    }
  }

  if (routeError) {
    return { messages: [], hasMore: false };
  }

  return { messages: [], hasMore: false };
};

export const sendMessage = async ({ conversationId, text }) => {
  let routeError;
  const body = { text, content: text, conversationId };

  for (const endpoint of buildMessageEndpoints(conversationId)) {
    try {
      const response = await api.post(endpoint, body);
      const payload = getPayload(response.data);
      return payload?.message || payload;
    } catch (error) {
      if (!isMissingRoute(error)) {
        throw error;
      }

      routeError = error;
    }
  }

  if (routeError) {
    throw routeError;
  }

  return null;
};
