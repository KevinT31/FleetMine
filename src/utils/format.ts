import type { AlertType, Severity, VehicleStatus, VehicleTypeKey } from '../types';

export const STATUS_META: Record<
  VehicleStatus,
  { label: string; color: string; dot: string }
> = {
  normal: { label: 'Normal', color: 'var(--status-normal)', dot: '#3bd16f' },
  warning: { label: 'Advertencia', color: 'var(--status-warning)', dot: '#ffb020' },
  critical: { label: 'CRITICO', color: 'var(--status-critical)', dot: '#ff4d4f' },
  offline: { label: 'Offline', color: 'var(--status-offline)', dot: '#8f97a8' },
};

export const TYPE_META: Record<
  VehicleTypeKey,
  { label: string; profile: string }
> = {
  truck: { label: 'Camión minero', profile: 'Motor y transmisión' },
  loader: { label: 'Cargador frontal', profile: 'Sistema hidráulico' },
  tanker: { label: 'Cisterna', profile: 'Bomba / toma de fuerza' },
  grader: { label: 'Motoniveladora', profile: 'Hidráulico + tren de potencia' },
};

export const ALERT_TYPE_LABEL: Record<AlertType, string> = {
  temp: 'Temperatura',
  pressure: 'Presión',
  vibration: 'Vibración',
  geofence: 'Geocerca',
  offline: 'Offline',
  gps: 'GPS',
};

export const SEVERITY_META: Record<Severity, { label: string; color: string }> = {
  baja: { label: 'Baja', color: '#6cc4ff' },
  media: { label: 'Media', color: '#ffcf5a' },
  alta: { label: 'Alta', color: '#ff8a3d' },
  critica: { label: 'CRITICA', color: '#ff4d4f' },
};

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-CO').format(value);
}

export function formatPct(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

export function formatMetric(value: number, unit: string, decimals = 1): string {
  return `${value.toFixed(decimals)} ${unit}`;
}


