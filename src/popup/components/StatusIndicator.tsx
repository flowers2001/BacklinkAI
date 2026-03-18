import type { AppStatus } from '../../shared/types';

interface StatusIndicatorProps {
  status: AppStatus;
  message: string;
}

const STATUS_CONFIG: Record<AppStatus, { className: string; showSpinner: boolean }> = {
  idle: { className: 'info', showSpinner: false },
  scraping: { className: 'info', showSpinner: true },
  generating: { className: 'info', showSpinner: true },
  filling: { className: 'info', showSpinner: true },
  success: { className: 'success', showSpinner: false },
  error: { className: 'error', showSpinner: false },
};

export function StatusIndicator({ status, message }: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status];
  
  return (
    <div className={`status-bar ${config.className}`}>
      {config.showSpinner && <div className="spinner" />}
      <span>{message}</span>
    </div>
  );
}
