import { useState } from 'react';
import { setupApi } from '../api';

interface Props {
  onComplete: () => void;
}

export default function Setup({ onComplete }: Props) {
  const [setupToken, setSetupToken] = useState('');
  const [vaultPath, setVaultPath] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [port, setPort] = useState('3000');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!setupToken.trim()) {
      setError('El token de configuración es requerido');
      return;
    }
    if (!vaultPath.trim()) {
      setError('La ruta del vault es requerida');
      return;
    }
    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const result = await setupApi.init(setupToken, vaultPath, password, parseInt(port));
      if (result.success || result.error === undefined) {
        // Setup completado exitosamente
        // Recarga la página para que App.tsx refresque el estado
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        setError(result.error || 'Error al configurar');
      }
    } catch (err: any) {
      setError(err?.error || 'Error al configurar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-form">
        <h1>Configurar Obisidan Web</h1>
        <p style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: '-8px' }}>
          Primer arranque - define tu vault y contraseña
        </p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit} className="setup-wizard">
          <div className="setup-wizard-field">
            <label>Token de configuración</label>
            <input
              type="text"
              autoComplete="off"
              value={setupToken}
              onChange={(e) => setSetupToken(e.target.value)}
              disabled={loading}
            />
            <small style={{ color: 'var(--text-faint)', fontSize: '11px' }}>
              Se muestra en la consola del servidor al arrancar.
            </small>
          </div>

          <div className="setup-wizard-field">
            <label>Ruta del Vault</label>
            <input
              type="text"
              placeholder="/home/user/my-vault"
              value={vaultPath}
              onChange={(e) => setVaultPath(e.target.value)}
              disabled={loading}
            />
            <small style={{ color: 'var(--text-faint)', fontSize: '11px' }}>
              Ruta absoluta en el servidor. Se creará si no existe.
            </small>
          </div>

          <div className="setup-wizard-field">
            <label>Contraseña</label>
            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="setup-wizard-field">
            <label>Confirmar Contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="setup-wizard-field">
            <label>Puerto (opcional)</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Configurando...' : 'Configurar'}
          </button>
        </form>
      </div>
    </div>
  );
}
