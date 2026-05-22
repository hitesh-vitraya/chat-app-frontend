import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import theme from '../constants/theme';
import { getConversations } from '../services/conversationService';
import { getApiErrorMessage } from '../utils/errors';

const ROW_HEIGHT = 84;

const getParticipant = (conversation) => (
  conversation.participant
  || conversation.user
  || conversation.otherUser
  || conversation.members?.[0]
  || {}
);

const getLastMessage = (conversation) => {
  const message = conversation.lastMessage || conversation.latestMessage || conversation.message;

  if (!message) {
    return 'No messages yet';
  }

  return message.text || message.content || message.body || String(message);
};

const getTimestampValue = (conversation) => {
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

const getInitial = (name) => (name?.trim()?.charAt(0) || '?').toUpperCase();

const getConversationId = (conversation, index) => (
  conversation.id
  || conversation._id
  || conversation.conversationId
  || `conversation-${index}`
);

const normalizeConversation = (conversation, index) => {
  const participant = getParticipant(conversation);
  const username = participant.username || participant.name || participant.fullName || conversation.username || 'Unknown user';
  const unreadCount = Number(conversation.unreadCount || conversation.unread || conversation.unreadMessagesCount || 0);

  return {
    id: getConversationId(conversation, index),
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
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{getInitial(item.username)}</Text>
          </View>
        )}
        {item.isOnline ? <View style={styles.onlineIndicator} /> : null}
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
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const normalizedConversations = useMemo(
    () => conversations.map(normalizeConversation),
    [conversations]
  );

  const loadConversations = useCallback(async ({ refreshing = false } = {}) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError('');

    try {
      const nextConversations = await getConversations();
      setConversations(nextConversations);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'Unable to load conversations.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleRefresh = useCallback(() => {
    loadConversations({ refreshing: true });
  }, [loadConversations]);

  const handlePressConversation = useCallback((conversation) => {
    navigation.navigate('ChatScreen', {
      conversationId: conversation.id,
      conversation: conversation.raw,
      title: conversation.username
    });
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
            <Text style={styles.emptySubtitle}>New conversations will appear here.</Text>
          </View>
        )}
        windowSize={7}
      />
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
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.border
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary
  },
  avatarInitial: {
    color: theme.colors.surface,
    fontSize: theme.typography.subtitle,
    fontWeight: '700'
  },
  onlineIndicator: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    backgroundColor: theme.colors.success
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
  }
});
