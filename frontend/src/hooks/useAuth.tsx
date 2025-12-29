import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, getToken, setToken, clearToken } from '../services/api';

interface AuthContextType {
  isAdmin: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      api.checkAuth(token)
        .then(r => setIsAdmin(r.authenticated))
        .catch(() => {
          clearToken();
          setIsAdmin(false);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (password: string): Promise<boolean> => {
    const result = await api.checkAuth(password);
    if (result.authenticated) {
      setToken(password);
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    clearToken();
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ isAdmin, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
