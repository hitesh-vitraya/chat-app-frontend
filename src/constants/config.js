const LOCAL_NETWORK_HOST = '192.168.31.147';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_NETWORK_HOST}:3000/api`;
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || `http://${LOCAL_NETWORK_HOST}:3000`;
