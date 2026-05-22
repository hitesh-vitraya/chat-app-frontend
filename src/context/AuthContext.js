import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import LoadingScreen from '../screens/LoadingScreen';
import { loginRequest, signupRequest } from '../services/authService';
import { storage, storageKeys } from '../utils/storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          storage.get(storageKeys.authToken),
          storage.get(storageKeys.user)
        ]);

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
    const session = await loginRequest(credentials);
    await storeSession(session);
    return session;
  }, [storeSession]);

  const signup = useCallback(async (details) => {
    const session = await signupRequest(details);
    await storeSession(session);
    return session;
  }, [storeSession]);

  const logout = useCallback(async () => {
    await Promise.all([
      storage.remove(storageKeys.authToken),
      storage.remove(storageKeys.user)
    ]);

    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    isLoading,
    isAuthenticated: Boolean(token),
    login,
    signup,
    logout
  }), [isLoading, login, logout, signup, token, user]);

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
