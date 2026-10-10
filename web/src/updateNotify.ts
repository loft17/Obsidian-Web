import { useEffect } from 'react';
import { settingsApi } from './api';
import { notify } from './toast';
import { t } from './i18n';

// Cada vez que se entra en la web, si hay una versión nueva en GitHub se avisa unos segundos
// en la esquina superior derecha. El detalle queda en Preferencias → Acerca de

const DURATION = 8000;

export function useUpdateNotification() {
  useEffect(() => {
    settingsApi
      .getUpdate()
      .then((u) => {
        if (u.updateAvailable && u.latest) {
          notify('update', t('toast.updateAvailable', { version: u.latest }), 'info', DURATION, true);
        }
      })
      .catch(() => {});
  }, []);
}
