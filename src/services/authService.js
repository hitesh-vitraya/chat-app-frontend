import api from './api';

const normalizeAuthResponse = (data) => {
  const payload = data?.data || data;
  const token = payload?.token || payload?.accessToken || payload?.jwt;
  const user = payload?.user || payload?.profile || null;

  if (!token) {
    throw new Error('Authentication response did not include a token.');
  }

  return { token, user };
};

export const loginRequest = async ({ email, password }) => {
  const response = await api.post('/auth/login', { email, password });
  return normalizeAuthResponse(response.data);
};

export const signupRequest = async ({ name, email, password }) => {
  const response = await api.post('/auth/signup', { name, email, password });
  return normalizeAuthResponse(response.data);
};
