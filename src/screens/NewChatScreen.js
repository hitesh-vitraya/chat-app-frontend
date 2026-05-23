import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import UserAvatar from '../components/UserAvatar';
import theme from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { startConversation } from '../services/conversationService';
import { searchUsers } from '../services/userService';
import { getApiErrorMessage } from '../utils/errors';

const ROW_HEIGHT = 76;
const SEARCH_DEBOUNCE_MS = 350;

const getUserId = (user) => user?.id || user?._id || user?.userId;

const getDisplayName = (user) => (
  user.name
  || user.username
  || user.fullName
  || user.email
  || 'Unknown user'
);

const getAvatarUrl = (user) => user.avatar || user.avatarUrl || user.profileImage;

const normalizeUser = (user) => ({
  id: String(getUserId(user) || user.email || getDisplayName(user)),
  raw: user,
  name: getDisplayName(user),
  email: user.email || '',
  avatarUrl: getAvatarUrl(user),
  isOnline: Boolean(user.isOnline || user.online)
});

const getConversationId = (conversation) => (
  conversation?.id
  || conversation?._id
  || conversation?.conversationId
);

const UserSearchRow = memo(function UserSearchRow({ item, loading, onPress }) {
  return (
    <Pressable
      android_ripple={{ color: theme.colors.border }}
      disabled={loading}
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.userRow,
        pressed && styles.userRowPressed
      ]}
    >
      <UserAvatar name={item.name} online={item.isOnline} size={48} uri={item.avatarUrl} />

      <View style={styles.userTextArea}>
        <View style={styles.userHeader}>
          <Text numberOfLines={1} style={styles.userName}>{item.name}</Text>
          <Text style={[
            styles.presenceText,
            item.isOnline && styles.presenceOnline
          ]}>
            {item.isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
        <Text numberOfLines={1} style={styles.userEmail}>{item.email}</Text>
      </View>

      {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
    </Pressable>
  );
});

export default function NewChatScreen({ navigation }) {
  const { user: currentUser } = useAuth();
  const currentUserId = useMemo(() => getUserId(currentUser), [currentUser]);
  const searchRequestRef = useRef(0);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [startingUserId, setStartingUserId] = useState(null);

  const normalizedUsers = useMemo(() => users
    .map(normalizeUser)
    .filter((nextUser) => !currentUserId || String(nextUser.id) !== String(currentUserId)), [currentUserId, users]);

  const loadUsers = useCallback(async (searchQuery) => {
    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;
    setIsLoading(true);
    setError('');

    try {
      const nextUsers = await searchUsers(searchQuery.trim());

      if (searchRequestRef.current === requestId) {
        setUsers(nextUsers);
      }
    } catch (loadError) {
      if (searchRequestRef.current === requestId) {
        setError(getApiErrorMessage(loadError, 'Unable to search users.'));
      }
    } finally {
      if (searchRequestRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadUsers(query);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [loadUsers, query]);

  const handleStartConversation = useCallback(async (selectedUser) => {
    if (startingUserId) {
      return;
    }

    setStartingUserId(selectedUser.id);
    setError('');

    try {
      const conversation = await startConversation(selectedUser.id);
      const conversationId = getConversationId(conversation);

      if (!conversationId) {
        throw new Error('Conversation response did not include an id.');
      }

      navigation.replace('ChatScreen', {
        conversationId,
        conversation,
        refreshConversations: true,
        receiverId: selectedUser.id,
        title: selectedUser.name
      });
    } catch (startError) {
      setError(getApiErrorMessage(startError, 'Unable to start conversation.'));
    } finally {
      setStartingUserId(null);
    }
  }, [navigation, startingUserId]);

  const renderItem = useCallback(({ item }) => (
    <UserSearchRow
      item={item}
      loading={startingUserId === item.id}
      onPress={handleStartConversation}
    />
  ), [handleStartConversation, startingUserId]);

  const keyExtractor = useCallback((item) => item.id, []);

  const getItemLayout = useCallback((_, index) => ({
    length: ROW_HEIGHT,
    offset: ROW_HEIGHT * index,
    index
  }), []);

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder="Search name or email"
          placeholderTextColor={theme.colors.placeholder}
          returnKeyType="search"
          style={styles.searchInput}
          value={query}
        />
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {isLoading && normalizedUsers.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={styles.loadingText}>Searching users...</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.listContent,
            normalizedUsers.length === 0 && styles.emptyListContent
          ]}
          data={normalizedUsers}
          getItemLayout={getItemLayout}
          initialNumToRender={14}
          keyboardShouldPersistTaps="handled"
          keyExtractor={keyExtractor}
          ListEmptyComponent={(
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {query.trim() ? 'No users found' : 'Find people to chat with'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {query.trim() ? 'Try a different name or email.' : 'Search by name or email to start a conversation.'}
              </Text>
            </View>
          )}
          maxToRenderPerBatch={12}
          renderItem={renderItem}
          removeClippedSubviews
          windowSize={7}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  searchWrap: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  searchInput: {
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    color: theme.colors.text,
    fontSize: theme.typography.body,
    backgroundColor: theme.colors.background
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg
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
  userRow: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  userRowPressed: {
    opacity: 0.72
  },
  userTextArea: {
    flex: 1,
    minWidth: 0,
    marginLeft: theme.spacing.md
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs
  },
  userName: {
    flex: 1,
    marginRight: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: '700'
  },
  userEmail: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.caption
  },
  presenceText: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '700'
  },
  presenceOnline: {
    color: theme.colors.success
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
