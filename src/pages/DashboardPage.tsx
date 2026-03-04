import {
  AlertTriangle,
  ClipboardList,
  Droplets,
  PlugZap,
  RefreshCcw,
  Route,
  ShieldAlert,
  Truck,
  WifiOff,
  Wrench,
} from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { KpiCard } from '../components/common/KpiCard';
import { PageHeader } from '../components/common/PageHeader';
import { PanelTitle } from '../components/common/PanelTitle';
import { StatusBadge } from '../components/common/StatusBadge';
import { MineMap } from '../components/map/MineMap';
import type { AppViewContext } from '../components/layout/AppLayout';
import { geofences, vehicleTypeKeys } from '../data/mockData';
import { useAlerts } from '../hooks/useAlerts';
import { useOpenIncidents } from '../hooks/useIncidents';
import { useVehicles } from '../hooks/useVehicles';
import type { AlertState, AlertType, Severity, VehicleTypeKey } from '../types';
import { ALERT_TYPE_LABEL, TYPE_META, formatDateTime, formatMetric } from '../utils/format';

const TYPE_ICON_MAP: Record<VehicleTypeKey, ReactNode> = {
  truck: <Truck size={16} />,
  loader: <Wrench size={16} />,
  tanker: <Droplets size={16} />,
  grader: <Route size={16} />,
};

function matchesSearch(search: string, values: string[]) {
  if (!search.trim()) return true;
  const normalized = search.toLowerCase();
  return values.some((value) => value.toLowerCase().includes(normalized));
}

type DashboardAlert = {
  id: string;
  ts: string;
  vehicleId: string;
  type: AlertType;
  severity: Severity;
  state: AlertState;
  value: number;
  threshold: number;
};

