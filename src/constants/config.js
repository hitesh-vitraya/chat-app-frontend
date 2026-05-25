const DEFAULT_BACKEND_URL = 'https://chat-app-backend-production-c9ff.up.railway.app';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || `${DEFAULT_BACKEND_URL}/api`;
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || DEFAULT_BACKEND_URL;
