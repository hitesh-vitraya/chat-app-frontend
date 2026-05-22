import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import theme from '../constants/theme';

export default function AuthButton({ title, onPress, loading = false, disabled = false }) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.surface} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary
  },
  pressed: {
    backgroundColor: theme.colors.primaryDark
  },
  disabled: {
    opacity: 0.65
  },
  text: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.surface
  }
});
