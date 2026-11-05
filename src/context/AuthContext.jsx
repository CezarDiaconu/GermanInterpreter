import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'germanLiveUser';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = Boolean(user);

  const login = useCallback((email, password, name = null) => {
    // Mock auth: any email/password combination works
    const userData = {
      email: email.trim().toLowerCase(),
      name: name ? name.trim() : email.split('@')[0],
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
    return { success: true };
  }, []);

  const signUp = useCallback((name, email, password, confirmPassword) => {
    if (!name || !email || !password || !confirmPassword) {
      return { success: false, error: 'All fields are required.' };
    }
    if (password !== confirmPassword) {
      return { success: false, error: 'Passwords do not match.' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    const userData = {
      email: email.trim().toLowerCase(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, signUp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
