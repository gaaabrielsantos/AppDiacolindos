import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccessControl } from '../hooks/useAccessControl';

export function AccessGate({
  loginOpen,
  onClose,
}: {
  loginOpen: boolean;
  onClose: () => void;
}) {
  const { getDefaultPath, login, continueAsViewer, isInitializing } = useAccessControl();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loginOpen) return null;

  const handleLogin = async () => {
    setIsSubmitting(true);
    const result = await login(username, password);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    setError(null);
    setUsername('');
    setPassword('');
    onClose();
    navigate(getDefaultPath(), { replace: true });
  };

  const handleContinueViewing = () => {
    continueAsViewer();
    setError(null);
    setUsername('');
    setPassword('');
    onClose();
    navigate('/principal/dashboard', { replace: true });
  };

  return (
    <div
      className="login-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Acesso ao projeto IPB Mairinque"
      onClick={handleContinueViewing}
    >
      <div className="login-card" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="login-close-button" aria-label="Fechar login" onClick={handleContinueViewing}>✕</button>
        <h1>IPB MAIRINQUE</h1>
        <p>Acesse como administrador para liberar edição completa do sistema.</p>

        <div className="input-group login-form-grid">
          <label>
            Usuário
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Digite o usuário"
              autoComplete="username"
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

  {isInitializing ? <p className="muted-text">Carregando acesso...</p> : null}
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
