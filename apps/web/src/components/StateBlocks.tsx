import type { ReactNode } from 'react';
import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react';

export function LoadingBlock({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="state-block" role="status" aria-live="polite">
      <LoaderCircle aria-hidden="true" className="spin" size={22} />
      <p>{label}</p>
    </div>
  );
}

export function ErrorBlock({
  message,
  onRetry,
  retryLabel = 'Reintentar',
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="state-block state-block--error" role="alert">
      <AlertTriangle aria-hidden="true" size={22} />
      <p>{message}</p>
      {onRetry ? (
        <button className="button button--ghost" type="button" onClick={onRetry}>
          <RefreshCw aria-hidden="true" size={16} /> {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

export function EmptyBlock({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state-block state-block--empty">
      <p className="eyebrow">{title}</p>
      {children ? <p className="muted">{children}</p> : null}
    </div>
  );
}
