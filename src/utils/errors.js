import { API_URL } from '../constants/config';

export const getApiErrorMessage = (error, fallback) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  if (error.response?.status) {
    return `${fallback} Server responded with status ${error.response.status}.`;
  }

  if (error.request) {
    return `Cannot reach the API at ${API_URL}. Check that the backend is running and that this URL is reachable from your device or emulator.`;
  }

  return error.message || fallback;
};
