import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  apiJson,
  clearStaffSession,
  getStaffUser,
  getToken,
  setStaffSession,
  type StaffUser,
} from '../api/http';

type StaffAuthContextValue = {
  user: StaffUser | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const StaffAuthContext = createContext<StaffAuthContextValue | null>(null);

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(() => getStaffUser());
  const [loading, setLoading] = useState(Boolean(getToken()));

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return;
    }
    const me = await apiJson<StaffUser>('/api/v1/auth/me');
    setStaffSession(getToken()!, me);
    setUser(me);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    refreshUser()
      .catch(() => {
        clearStaffSession();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const r = await apiJson<{ token: string; user: StaffUser }>('/api/v1/auth/login', {
      method: 'POST',
      json: { email, password },
    });
    setStaffSession(r.token, r.user);
    setUser(r.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiJson('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    clearStaffSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin: user?.role === 'admin',
      login,
      logout,
      refreshUser,
    }),
    [user, loading, login, logout, refreshUser],
  );

  return <StaffAuthContext.Provider value={value}>{children}</StaffAuthContext.Provider>;
}

export function useStaffAuth(): StaffAuthContextValue {
  const ctx = useContext(StaffAuthContext);
  if (!ctx) throw new Error('useStaffAuth must be used within StaffAuthProvider');
  return ctx;
}
