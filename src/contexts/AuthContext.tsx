import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'super_admin' | 'admin' | 'user';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function hydrateWordPressCredsToLocalStorage() {
  try {
    const { data, error } = await supabase
      .from('wordpress_settings')
      .select('site_url, username, password')
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn('[Auth] Failed to load WP settings:', error.message);
      return;
    }
    if (data) {
      localStorage.setItem('wp_site_url', data.site_url);
      localStorage.setItem('wp_username', data.username);
      localStorage.setItem('wp_password', data.password);
    }
  } catch (e) {
    console.warn('[Auth] WP hydration error', e);
  }
}

async function fetchUserRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  if (error) {
    console.warn('[Auth] Failed to fetch roles:', error.message);
    return [];
  }
  return (data ?? []).map((r) => r.role as AppRole);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshRoles = useCallback(async () => {
    if (!user) {
      setRoles([]);
      return;
    }
    const r = await fetchUserRoles(user.id);
    setRoles(r);
  }, [user]);

  useEffect(() => {
    // Set up listener BEFORE getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // Defer Supabase calls to avoid deadlocks
        setTimeout(() => {
          fetchUserRoles(newSession.user.id).then(setRoles);
          hydrateWordPressCredsToLocalStorage();
        }, 0);
      } else {
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) {
        fetchUserRoles(existing.user.id).then(setRoles);
        hydrateWordPressCredsToLocalStorage();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // Clear cached WP creds on sign-out
    localStorage.removeItem('wp_site_url');
    localStorage.removeItem('wp_username');
    localStorage.removeItem('wp_password');
  }, []);

  const isAdmin = roles.includes('admin') || roles.includes('super_admin');
  const isSuperAdmin = roles.includes('super_admin');

  const value: AuthContextValue = {
    session,
    user,
    roles,
    isAdmin,
    isSuperAdmin,
    loading,
    signIn,
    signOut,
    refreshRoles,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}