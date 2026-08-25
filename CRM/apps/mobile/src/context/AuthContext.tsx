import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string, baseUrl?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refreshMe: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const session = await api.initSession();
        if (session.token) {
          setToken(session.token);
          if (session.user) {
            setUser(session.user);
          }
          // Refresh user data from API
          try {
            const me = await api.get<User>('/auth/me');
            setUser(me);
            await api.saveSession(session.token, me);
          } catch {
            // keep existing user if network glitch
          }
        }
      } catch {
        // session restore failed
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, pass: string, baseUrl?: string) => {
    if (baseUrl) {
      api.setBaseUrl(baseUrl);
    }
    const res = await api.post<{
      accessToken: string;
      refreshToken: string;
      user: User & { id?: string; _id?: string };
    }>('/auth/login', {
      email: email.trim().toLowerCase(),
      password: pass,
    });

    const accessToken = res.accessToken;
    const userData: User = {
      ...(res.user as any),
      id: res.user.id || res.user._id || '',
    };

    setToken(accessToken);
    setUser(userData);
    await api.saveSession(accessToken, userData);
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await api.clearSession();
  };

  const refreshMe = async () => {
    if (!token) return;
    try {
      const me = await api.get<User>('/auth/me');
      setUser(me);
      await api.saveSession(token, me);
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
