import { io } from 'socket.io-client';
import { SOCKET_URL } from '../constants/config';

let socket;

export const initializeSocket = (token) => {
  socket = io(SOCKET_URL, {
    autoConnect: false,
    auth: token ? { token } : undefined,
    transports: ['websocket']
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    socket = initializeSocket();
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
};
