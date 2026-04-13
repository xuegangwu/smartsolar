import { createContext, useContext, useState, ReactNode } from 'react';

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
  can: (permission: string) => boolean;
}

// Permission matrix
const PERMISSIONS: Record<string, string[]> = {
  'work-orders:create': ['admin', 'operator', 'manager'],
  'work-orders:delete': ['admin', 'manager'],
  'stations:create': ['admin', 'manager'],
  'stations:delete': ['admin', 'manager'],
  'spare-parts:create': ['admin', 'manager'],
  'spare-parts:delete': ['admin', 'manager'],
  'inspection:delete': ['admin', 'manager'],
  'personnel:create': ['admin', 'manager'],
  'personnel:delete': ['admin', 'manager'],
  'admin:access': ['admin', 'manager'],
};

// Initialize synchronously from localStorage
const savedToken = localStorage.getItem('smartsolar_token');
const savedUser = localStorage.getItem('smartsolar_user');
let initialUser: User | null = null;
let initialToken: string | null = null;

try {
  if (savedToken && savedUser) {
    initialUser = JSON.parse(savedUser);
    initialToken = savedToken;
  }
} catch {
  localStorage.removeItem('smartsolar_token');
  localStorage.removeItem('smartsolar_user');
}

const AuthContext = createContext<AuthContextValue>({
  user: initialUser,
  token: initialToken,
  login: async () => ({ success: false }),
  logout: () => {},
  can: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [token, setToken] = useState<string | null>(initialToken);

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
    } catch (e) {
      console.error('[Auth] Login error:', e);
      return { success: false, message: '网络错误' };
    }
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('smartsolar_token');
    localStorage.removeItem('smartsolar_user');
  }

  function can(permission: string): boolean {
    if (!user) return false;
    const allowed = PERMISSIONS[permission];
    if (!allowed) return false;
    return allowed.includes(user.role);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
