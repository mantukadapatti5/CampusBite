import React, { createContext, useContext, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('canteen_user');
    return stored ? JSON.parse(stored) : null;
  });

  async function login(usn_or_id, password) {
    const { data } = await api.post('/auth/login', { usn_or_id, password });
    localStorage.setItem('canteen_token', data.token);
    localStorage.setItem('canteen_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('canteen_token', data.token);
    localStorage.setItem('canteen_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function refreshUser() {
    const { data } = await api.get('/auth/me');
    const updated = { ...user, ...data };
    localStorage.setItem('canteen_user', JSON.stringify(updated));
    setUser(updated);
    return updated;
  }

  function logout() {
    localStorage.removeItem('canteen_token');
    localStorage.removeItem('canteen_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
