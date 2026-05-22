import { Pressable, StyleSheet, Text } from 'react-native';
import theme from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function HeaderLogoutButton() {
  const { logout } = useAuth();

  return (
    <Pressable accessibilityRole="button" onPress={logout} hitSlop={8}>
      <Text style={styles.text}>Logout</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: {
    color: theme.colors.primary,
    fontSize: theme.typography.caption,
    fontWeight: '700'
  }
});
