import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, User, setAuthToken } from '../lib/api';

const TOKEN_KEY = 'blogcraft_token';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username: string, name?: string, nickname?: string, phone?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 앱 시작 시 저장된 토큰으로 사용자 복원
  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (!saved) { setIsLoading(false); return; }

    setAuthToken(saved);
    api.me()
      .then(u => setUser(u))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setAuthToken(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const persist = (token: string, u: User) => {
    localStorage.setItem(TOKEN_KEY, token);
    setAuthToken(token);
    setUser(u);
  };

  const login = async (username: string, password: string) => {
    const { token, user: u } = await api.login(username, password);
    persist(token, u);
  };

  const signup = async (email: string, password: string, username: string, name?: string, nickname?: string, phone?: string) => {
    const { token, user: u } = await api.register(email, password, username, name, nickname, phone);
    persist(token, u);
  };

  const logout = () => {
    api.logout().catch(() => {}); // 서버에 로그아웃 알림 (실패해도 무관)
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
