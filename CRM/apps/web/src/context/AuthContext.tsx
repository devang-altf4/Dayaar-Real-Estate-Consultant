'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { IAuthUser, Role } from '@dayaar/shared';
import { api } from '@/lib/api';

interface AuthContextType {
  user: IAuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<string>;
  isAdmin: boolean;
  isManager: boolean;
  isEmployee: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<IAuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedToken = localStorage.getItem('dayaar_access_token');
    const storedUser = localStorage.getItem('dayaar_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('dayaar_access_token');
        localStorage.removeItem('dayaar_refresh_token');
        localStorage.removeItem('dayaar_user');
      }
    }
    setIsLoading(false);
  }, []);

  // Keep in-memory token in sync when api.ts silently refreshes
  useEffect(() => {
    const handler = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      if (next) setToken(next);
    };
    window.addEventListener('dayaar:token-refreshed', handler as EventListener);
    return () => window.removeEventListener('dayaar:token-refreshed', handler as EventListener);
  }, []);

  // Route protection
  useEffect(() => {
    if (!isLoading) {
      const isAuthPage = pathname === '/login';
      if (!user && !isAuthPage) {
        router.push('/login');
      } else if (user && isAuthPage) {
        router.push('/');
      }
    }
  }, [user, isLoading, pathname, router]);

  const login = async (email: string, password: string) => {
    const res: any = await api.post('/auth/login', { email, password });
    localStorage.setItem('dayaar_access_token', res.accessToken);
    localStorage.setItem('dayaar_refresh_token', res.refreshToken);
    localStorage.setItem('dayaar_user', JSON.stringify(res.user));

    setToken(res.accessToken);
    setUser(res.user);
    router.push('/');
  };

  const logout = () => {
    try {
      // Best-effort server revocation (rotation-aware backend); ignore failures
      const rt = localStorage.getItem('dayaar_refresh_token');
      if (rt) {
        void api.post('/auth/logout', { refreshToken: rt }).catch(() => undefined);
      }
    } catch {
      /* noop */
    }
    try {
      (api as any).logoutLocal?.();
    } catch {
      localStorage.removeItem('dayaar_access_token');
      localStorage.removeItem('dayaar_refresh_token');
      localStorage.removeItem('dayaar_user');
    }
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  const refresh = async (): Promise<string> => {
    const next = await api.refreshAccessToken();
    setToken(next);
    return next;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        refresh,
        isAdmin: user?.role === Role.ADMIN,
        isManager: user?.role === Role.MANAGER,
        isEmployee: user?.role === Role.EMPLOYEE,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
