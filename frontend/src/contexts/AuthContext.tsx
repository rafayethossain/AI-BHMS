import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi, type User } from '../api/client';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      authApi.verifyToken()
        .then(() => {
          const userData = localStorage.getItem('user');
          if (userData) {
            setUser(JSON.parse(userData));
          } else {
            return authApi.getMe().then((res) => {
              localStorage.setItem('user', JSON.stringify(res.data));
              setUser(res.data);
            });
          }
        })
        .catch(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          localStorage.removeItem('tenant_id');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const res = await authApi.login(email, password);
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      if (res.data.user?.tenant_id) {
        localStorage.setItem('tenant_id', res.data.user.tenant_id);
      }
      const meRes = await authApi.getMe();
      localStorage.setItem('user', JSON.stringify(meRes.data));
      setUser(meRes.data);
    } catch (err: unknown) {
      console.error('Login error:', err);
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const message = (data?.error as Record<string, unknown>)?.details
        ? ((data?.error as Record<string, unknown>)?.details as Record<string, unknown>)?.detail as string
        : (data?.detail as string)
        || (data?.message as string)
        || 'Invalid credentials';
      setError(message);
      throw err;
    }
  };

  const logout = async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      try { await authApi.logout(refresh); } catch { /* ignore */ }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant_id');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, error, clearError: () => setError(null) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
