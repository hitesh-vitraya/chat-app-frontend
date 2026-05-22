import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import theme from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getMessages, sendMessage } from '../services/messageService';
import { getSocket } from '../services/socket';
import { getApiErrorMessage } from '../utils/errors';

const PAGE_SIZE = 30;

const getMessageId = (message) => (
  message.id
  || message._id
  || message.messageId
  || message.clientId
);

const getMessageText = (message) => message.text || message.content || message.body || '';

const getMessageTimeValue = (message) => (
  message.createdAt
  || message.sentAt
  || message.timestamp
  || message.updatedAt
);

const getSenderId = (message) => (
  message.senderId
  || message.userId
  || message.sender?._id
  || message.sender?.id
  || message.user?._id
  || message.user?.id
);

const getUserId = (user) => user?.id || user?._id || user?.userId;

const formatMessageTime = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const normalizeMessage = (message, currentUserId) => {
  const senderId = getSenderId(message);
  const id = getMessageId(message) || `${senderId || 'message'}-${getMessageTimeValue(message) || Date.now()}`;
  const isMine = Boolean(
    message.isMine
    || message.mine
    || message.fromMe
    || (currentUserId && senderId && String(senderId) === String(currentUserId))
  );

  return {
    id: String(id),
    raw: message,
    text: getMessageText(message),
    timestamp: formatMessageTime(getMessageTimeValue(message)),
    createdAt: getMessageTimeValue(message) || new Date().toISOString(),
    isMine,
    status: message.status || (message.seen || message.read ? 'seen' : 'sent'),
    pending: Boolean(message.pending)
  };
};

const sortNewestFirst = (messages) => [...messages].sort((a, b) => {
  const aTime = new Date(a.createdAt).getTime();
  const bTime = new Date(b.createdAt).getTime();

  return bTime - aTime;
});

const mergeMessages = (currentMessages, nextMessages) => {
  const byId = new Map();

  [...currentMessages, ...nextMessages].forEach((message) => {
    byId.set(message.id, {
      ...byId.get(message.id),
      ...message
    });
  });

  return sortNewestFirst([...byId.values()]);
};

const belongsToConversation = (payload, conversationId) => {
  const payloadConversationId = (
    payload.conversationId
    || payload.chatId
    || payload.conversation?._id
    || payload.conversation?.id
  );

  return !payloadConversationId || String(payloadConversationId) === String(conversationId);
};

const getOldestCursor = (messages) => messages[messages.length - 1]?.createdAt;

