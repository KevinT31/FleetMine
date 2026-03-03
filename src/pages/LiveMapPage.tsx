import { Activity, AlertCircle, Filter, Navigation, RefreshCcw, Route, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { MineMap } from '../components/map/MineMap';
import type { AppViewContext } from '../components/layout/AppLayout';
import { geofences } from '../data/mockData';
import { useAlerts } from '../hooks/useAlerts';
import { useVehicles } from '../hooks/useVehicles';
import type { VehicleStatus, VehicleTypeKey } from '../types';
import { formatDateTime, formatMetric } from '../utils/format';

const statusOptions: Array<{ value: VehicleStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'normal', label: 'Normal' },
  { value: 'warning', label: 'Advertencia' },
  { value: 'critical', label: 'CRITICO' },
  { value: 'offline', label: 'Offline' },
];

const typeOptions: Array<{ value: VehicleTypeKey | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'truck', label: 'Camion' },
  { value: 'loader', label: 'Cargador' },
  { value: 'tanker', label: 'Cisterna' },
  { value: 'grader', label: 'Motoniveladora' },
];

export function LiveMapPage() {
  const { search } = useOutletContext<AppViewContext>();
  const { vehicles, source, loading, error, refresh } = useVehicles();
  const { alerts: apiAlerts, loading: alertsLoading, error: alertsError } = useAlerts(undefined, 100);
  const [selectedType, setSelectedType] = useState<VehicleTypeKey | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<VehicleStatus | 'all'>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [movingOnly, setMovingOnly] = useState(false);
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(undefined);

  const activeAlerts = useMemo(() => {
    return new Set(
      apiAlerts
        .filter((alert) => {
          const state = typeof alert.state === 'string' ? alert.state.toLowerCase() : '';
          const ack = alert.ack === true;
          return state !== 'cerrada' && state !== 'closed' && !ack;
        })
        .map((alert) => (typeof alert.vehicleId === 'string' ? alert.vehicleId : 'N/A'))
    );
  }, [apiAlerts]);

  const zones = useMemo(() => ['all', ...new Set(vehicles.map((vehicle) => vehicle.zone))], [vehicles]);

  const filteredVehicles = useMemo(
    () =>
      vehicles.filter((vehicle) => {
        const matchesSearch =
          !search.trim() ||
          [vehicle.id, vehicle.plate, vehicle.gatewayId].some((value) =>
            value.toLowerCase().includes(search.toLowerCase())
          );
        const matchesType = selectedType === 'all' || vehicle.type === selectedType;
        const matchesStatus = selectedStatus === 'all' || vehicle.status === selectedStatus;
        const matchesZone = selectedZone === 'all' || vehicle.zone === selectedZone;
        const matchesMovement = !movingOnly || vehicle.speedKmh > 0;
        const matchesAlerts = !alertsOnly || activeAlerts.has(vehicle.id);
        return (
          matchesSearch &&
          matchesType &&
          matchesStatus &&
          matchesZone &&
          matchesMovement &&
          matchesAlerts
        );
      })
      .filter(
        (vehicle) =>
          Number.isFinite(vehicle.lat) &&
          Number.isFinite(vehicle.lon)
      ),
    [activeAlerts, alertsOnly, movingOnly, search, selectedStatus, selectedType, selectedZone, vehicles]
  );
  const effectiveSelectedVehicleId =
    selectedVehicleId && filteredVehicles.some((vehicle) => vehicle.id === selectedVehicleId)
      ? selectedVehicleId
      : filteredVehicles[0]?.id;

  const selectedVehicle =
    filteredVehicles.find((vehicle) => vehicle.id === effectiveSelectedVehicleId) || filteredVehicles[0];

  return (
    <div className="page">
      <PageHeader
        title="Mapa en Vivo"
        description="Seguimiento GPS con geocercas, filtros operativos y panel de detalle por unidad"
        actions={
          <div className="header-actions-group">
            <span className={`source-badge source-${source}`}>{source.toUpperCase()}</span>
            <button type="button" className="ghost-button" onClick={() => void refresh()}>
              <RefreshCcw size={14} /> Refresh
            </button>
          </div>
        }
      />

      {(loading || error || alertsLoading || alertsError) && (
        <p className="muted">
          {loading ? 'Cargando vehiculos...' : null}
          {error ? ` ${error}` : null}
          {alertsLoading ? ' Cargando alertas...' : null}
          {alertsError ? ` ${alertsError}` : null}
        </p>
      )}

      <section className="map-screen-grid">
        <aside className="panel filters-panel">
          <h3>
            <Filter size={16} /> Filtros
          </h3>

          <label>
            Tipo
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value as VehicleTypeKey | 'all')}>
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Estado
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as VehicleStatus | 'all')}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Zona
            <select value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)}>
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone === 'all' ? 'Todas' : zone}
                </option>
              ))}
            </select>
          </label>

          <label className="checkbox-row">
            <input type="checkbox" checked={movingOnly} onChange={() => setMovingOnly((prev) => !prev)} />
            Solo en movimiento
          </label>

          <label className="checkbox-row">
            <input type="checkbox" checked={alertsOnly} onChange={() => setAlertsOnly((prev) => !prev)} />
            Solo con alertas activas
          </label>

          <div className="mini-kpis">
            <article>
              <span>Vehiculos visibles</span>
              <strong>{filteredVehicles.length}</strong>
            </article>
            <article>
              <span>Con alerta activa</span>
              <strong>{filteredVehicles.filter((v) => activeAlerts.has(v.id)).length}</strong>
            </article>
          </div>
        </aside>

        <article className="panel map-main-panel">
          <MineMap
            vehicles={filteredVehicles}
            geofences={geofences}
            selectedVehicleId={effectiveSelectedVehicleId}
            showTrails
            onSelectVehicle={(vehicle) => setSelectedVehicleId(vehicle.id)}
          />
        </article>

        <aside className="panel vehicle-focus-panel">
          <h3>
            <Navigation size={16} /> Unidad seleccionada
          </h3>
          {selectedVehicle ? (
            <div className="focus-content">
              <div className="focus-head">
                <strong>{selectedVehicle.id}</strong>
                <StatusBadge status={selectedVehicle.status} />
              </div>
              <p>{selectedVehicle.typeLabel}</p>
              <ul>
                <li>
                  <span>Velocidad</span>
                  <b>{formatMetric(selectedVehicle.speedKmh, 'km/h')}</b>
                </li>
                <li>
                  <span>Ubicacion</span>
                  <b>
                    {selectedVehicle.lat.toFixed(4)}, {selectedVehicle.lon.toFixed(4)}
                  </b>
                </li>
                <li>
                  <span>Timestamp</span>
                  <b>{formatDateTime(selectedVehicle.lastSeenTs)}</b>
                </li>
                <li>
                  <span>Temperatura</span>
                  <b>{formatMetric(selectedVehicle.tempC, '°C')}</b>
                </li>
                <li>
                  <span>Presion</span>
                  <b>{formatMetric(selectedVehicle.pressureBar, 'bar')}</b>
                </li>
                <li>
                  <span>Vibracion</span>
                  <b>{formatMetric(selectedVehicle.vibrationMm_sRms, 'mm/s')}</b>
                </li>
              </ul>
              <div className="focus-actions">
                <Link className="solid-button" to={`/vehiculos/${selectedVehicle.id}`}>
                  Ver detalle
                </Link>
                <button type="button" className="ghost-button">
                  <Route size={15} /> Ver historial
                </button>
                <button type="button" className="ghost-button">
                  <AlertCircle size={15} /> Reportar incidente
                </button>
              </div>
            </div>
          ) : (
            <p className="muted">
              <Activity size={14} /> No hay unidades para los filtros actuales.
            </p>
          )}

          <div className="focus-separator" />
          <h4>
            <Wrench size={14} /> Geocercas activas
          </h4>
          <ul className="simple-list">
            {geofences.map((fence) => (
              <li key={fence.id}>{fence.name}</li>
            ))}
          </ul>
        </aside>
      </section>
    </div>
  );
}

