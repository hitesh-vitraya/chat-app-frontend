import { io } from 'socket.io-client';
import { SOCKET_URL } from '../constants/config';

const socketEvents = {
  message: ['receive_message', 'message', 'newMessage', 'message:new'],
  typing: ['typing', 'userTyping', 'typing:start'],
  stopTyping: ['stop_typing', 'stopTyping', 'typing:stop'],
  seen: ['seen_status', 'messageSeen', 'message:seen'],
  online: ['online', 'user_online', 'presence:online'],
  offline: ['offline', 'user_offline', 'presence:offline']
};

const emitEvents = {
  joinConversation: ['join_conversation', 'joinConversation', 'conversation:join'],
  leaveConversation: ['leave_conversation', 'leaveConversation', 'conversation:leave'],
  sendMessage: ['send_message', 'sendMessage', 'message:send'],
  typing: ['typing', 'typing:start'],
  stopTyping: ['stop_typing', 'stopTyping', 'typing:stop'],
  seen: ['seen_status', 'message_seen', 'message:seen']
};

let socket;
let authToken;

const createSocket = (token) => io(SOCKET_URL, {
  autoConnect: false,
  auth: token ? { token } : undefined,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  transports: ['websocket']
});

const getOrCreateSocket = (token = authToken) => {
  if (!socket) {
    socket = createSocket(token);
  }

  if (token) {
    authToken = token;
    socket.auth = { token };
  }

  return socket;
};

export const connectSocket = (token) => {
  const activeSocket = getOrCreateSocket(token);

  if (!activeSocket.connected) {
    activeSocket.connect();
  }

  return activeSocket;
};

export const getSocket = (token) => getOrCreateSocket(token);

export const disconnectSocket = () => {
  authToken = null;

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

export const onSocketReconnect = (handler) => {
  const activeSocket = getOrCreateSocket();

  activeSocket.off('connect', handler);
  activeSocket.on('connect', handler);
  activeSocket.off('reconnect', handler);
  activeSocket.io.on('reconnect', handler);

  return () => {
    activeSocket.off('connect', handler);
    activeSocket.io.off('reconnect', handler);
  };
};

export const subscribeSocketEvents = (eventNames, handler) => {
  const activeSocket = getOrCreateSocket();

  eventNames.forEach((eventName) => {
    activeSocket.off(eventName, handler);
    activeSocket.on(eventName, handler);
  });

  return () => {
    eventNames.forEach((eventName) => {
      activeSocket.off(eventName, handler);
    });
  };
};

const emitMany = (eventNames, payload) => {
  const activeSocket = getOrCreateSocket();

  eventNames.forEach((eventName) => {
    activeSocket.emit(eventName, payload);
  });
};

export const joinConversation = (conversationId) => {
  emitMany(emitEvents.joinConversation, { conversationId });
};

export const leaveConversation = (conversationId) => {
  emitMany(emitEvents.leaveConversation, { conversationId });
};

export const emitSendMessage = ({ conversationId, message }) => {
  emitMany(emitEvents.sendMessage, { conversationId, message });
};

export const emitTyping = (conversationId) => {
  emitMany(emitEvents.typing, { conversationId });
};

export const emitStopTyping = (conversationId) => {
  emitMany(emitEvents.stopTyping, { conversationId });
};

export const emitSeenStatus = ({ conversationId, messageId }) => {
  emitMany(emitEvents.seen, { conversationId, messageId });
};

export const subscribeToMessages = (handler) => subscribeSocketEvents(socketEvents.message, handler);

export const subscribeToTyping = ({ onTyping, onStopTyping }) => {
  const cleanupTyping = subscribeSocketEvents(socketEvents.typing, onTyping);
  const cleanupStopTyping = subscribeSocketEvents(socketEvents.stopTyping, onStopTyping);

  return () => {
    cleanupTyping();
    cleanupStopTyping();
  };
};

export const subscribeToSeenStatus = (handler) => subscribeSocketEvents(socketEvents.seen, handler);

export const subscribeToPresence = ({ onOnline, onOffline }) => {
  const cleanupOnline = subscribeSocketEvents(socketEvents.online, onOnline);
  const cleanupOffline = subscribeSocketEvents(socketEvents.offline, onOffline);

  return () => {
    cleanupOnline();
    cleanupOffline();
  };
};
