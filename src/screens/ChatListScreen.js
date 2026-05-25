import { useFocusEffect } from '@react-navigation/native';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import UserAvatar from '../components/UserAvatar';
import theme from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getConversations } from '../services/conversationService';
import { subscribeToMessages, subscribeToPresence, subscribeToSeenStatus } from '../services/socket';
import { getApiErrorMessage } from '../utils/errors';

const ROW_HEIGHT = 84;

const getUserId = (user) => user?.id || user?._id || user?.userId;

const getParticipant = (conversation = {}, currentUserId) => {
  const directParticipant = (
    conversation.participant
    || conversation.receiver
    || conversation.recipient
    || conversation.otherUser
  );

  if (directParticipant) {
    return directParticipant;
  }

  const users = conversation.members || conversation.participants || conversation.users || [];

  if (Array.isArray(users) && users.length) {
    return users.find((member) => {
      const memberId = getUserId(member);
      return currentUserId && memberId && String(memberId) !== String(currentUserId);
    }) || users[0];
  }

  return conversation.user || {};
};

const getLastMessage = (conversation = {}) => {
  const message = conversation.lastMessage || conversation.latestMessage || conversation.message;

  if (!message) {
    return 'No messages yet';
  }

  return message.text || message.content || message.body || (typeof message === 'string' ? message : 'No messages yet');
};

const getTimestampValue = (conversation = {}) => {
  const message = conversation.lastMessage || conversation.latestMessage || {};

  return (
    message.createdAt
    || message.updatedAt
    || conversation.lastMessageAt
    || conversation.updatedAt
    || conversation.createdAt
  );
};

