import { StyleSheet, Text, TextInput, View } from 'react-native';
import theme from '../constants/theme';

export default function AuthInput({ label, error, style, ...props }) {
  return (
    <View style={[styles.wrapper, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.colors.placeholder}
        style={[styles.input, error ? styles.inputError : null]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: theme.spacing.md
  },
  label: {
    marginBottom: theme.spacing.xs,
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.text
  },
  input: {
    height: 50,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    fontSize: theme.typography.body
  },
  inputError: {
    borderColor: theme.colors.danger
  },
  error: {
    marginTop: theme.spacing.xs,
    color: theme.colors.danger,
    fontSize: theme.typography.caption
  }
});
