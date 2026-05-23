import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import theme from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { subscribeToLogoutRequest, triggerLogout } from '../services/logoutBus';

export default function LogoutConfirmationModal() {
  const { logout, token } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => subscribeToLogoutRequest(() => {
    console.log('[logout] modal received request. token:', Boolean(token));
    if (token) {
      console.log('[logout] opening confirmation modal');
      setVisible(true);
    } else {
      console.log('[logout] skipped modal because token is missing');
    }
  }), [token]);

  const handleLogout = () => {
    console.log('[logout] modal confirm pressed');
    setVisible(false);
    triggerLogout();
    logout();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => setVisible(false)}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Log out?</Text>
          <Text style={styles.message}>You will need to sign in again to access your chats.</Text>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                console.log('[logout] modal cancel pressed');
                setVisible(false);
              }}
              style={({ pressed }) => [
                styles.action,
                pressed && styles.pressed
              ]}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.action,
                pressed && styles.pressed
              ]}
            >
              <Text style={styles.logoutText}>Log out</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(15, 23, 42, 0.38)'
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.subtitle,
    fontWeight: '700'
  },
  message: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedText,
    fontSize: theme.typography.body,
    lineHeight: 22
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.lg
  },
  action: {
    marginLeft: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  pressed: {
    opacity: 0.55
  },
  cancelText: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.body,
    fontWeight: '600'
  },
  logoutText: {
    color: theme.colors.danger,
    fontSize: theme.typography.body,
    fontWeight: '700'
  }
});
