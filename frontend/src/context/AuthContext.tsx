// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role_display: string;
  phone_number?: string;
}

interface AuthContextType {
  user: User | null;
  userRole: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is logged in on app start
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      const userData = await AsyncStorage.getItem('user');

      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Extract role from user data
        // role_display comes from backend like "Patient" or "Doctor"
        const role = parsedUser.role_display?.toUpperCase() || 'PATIENT';
        setUserRole(role);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setUserRole(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
      setUserRole(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);

      // Store tokens
      await AsyncStorage.setItem('access_token', response.tokens.access);
      await AsyncStorage.setItem('refresh_token', response.tokens.refresh);
      await AsyncStorage.setItem('user', JSON.stringify(response.user));

      // Set user state
      setUser(response.user);
      
      // Extract role
      const role = response.user.role_display?.toUpperCase() || 'PATIENT';
      setUserRole(role);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (refreshToken) {
        await authAPI.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear storage
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
      setUser(null);
      setUserRole(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        isLoading,
        isAuthenticated,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};