const formatTimestamp = (value) => {
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
    return 'Yesterday';
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const getParticipantId = (participant = {}, conversation = {}) => (
  participant.id
  || participant._id
  || participant.userId
  || conversation.userId
  || conversation.participantId
);

const getPresenceUserId = (payload) => (
  payload?.userId
  || payload?.id
  || payload?._id
  || payload?.user?.id
  || payload?.user?._id
);

const getConversationId = (conversation = {}, index) => (
  conversation.id
  || conversation._id
  || conversation.conversationId
  || `conversation-${index}`
);

const getSeenConversationId = (payload) => (
  payload?.conversationId
  || payload?.chatId
  || payload?.conversation?._id
  || payload?.conversation?.id
);

const getMessageConversationId = (message) => (
  message?.conversationId
  || message?.chatId
  || message?.conversation?._id
  || message?.conversation?.id
);

const getMessageSenderId = (message) => (
  message?.senderId
  || message?.userId
  || message?.sender?._id
  || message?.sender?.id
);

const getUnreadCount = (conversation = {}) => {
  const unreadValue = (
    conversation.unreadCount
    ?? conversation.unreadMessageCount
    ?? conversation.unreadMessagesCount
    ?? conversation.unread
    ?? conversation.unread_count
    ?? conversation.unread_message_count
    ?? conversation.unreadMessages
    ?? 0
  );

  return Array.isArray(unreadValue) ? unreadValue.length : Number(unreadValue);
};

const normalizeConversation = (conversation = {}, index, currentUserId, readConversationIds) => {
  const participant = getParticipant(conversation, currentUserId);
  const username = participant.username || participant.name || participant.fullName || conversation.username || 'Unknown user';
  const id = getConversationId(conversation, index);
  const unreadCount = readConversationIds.has(String(id))
    ? 0
    : getUnreadCount(conversation);

  return {
    id,
    participantId: getParticipantId(participant, conversation),
    raw: conversation,
    username,
    avatarUrl: participant.avatar || participant.avatarUrl || participant.profileImage || conversation.avatarUrl,
    lastMessage: getLastMessage(conversation),
    timestamp: formatTimestamp(getTimestampValue(conversation)),
    unreadCount: Number.isNaN(unreadCount) ? 0 : unreadCount,
    isOnline: Boolean(participant.isOnline || participant.online || conversation.isOnline)
  };
};

const ChatListItem = memo(function ChatListItem({ item, onPress }) {
  return (
    <Pressable
      android_ripple={{ color: theme.colors.border }}
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.item,
        pressed && styles.itemPressed
      ]}
    >
      <View style={styles.avatarWrap}>
        <UserAvatar name={item.username} online={item.isOnline} size={56} uri={item.avatarUrl} />
      </View>

      <View style={styles.messageArea}>
        <View style={styles.itemHeader}>
          <Text numberOfLines={1} style={styles.username}>{item.username}</Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>

        <View style={styles.itemFooter}>
          <Text numberOfLines={1} style={[
            styles.lastMessage,
            item.unreadCount > 0 && styles.unreadMessage
          ]}>
            {item.lastMessage}
          </Text>
          {item.unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

export default function ChatListScreen({ navigation }) {
  const { user } = useAuth();
  const currentUserId = useMemo(() => getUserId(user), [user]);
  const hasLoadedRef = useRef(false);
  const conversationsRef = useRef([]);
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [readConversationIds, setReadConversationIds] = useState(() => new Set());

  const normalizedConversations = useMemo(
    () => conversations.filter(Boolean).map((conversation, index) => normalizeConversation(
      conversation,
      index,
      currentUserId,
      readConversationIds
    )),
    [conversations, currentUserId, readConversationIds]
  );

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const loadConversations = useCallback(async ({ refreshing = false } = {}) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError('');

    try {
      const nextConversations = await getConversations();
      setConversations(Array.isArray(nextConversations) ? nextConversations.filter(Boolean) : []);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'Unable to load conversations.'));
    } finally {
      hasLoadedRef.current = true;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConversations({ refreshing: hasLoadedRef.current });
    }, [loadConversations])
  );

  useEffect(() => {
    const updatePresence = (payload, isOnline) => {
      const userId = getPresenceUserId(payload);

      if (!userId) {
        return;
      }

      setConversations((current) => current.map((conversation) => {
        const participant = getParticipant(conversation, currentUserId);
        const participantId = getParticipantId(participant, conversation);

        if (String(participantId) !== String(userId)) {
          return conversation;
        }

        return {
          ...conversation,
          isOnline,
          lastSeenAt: isOnline ? conversation.lastSeenAt : (payload?.lastSeenAt || payload?.lastSeen || new Date().toISOString()),
          participant: {
            ...participant,
            isOnline,
            lastSeenAt: isOnline ? participant.lastSeenAt : (payload?.lastSeenAt || payload?.lastSeen || new Date().toISOString())
          }
        };
      }));
    };

    return subscribeToPresence({
      onOnline: (payload) => updatePresence(payload, true),
      onOffline: (payload) => updatePresence(payload, false)
    });
  }, [currentUserId]);

  useEffect(() => subscribeToSeenStatus((payload) => {
    const conversationId = getSeenConversationId(payload);

    if (!conversationId) {
      return;
    }

    setReadConversationIds((current) => {
      const next = new Set(current);
      next.add(String(conversationId));
      return next;
    });
  }), []);

  useEffect(() => subscribeToMessages((payload) => {
    const message = payload?.message || payload;
    const messageConversationId = getMessageConversationId(message);
    const senderId = getMessageSenderId(message);

    if (!message || (senderId && currentUserId && String(senderId) === String(currentUserId))) {
      return;
    }

    const matchingConversation = conversationsRef.current.find((conversation, index) => {
        const conversationId = getConversationId(conversation, index);
        const participantId = getParticipantId(getParticipant(conversation, currentUserId), conversation);

        return (
          (messageConversationId && String(conversationId) === String(messageConversationId))
          || (senderId && String(participantId) === String(senderId))
        );
    });

    if (!matchingConversation) {
      loadConversations({ refreshing: true });
      return;
    }

    const matchingId = getConversationId(
      matchingConversation,
      conversationsRef.current.indexOf(matchingConversation)
    );

    setReadConversationIds((current) => {
      const next = new Set(current);
      next.delete(String(matchingId));
      return next;
    });

    setConversations((current) => [
      {
        ...matchingConversation,
        lastMessage: message,
        updatedAt: message.createdAt || message.updatedAt || new Date().toISOString(),
        unreadCount: getUnreadCount(matchingConversation) + 1
      },
      ...current.filter((conversation, index) => (
        String(getConversationId(conversation, index)) !== String(matchingId)
      ))
    ]);
  }), [currentUserId, loadConversations]);

  const handleRefresh = useCallback(() => {
    loadConversations({ refreshing: true });
  }, [loadConversations]);

  const handlePressConversation = useCallback((conversation) => {
    setReadConversationIds((current) => {
      const next = new Set(current);
      next.add(String(conversation.id));
      return next;
    });

    navigation.navigate('ChatScreen', {
      conversationId: conversation.id,
      conversation: conversation.raw,
      receiverId: conversation.participantId,
      title: conversation.username
    });
  }, [navigation]);

  const handleNewChat = useCallback(() => {
    navigation.navigate('NewChatScreen');
  }, [navigation]);

  const renderItem = useCallback(({ item }) => (
    <ChatListItem item={item} onPress={handlePressConversation} />
  ), [handlePressConversation]);

  const keyExtractor = useCallback((item) => String(item.id), []);

  const getItemLayout = useCallback((_, index) => ({
    length: ROW_HEIGHT,
    offset: ROW_HEIGHT * index,
    index
  }), []);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        contentContainerStyle={[
          styles.listContent,
          normalizedConversations.length === 0 && styles.emptyListContent
        ]}
        data={normalizedConversations}
        getItemLayout={getItemLayout}
        initialNumToRender={12}
        keyExtractor={keyExtractor}
        maxToRenderPerBatch={10}
        refreshControl={(
          <RefreshControl
            colors={[theme.colors.primary]}
            onRefresh={handleRefresh}
            refreshing={isRefreshing}
            tintColor={theme.colors.primary}
          />
        )}
        renderItem={renderItem}
        removeClippedSubviews
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No chats yet</Text>
            <Text style={styles.emptySubtitle}>Search for someone and start your first conversation.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={handleNewChat}
              style={({ pressed }) => [
                styles.emptyButton,
                pressed && styles.emptyButtonPressed
              ]}
            >
              <Text style={styles.emptyButtonText}>Start a chat</Text>
            </Pressable>
          </View>
        )}
        windowSize={7}
      />

      <Pressable
        accessibilityRole="button"
        onPress={handleNewChat}
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.fabPressed
        ]}
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </View>
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
  listContent: {
    paddingVertical: theme.spacing.sm
  },
  emptyListContent: {
    flexGrow: 1
  },
  item: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  itemPressed: {
    opacity: 0.72
  },
  avatarWrap: {
    width: 56,
    height: 56,
    marginRight: theme.spacing.md
  },
  messageArea: {
    flex: 1,
    minWidth: 0
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs
  },
  username: {
    flex: 1,
    marginRight: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: '700'
  },
  timestamp: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.caption
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  lastMessage: {
    flex: 1,
    marginRight: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontSize: theme.typography.caption
  },
  unreadMessage: {
    color: theme.colors.text,
    fontWeight: '700'
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xs,
    borderRadius: 11,
    backgroundColor: theme.colors.primary
  },
  unreadText: {
    color: theme.colors.surface,
    fontSize: 11,
    fontWeight: '700'
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg
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
  emptyButton: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary
  },
  emptyButtonPressed: {
    opacity: 0.78
  },
  emptyButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.caption,
    fontWeight: '700'
  },
  fab: {
    position: 'absolute',
    right: theme.spacing.lg,
    bottom: theme.spacing.lg,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6
  },
  fabPressed: {
    opacity: 0.78
  },
  fabIcon: {
    marginTop: -2,
    color: theme.colors.surface,
    fontSize: 32,
    fontWeight: '500'
  }
});
