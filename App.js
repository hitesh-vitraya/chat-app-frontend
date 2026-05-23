import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import LogoutConfirmationModal from './src/components/LogoutConfirmationModal';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
      <LogoutConfirmationModal />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
