import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import AppNavigator from './AppNavigator';
import AuthNavigator from './AuthNavigator';

export default function RootNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator key="app" /> : <AuthNavigator key="auth" />}
    </NavigationContainer>
  );
}
