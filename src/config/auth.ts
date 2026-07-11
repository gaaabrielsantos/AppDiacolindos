export const AUTH_ERROR_MESSAGES = {
  missingEmail: 'Informe o e-mail.',
  missingPassword: 'Informe a senha.',
  invalidCredentials: 'E-mail ou senha inválidos.',
  sessionLoadFailed: 'Não foi possível verificar a sessão atual. Tente novamente.',
  unexpected: 'Não foi possível autenticar no momento. Tente novamente.',
  unavailable: 'Supabase Auth não está configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
} as const;
