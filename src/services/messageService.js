import api from './api';

const getPayload = (data) => data?.data || data;

const normalizeMessages = (data, page, limit) => {
  const payload = getPayload(data);

  if (Array.isArray(payload)) {
    return {
      messages: payload,
      hasMore: payload.length === limit,
      nextPage: page + 1
    };
  }

  const messages = payload?.messages || payload?.items || payload?.results || [];
  const currentPage = payload?.page || payload?.currentPage || page;
  const totalPages = payload?.totalPages || payload?.pages;
  const hasMore = payload?.hasMore ?? (
    totalPages ? currentPage < totalPages : Array.isArray(messages) && messages.length === limit
  );

  return {
    messages: Array.isArray(messages) ? messages : [],
    hasMore: Boolean(hasMore),
    nextPage: currentPage + 1
  };
};

export const getMessages = async ({ conversationId, page = 1, limit = 20 }) => {
  const response = await api.get(`/chat/messages/${encodeURIComponent(conversationId)}`, {
    params: { page, limit }
  });

  return normalizeMessages(response.data, page, limit);
};