const MessageBubble = memo(function MessageBubble({ item }) {
  return (
    <View style={[
      styles.messageRow,
      item.isMine ? styles.myMessageRow : styles.theirMessageRow
    ]}>
      <View style={[
        styles.bubble,
        item.isMine ? styles.myBubble : styles.theirBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.isMine ? styles.myMessageText : styles.theirMessageText
        ]}>
          {item.text}
        </Text>
        <View style={styles.messageMeta}>
          <Text style={[
            styles.messageTime,
            item.isMine ? styles.myMessageTime : styles.theirMessageTime
          ]}>
            {item.timestamp}
          </Text>
          {item.isMine ? (
            <Text style={[
              styles.statusTicks,
              item.status === 'seen' && styles.seenTicks
            ]}>
              {item.pending ? '...' : item.status === 'seen' ? '\u2713\u2713' : '\u2713'}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
});

export default function ChatScreen({ route, navigation }) {
  const { token, user } = useAuth();
  const conversationId = route.params?.conversationId || route.params?.conversation?._id || route.params?.conversation?.id;
  const title = route.params?.title || 'Chat';
  const currentUserId = useMemo(() => getUserId(user), [user]);
  const listRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesRef = useRef([]);
  const hasMoreRef = useRef(true);
  const isLoadingMoreRef = useRef(false);
  const nextCursorRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore;
  }, [isLoadingMore]);

  useEffect(() => {
    nextCursorRef.current = nextCursor;
  }, [nextCursor]);

  const loadMessages = useCallback(async ({ older = false } = {}) => {
    if (!conversationId || (older && (!hasMoreRef.current || isLoadingMoreRef.current))) {
      return;
    }

    if (older) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    setError('');

    try {
      const response = await getMessages({
        conversationId,
        cursor: older ? nextCursorRef.current || getOldestCursor(messagesRef.current) : undefined,
        limit: PAGE_SIZE
      });
      const normalized = response.messages.map((message) => normalizeMessage(message, currentUserId));

      setMessages((current) => older ? mergeMessages(current, normalized) : sortNewestFirst(normalized));
      setHasMore(response.hasMore && normalized.length > 0);
      setNextCursor(response.nextCursor || getOldestCursor(normalized));
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'Unable to load messages.'));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [conversationId, currentUserId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => () => {
    clearTimeout(typingTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!conversationId) {
      return undefined;
    }

    const socket = getSocket(token);

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('joinConversation', { conversationId });
    socket.emit('conversation:join', { conversationId });

    const handleIncomingMessage = (payload) => {
      const message = payload?.message || payload;

      if (!message || !belongsToConversation(message, conversationId)) {
        return;
      }

      setMessages((current) => mergeMessages(current, [normalizeMessage(message, currentUserId)]));
      requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
    };

    const handleTyping = (payload) => {
      if (!belongsToConversation(payload || {}, conversationId)) {
        return;
      }

      const typingUserId = payload?.userId || payload?.senderId;

      if (currentUserId && typingUserId && String(typingUserId) === String(currentUserId)) {
        return;
      }

      setIsTyping(true);
    };

    const handleStopTyping = (payload) => {
      if (belongsToConversation(payload || {}, conversationId)) {
        setIsTyping(false);
      }
    };

    const handleSeen = (payload) => {
      if (!belongsToConversation(payload || {}, conversationId)) {
        return;
      }

      setMessages((current) => current.map((message) => (
        message.isMine ? { ...message, status: 'seen' } : message
      )));
    };

    socket.on('message', handleIncomingMessage);
    socket.on('newMessage', handleIncomingMessage);
    socket.on('message:new', handleIncomingMessage);
    socket.on('typing', handleTyping);
    socket.on('userTyping', handleTyping);
    socket.on('stopTyping', handleStopTyping);
    socket.on('typing:stop', handleStopTyping);
    socket.on('messageSeen', handleSeen);
    socket.on('message:seen', handleSeen);

    return () => {
      socket.emit('leaveConversation', { conversationId });
      socket.emit('conversation:leave', { conversationId });
      socket.off('message', handleIncomingMessage);
      socket.off('newMessage', handleIncomingMessage);
      socket.off('message:new', handleIncomingMessage);
      socket.off('typing', handleTyping);
      socket.off('userTyping', handleTyping);
      socket.off('stopTyping', handleStopTyping);
      socket.off('typing:stop', handleStopTyping);
      socket.off('messageSeen', handleSeen);
      socket.off('message:seen', handleSeen);
    };
  }, [conversationId, currentUserId, token]);

  const emitTyping = useCallback((isCurrentlyTyping) => {
    if (!conversationId) {
      return;
    }

    const socket = getSocket(token);
    const eventName = isCurrentlyTyping ? 'typing' : 'stopTyping';
    const alternateEventName = isCurrentlyTyping ? 'typing:start' : 'typing:stop';
    const payload = { conversationId };

    socket.emit(eventName, payload);
    socket.emit(alternateEventName, payload);
  }, [conversationId, token]);

  const handleChangeText = useCallback((value) => {
    setInput(value);

    if (!value.trim()) {
      emitTyping(false);
      return;
    }

    emitTyping(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitTyping(false), 1200);
  }, [emitTyping]);

  const handleSend = useCallback(async () => {
    const text = input.trim();

    if (!text || !conversationId || isSending) {
      return;
    }

    clearTimeout(typingTimeoutRef.current);
    emitTyping(false);
    setInput('');
    setIsSending(true);

    const clientId = `local-${Date.now()}`;
    const optimisticMessage = normalizeMessage({
      clientId,
      text,
      senderId: currentUserId,
      createdAt: new Date().toISOString(),
      pending: true,
      status: 'sent'
    }, currentUserId);

    setMessages((current) => mergeMessages(current, [optimisticMessage]));
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));

    try {
      const savedMessage = await sendMessage({ conversationId, text });
      const normalizedSavedMessage = normalizeMessage(savedMessage || {
        ...optimisticMessage.raw,
        pending: false
      }, currentUserId);

      setMessages((current) => mergeMessages(
        current.filter((message) => message.id !== optimisticMessage.id),
        [{ ...normalizedSavedMessage, pending: false }]
      ));

      const socket = getSocket(token);
      socket.emit('sendMessage', { conversationId, message: normalizedSavedMessage.raw || savedMessage });
      socket.emit('message:send', { conversationId, message: normalizedSavedMessage.raw || savedMessage });
    } catch (sendError) {
      setError(getApiErrorMessage(sendError, 'Unable to send message.'));
      setMessages((current) => current.filter((message) => message.id !== optimisticMessage.id));
      setInput(text);
    } finally {
      setIsSending(false);
    }
  }, [conversationId, currentUserId, emitTyping, input, isSending, token]);

  const handleLoadMore = useCallback(() => {
    loadMessages({ older: true });
  }, [loadMessages]);

  const renderItem = useCallback(({ item }) => <MessageBubble item={item} />, []);
  const keyExtractor = useCallback((item) => item.id, []);

  const listFooter = useMemo(() => (
    isLoadingMore ? (
      <View style={styles.paginationLoader}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    ) : null
  ), [isLoadingMore]);

  if (!conversationId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Conversation unavailable</Text>
        <Text style={styles.emptySubtitle}>Go back and choose a chat again.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      style={styles.container}
    >
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : (
        <>
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <FlatList
            ref={listRef}
            contentContainerStyle={[
              styles.messageList,
              messages.length === 0 && styles.emptyMessageList
            ]}
            data={messages}
            inverted
            initialNumToRender={16}
            keyboardShouldPersistTaps="handled"
            keyExtractor={keyExtractor}
            ListEmptyComponent={(
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptySubtitle}>Send the first message.</Text>
              </View>
            )}
            ListFooterComponent={listFooter}
            maxToRenderPerBatch={12}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.2}
            renderItem={renderItem}
            removeClippedSubviews
            windowSize={9}
          />

          {isTyping ? (
            <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>Typing...</Text>
            </View>
          ) : null}
        </>
      )}

      <View style={styles.composer}>
        <TextInput
          multiline
          onChangeText={handleChangeText}
          placeholder="Message"
          placeholderTextColor={theme.colors.placeholder}
          style={styles.input}
          value={input}
        />
        <Pressable
          accessibilityRole="button"
          disabled={!input.trim() || isSending}
          onPress={handleSend}
          style={({ pressed }) => [
            styles.sendButton,
            (!input.trim() || isSending) && styles.sendButtonDisabled,
            pressed && styles.sendButtonPressed
          ]}
        >
          <Text style={styles.sendButtonText}>{isSending ? '...' : 'Send'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.mutedText,
    fontSize: theme.typography.body
  },
  errorBanner: {
    margin: theme.spacing.md,
    marginBottom: 0,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: theme.typography.caption
  },
  messageList: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  emptyMessageList: {
    flexGrow: 1
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: theme.spacing.xs
  },
  myMessageRow: {
    justifyContent: 'flex-end'
  },
  theirMessageRow: {
    justifyContent: 'flex-start'
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg
  },
  myBubble: {
    borderBottomRightRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary
  },
  theirBubble: {
    borderBottomLeftRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  messageText: {
    fontSize: theme.typography.body,
    lineHeight: 21
  },
  myMessageText: {
    color: theme.colors.surface
  },
  theirMessageText: {
    color: theme.colors.text
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.xs
  },
  messageTime: {
    fontSize: 11
  },
  myMessageTime: {
    color: '#DBEAFE'
  },
  theirMessageTime: {
    color: theme.colors.mutedText
  },
  statusTicks: {
    marginLeft: theme.spacing.xs,
    color: '#DBEAFE',
    fontSize: 11,
    fontWeight: '700'
  },
  seenTicks: {
    color: '#BFDBFE'
  },
  paginationLoader: {
    paddingVertical: theme.spacing.md
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    transform: [{ scaleY: -1 }]
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.subtitle,
    fontWeight: '700'
  },
  emptySubtitle: {
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    color: theme.colors.mutedText,
    fontSize: theme.typography.body
  },
  typingIndicator: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xs
  },
  typingText: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.caption,
    fontStyle: 'italic'
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    color: theme.colors.text,
    fontSize: theme.typography.body,
    backgroundColor: theme.colors.background
  },
  sendButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.placeholder
  },
  sendButtonPressed: {
    opacity: 0.72
  },
  sendButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.caption,
    fontWeight: '700'
  }
});
