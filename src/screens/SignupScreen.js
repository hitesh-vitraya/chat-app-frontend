import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import AuthButton from '../components/AuthButton';
import AuthInput from '../components/AuthInput';
import ScreenContainer from '../components/ScreenContainer';
import theme from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/errors';
import { validateSignupForm } from '../utils/validation';

const initialValues = {
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
};

export default function SignupScreen({ navigation }) {
  const { signup } = useAuth();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setServerError('');
  };

  const handleSignup = async () => {
    const validationErrors = validateSignupForm(values);

    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setServerError('');

    try {
      await signup({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password
      });
    } catch (error) {
      setServerError(getApiErrorMessage(error, 'Unable to create account.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Set up your profile to start chatting.</Text>

      <AuthInput
        autoComplete="name"
        error={errors.name}
        label="Name"
        onChangeText={(value) => updateField('name', value)}
        placeholder="Your name"
        value={values.name}
      />
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
        placeholder="At least 6 characters"
        secureTextEntry
        value={values.password}
      />
      <AuthInput
        autoCapitalize="none"
        error={errors.confirmPassword}
        label="Confirm password"
        onChangeText={(value) => updateField('confirmPassword', value)}
        placeholder="Re-enter your password"
        secureTextEntry
        value={values.confirmPassword}
      />

      {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

      <AuthButton title="Sign up" loading={isSubmitting} onPress={handleSignup} />

      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Already have an account?</Text>
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
