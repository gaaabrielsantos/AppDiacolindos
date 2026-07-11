import { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AUTH_ERROR_MESSAGES } from '../config/auth';
import { AppModuleId, buildModulePath, isAppModuleId } from '../config/modules';
import { isSupabaseConfigured, supabase } from '../services/supabase';

export type AccessMode = 'admin' | 'viewer' | 'principal';
type AccessScope = AppModuleId | 'principal';

type LoginResult =
  | { success: true }
  | {
      success: false;
      message: string;
    };

interface AccessControlContextValue {
  accessMode: AccessMode;
  isAdmin: boolean;
  isPrincipal: boolean;
  isAuthenticated: boolean;
  isInitializing: boolean;
  session: Session | null;
  assignedModuleId: AppModuleId | null;
  assignedScope: AccessScope | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  continueAsViewer: () => void;
  canAccessModule: (moduleId: AppModuleId) => boolean;
  canAccessPrincipal: () => boolean;
  getDefaultPath: () => string;
}

const AccessControlContext = createContext<AccessControlContextValue>({
  accessMode: 'viewer',
  isAdmin: false,
  isPrincipal: false,
  isAuthenticated: false,
  isInitializing: true,
  session: null,
  assignedModuleId: null,
  assignedScope: null,
  login: async () => ({ success: false, message: AUTH_ERROR_MESSAGES.invalidCredentials }),
  logout: async () => {},
  continueAsViewer: () => {},
  canAccessModule: () => true,
  canAccessPrincipal: () => false,
  getDefaultPath: () => buildModulePath('diaconia'),
});

function getSessionScope(session: Session | null): AccessScope | null {
  const rawModule = session?.user?.user_metadata?.module;
  if (typeof rawModule !== 'string') return null;
  if (rawModule === 'principal') return 'principal';
  return isAppModuleId(rawModule) ? rawModule : null;
}

export function AccessControlProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [accessMode, setAccessMode] = useState<AccessMode>('viewer');
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setSession(null);
      setAccessMode('viewer');
      setIsInitializing(false);
      return;
    }

    const client = supabase;

    let isMounted = true;

    const initializeSession = async () => {
      const { data, error } = await client.auth.getSession();
      if (!isMounted) return;

      if (error) {
        setSession(null);
        setAccessMode('viewer');
        setIsInitializing(false);
        return;
      }

      const nextSession = data.session;
      const nextScope = getSessionScope(nextSession);
      setSession(nextSession && nextScope ? nextSession : null);
      setAccessMode(nextScope === 'principal' ? 'principal' : nextScope ? 'admin' : 'viewer');
      setIsInitializing(false);
    };

    void initializeSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      const nextScope = getSessionScope(nextSession);
      setSession(nextSession && nextScope ? nextSession : null);
      setAccessMode(nextScope === 'principal' ? 'principal' : nextScope ? 'admin' : 'viewer');
      setIsInitializing(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      return { success: false, message: AUTH_ERROR_MESSAGES.missingEmail };
    }
    if (!password) {
      return { success: false, message: AUTH_ERROR_MESSAGES.missingPassword };
    }
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, message: AUTH_ERROR_MESSAGES.unavailable };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      const message = error.message.toLowerCase().includes('invalid login credentials')
        ? AUTH_ERROR_MESSAGES.invalidCredentials
        : AUTH_ERROR_MESSAGES.unexpected;
      return { success: false, message };
    }

    const nextScope = getSessionScope(data.session);

    if (!data.session || !nextScope) {
      await supabase.auth.signOut();
      setSession(null);
      setAccessMode('viewer');
      return { success: false, message: AUTH_ERROR_MESSAGES.unexpected };
    }

    setSession(data.session);
    setAccessMode(nextScope === 'principal' ? 'principal' : 'admin');
    return { success: true };
  };

  const logout = async () => {
    if (!supabase) {
      setSession(null);
      setAccessMode('viewer');
      return;
    }

    await supabase.auth.signOut();
    setSession(null);
    setAccessMode('viewer');
  };

  const continueAsViewer = () => {
    setAccessMode('viewer');
  };

  const assignedScope = getSessionScope(session);
  const assignedModuleId = assignedScope && assignedScope !== 'principal' ? assignedScope : null;

  const canAccessModule = (moduleId: AppModuleId) => {
    if (accessMode === 'viewer') return true;
    if (accessMode === 'principal') return false;
    return assignedModuleId === moduleId;
  };

  const canAccessPrincipal = () => accessMode === 'principal';

  const getDefaultPath = () => {
    if (assignedScope === 'principal') return '/principal/dashboard';
    return buildModulePath(assignedModuleId ?? 'diaconia');
  };

  const value = useMemo(
    () => ({
      accessMode,
      isAdmin: Boolean(session) && Boolean(assignedModuleId),
      isPrincipal: assignedScope === 'principal',
      isAuthenticated: Boolean(session) && Boolean(assignedScope),
      isInitializing,
      session,
      assignedModuleId,
      assignedScope,
      login,
      logout,
      continueAsViewer,
      canAccessModule,
      canAccessPrincipal,
      getDefaultPath,
    }),
    [accessMode, assignedModuleId, assignedScope, isInitializing, session]
  );

  return <AccessControlContext.Provider value={value}>{children}</AccessControlContext.Provider>;
}

export function useAccessControl() {
  return useContext(AccessControlContext);
}
