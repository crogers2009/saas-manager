import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, AuthContextType, LoginResponse } from '../types';

import { apiRequest } from '../services/apiService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await apiRequest<LoginResponse>('/auth/me');
        setUser(data.user);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
      } catch (error) {
        // If /me fails, it means the token is invalid or expired, or no token exists.
        // Clear any stale user data.
        setUser(null);
        localStorage.removeItem('currentUser');
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const data = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
    localStorage.setItem('currentUser', JSON.stringify(data.user));
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed:', error);
    }
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === UserRole.Admin;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated,
      isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};