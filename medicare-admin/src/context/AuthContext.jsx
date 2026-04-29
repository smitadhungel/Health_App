import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('adminUser');
    return u ? JSON.parse(u) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      const data = res.data;
      const token = data.tokens?.access || data.access || data.token;
      if (!token) throw new Error('No token received');
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser', JSON.stringify(data.user || { email }));
      setUser(data.user || { email });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || err.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuth: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };