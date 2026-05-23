import api from './api';

const getPayload = (data) => data?.data || data;

const normalizeUsers = (data) => {
  const payload = getPayload(data);

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.users)) {
    return payload.users;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return [];
};

export const searchUsers = async (query, { page = 1, limit = 20 } = {}) => {
  const response = await api.get('/users/search', {
    params: {
      query: query.trim(),
      page,
      limit
    }
  });

  return normalizeUsers(response.data);
};
