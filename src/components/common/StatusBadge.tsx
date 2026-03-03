import clsx from 'clsx';
import type { AlertState, Severity, VehicleStatus } from '../../types';
import { SEVERITY_META, STATUS_META } from '../../utils/format';

interface StatusBadgeProps {
  status?: VehicleStatus;
  severity?: Severity;
  alertState?: AlertState;
}

const ALERT_STATE_COLOR: Record<AlertState, string> = {
  abierta: '#ff5c5c',
  reconocida: '#ffb020',
  cerrada: '#4cc07a',
};

export function StatusBadge({ status, severity, alertState }: StatusBadgeProps) {
  const content = status
    ? { label: STATUS_META[status].label, color: STATUS_META[status].dot }
    : severity
      ? { label: SEVERITY_META[severity].label, color: SEVERITY_META[severity].color }
      : alertState
        ? { label: alertState, color: ALERT_STATE_COLOR[alertState] }
        : { label: 'N/A', color: '#8f97a8' };

  return (
    <span className={clsx('status-badge')} style={{ borderColor: `${content.color}66` }}>
      <span className="status-dot" style={{ backgroundColor: content.color }} />
      {content.label}
    </span>
  );
}
