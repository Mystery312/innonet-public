import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setTokens, clearTokens, getStoredRefreshToken } from '../lib/api';
import type { User, RegisterData, LoginData, AuthResponse } from '../types/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get<User>('/auth/me');
      setUser(response.data);
    } catch {
      setUser(null);
    }
  }, []);

  // Try to restore session on mount
  useEffect(() => {
    const initAuth = async () => {
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        try {
          const response = await api.post('/auth/refresh', {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token: newRefreshToken } = response.data;
          setTokens(access_token, newRefreshToken);
          await refreshUser();
        } catch {
          clearTokens();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [refreshUser]);

  const login = async (data: LoginData) => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    const { user: userData, access_token, refresh_token } = response.data;
    setTokens(access_token, refresh_token);
    setUser(userData);
  };

  const register = async (data: RegisterData) => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    const { user: userData, access_token, refresh_token } = response.data;
    setTokens(access_token, refresh_token);
    setUser(userData);
  };

  const logout = async () => {
    const refreshToken = getStoredRefreshToken();
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      } catch {
        // Ignore logout errors
      }
    }
    clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
