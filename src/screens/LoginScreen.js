import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import AuthButton from '../components/AuthButton';
import AuthInput from '../components/AuthInput';
import ScreenContainer from '../components/ScreenContainer';
import theme from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/errors';
import { validateLoginForm } from '../utils/validation';

const initialValues = {
  email: '',
  password: ''
};

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setServerError('');
  };

  const handleLogin = async () => {
    const validationErrors = validateLoginForm(values);

    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setServerError('');

    try {
      await login({
        email: values.email.trim(),
        password: values.password
      });
    } catch (error) {
      setServerError(getApiErrorMessage(error, 'Unable to log in.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in to continue to your chats.</Text>

      <AuthInput
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        error={errors.email}
        keyboardType="email-address"
        label="Email"
        onChangeText={(value) => updateField('email', value)}
        placeholder="you@example.com"
        value={values.email}
      />
      <AuthInput
        autoCapitalize="none"
        error={errors.password}
        label="Password"
        onChangeText={(value) => updateField('password', value)}
        placeholder="Enter your password"
        secureTextEntry
        value={values.password}
      />

      {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

      <AuthButton title="Login" loading={isSubmitting} onPress={handleLogin} />

      <Pressable onPress={() => navigation.navigate('SignupScreen')}>
        <Text style={styles.link}>Create an account</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: theme.typography.title,
    fontWeight: '700',
    color: theme.colors.text
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    fontSize: theme.typography.body,
    color: theme.colors.mutedText
  },
  serverError: {
    marginBottom: theme.spacing.md,
    color: theme.colors.danger,
    fontSize: theme.typography.caption
  },
  link: {
    marginTop: theme.spacing.lg,
    textAlign: 'center',
    color: theme.colors.primary,
    fontWeight: '600'
  }
});
