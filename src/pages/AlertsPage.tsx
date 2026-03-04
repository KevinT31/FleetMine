import { ClipboardPlus, Filter, RefreshCcw, Wrench } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { TelemetryTrendChart } from '../components/charts/TelemetryTrendChart';
import { useAlerts } from '../hooks/useAlerts';
import { createIncident, createWorkOrder, getVehicleHistory, type Alert as ApiAlert } from '../services/api';
import type { Alert, AlertState, AlertType, Severity } from '../types';
import { ALERT_TYPE_LABEL, formatDateTime } from '../utils/format';

const typeOptions: Array<AlertType | 'all'> = ['all', 'temp', 'pressure', 'vibration', 'gps', 'offline', 'geofence'];
const severityOptions: Array<Severity | 'all'> = ['all', 'baja', 'media', 'alta', 'critica'];

type UiAlert = Alert & {
  ackId: string;
  siteId?: string;
};

type HistoryChartPoint = {
  ts: string;
  t: string;
  speedKmh: number;
  tempC: number | null;
};

function toIsoNoMs(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function pickNumber(source: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    if (
      typeof value === 'object' &&
      value !== null &&
      'N' in value &&
      typeof (value as { N?: unknown }).N === 'string'
    ) {
      const parsed = Number((value as { N: string }).N);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return fallback;
}

function pickString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    if (
      typeof value === 'object' &&
      value !== null &&
      'S' in value &&
      typeof (value as { S?: unknown }).S === 'string' &&
      (value as { S: string }).S.trim().length > 0
    ) {
      return (value as { S: string }).S.trim();
    }
  }
  return undefined;
}

