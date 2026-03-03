import { BellRing, ClipboardPlus, Filter, RefreshCcw, ShieldCheck, Wrench } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { TelemetryTrendChart } from '../components/charts/TelemetryTrendChart';
import { useAlerts } from '../hooks/useAlerts';
import { createIncident, getVehicleHistory, type Alert as ApiAlert } from '../services/api';
import type { Alert, AlertState, AlertType, Severity } from '../types';
import { ALERT_TYPE_LABEL, formatDateTime } from '../utils/format';

const typeOptions: Array<AlertType | 'all'> = ['all', 'temp', 'pressure', 'vibration', 'gps', 'offline', 'geofence'];
const severityOptions: Array<Severity | 'all'> = ['all', 'baja', 'media', 'alta', 'critica'];

type UiAlert = Alert & {
  ack: boolean;
  ackId: string;
  canAck: boolean;
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

function mapApiAlert(apiAlert: ApiAlert, index: number): UiAlert {
  const id =
    (typeof apiAlert.alertId === 'string' && apiAlert.alertId) ||
    (typeof apiAlert.sk === 'string' && apiAlert.sk) ||
    `ALERT-${index + 1}`;
  const ackId = typeof apiAlert.alertId === 'string' && apiAlert.alertId ? apiAlert.alertId : id;

  const ts = typeof apiAlert.ts === 'string' ? apiAlert.ts : new Date().toISOString();
  const vehicleId = typeof apiAlert.vehicleId === 'string' ? apiAlert.vehicleId : 'N/A';
  const type = normalizeType(apiAlert.type);
  const severity = normalizeSeverity(apiAlert.severity);
  const state = normalizeState(apiAlert.state, apiAlert.ack);
  const zone = typeof apiAlert.siteId === 'string' ? apiAlert.siteId : 'Sin zona';
  const siteId = typeof apiAlert.siteId === 'string' ? apiAlert.siteId : undefined;
  const message = typeof apiAlert.message === 'string' && apiAlert.message ? apiAlert.message : 'Sin mensaje';
  const ack = apiAlert.ack === true || state !== 'abierta';

  return {
    id,
    ts,
    vehicleId,
    type,
    severity,
    state,
    value: toNumber(apiAlert.value, 0),
    threshold: toNumber(apiAlert.threshold, 0),
    message,
    zone,
    ack,
    ackId,
    canAck: !ack && Boolean(ackId),
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
  const [notifying, setNotifying] = useState(false);
  const [contextSeries, setContextSeries] = useState<HistoryChartPoint[]>([]);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);

  const alertsVehicleScope = selectedVehicle === 'all' ? undefined : selectedVehicle;
  const { alerts: apiAlerts, loading, error, source, refresh, ack, notifyCritical } = useAlerts(
    alertsVehicleScope,
    100
  );

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

  const pendingCriticalAlerts = useMemo(
    () => filtered.filter((alert) => alert.severity === 'critica' && alert.state === 'abierta'),
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

  const handleAck = (alertId: string) => {
    setActionError(null);
    setActionSuccess(null);
    void ack(alertId).catch((err) => {
      const message = err instanceof Error ? err.message : 'Error reconociendo alerta';
      setActionError(message);
    });
  };

  const handleNotifySingle = (alertId: string) => {
    setActionError(null);
    setActionSuccess(null);
    void notifyCritical(alertId)
      .then(() => {
        setActionSuccess(`Notificacion SNS enviada para alerta ${alertId}`);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'No se pudo enviar notificacion SNS';
        setActionError(message);
      });
  };

  const handleNotifyCriticalAll = async () => {
    if (pendingCriticalAlerts.length === 0) {
      setActionSuccess('No hay alertas criticas abiertas para notificar');
      return;
    }

    setNotifying(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const results = await Promise.allSettled(
        pendingCriticalAlerts.map((alert) => notifyCritical(alert.ackId))
      );
      const sent = results.filter((result) => result.status === 'fulfilled').length;
      const failed = results.length - sent;
      if (failed > 0) {
        setActionError(`SNS envio ${sent} notificaciones y fallo en ${failed}`);
      } else {
        setActionSuccess(`SNS envio ${sent} notificaciones criticas`);
      }
    } finally {
      setNotifying(false);
    }
  };

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

  return (
    <div className="page">
      <PageHeader
        title="Centro de Alertas"
        description="Bandeja operativa con notificacion inmediata de alertas criticas a supervisores y operadores"
        actions={
          <div className="header-actions-group">
            <span className={`source-badge source-${source}`}>{source.toUpperCase()}</span>
            <button type="button" className="ghost-button" onClick={() => void refresh()} disabled={loading}>
              <RefreshCcw size={14} /> {loading ? 'Cargando...' : 'Refrescar'}
            </button>
            <button
              type="button"
              className="solid-button"
              onClick={() => void handleNotifyCriticalAll()}
              disabled={notifying}
            >
              <BellRing size={14} /> {notifying ? 'Enviando SNS...' : 'Notificar criticas SNS'}
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

        <p className="muted">Alertas criticas abiertas: {pendingCriticalAlerts.length}</p>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha/Hora</th>
                <th>Vehiculo</th>
                <th>Tipo</th>
                <th>Valor / Umbral</th>
                <th>Severidad</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((alert) => (
                <tr key={alert.id}>
                  <td>{formatDateTime(alert.ts)}</td>
                  <td>{alert.vehicleId}</td>
                  <td>{ALERT_TYPE_LABEL[alert.type]}</td>
                  <td>
                    {alert.value} / {alert.threshold}
                  </td>
                  <td>
                    <StatusBadge severity={alert.severity} />
                  </td>
                  <td>
                    <StatusBadge alertState={alert.state} />
                  </td>
                  <td>
                    <div className="table-actions">
                      <button type="button" className="ghost-button" onClick={() => setSelectedAlertId(alert.id)}>
                        Ver detalle
                      </button>
                      {alert.canAck ? (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => handleAck(alert.ackId)}
                          disabled={loading}
                        >
                          <ShieldCheck size={14} /> Reconocer
                        </button>
                      ) : (
                        <span className="muted">Reconocida</span>
                      )}
                      {alert.severity === 'critica' ? (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => handleNotifySingle(alert.ackId)}
                        >
                          <BellRing size={14} /> Notificar
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedAlert && (
        <section className="panel alert-detail-grid">
          <article>
            <h3>Detalle de alerta {selectedAlert.id}</h3>
            <ul className="simple-list">
              <li>
                <span>Vehiculo</span>
                <strong>{selectedAlert.vehicleId}</strong>
              </li>
              <li>
                <span>Tipo</span>
                <strong>{ALERT_TYPE_LABEL[selectedAlert.type]}</strong>
              </li>
              <li>
                <span>Ubicacion</span>
                <strong>{selectedAlert.zone}</strong>
              </li>
              <li>
                <span>Mensaje</span>
                <strong>{selectedAlert.message}</strong>
              </li>
              <li>
                <span>Estado</span>
                <StatusBadge alertState={selectedAlert.state} />
              </li>
            </ul>
            <div className="focus-actions">
              <button
                type="button"
                className="solid-button"
                onClick={() => void handleCreateIncident(selectedAlert)}
                disabled={creatingIncident}
              >
                <ClipboardPlus size={14} /> Crear incidente
              </button>
              <button type="button" className="ghost-button">
                <Wrench size={14} /> Crear mantenimiento
              </button>
            </div>
          </article>
          <article>
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
