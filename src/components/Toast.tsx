import { useStore } from '../store';

export function ToastContainer() {
  const { state } = useStore();

  if (state.toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {state.toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