function normalizeType(rawType: unknown): AlertType {
  if (typeof rawType !== 'string') return 'gps';
  const value = rawType.toLowerCase();
  if (value.includes('temp')) return 'temp';
  if (value.includes('press')) return 'pressure';
  if (value.includes('vib')) return 'vibration';
  if (value.includes('geo')) return 'geofence';
  if (value.includes('off')) return 'offline';
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

export function DashboardPage() {
  const { search, mine, timeRange } = useOutletContext<AppViewContext>();
  const { vehicles, source, loading, error, refresh } = useVehicles();
  const { alerts: apiAlerts, loading: alertsLoading, error: alertsError } = useAlerts(undefined, 100);
  const { incidents, loading: incidentsLoading, error: incidentsError } = useOpenIncidents();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(undefined);

  const filteredVehicles = useMemo(
    () =>
      vehicles.filter((vehicle) =>
        matchesSearch(search, [vehicle.id, vehicle.plate, vehicle.gatewayId, vehicle.zone])
      ),
    [search, vehicles]
  );

  const effectiveSelectedVehicleId =
    selectedVehicleId && filteredVehicles.some((vehicle) => vehicle.id === selectedVehicleId)
      ? selectedVehicleId
      : filteredVehicles[0]?.id;

  const liveVehicles = useMemo(
    () =>
      [...filteredVehicles].sort((a, b) => {
        const timeA = new Date(a.lastSeenTs).getTime();
        const timeB = new Date(b.lastSeenTs).getTime();
        const safeA = Number.isFinite(timeA) ? timeA : 0;
        const safeB = Number.isFinite(timeB) ? timeB : 0;
        return safeB - safeA;
      }),
    [filteredVehicles]
  );

  const filteredAlerts = useMemo(
    () => {
      const normalized: DashboardAlert[] = apiAlerts
        .map((alert, index) => {
          const raw = alert as Record<string, unknown>;
          const id =
            pickString(raw, ['alertId', 'id', 'sk']) ||
            `ALERT-${index + 1}`;
          const ts = pickString(raw, ['ts', 'createdAt', 'timestamp', 'eventTs', 'occurredAt']) || new Date().toISOString();
          const vehicleId = pickString(raw, ['vehicleId', 'unitId']) || 'N/A';
          const message = pickString(raw, ['message', 'detail', 'description']);
          const valueFromMessage = parseKmhFromMessage(message);
          const thresholdFromMessage = parseThresholdFromMessage(message);

          return {
            id,
            ts,
            vehicleId,
            type: normalizeType(alert.type),
            severity: normalizeSeverity(alert.severity),
            state: normalizeState(alert.state, alert.ack),
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
          };
        })
        .filter((alert) => matchesSearch(search, [alert.vehicleId, alert.id]))
        .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
      return normalized;
    },
    [apiAlerts, search]
  );

  const counters = useMemo(
    () => ({
      total: filteredVehicles.length,
      online: filteredVehicles.filter((v) => v.gatewayOnline).length,
      offline: filteredVehicles.filter((v) => !v.gatewayOnline).length,
      critical: filteredVehicles.filter((v) => v.status === 'critical').length,
      warning: filteredVehicles.filter((v) => v.status === 'warning').length,
      incidents: incidents.length,
    }),
    [filteredVehicles, incidents]
  );

  const typeSummary = useMemo(
    () =>
      vehicleTypeKeys.map((type) => {
        const list = filteredVehicles.filter((vehicle) => vehicle.type === type);
        return {
          type,
          total: list.length,
          critical: list.filter((vehicle) => vehicle.status === 'critical').length,
          offline: list.filter((vehicle) => vehicle.status === 'offline').length,
        };
      }),
    [filteredVehicles]
  );

  return (
    <div className="page">
      <PageHeader
        title="VisualizaciÃ³n de Operacion"
        description={`Vista general de la mina ${mine} Â· Rango ${timeRange}`}
        actions={
          <div className="header-actions-group">
            <span className={`source-badge source-${source}`}>{source.toUpperCase()}</span>
            <button type="button" className="ghost-button" onClick={() => void refresh()}>
              <RefreshCcw size={14} /> Refresh
            </button>
          </div>
        }
      />

      {(loading || error || alertsLoading || alertsError || incidentsLoading || incidentsError) && (
        <p className="muted">
          {loading ? 'Cargando vehiculos...' : null}
          {error ? ` ${error}` : null}
          {alertsLoading ? ' Cargando alertas...' : null}
          {alertsError ? ` ${alertsError}` : null}
          {incidentsLoading ? ' Cargando incidentes...' : null}
          {incidentsError ? ` ${incidentsError}` : null}
        </p>
      )}

      <section className="grid grid-kpi">
        <KpiCard
          title="Total vehiculos"
          value={counters.total}
          subtitle="Flota monitoreada"
          delta={0}
          icon={<Truck size={18} />}
          highlight="neutral"
          hideFooter
        />
        <KpiCard
          title="Gateways online"
          value={counters.online}
          subtitle="Conectividad estable"
          delta={0}
          icon={<PlugZap size={18} />}
          highlight="positive"
          hideFooter
        />
        <KpiCard
          title="Gateways offline"
          value={counters.offline}
          subtitle="Sin senal / heartbeat"
          delta={0}
          icon={<WifiOff size={18} />}
          highlight="warning"
          hideFooter
        />
        <KpiCard
          title="Alerta critica"
          value={counters.critical}
          subtitle="Atencion inmediata"
          delta={0}
          icon={<ShieldAlert size={18} />}
          highlight="critical"
          hideFooter
        />
        <KpiCard
          title="Advertencias"
          value={counters.warning}
          subtitle="Riesgo moderado"
          delta={0}
          icon={<AlertTriangle size={18} />}
          highlight="warning"
          hideFooter
        />
        <KpiCard
          title="Incidentes hoy"
          value={counters.incidents}
          subtitle="Operacion"
          delta={0}
          icon={<ClipboardList size={18} />}
          highlight="neutral"
          hideFooter
        />
      </section>

      <section className="grid grid-four">
        {typeSummary.map((item) => {
          const meta = TYPE_META[item.type];
          return (
            <article key={item.type} className="panel type-card">
              <div className="type-head">
                <span className="type-icon">{TYPE_ICON_MAP[item.type]}</span>
                <strong>{meta.label}</strong>
              </div>
              <ul>
                <li>
                  <span>Total</span>
                  <b>{item.total}</b>
                </li>
                <li>
                  <span>Criticos</span>
                  <b>{item.critical}</b>
                </li>
                <li>
                  <span>Offline</span>
                  <b>{item.offline}</b>
                </li>
              </ul>
              <small>{meta.profile}</small>
            </article>
          );
        })}
      </section>

      <section className="grid map-list-grid">
        <article className="panel">
          <PanelTitle title="Mapa en vivo" />
          <MineMap
            vehicles={filteredVehicles}
            geofences={geofences}
            selectedVehicleId={effectiveSelectedVehicleId}
            onSelectVehicle={(vehicle) => setSelectedVehicleId(vehicle.id)}
          />
        </article>

        <article className="panel live-table-panel">
          <PanelTitle title="Vehiculos en vivo" subtitle="Ultima telemetria reportada" />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Velocidad</th>
                  <th>Ultimo dato</th>
                </tr>
              </thead>
              <tbody>
                {liveVehicles.slice(0, 10).map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td>{vehicle.id}</td>
                    <td>{vehicle.typeLabel}</td>
                    <td>
                      <StatusBadge status={vehicle.status} />
                    </td>
                    <td>{formatMetric(vehicle.speedKmh, 'km/h')}</td>
                    <td>{formatDateTime(vehicle.lastSeenTs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="panel">
        <PanelTitle title="Alertas recientes" subtitle="Ultimas 10 alertas en cola operativa" />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Vehiculo</th>
                <th>Tipo</th>
                <th>Valor / Umbral</th>
                <th>Severidad</th>
                <th>Estado</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.slice(0, 10).map((alert) => (
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
                    <button type="button" className="ghost-button">
                      Reconocer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

