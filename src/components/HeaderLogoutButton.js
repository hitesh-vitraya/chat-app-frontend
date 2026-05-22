import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import theme from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function HeaderLogoutButton() {
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isLoggingOut}
      hitSlop={8}
      onPress={handleLogout}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Text style={[styles.text, isLoggingOut && styles.disabled]}>
        {isLoggingOut ? 'Logging out...' : 'Logout'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.72
  },
  text: {
    color: theme.colors.primary,
    fontSize: theme.typography.caption,
    fontWeight: '700'
  },
  disabled: {
    color: theme.colors.placeholder
  }
});
