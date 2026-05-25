import { StatusBar } from 'expo-status-bar';
import AppErrorBoundary from './src/components/AppErrorBoundary';
import { AuthProvider } from './src/context/AuthContext';
import LogoutConfirmationModal from './src/components/LogoutConfirmationModal';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <RootNavigator />
        <LogoutConfirmationModal />
        <StatusBar style="auto" />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
