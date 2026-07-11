import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AUTH_ERROR_MESSAGES, AUTH_USERS, AuthUserScope } from '../config/auth';
import { AppModuleId, buildModulePath, isAppModuleId } from '../config/modules';

export type AccessMode = 'admin' | 'viewer' | 'principal';
type AccessScope = AuthUserScope;

type LocalAccessSession = {
  accessMode: AccessMode;
  scope: AccessScope;
  username: string;
  label: string;
};

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
  username: string | null;
  label: string | null;
  assignedModuleId: AppModuleId | null;
  assignedScope: AccessScope | null;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  continueAsViewer: () => void;
  canAccessModule: (moduleId: AppModuleId) => boolean;
  canAccessPrincipal: () => boolean;
  getDefaultPath: () => string;
}

const ACCESS_STORAGE_KEY = 'diacolindos_access_session';

const AccessControlContext = createContext<AccessControlContextValue>({
  accessMode: 'viewer',
  isAdmin: false,
  isPrincipal: false,
  isAuthenticated: false,
  isInitializing: true,
  username: null,
  label: null,
  assignedModuleId: null,
  assignedScope: null,
  login: async () => ({ success: false, message: AUTH_ERROR_MESSAGES.invalidCredentials }),
  logout: async () => {},
  continueAsViewer: () => {},
  canAccessModule: () => true,
  canAccessPrincipal: () => true,
  getDefaultPath: () => '/principal/dashboard',
});

function isValidAccessScope(value: unknown): value is AccessScope {
  return value === 'principal' || (typeof value === 'string' && isAppModuleId(value));
}

function parseStoredSession(rawValue: string | null): LocalAccessSession | null {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as Partial<LocalAccessSession>;

    if (
      !parsed
      || (parsed.accessMode !== 'principal' && parsed.accessMode !== 'admin')
      || !isValidAccessScope(parsed.scope)
      || typeof parsed.username !== 'string'
      || typeof parsed.label !== 'string'
    ) {
      return null;
    }

    return {
      accessMode: parsed.accessMode,
      scope: parsed.scope,
      username: parsed.username,
      label: parsed.label,
    };
  } catch {
    return null;
  }
}

export function AccessControlProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<LocalAccessSession | null>(null);
  const [accessMode, setAccessMode] = useState<AccessMode>('viewer');
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const restoredSession = parseStoredSession(window.localStorage.getItem(ACCESS_STORAGE_KEY));

    if (restoredSession) {
      setSession(restoredSession);
      setAccessMode(restoredSession.accessMode);
    } else {
      window.localStorage.removeItem(ACCESS_STORAGE_KEY);
      setSession(null);
      setAccessMode('viewer');
    }

    setIsInitializing(false);
  }, []);

  const login = async (username: string, password: string): Promise<LoginResult> => {
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      return { success: false, message: AUTH_ERROR_MESSAGES.missingUser };
    }
    if (!password) {
      return { success: false, message: AUTH_ERROR_MESSAGES.missingPassword };
    }

    const userConfig = AUTH_USERS[cleanUsername as keyof typeof AUTH_USERS];

    if (!userConfig || userConfig.password !== password) {
      return { success: false, message: AUTH_ERROR_MESSAGES.invalidCredentials };
    }

    const nextSession: LocalAccessSession = {
      username: cleanUsername,
      scope: userConfig.scope,
      label: userConfig.label,
      accessMode: userConfig.scope === 'principal' ? 'principal' : 'admin',
    };

    window.localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
    setAccessMode(nextSession.accessMode);
    return { success: true };
  };

  const logout = async () => {
    window.localStorage.removeItem(ACCESS_STORAGE_KEY);
    setSession(null);
    setAccessMode('viewer');
  };

  const continueAsViewer = () => {
    window.localStorage.removeItem(ACCESS_STORAGE_KEY);
    setSession(null);
    setAccessMode('viewer');
  };

  const assignedScope = session?.scope ?? null;
  const assignedModuleId = assignedScope && assignedScope !== 'principal' ? assignedScope : null;

  const canAccessModule = (moduleId: AppModuleId) => {
    if (accessMode === 'viewer') return true;
    if (accessMode === 'principal') return false;
    if (accessMode === 'admin') return assignedModuleId === moduleId;
    return assignedModuleId === moduleId;
  };

  const canAccessPrincipal = () => accessMode === 'viewer' || accessMode === 'principal';

  const getDefaultPath = () => {
    if (assignedScope === 'principal' || accessMode === 'viewer') return '/principal/dashboard';
    return buildModulePath(assignedModuleId ?? 'diaconia');
  };

  const value = useMemo(
    () => ({
      accessMode,
      isAdmin: accessMode === 'admin' && Boolean(assignedModuleId),
      isPrincipal: assignedScope === 'principal',
      isAuthenticated: Boolean(session),
      isInitializing,
      username: session?.username ?? null,
      label: session?.label ?? null,
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
