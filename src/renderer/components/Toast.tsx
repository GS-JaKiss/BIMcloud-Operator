import { CircleAlert, CircleCheck } from 'lucide-react';
import { useEffect } from 'react';
import type { ToastState } from '../hooks/useBranchEditor';

type ToastProps = {
  toast: ToastState;
  onReveal(path: string): void;
  onDismiss(): void;
};

export function Toast({ toast, onReveal, onDismiss }: ToastProps): React.JSX.Element {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div id="toast" className={`toast visible${toast.error ? ' error' : ''}`} role="status" aria-live="polite">
      {toast.error ? <CircleAlert /> : <CircleCheck />}
      <div><strong>{toast.title}</strong><p>{toast.message}</p></div>
      {toast.actionPath && (
        <button className="toast-action" type="button" onClick={() => onReveal(toast.actionPath ?? '')}>
          Show backup
        </button>
      )}
    </div>
  );
}