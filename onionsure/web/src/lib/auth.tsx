import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getToken, setToken, setStoredUser, getStoredUser, setOnUnauthorized } from './api';
import type { User } from './types';

/**
 * Mock authentication system with proper session management.
 *
 * Session lifecycle:
 * 1. On mount → read token from localStorage. If present, validate expiry.
 *    - Expired or invalid → clear everything, user = null.
 *    - Valid → hydrate user from localStorage, mark ready.
 * 2. login() → call API, store token + user, set session expiry.
 * 3. logout() → clear all storage, set user = null, caller navigates to /login.
 * 4. ProtectedRoute → declarative <Navigate> (no useEffect side-effects).
 *
 * The session has a client-side TTL (SESSION_TTL_MS). After that, the user
 * must re-authenticate. This prevents stale auto-login from old sessions.
 */

// 30-minute client-side session TTL (matches JWT expiry on server).
const SESSION_TTL_MS = 30 * 60 * 1000;
const SESSION_TS_KEY = 'onionsure_session_ts';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;   // true during initial async bootstrap
  ready: boolean;     // false until the first auth check completes
  login: (username: string, password: string) => Promise<User>;
  register: (payload: any) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null, token: null, loading: false, ready: false,
  login: async () => { throw new Error('AuthProvider not mounted'); },
  register: async () => { throw new Error('AuthProvider not mounted'); },
  logout: () => {},
});

/** Check if the stored session timestamp is still within the TTL window. */
function isSessionValid(): boolean {
  const ts = localStorage.getItem(SESSION_TS_KEY);
  if (!ts) return false;
  const age = Date.now() - parseInt(ts, 10);
  if (isNaN(age) || age > SESSION_TTL_MS) return false;
  return true;
}

/** Write the current timestamp so the TTL can be checked on next load. */
function stampSession(): void {
  localStorage.setItem(SESSION_TS_KEY, String(Date.now()));
}

/** Remove all auth-related keys from localStorage. */
function clearSession(): void {
  setToken(null);
  setStoredUser(null);
  localStorage.removeItem(SESSION_TS_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTok] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Register a global 401 handler: when the backend rejects the token, wipe the
  // session and send the user to /login (spec §5). AuthProvider is rendered
  // inside <BrowserRouter>, so useNavigate is available here.
  useEffect(() => {
    setOnUnauthorized(() => {
      clearSession();
      setTok(null);
      setUser(null);
      navigate('/login', { replace: true });
    });
    return () => setOnUnauthorized(null);
  }, [navigate]);

  // Bootstrap: validate any persisted session on mount.
  useEffect(() => {
    const storedToken = getToken();
    const storedUser = getStoredUser();
    if (storedToken && storedUser && isSessionValid()) {
      // Session is still within TTL — hydrate without hitting the server.
      setTok(storedToken);
      setUser(storedUser);
    } else {
      // Either no stored session, or it has expired — clear everything.
      clearSession();
    }
    setLoading(false);
    setReady(true);
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<User> => {
    const res = await api.login(username, password);
    setTok(res.token);
    setToken(res.token);
    setUser(res.user);
    setStoredUser(res.user);
    stampSession();
    return res.user; // return the real user so the caller knows the role
  }, []);

  const register = useCallback(async (payload: any) => {
    const res = await api.register(payload);
    setTok(res.token);
    setToken(res.token);
    setUser(res.user);
    setStoredUser(res.user);
    stampSession();
    return res.user;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setTok(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/** Role → default landing route. */
export const ROLE_HOME: Record<string, string> = {
  procurement_officer: '/quality/dashboard',
  fpo: '/fpo/dashboard',
  farmer: '/farmer/dashboard',
  buyer: '/buyer/dashboard',
  admin: '/admin/dashboard',
};
