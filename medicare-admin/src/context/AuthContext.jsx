// import { createContext, useContext, useState, useEffect } from 'react';
// import { authAPI } from '../services/api';

// const AuthContext = createContext(null);

// export function AuthProvider({ children }) {
//   const [user, setUser] = useState(() => {
//     const u = localStorage.getItem('adminUser');
//     return u ? JSON.parse(u) : null;
//   });
//   const [loading, setLoading] = useState(false);

//   const login = async (email, password) => {
//     setLoading(true);
//     try {
//       const res = await authAPI.login({ email, password });
//       const data = res.data;
//       const token = data.tokens?.access || data.access || data.token;
//       if (!token) throw new Error('No token received');
//       localStorage.setItem('adminToken', token);
//       localStorage.setItem('adminUser', JSON.stringify(data.user || { email }));
//       setUser(data.user || { email });
//       return { success: true };
//     } catch (err) {
//       return { success: false, error: err.response?.data?.detail || err.response?.data?.message || 'Login failed' };
//     } finally {
//       setLoading(false);
//     }
//   };

//   const logout = async () => {
//     try { await authAPI.logout(); } catch {}
//     localStorage.removeItem('adminToken');
//     localStorage.removeItem('adminUser');
//     setUser(null);
//   };

//   return (
//     <AuthContext.Provider value={{ user, login, logout, loading, isAuth: !!user }}>
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export { AuthContext };

import { createContext, useState } from 'react';
import { authAPI } from '../services/api';

export const AuthContext = createContext(null);

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

      const userData = data.user || { email };

      // Block non-admin users from accessing the admin dashboard
      if (userData.role && userData.role !== 'ADMIN') {
        return {
          success: false,
          error: `Access denied. Only admins can access this dashboard. Your role is: ${userData.role_display || userData.role}`
        };
      }

      // Also store refresh token for logout
      if (data.tokens?.refresh) {
        localStorage.setItem('adminRefreshToken', data.tokens.refresh);
      }

      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error ||
               err.response?.data?.detail ||
               err.message ||
               'Login failed'
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('adminRefreshToken');
      if (refresh) await authAPI.logout({ refresh });
    } catch {}
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminUser');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuth: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}