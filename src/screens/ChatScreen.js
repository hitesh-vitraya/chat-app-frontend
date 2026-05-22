import { useLayoutEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import theme from '../constants/theme';

export default function ChatScreen({ route, navigation }) {
  const title = route.params?.title || 'Chat';

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Messages will appear here once chat functionality is implemented.</Text>
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
  placeholder: {
    textAlign: 'center',
    color: theme.colors.mutedText,
    fontSize: theme.typography.body
  }
});
