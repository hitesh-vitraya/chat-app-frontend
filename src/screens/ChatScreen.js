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
import { getMessages } from '../services/messageService';
import {
  emitSendMessage,
  emitSeenStatus,
  emitStopTyping,
  emitTyping,
  joinConversation,
  leaveConversation,
  onSocketReconnect,
  subscribeToPresence,
  subscribeToMessages,
  subscribeToSeenStatus,
  subscribeToTyping
} from '../services/socket';
import { getApiErrorMessage } from '../utils/errors';

const PAGE_SIZE = 20;

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

const getParticipant = (conversation, currentUserId) => {
  const directParticipant = (
    conversation?.participant
    || conversation?.receiver
    || conversation?.recipient
    || conversation?.otherUser
  );

  if (directParticipant) {
    return directParticipant;
  }

  const users = conversation?.members || conversation?.participants || conversation?.users || [];

  if (Array.isArray(users) && users.length) {
    return users.find((member) => {
      const memberId = getUserId(member);
      return currentUserId && memberId && String(memberId) !== String(currentUserId);
    }) || users[0];
  }

  return conversation?.user || {};
};

const getReceiverId = (routeParams, currentUserId) => {
  const conversation = routeParams?.conversation || {};
  const participant = getParticipant(conversation, currentUserId);

  return (
    routeParams?.receiverId
    || participant.id
    || participant._id
    || participant.userId
    || conversation.receiverId
    || conversation.participantId
    || conversation.userId
  );
};

const getChatTitle = (routeParams, currentUserId) => {
  if (routeParams?.title && routeParams.title !== 'Unknown user') {
    return routeParams.title;
  }

  const participant = getParticipant(routeParams?.conversation || {}, currentUserId);

  return participant.username || participant.name || participant.fullName || routeParams?.title || 'Chat';
};

const getLastSeenValue = (participant, conversation) => (
  participant.lastSeen
  || participant.lastSeenAt
  || participant.lastActiveAt
  || participant.updatedAt
  || conversation.lastSeen
  || conversation.lastSeenAt
);

