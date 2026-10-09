import { useEffect } from 'react';
import { filesApi, syncApi, type SyncConfig } from './api';
import { useStore } from './store';
import { notify, dismissToast } from './toast';
import { NOTES_CHANGED } from './components/Editor';
import { t } from './i18n';

// Avisos de la sincronización con GitHub, tanto la manual como la automática del servidor.
// El servidor solo escribe lastAttempt al terminar, así que un cambio en él es una
// sincronización acabada

// Cada cuánto se consulta el estado (ms); más a menudo mientras hay una en marcha
const POLL_INTERVAL = 30000;
const POLL_RUNNING_INTERVAL = 3000;

// undefined: aún no se conoce el estado (la primera lectura no avisa de nada)
let lastSeen: string | null | undefined;
let wasRunning = false;

export const reportSync = (cfg: SyncConfig) => {
  const { running, lastAttempt, lastError } = cfg.status;
  const finished = lastSeen !== undefined && lastAttempt !== lastSeen;
  lastSeen = lastAttempt;

  if (finished) {
    if (lastError) notify('sync', t('toast.syncError', { error: lastError }), 'error');
    else {
      notify('sync', t('toast.synced'));
      // Puede haber traído notas nuevas o cambiadas
      filesApi.getTree().then(useStore.getState().setTree, () => {});
      window.dispatchEvent(new Event(NOTES_CHANGED));
    }
  } else if (running && !wasRunning) {
    notify('sync', t('toast.syncing'), 'info', 0);
  } else if (!running && wasRunning) {
    dismissToast('sync');
  }
  wasRunning = running;
};

// Sincronización lanzada desde aquí: se avisa del inicio sin esperar a la siguiente consulta
export const runSync = async () => {
  notify('sync', t('toast.syncing'), 'info', 0);
  wasRunning = true;
  try {
    const cfg = await syncApi.run();
    reportSync(cfg);
    return cfg;
  } catch (err) {
    wasRunning = false;
    notify('sync', t('toast.syncError', { error: (err as Error).message }), 'error');
    throw err;
  }
};

export function useSyncNotifications() {
  useEffect(() => {
    let timer = 0;
    let stopped = false;
    const poll = async () => {
      let delay = POLL_INTERVAL;
      if (document.visibilityState === 'visible') {
        try {
          const cfg = await syncApi.get();
          reportSync(cfg);
          if (cfg.status.running) delay = POLL_RUNNING_INTERVAL;
        } catch {
          // sin conexión o sesión caducada: se reintenta en la próxima consulta
        }
      }
      if (!stopped) timer = window.setTimeout(poll, delay);
    };
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, []);
}
