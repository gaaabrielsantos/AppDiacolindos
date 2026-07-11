import { AppModuleId } from './modules';

export type AuthUserScope = AppModuleId | 'principal';

export const AUTH_USERS = {
  ipbmairinque: {
    password: 'ipbmairinque',
    scope: 'principal',
    label: 'IPB Mairinque',
  },
  diacolindos: {
    password: 'ipbmk123',
    scope: 'diaconia',
    label: 'Diaconia',
  },
  recepcao: {
    password: 'ipbmk123',
    scope: 'recepcao',
    label: 'Recepção',
  },
  midias: {
    password: 'ipbmk123',
    scope: 'midias',
    label: 'Mídias',
  },
  louvor: {
    password: 'ipbmk123',
    scope: 'louvor',
    label: 'Louvor',
  },
  cozinha: {
    password: 'ipbmk123',
    scope: 'cozinha',
    label: 'Cozinha',
  },
  ebd: {
    password: 'ipbmk123',
    scope: 'ebd',
    label: 'EBD',
  },
} as const satisfies Record<string, { password: string; scope: AuthUserScope; label: string }>;

export const AUTH_ERROR_MESSAGES = {
  missingUser: 'Informe o usuário.',
  missingPassword: 'Informe a senha.',
  invalidCredentials: 'Usuário ou senha inválidos.',
} as const;
