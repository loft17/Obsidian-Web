import { useToasts, dismissToast } from '../toast';
import { useT } from '../i18n';

export default function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  const t = useT();
  if (!toasts.length) return null;

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.kind}`}
          onClick={() => dismissToast(toast.key)}
          title={t('common.close')}
        >
          <span className="toast-dot" />
          <span className="toast-text">{toast.text}</span>
        </div>
      ))}
    </div>
  );
}
