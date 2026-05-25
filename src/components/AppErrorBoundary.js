import { Component } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import theme from '../constants/theme';

export default class AppErrorBoundary extends Component {
  state = {
    error: null
  };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[app] render failed', error, errorInfo?.componentStack);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Unable to open the app</Text>
        <Text style={styles.message}>
          {error.message || 'An unexpected error occurred after sign in.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={this.handleRetry}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed
          ]}
        >
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
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
    color: theme.colors.text,
    fontSize: theme.typography.subtitle,
    fontWeight: '700'
  },
  message: {
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    color: theme.colors.mutedText,
    fontSize: theme.typography.body,
    lineHeight: 22
  },
  button: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary
  },
  buttonPressed: {
    opacity: 0.78
  },
  buttonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.body,
    fontWeight: '700'
  }
});