const formatPresenceTime = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isToday) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return `yesterday at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const getInitialPresence = (routeParams, currentUserId) => {
  const conversation = routeParams?.conversation || {};
  const participant = getParticipant(conversation, currentUserId);
  const isOnline = Boolean(participant.isOnline || participant.online || conversation.isOnline);

  return {
    isOnline,
    lastSeenAt: getLastSeenValue(participant, conversation)
  };
};

const getPresenceUserId = (payload) => (
  payload?.userId
  || payload?.id
  || payload?._id
  || payload?.user?.id
  || payload?.user?._id
);

const getPresenceLabel = ({ isOnline, lastSeenAt }) => {
  if (isOnline) {
    return 'Online';
  }

  const timestamp = formatPresenceTime(lastSeenAt);

  return timestamp ? `Last seen ${timestamp}` : 'Offline';
};

const getSocketMessage = (response) => (
  response?.message
  || response?.data?.message
  || response?.data
  || response
);

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
  const { user } = useAuth();
  const currentUserId = useMemo(() => getUserId(user), [user]);
  const conversationId = route.params?.conversationId || route.params?.conversation?._id || route.params?.conversation?.id;
  const receiverId = getReceiverId(route.params, currentUserId);
  const title = getChatTitle(route.params, currentUserId);
  const [presence, setPresence] = useState(() => getInitialPresence(route.params, currentUserId));
  const listRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesRef = useRef([]);
  const hasMoreRef = useRef(true);
  const isLoadingMoreRef = useRef(false);
  const nextPageRef = useRef(1);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextPage, setNextPage] = useState(1);
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <Text numberOfLines={1} style={styles.headerName}>{title}</Text>
          <Text
            numberOfLines={1}
            style={[
              styles.headerPresence,
              presence.isOnline && styles.headerPresenceOnline
            ]}
          >
            {getPresenceLabel(presence)}
          </Text>
        </View>
      )
    });
  }, [navigation, presence, title]);

  useEffect(() => {
    setPresence(getInitialPresence(route.params, currentUserId));
  }, [currentUserId, route.params]);

  useEffect(() => {
    if (!receiverId) {
      return undefined;
    }

    const updatePresence = (payload, isOnline) => {
      const userId = getPresenceUserId(payload);

      if (!userId || String(userId) !== String(receiverId)) {
        return;
      }

      setPresence((current) => ({
        isOnline,
        lastSeenAt: isOnline ? current.lastSeenAt : (payload?.lastSeenAt || payload?.lastSeen || new Date().toISOString())
      }));
    };

    return subscribeToPresence({
      onOnline: (payload) => updatePresence(payload, true),
      onOffline: (payload) => updatePresence(payload, false)
    });
  }, [receiverId]);

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
    nextPageRef.current = nextPage;
  }, [nextPage]);

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
        page: older ? nextPageRef.current : 1,
        limit: PAGE_SIZE
      });
      const normalized = response.messages.map((message) => normalizeMessage(message, currentUserId));
      const latestIncomingMessage = normalized.find((message) => !message.isMine);

      setMessages((current) => older ? mergeMessages(current, normalized) : sortNewestFirst(normalized));
      setHasMore(response.hasMore && normalized.length > 0);
      setNextPage(response.nextPage || (older ? nextPageRef.current + 1 : 2));

      if (!older && latestIncomingMessage) {
        emitSeenStatus({
          conversationId,
          messageId: latestIncomingMessage.id
        });
      }
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

    joinConversation(conversationId);

    const handleIncomingMessage = (payload) => {
      const message = payload?.message || payload;

      if (!message || !belongsToConversation(message, conversationId)) {
        return;
      }

      const normalizedMessage = normalizeMessage(message, currentUserId);

      setMessages((current) => mergeMessages(current, [normalizedMessage]));

      if (!normalizedMessage.isMine) {
        emitSeenStatus({
          conversationId,
          messageId: getMessageId(message)
        });
      }

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

    const cleanupMessages = subscribeToMessages(handleIncomingMessage);
    const cleanupTyping = subscribeToTyping({
      onTyping: handleTyping,
      onStopTyping: handleStopTyping
    });
    const cleanupSeen = subscribeToSeenStatus(handleSeen);
    const cleanupReconnect = onSocketReconnect(() => joinConversation(conversationId));

    return () => {
      leaveConversation(conversationId);
      cleanupMessages();
      cleanupTyping();
      cleanupSeen();
      cleanupReconnect();
    };
  }, [conversationId, currentUserId]);

  const emitTypingStatus = useCallback((isCurrentlyTyping) => {
    if (!conversationId) {
      return;
    }

    if (isCurrentlyTyping) {
      emitTyping(conversationId);
    } else {
      emitStopTyping(conversationId);
    }
  }, [conversationId]);

  const handleChangeText = useCallback((value) => {
    setInput(value);

    if (!value.trim()) {
      emitTypingStatus(false);
      return;
    }

    emitTypingStatus(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitTypingStatus(false), 1200);
  }, [emitTypingStatus]);

  const handleSend = useCallback(async () => {
    const text = input.trim();

    if (!text || !conversationId || !receiverId || isSending) {
      return;
    }

    clearTimeout(typingTimeoutRef.current);
    emitTypingStatus(false);
    setInput('');
    setIsSending(true);

    const clientId = `local-${Date.now()}`;
    const optimisticMessage = normalizeMessage({
      clientId,
      text,
      senderId: currentUserId,
      fromMe: true,
      isMine: true,
      createdAt: new Date().toISOString(),
      pending: true,
      status: 'sent'
    }, currentUserId);

    setMessages((current) => mergeMessages(current, [optimisticMessage]));
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));

    try {
      const response = await emitSendMessage({ receiverId, text });
      const savedMessage = getSocketMessage(response);
      const normalizedSavedMessage = normalizeMessage(savedMessage || {
        ...optimisticMessage.raw,
        pending: false
      }, currentUserId);

      setMessages((current) => mergeMessages(
        current.filter((message) => message.id !== optimisticMessage.id),
        [{ ...normalizedSavedMessage, isMine: true, pending: false }]
      ));

    } catch (sendError) {
      setError(getApiErrorMessage(sendError, 'Unable to send message.'));
      setMessages((current) => current.filter((message) => message.id !== optimisticMessage.id));
      setInput(text);
    } finally {
      setIsSending(false);
    }
  }, [conversationId, currentUserId, emitTypingStatus, input, isSending, receiverId]);

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
          disabled={!input.trim() || !receiverId || isSending}
          onPress={handleSend}
          style={({ pressed }) => [
            styles.sendButton,
            (!input.trim() || !receiverId || isSending) && styles.sendButtonDisabled,
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
  headerTitle: {
    maxWidth: 220
  },
  headerName: {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: '700'
  },
  headerPresence: {
    marginTop: 1,
    color: theme.colors.mutedText,
    fontSize: 11
  },
  headerPresenceOnline: {
    color: theme.colors.success,
    fontWeight: '700'
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
