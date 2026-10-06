import { useEffect, useState } from 'react';
import { setupApi, authApi, filesApi } from './api';
import Setup from './components/Setup';
import Login from './components/Login';
import MainLayout from './components/MainLayout';
import { useStore } from './store';

type AppState = 'setup' | 'login' | 'main';

export default function App() {
  const [appState, setAppState] = useState<AppState>('setup');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const setTree = useStore((s) => s.setTree);

  useEffect(() => {
    const init = async () => {
      try {
        const status = await setupApi.checkStatus();
        console.log('Setup status:', status);
        if (status.configured) {
          setAppState('login');
        } else {
          setAppState('setup');
        }
      } catch (err: any) {
        console.error('Init error:', err);
        setError(`Error: ${err.message || 'No se pudo conectar al servidor'}`);
        setAppState('setup');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleSetupComplete = async () => {
    try {
      // Después del setup, necesitamos recargar la página o llamar a checkStatus de nuevo
      // porque el servidor ha actualizado su estado en memoria
      setTimeout(async () => {
        try {
          const tree = await filesApi.getTree();
          setTree(tree);
          setAppState('main');
        } catch (err) {
          console.log('Entrando a login después de setup');
          setAppState('login');
        }
      }, 500);
    } catch (err: any) {
      console.error('Setup completion error:', err);
    }
  };

  const handleLoginComplete = async () => {
    try {
      const tree = await filesApi.getTree();
      setTree(tree);
      setAppState('main');
    } catch (err) {
      console.error('Failed to load tree:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
        <div>Cargando...</div>
        {error && <div style={{ color: 'var(--color-red)', fontSize: '12px' }}>{error}</div>}
      </div>
    );
  }

  return (
    <>
      {appState === 'setup' && <Setup onComplete={handleSetupComplete} />}
      {appState === 'login' && <Login onComplete={handleLoginComplete} />}
      {appState === 'main' && <MainLayout />}
    </>
  );
}
