import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextData {
  userToken: string | null;
  userRole: string | null;
  isLoading: boolean;
  signIn: (token: string, refreshToken: string, user: any) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        const role  = await AsyncStorage.getItem('user_role');
        setUserToken(token);
        setUserRole(role);
      } catch (error) {
        console.error('Failed to load auth', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadAuth();
  }, []);

  const signIn = async (token: string, refreshToken: string, user: any) => {
    await AsyncStorage.setItem('access_token', token);
    await AsyncStorage.setItem('refresh_token', refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(user));

    // Determine role from available fields
    let role = user.role || user.user_type;
    if (!role && user.role_display) {
      role =
        user.role_display === 'Patient' ? 'PATIENT' :
        user.role_display === 'Doctor'  ? 'DOCTOR'  :
        user.role_display === 'Admin'   ? 'ADMIN'   : null; // ← added ADMIN
    }

    if (role) {
      await AsyncStorage.setItem('user_role', role);
    } else {
      console.warn('Could not determine user role from:', user);
    }

    setUserToken(token);
    setUserRole(role);
  };

  const signOut = async () => {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user', 'user_role']);
    setUserToken(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ userToken, userRole, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};