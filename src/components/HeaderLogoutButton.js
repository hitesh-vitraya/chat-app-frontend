import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import theme from '../constants/theme';
import { requestLogoutConfirmation } from '../services/logoutBus';

export default function HeaderLogoutButton() {
  const handlePress = () => {
    console.log('[logout] header button pressed');
    requestLogoutConfirmation();
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.55}
      hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      onPressIn={handlePress}
      style={styles.button}
    >
      <Text style={styles.text}>Logout</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 72,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm
  },
  text: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.caption,
    fontWeight: '600'
  }
});
