// @refresh reset
import React, { createContext, useState, useEffect, useContext } from 'react';
import { dataService } from '../services/dataService';

const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => { },
  register: async () => { },
  logout: () => { },
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const token = localStorage.getItem('access_token');
      const stored = localStorage.getItem('user');

      if (!token || !stored) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(JSON.parse(stored));
    } catch (err) {
      localStorage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await dataService.auth.login(email, password);
    const { user: u, tokens } = res.data;

    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    localStorage.setItem('user', JSON.stringify(u));

    setUser(u);
    return u;
  };

  const register = async (email, password, first_name, last_name, role) => {
    await dataService.auth.register({
      email,
      password,
      first_name,
      last_name,
      role,
    });
    return true;
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}