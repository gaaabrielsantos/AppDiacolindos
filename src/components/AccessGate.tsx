import { useState } from 'react';
import { useAccessControl } from '../hooks/useAccessControl';

export function AccessGate({
  loginOpen,
  onClose,
}: {
  loginOpen: boolean;
  onClose: () => void;
}) {
  const { login, continueAsViewer } = useAccessControl();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!loginOpen) return null;

  const handleLogin = () => {
    const result = login(username, password);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setError(null);
    setUsername('');
    setPassword('');
    onClose();
  };

  const handleContinueViewing = () => {
    continueAsViewer();
    setError(null);
    setUsername('');
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
            Nome de usuário
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Digite seu usuário"
              autoComplete="username"
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
            />
          </label>
        </div>

        {error ? <p className="login-error">{error}</p> : null}

        <div className="login-actions">
          <button type="button" className="button" onClick={handleLogin}>Entrar</button>
          <button type="button" className="button secondary" onClick={handleContinueViewing}>Continuar apenas visualizando</button>
        </div>
      </div>
    </div>
  );
}