function parseKmhFromMessage(message?: string): number | undefined {
  if (!message) return undefined;
  const match = message.match(/(-?\d+(?:\.\d+)?)\s*km\/h/i);
  if (!match) return undefined;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseThresholdFromMessage(message?: string): number | undefined {
  if (!message) return undefined;
  const match = message.match(/(?:umbral|limite|threshold)[^\d-]*(-?\d+(?:\.\d+)?)/i);
  if (!match) return undefined;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeType(rawType: unknown): AlertType {
  if (typeof rawType !== 'string') return 'gps';
  const value = rawType.toLowerCase();
  if (value.includes('temp')) return 'temp';
  if (value.includes('press')) return 'pressure';
  if (value.includes('vib')) return 'vibration';
  if (value.includes('geo')) return 'geofence';
  if (value.includes('off')) return 'offline';
  if (value.includes('gps') || value.includes('loc')) return 'gps';
  return 'gps';
}

function normalizeSeverity(rawSeverity: unknown): Severity {
  if (typeof rawSeverity !== 'string') return 'media';
  const value = rawSeverity.toLowerCase();
  if (value === 'baja' || value === 'low') return 'baja';
  if (value === 'media' || value === 'medium') return 'media';
  if (value === 'alta' || value === 'high') return 'alta';
  if (value === 'critica' || value === 'critical') return 'critica';
  return 'media';
}

function normalizeState(rawState: unknown, ack: unknown): AlertState {
  if (typeof rawState === 'string') {
    const value = rawState.toLowerCase();
    if (value === 'abierta' || value === 'open') return 'abierta';
    if (value === 'reconocida' || value === 'ack' || value === 'acknowledged') return 'reconocida';
    if (value === 'cerrada' || value === 'closed') return 'cerrada';
  }
  if (ack === true) return 'reconocida';
  return 'abierta';
}

function mapSeverityToWorkOrderPriority(severity: Severity): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (severity === 'critica') return 'CRITICAL';
  if (severity === 'alta') return 'HIGH';
  if (severity === 'baja') return 'LOW';
  return 'MEDIUM';
}

function mapApiAlert(apiAlert: ApiAlert, index: number): UiAlert {
  const raw = apiAlert as Record<string, unknown>;
  const id = pickString(raw, ['alertId', 'id', 'sk']) || `ALERT-${index + 1}`;
  const ackId = pickString(raw, ['alertId', 'id', 'sk']) || id;

  const ts = pickString(raw, ['ts', 'createdAt', 'timestamp', 'eventTs', 'occurredAt']) || new Date().toISOString();
  const vehicleId = pickString(raw, ['vehicleId', 'unitId']) || 'N/A';
  const type = normalizeType(raw.type);
  const severity = normalizeSeverity(raw.severity);
  const state = normalizeState(raw.state, raw.ack);
  const zone = pickString(raw, ['siteId', 'site', 'zone']) || 'Sin zona';
  const siteId = pickString(raw, ['siteId', 'site']);
  const message = pickString(raw, ['message', 'detail', 'description']) || 'Sin mensaje';
  const valueFromMessage = parseKmhFromMessage(message);
  const thresholdFromMessage = parseThresholdFromMessage(message);

  return {
    id,
    ts,
    vehicleId,
    type,
    severity,
    state,
    value: pickNumber(
      raw,
      ['value', 'metricValue', 'currentValue', 'observedValue', 'speedKmh', 'speed'],
      valueFromMessage ?? 0
    ),
    threshold: pickNumber(
      raw,
      ['threshold', 'metricThreshold', 'thresholdValue', 'limit', 'speedLimitKmh', 'speedLimit'],
      thresholdFromMessage ?? 0
    ),
    message,
    zone,
    ackId,
    siteId,
  };
}

export function AlertsPage() {
  const [selectedType, setSelectedType] = useState<AlertType | 'all'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | 'all'>('all');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [creatingIncident, setCreatingIncident] = useState(false);
  const [creatingMaintenance, setCreatingMaintenance] = useState(false);
  const [contextSeries, setContextSeries] = useState<HistoryChartPoint[]>([]);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);

  const alertsVehicleScope = selectedVehicle === 'all' ? undefined : selectedVehicle;
  const { alerts: apiAlerts, loading, error, source, refresh } = useAlerts(alertsVehicleScope, 100);

  const alerts = useMemo<UiAlert[]>(() => apiAlerts.map((alert, index) => mapApiAlert(alert, index)), [apiAlerts]);

  const vehicleOptions = useMemo(() => {
    const values = new Set<string>();
    alerts.forEach((alert) => values.add(alert.vehicleId));
    return Array.from(values).sort();
  }, [alerts]);

  const filtered = useMemo(() => {
    return alerts
      .filter(
        (alert) =>
          (selectedType === 'all' || alert.type === selectedType) &&
          (selectedSeverity === 'all' || alert.severity === selectedSeverity)
      )
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  }, [alerts, selectedSeverity, selectedType]);

  const selectedAlert: UiAlert | null = filtered.find((alert) => alert.id === selectedAlertId) || filtered[0] || null;

  const openCriticalCount = useMemo(
    () => filtered.filter((alert) => alert.severity === 'critica' && alert.state === 'abierta').length,
    [filtered]
  );

  useEffect(() => {
    if (!selectedAlert) {
      setContextSeries([]);
      setContextError(null);
      return;
    }

    let alive = true;
    const load = async () => {
      try {
        setContextLoading(true);
        setContextError(null);
        const alertTs = new Date(selectedAlert.ts);
        const fromISO = toIsoNoMs(new Date(alertTs.getTime() - 10 * 60 * 1000));
        const toISO = toIsoNoMs(new Date(alertTs.getTime() + 10 * 60 * 1000));
        const history = await getVehicleHistory(selectedAlert.vehicleId, fromISO, toISO);
        const points = history.items
          .slice()
          .sort((a, b) => a.ts.localeCompare(b.ts))
          .map((item) => ({
            ts: item.ts,
            t: item.ts.slice(11, 16),
            speedKmh: toNumber(item.speedKmh, 0),
            tempC: toNullableNumber(item.tempC),
          }));

        if (alive) {
          setContextSeries(points);
        }
      } catch (err) {
        if (alive) {
          setContextSeries([]);
          setContextError(err instanceof Error ? err.message : 'Error cargando contexto historico');
        }
      } finally {
        if (alive) {
          setContextLoading(false);
        }
      }
    };

    void load();
    return () => {
      alive = false;
    };
  }, [selectedAlert]);

  const handleCreateIncident = async (alert: UiAlert) => {
    try {
      setCreatingIncident(true);
      setActionError(null);
      setActionSuccess(null);

      const payload = {
        siteId: alert.siteId || (alert.zone !== 'Sin zona' ? alert.zone : 'SM-01'),
        vehicleId: alert.vehicleId,
        severity: alert.severity,
        type: alert.type,
        title: alert.message || ALERT_TYPE_LABEL[alert.type],
        description: alert.message,
        linkedAlertIds: [alert.ackId],
      };

      const created = await createIncident(payload);
      setActionSuccess(`Incidente creado: ${created.incidentId}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo crear incidente');
    } finally {
      setCreatingIncident(false);
    }
  };

  const handleCreateMaintenance = async (alert: UiAlert) => {
    try {
      if (!alert.vehicleId || alert.vehicleId === 'N/A') {
        throw new Error('La alerta no tiene un vehicleId valido');
      }

      setCreatingMaintenance(true);
      setActionError(null);
      setActionSuccess(null);

      const payload = {
        vehicleId: alert.vehicleId,
        title: `Mantenimiento por alerta ${ALERT_TYPE_LABEL[alert.type]}`,
        description: `${alert.message} (alerta ${alert.id})`,
        priority: mapSeverityToWorkOrderPriority(alert.severity),
        type: alert.type.toUpperCase(),
        source: 'ALERT',
      };

      const created = await createWorkOrder(payload);
      const workOrderId =
        (typeof created.workOrderId === 'string' && created.workOrderId) ||
        (typeof created.id === 'string' && created.id) ||
        'N/A';
      setActionSuccess(`Orden de trabajo creada: ${workOrderId}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo crear orden de trabajo');
    } finally {
      setCreatingMaintenance(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Centro de Alertas"
        description="Bandeja operativa para seguimiento de alertas y acciones correctivas"
        actions={
          <div className="header-actions-group">
            <span className={`source-badge source-${source}`}>{source.toUpperCase()}</span>
            <button type="button" className="ghost-button" onClick={() => void refresh()} disabled={loading}>
              <RefreshCcw size={14} /> {loading ? 'Cargando...' : 'Refrescar'}
            </button>
          </div>
        }
      />

      {(error || actionError) && <p className="muted">{error || actionError}</p>}
      {actionSuccess && <p className="muted">{actionSuccess}</p>}

      <section className="panel">
        <div className="filters-inline filters-inline-alerts">
          <label>
            <span className="filter-label">
              <Filter size={14} /> Tipo
            </span>
            <select value={selectedType} onChange={(event) => setSelectedType(event.target.value as AlertType | 'all')}>
              {typeOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'Todos' : ALERT_TYPE_LABEL[option]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Severidad
            <select
              value={selectedSeverity}
              onChange={(event) => setSelectedSeverity(event.target.value as Severity | 'all')}
            >
              {severityOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'Todas' : option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Vehiculo
            <select value={selectedVehicle} onChange={(event) => setSelectedVehicle(event.target.value)}>
              <option value="all">Todos</option>
              {vehicleOptions.map((vehicle) => (
                <option key={vehicle} value={vehicle}>
                  {vehicle}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="muted">Alertas criticas abiertas: {openCriticalCount}</p>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha/Hora</th>
                <th>Vehiculo</th>
                <th>Tipo</th>
                <th>Severidad</th>
                <th>Valor / Umbral</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((alert) => (
                <tr
                  key={alert.id}
                  className={selectedAlert?.id === alert.id ? 'row-selected alert-row-clickable' : 'alert-row-clickable'}
                  onClick={() => setSelectedAlertId(alert.id)}
                >
                  <td>{formatDateTime(alert.ts)}</td>
                  <td>{alert.vehicleId}</td>
                  <td>{ALERT_TYPE_LABEL[alert.type]}</td>
                  <td>
                    <StatusBadge severity={alert.severity} />
                  </td>
                  <td>
                    {alert.value} / {alert.threshold}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedAlert && (
        <section className="panel alert-detail-grid">
          <article className="alert-detail-panel">
            <h3>Detalle de alerta seleccionada</h3>
            <div className="alert-detail-meta">
              <article className="alert-detail-item">
                <span>Vehiculo</span>
                <strong>{selectedAlert.vehicleId}</strong>
              </article>
              <article className="alert-detail-item">
                <span>Ubicacion</span>
                <strong>{selectedAlert.zone}</strong>
              </article>
              <article className="alert-detail-item">
                <span>Tipo</span>
                <strong>{ALERT_TYPE_LABEL[selectedAlert.type]}</strong>
              </article>
              <article className="alert-detail-item">
                <span>Severidad</span>
                <StatusBadge severity={selectedAlert.severity} />
              </article>
            </div>
            <div className="alert-detail-message">
              <span>Mensaje</span>
              <p>{selectedAlert.message}</p>
            </div>
            <div className="alert-create-actions">
              <button
                type="button"
                className="solid-button alert-create-button"
                onClick={() => void handleCreateIncident(selectedAlert)}
                disabled={creatingIncident || creatingMaintenance}
              >
                <ClipboardPlus size={14} /> {creatingIncident ? 'Creando incidente...' : 'Crear incidente'}
              </button>
              <button
                type="button"
                className="ghost-button alert-create-button"
                onClick={() => void handleCreateMaintenance(selectedAlert)}
                disabled={creatingIncident || creatingMaintenance}
              >
                <Wrench size={14} /> {creatingMaintenance ? 'Creando mantenimiento...' : 'Crear mantenimiento'}
              </button>
            </div>
          </article>
          <article className="alert-context-panel">
            <h3>Contexto 10 min antes/despues (historial real)</h3>
            {contextError ? <p className="muted">{contextError}</p> : null}
            <div style={{ height: 260, minHeight: 260, width: '100%' }}>
              {contextLoading ? (
                <p className="muted">Cargando historial...</p>
              ) : (
                <TelemetryTrendChart data={contextSeries} mode="history" />
              )}
            </div>
          </article>
        </section>
      )}
    </div>
  );
}
