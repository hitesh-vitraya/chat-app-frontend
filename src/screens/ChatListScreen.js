import { StyleSheet, Text, View } from 'react-native';
import theme from '../constants/theme';

export default function ChatListScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>No chats yet</Text>
      <Text style={styles.subtitle}>Chat functionality will be added later.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background
  },
  title: {
    fontSize: theme.typography.subtitle,
    fontWeight: '700',
    color: theme.colors.text
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    fontSize: theme.typography.body,
    color: theme.colors.mutedText
  }
});
