import {
  AlertTriangle,
  ClipboardPlus,
  Clock3,
  Gauge,
  Route,
  Signal,
  Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { TelemetryTrendChart } from '../components/charts/TelemetryTrendChart';
import { MineMap } from '../components/map/MineMap';
import { alerts, geofences, incidents, vehicles, workOrders } from '../data/mockData';
import { useVehicleHistory } from '../hooks/useVehicleHistory';
import { ALERT_TYPE_LABEL, formatDateTime, formatMetric, formatPct } from '../utils/format';

type DetailTab = 'vivo' | 'telemetria' | 'ruta' | 'eventos' | 'mantenimiento';
type RangeTab = '1h' | '24h' | '7d';

const ranges: Record<RangeTab, number> = {
  '1h': 1,
  '24h': 24,
  '7d': 24 * 7,
};

function safeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function VehicleDetailPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const [activeTab, setActiveTab] = useState<DetailTab>('vivo');
  const [range, setRange] = useState<RangeTab>('24h');
  const resolvedVehicleId = vehicleId ?? '';

  const vehicle = vehicles.find((item) => {
    const itemVehicleId = (item as unknown as { vehicleId?: string }).vehicleId;
    return itemVehicleId === resolvedVehicleId || item.id === resolvedVehicleId;
  });

  const fallbackVehicle = {
    id: resolvedVehicleId || 'N/A',
    plate: '--',
    type: 'truck',
    typeLabel: 'Sin datos locales',
    gatewayId: '--',
    status: 'offline',
    speedKmh: 0,
    tempC: 0,
    pressureBar: 0,
    vibrationMm_sRms: 0,
    lat: 0,
    lon: 0,
    zone: '--',
    headingDeg: 0,
    lastSeenTs: new Date().toISOString(),
    gatewayOnline: false,
    healthIndex: 0,
    failureProb72h: 0,
  } as const;

  const vehicleData = vehicle ?? fallbackVehicle;

  const {
    status: historyStatus,
    data: historyData,
    error: historyError,
    fromISO,
    toISO,
  } = useVehicleHistory(resolvedVehicleId, ranges[range]);

  const chartData = useMemo(
    () =>
      (historyData?.items ?? [])
        .slice()
        .sort((a, b) => a.ts.localeCompare(b.ts))
        .map((item) => ({
          ts: item.ts,
          t: item.ts.slice(11, 16),
          speedKmh: safeNumber(item.speedKmh) ?? 0,
          tempC: safeNumber(item.tempC),
        })),
    [historyData?.items]
  );

  const vehicleAlerts = useMemo(
    () =>
      alerts
        .filter((alert) => alert.vehicleId === resolvedVehicleId)
        .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()),
    [resolvedVehicleId]
  );

  const vehicleIncidents = useMemo(
    () =>
      incidents
        .filter((incident) => incident.vehicleId === resolvedVehicleId)
        .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()),
    [resolvedVehicleId]
  );

  const vehicleOrders = useMemo(
    () =>
      workOrders
        .filter((order) => order.vehicleId === resolvedVehicleId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [resolvedVehicleId]
  );

  const sensorHealth = [
    { label: 'Temp sensor PT100', ok: vehicleData.tempC < 88 },
    { label: 'Canal presion 4-20 mA', ok: vehicleData.pressureBar < 210 },
    { label: 'Canal vibracion 4-20 mA', ok: vehicleData.vibrationMm_sRms < 6.5 },
    { label: 'Gateway heartbeat', ok: vehicleData.gatewayOnline },
  ];

  const events = [
    ...vehicleAlerts.map((alert) => ({
      ts: alert.ts,
      type: 'alerta',
      title: `${ALERT_TYPE_LABEL[alert.type]} ${alert.severity}`,
      detail: alert.message,
    })),
    ...vehicleIncidents.map((incident) => ({
      ts: incident.ts,
      type: 'incidente',
      title: incident.title,
      detail: incident.description,
    })),
    {
      ts: vehicleData.lastSeenTs,
      type: 'telemetria',
      title: 'Ultimo heartbeat del gateway',
      detail: `${vehicleData.gatewayId} ${vehicleData.gatewayOnline ? 'online' : 'offline'}`,
    },
  ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  return (
    <div className="page">
      <PageHeader
        title={`${vehicleData.id} · ${vehicleData.typeLabel}`}
        description={`Gateway ${vehicleData.gatewayId} · Ultimo update ${formatDateTime(vehicleData.lastSeenTs)}`}
        actions={
          <div className="header-actions-group">
            <button type="button" className="ghost-button">
              <AlertTriangle size={15} /> Reportar incidente
            </button>
            <button type="button" className="solid-button">
              <ClipboardPlus size={15} /> Crear orden mantenimiento
            </button>
          </div>
        }
      />
      {!resolvedVehicleId && <p className="muted">Selecciona un vehiculo</p>}
      {Boolean(resolvedVehicleId) && !vehicle && <p className="muted">Selecciona un vehiculo</p>}

      <section className="panel detail-header-strip">
        <div>
          <span>Estado</span>
          <StatusBadge status={vehicleData.status} />
        </div>
        <div>
          <span>Gateway</span>
          <b>{vehicleData.gatewayOnline ? 'Online' : 'Offline'}</b>
        </div>
        <div>
          <span>AI Health Index</span>
          <b>{formatPct(vehicleData.healthIndex)}</b>
        </div>
        <div>
          <span>Prob. falla 72h</span>
          <b>{formatPct(vehicleData.failureProb72h)}</b>
        </div>
      </section>

      <section className="tabs-row">
        {[
          ['vivo', 'En vivo'],
          ['telemetria', 'Telemetria'],
          ['ruta', 'Ruta / Ubicacion'],
          ['eventos', 'Eventos'],
          ['mantenimiento', 'Fallas y mantenimiento'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`tab-button ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key as DetailTab)}
          >
            {label}
          </button>
        ))}
      </section>

      {activeTab === 'vivo' && (
        <section className="grid detail-live-grid">
          <article className="panel">
            <h3>Ubicacion actual</h3>
            <MineMap vehicles={[vehicleData]} geofences={geofences} selectedVehicleId={vehicleData.id} />
          </article>
          <article className="panel">
            <h3>Telemetria en tiempo real</h3>
            <div className="sensor-cards">
              <div>
                <span>Velocidad</span>
                <b>{formatMetric(vehicleData.speedKmh, 'km/h')}</b>
              </div>
              <div>
                <span>Temperatura</span>
                <b>{formatMetric(vehicleData.tempC, '°C')}</b>
              </div>
              <div>
                <span>Presion</span>
                <b>{formatMetric(vehicleData.pressureBar, 'bar')}</b>
              </div>
              <div>
                <span>Vibracion</span>
                <b>{formatMetric(vehicleData.vibrationMm_sRms, 'mm/s RMS')}</b>
              </div>
            </div>
            <h4>Estado de sensores</h4>
            <ul className="simple-list">
              {sensorHealth.map((sensor) => (
                <li key={sensor.label}>
                  <span>{sensor.label}</span>
                  <strong className={sensor.ok ? 'ok' : 'fail'}>{sensor.ok ? 'OK' : 'Fault'}</strong>
                </li>
              ))}
            </ul>
          </article>
        </section>
      )}

      {activeTab === 'telemetria' && (
        <section className="panel">
          <div className="panel-toolbar">
            <h3>Series temporales del vehiculo</h3>
            <div className="range-switch">
              {(['1h', '24h', '7d'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={range === item ? 'active' : ''}
                  onClick={() => setRange(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <p className="muted">
            Fuente: AWS History ({resolvedVehicleId || 'N/A'}) · {fromISO} {'->'} {toISO}
          </p>
          {historyStatus === 'loading' && <p className="muted">Cargando historial...</p>}
          {historyStatus === 'error' && <p className="muted">Error: {historyError}</p>}
          {historyStatus === 'success' && (
            <div style={{ height: 260, minHeight: 260, width: '100%' }}>
              <TelemetryTrendChart key={`telemetry-${vehicleId}`} data={chartData} />
            </div>
          )}
        </section>
      )}

      {activeTab === 'ruta' && (
        <section className="grid detail-route-grid">
          <article className="panel">
            <h3>
              <Route size={16} /> Recorrido y geocercas
            </h3>
            <MineMap vehicles={[vehicleData]} geofences={geofences} selectedVehicleId={vehicleData.id} showTrails />
          </article>
          <article className="panel">
            <h3>Paradas y transiciones de zona</h3>
            <ul className="simple-list">
              <li>
                <span>Parada prolongada</span>
                <strong>14 min en {vehicleData.zone}</strong>
              </li>
              <li>
                <span>Entrada geocerca</span>
                <strong>{vehicleData.zone} · {formatDateTime(vehicleData.lastSeenTs)}</strong>
              </li>
              <li>
                <span>Velocidad promedio</span>
                <strong>{formatMetric(vehicleData.speedKmh * 0.74 + 3, 'km/h')}</strong>
              </li>
              <li>
                <span>Distancia estimada 24h</span>
                <strong>{formatMetric(vehicleData.speedKmh * 11.8, 'km')}</strong>
              </li>
            </ul>
          </article>
        </section>
      )}

      {activeTab === 'eventos' && (
        <section className="panel">
          <h3>Timeline de eventos</h3>
          <div className="timeline">
            {events.map((event) => (
              <article key={`${event.ts}-${event.type}-${event.title}`}>
                <span className="timeline-time">{formatDateTime(event.ts)}</span>
                <div>
                  <strong>{event.title}</strong>
                  <p>{event.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'mantenimiento' && (
        <section className="grid detail-maint-grid">
          <article className="panel">
            <h3>
              <Wrench size={16} /> Ordenes de trabajo
            </h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tipo</th>
                    <th>Componente</th>
                    <th>Estado</th>
                    <th>Asignado</th>
                    <th>Vence</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleOrders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.id}</td>
                      <td>{order.type}</td>
                      <td>{order.component}</td>
                      <td>{order.status}</td>
                      <td>{order.assignedTech}</td>
                      <td>{formatDateTime(order.dueAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel">
            <h3>
              <Signal size={16} /> Historial de fallas
            </h3>
            <ul className="simple-list">
              <li>
                <span>Componente dominante</span>
                <strong>
                  {vehicleData.type === 'truck'
                    ? 'Transmision'
                    : vehicleData.type === 'loader'
                      ? 'Hidraulico'
                      : vehicleData.type === 'tanker'
                        ? 'Bomba'
                        : 'Tren de potencia'}
                </strong>
              </li>
              <li>
                <span>Fallas en 90 dias</span>
                <strong>{Math.max(1, Math.round(vehicleData.failureProb72h / 21))}</strong>
              </li>
              <li>
                <span>Proximo mantenimiento</span>
                <strong>
                  {formatDateTime(
                    new Date(new Date(vehicleData.lastSeenTs).getTime() + 1000 * 60 * 60 * 42).toISOString()
                  )}
                </strong>
              </li>
              <li>
                <span>Tiempo medio reparacion</span>
                <strong>
                  <Clock3 size={14} /> {formatMetric(6.4 + vehicleData.failureProb72h / 50, 'h')}
                </strong>
              </li>
              <li>
                <span>Riesgo IA por componente</span>
                <strong>
                  <Gauge size={14} /> {vehicleData.failureProb72h > 70 ? 'Alto' : vehicleData.failureProb72h > 45 ? 'Medio' : 'Bajo'}
                </strong>
              </li>
            </ul>
          </article>
        </section>
      )}
    </div>
  );
}
