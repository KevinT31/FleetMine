import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  getCurrentUser,
  isAuthenticated as hasValidSession,
  login as authLogin,
  logout as authLogout,
  type AuthUser,
} from './authService';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => void;
  refreshAuth: () => void;
}

function createAuthSnapshot() {
  return {
    user: getCurrentUser(),
    isAuthenticated: hasValidSession(),
  };
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState(createAuthSnapshot());

  const refreshAuth = useCallback(() => {
    setSnapshot(createAuthSnapshot());
  }, []);

  const login = useCallback(async () => {
    setLoading(true);
    try {
      await authLogin();
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setSnapshot(createAuthSnapshot());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: snapshot.user,
      isAuthenticated: snapshot.isAuthenticated,
      loading,
      login,
      logout,
      refreshAuth,
    }),
    [loading, login, logout, refreshAuth, snapshot.isAuthenticated, snapshot.user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
