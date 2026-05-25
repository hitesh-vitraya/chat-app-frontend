import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import LoadingScreen from '../screens/LoadingScreen';
import { loginRequest, signupRequest } from '../services/authService';
import { subscribeToLogout } from '../services/logoutBus';
import { connectSocket, disconnectSocket } from '../services/socket';
import { storage, storageKeys } from '../utils/storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionVersion, setSessionVersion] = useState(0);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        console.log('[auth] restoring session');
        const [storedToken, storedUser] = await Promise.all([
          storage.get(storageKeys.authToken),
          storage.get(storageKeys.user)
        ]);

        console.log('[auth] restored token:', Boolean(storedToken));
        if (storedToken) {
          setToken(storedToken);
          setUser(storedUser);
        }
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    console.log('[auth] token changed:', Boolean(token));
    try {
      if (token) {
        connectSocket(token);
      } else {
        disconnectSocket();
      }
    } catch (socketError) {
      console.error('[socket] unable to update authentication connection', socketError);
    }

    return undefined;
  }, [token]);

  const clearLocalSession = useCallback(() => {
    console.log('[auth] clearLocalSession');
    setToken(null);
    setUser(null);
    setIsLoading(false);
    setSessionVersion((version) => version + 1);
  }, []);

  useEffect(() => subscribeToLogout(clearLocalSession), [clearLocalSession]);

  const storeSession = useCallback(async ({ token: authToken, user: authUser }) => {
    await storage.set(storageKeys.authToken, authToken);

    if (authUser) {
      await storage.set(storageKeys.user, authUser);
    } else {
      await storage.remove(storageKeys.user);
    }

    setToken(authToken);
    setUser(authUser);
  }, []);

  const login = useCallback(async (credentials) => {
    console.log('[auth] login requested');
    const session = await loginRequest(credentials);
    await storeSession(session);
    console.log('[auth] login completed');
    return session;
  }, [storeSession]);

  const signup = useCallback(async (details) => {
    const session = await signupRequest(details);
    await storeSession(session);
    return session;
  }, [storeSession]);

  const logout = useCallback(() => {
    console.log('[auth] logout called');
    clearLocalSession();

    Promise.resolve()
      .then(() => {
        console.log('[auth] logout cleanup start');
        disconnectSocket();
        return Promise.all([
          storage.remove(storageKeys.authToken),
          storage.remove(storageKeys.user)
        ]);
      })
      .then(() => {
        console.log('[auth] logout cleanup completed');
      })
      .catch((error) => {
        console.log('[auth] logout cleanup failed, clearing storage', error?.message);
        return storage.clear();
      });
  }, [clearLocalSession]);

  const clearSession = useCallback(async () => {
    console.log('[auth] clearSession called');
    clearLocalSession();

    await Promise.all([
        storage.remove(storageKeys.authToken),
        storage.remove(storageKeys.user)
    ]);
  }, [clearLocalSession]);

  const value = useMemo(() => ({
    user,
    token,
    isLoading,
    isAuthenticated: Boolean(token),
    sessionVersion,
    login,
    signup,
    logout,
    clearSession
  }), [clearSession, isLoading, login, logout, sessionVersion, signup, token, user]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
