import { useState } from 'react';
import { useAccessControl } from '../hooks/useAccessControl';

export function AccessGate({
  loginOpen,
  onClose,
}: {
  loginOpen: boolean;
  onClose: () => void;
}) {
  const { login, continueAsViewer, isInitializing } = useAccessControl();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loginOpen) return null;

  const handleLogin = async () => {
    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    setError(null);
    setEmail('');
    setPassword('');
    onClose();
  };

  const handleContinueViewing = () => {
    continueAsViewer();
    setError(null);
    setEmail('');
    setPassword('');
    onClose();
  };

  return (
    <div
      className="login-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Acesso ao projeto Diacolindos"
      onClick={handleContinueViewing}
    >
      <div className="login-card" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="login-close-button" aria-label="Fechar login" onClick={handleContinueViewing}>✕</button>
        <h1>Diacolindos</h1>
        <p>Acesse como administrador para liberar edição completa do sistema.</p>

        <div className="input-group login-form-grid">
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="usuario@exemplo.com"
              autoComplete="email"
              disabled={isSubmitting || isInitializing}
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Digite sua senha"
              autoComplete="current-password"
              disabled={isSubmitting || isInitializing}
            />
          </label>
        </div>

        {isInitializing ? <p className="muted-text">Verificando sessão...</p> : null}
        {error ? <p className="login-error">{error}</p> : null}

        <div className="login-actions">
          <button type="button" className="button" onClick={() => void handleLogin()} disabled={isSubmitting || isInitializing}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
          <button type="button" className="button secondary" onClick={handleContinueViewing} disabled={isSubmitting}>
            Continuar apenas visualizando
          </button>
        </div>
      </div>
    </div>
  );
}
