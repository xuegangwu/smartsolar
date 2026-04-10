import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'operator' | 'technician' | 'manager';
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, token: null,
  login: async () => ({ success: false }),
  logout: () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('smartsolar_token');
    const savedUser = localStorage.getItem('smartsolar_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('smartsolar_token');
        localStorage.removeItem('smartsolar_user');
      }
    }
    setLoading(false);
  }, []);

  async function login(username: string, password: string) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('smartsolar_token', data.token);
        localStorage.setItem('smartsolar_user', JSON.stringify(data.user));
        return { success: true };
      }
      return { success: false, message: data.message || '登录失败' };
    } catch {
      return { success: false, message: '网络错误' };
    }
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('smartsolar_token');
    localStorage.removeItem('smartsolar_user');
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
