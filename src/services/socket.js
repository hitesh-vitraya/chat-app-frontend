import { io } from 'socket.io-client';
import { SOCKET_URL } from '../constants/config';

let socket;

export const initializeSocket = (token) => {
  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    autoConnect: false,
    auth: token ? { token } : undefined,
    transports: ['websocket']
  });

  return socket;
};

export const getSocket = (token) => {
  if (!socket) {
    socket = initializeSocket(token);
  } else if (token) {
    socket.auth = { token };
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
};
