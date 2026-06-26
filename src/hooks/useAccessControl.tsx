import { createContext, useContext, useMemo, useState } from 'react';
import { ADMIN_AUTH_VALUE, AUTH_CREDENTIALS, AUTH_STORAGE_KEY } from '../config/auth';

export type AccessMode = 'admin' | 'viewer';

type LoginResult =
  | { success: true }
  | {
      success: false;
      message: 'Informe o nome de usuário.' | 'Informe a senha.' | 'Usuário ou senha inválidos.';
    };

interface AccessControlContextValue {
  accessMode: AccessMode;
  isAdmin: boolean;
  login: (username: string, password: string) => LoginResult;
  logout: () => void;
  continueAsViewer: () => void;
}

const AccessControlContext = createContext<AccessControlContextValue>({
  accessMode: 'viewer',
  isAdmin: false,
  login: () => ({ success: false, message: 'Usuário ou senha inválidos.' }),
  logout: () => {},
  continueAsViewer: () => {},
});

function getInitialAccessMode(): AccessMode {
  const saved = localStorage.getItem(AUTH_STORAGE_KEY);
  return saved === ADMIN_AUTH_VALUE ? 'admin' : 'viewer';
}

export function AccessControlProvider({ children }: { children: React.ReactNode }) {
  const [accessMode, setAccessMode] = useState<AccessMode>(() => getInitialAccessMode());

  const login = (username: string, password: string): LoginResult => {
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      return { success: false, message: 'Informe o nome de usuário.' };
    }
    if (!password) {
      return { success: false, message: 'Informe a senha.' };
    }

    const isValid = cleanUsername === AUTH_CREDENTIALS.username && password === AUTH_CREDENTIALS.password;
    if (!isValid) {
      return { success: false, message: 'Usuário ou senha inválidos.' };
    }

    localStorage.setItem(AUTH_STORAGE_KEY, ADMIN_AUTH_VALUE);
    setAccessMode('admin');
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAccessMode('viewer');
  };

  const continueAsViewer = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAccessMode('viewer');
  };

  const value = useMemo(
    () => ({
      accessMode,
      isAdmin: accessMode === 'admin',
      login,
      logout,
      continueAsViewer,
    }),
    [accessMode]
  );

  return <AccessControlContext.Provider value={value}>{children}</AccessControlContext.Provider>;
}

export function useAccessControl() {
  return useContext(AccessControlContext);
}
