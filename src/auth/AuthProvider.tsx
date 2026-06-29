/**
 * Authentication state for the app.
 *
 * Persists the JWT + the public user in the OS keychain via expo-secure-store
 * (so it survives restarts and isn't readable by other apps), hydrates on
 * launch, and keeps the sync client's auth token in lockstep. Sign-in/up call
 * the API; sign-out clears the keychain and the token slot.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, ApiError, isSyncConfigured, setAuthToken, type PublicUser } from '@/sync/client';

const TOKEN_KEY = 'questpic_token';
const USER_KEY = 'questpic_user';

interface AuthContextValue {
  /** Null until hydration completes, then the user or null if signed out. */
  user: PublicUser | null;
  /** True once we've checked the keychain (gates the navigation redirect). */
  ready: boolean;
  /** Whether a cloud backend is even configured (else app is local-only). */
  cloudEnabled: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);

  // Hydrate the persisted session once on launch.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [token, userJson] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (active && token && userJson) {
          setAuthToken(token);
          setUser(JSON.parse(userJson) as PublicUser);
        }
      } catch {
        // Corrupt/locked keychain — fall through to signed-out.
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const persistSession = useCallback(async (token: string, nextUser: PublicUser) => {
    setAuthToken(token);
    setUser(nextUser);
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser)),
    ]);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await api.login(email, password);
      await persistSession(res.token, res.user);
    },
    [persistSession],
  );

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      const res = await api.register(email, password, name);
      await persistSession(res.token, res.user);
    },
    [persistSession],
  );

  const signOut = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, ready, cloudEnabled: isSyncConfigured(), signIn, signUp, signOut }),
    [user, ready, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

export { ApiError };
