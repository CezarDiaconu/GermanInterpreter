import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'germanLiveToken';
const USER_KEY = 'germanLiveUser';
const GROQ_KEY_STORAGE = 'groqApiKey';
const GROQ_MODEL_STORAGE = 'groqModel';

function syncGroqSettings(user) {
  if (!user) return;
  if (typeof user.groqApiKey === 'string') {
    if (user.groqApiKey) {
      localStorage.setItem(GROQ_KEY_STORAGE, user.groqApiKey);
    } else {
      localStorage.removeItem(GROQ_KEY_STORAGE);
    }
  }
  if (user.groqModel) {
    localStorage.setItem(GROQ_MODEL_STORAGE, user.groqModel);
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  const isAuthenticated = Boolean(token && user);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken('');
    setUser(null);
  }, []);

  const saveSession = useCallback((newToken, userData) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    syncGroqSettings(userData);
    setToken(newToken);
    setUser(userData);
  }, []);

  // Verify existing token on mount
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Session expired');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        syncGroqSettings(data.user);
        setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) clearSession();
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, clearSession]);

  const login = useCallback(
    async (email, password) => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { success: false, error: data.error || 'Failed to sign in.' };
        }
        saveSession(data.token, data.user);
        return { success: true };
      } catch {
        return {
          success: false,
          error: 'Cannot reach the server. Make sure the backend is running.',
        };
      }
    },
    [saveSession]
  );

  const signUp = useCallback(
    async (name, email, password, confirmPassword) => {
      if (!name || !email || !password || !confirmPassword) {
        return { success: false, error: 'All fields are required.' };
      }
      if (password !== confirmPassword) {
        return { success: false, error: 'Passwords do not match.' };
      }
      if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters.' };
      }

      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { success: false, error: data.error || 'Failed to create account.' };
        }
        saveSession(data.token, data.user);
        return { success: true };
      } catch {
        return {
          success: false,
          error: 'Cannot reach the server. Make sure the backend is running.',
        };
      }
    },
    [saveSession]
  );

  const updateSettings = useCallback(
    async ({ groqApiKey, groqModel }) => {
      const res = await fetch('/api/account/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ groqApiKey, groqModel }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings.');
      }
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      syncGroqSettings(data.user);
      setUser(data.user);
      return data.user;
    },
    [token]
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        signUp,
        logout,
        updateSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
