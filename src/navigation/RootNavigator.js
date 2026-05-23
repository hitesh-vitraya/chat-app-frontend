import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import AppNavigator from './AppNavigator';
import AuthNavigator from './AuthNavigator';

export default function RootNavigator() {
  const { token, sessionVersion } = useAuth();
  const isAuthenticated = Boolean(token);

  console.log('[navigation] RootNavigator render', {
    isAuthenticated,
    sessionVersion
  });

  return (
    <NavigationContainer key={`${sessionVersion}-${isAuthenticated ? 'app' : 'auth'}`}>
      {isAuthenticated ? <AppNavigator key="app" /> : <AuthNavigator key="auth" />}
    </NavigationContainer>
  );
}
