import { ArrowDownUp, ListFilter, RefreshCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import type { AppViewContext } from '../components/layout/AppLayout';
import { useVehicles } from '../hooks/useVehicles';
import type { VehicleStatus, VehicleTypeKey } from '../types';
import { formatDateTime, formatMetric } from '../utils/format';

type SortOption =
  | 'critical_desc'
  | 'offline_desc'
  | 'vibration_desc'
  | 'temp_desc'
  | 'updated_desc'
  | 'id_asc';

function statusPriority(status: VehicleStatus) {
  if (status === 'critical') return 4;
  if (status === 'warning') return 3;
  if (status === 'offline') return 2;
  return 1;
}

export function VehiclesPage() {
  const { search } = useOutletContext<AppViewContext>();
  const { vehicles, source, loading, error, refresh } = useVehicles();
  const [typeFilter, setTypeFilter] = useState<VehicleTypeKey | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'all'>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('critical_desc');

  const zones = useMemo(() => ['all', ...new Set(vehicles.map((vehicle) => vehicle.zone))], [vehicles]);

  const filteredVehicles = useMemo(() => {
    const list = vehicles.filter((vehicle) => {
      const matchesSearch =
        !search.trim() ||
        [vehicle.id, vehicle.plate, vehicle.gatewayId].some((field) =>
          field.toLowerCase().includes(search.toLowerCase())
        );

      return (
        matchesSearch &&
        (typeFilter === 'all' || vehicle.type === typeFilter) &&
        (statusFilter === 'all' || vehicle.status === statusFilter) &&
        (zoneFilter === 'all' || vehicle.zone === zoneFilter)
      );
    });

    list.sort((a, b) => {
      if (sortBy === 'critical_desc') return statusPriority(b.status) - statusPriority(a.status);
      if (sortBy === 'offline_desc') {
        return new Date(a.lastSeenTs).getTime() - new Date(b.lastSeenTs).getTime();
      }
      if (sortBy === 'vibration_desc') return b.vibrationMm_sRms - a.vibrationMm_sRms;
      if (sortBy === 'temp_desc') return b.tempC - a.tempC;
      if (sortBy === 'updated_desc') return new Date(b.lastSeenTs).getTime() - new Date(a.lastSeenTs).getTime();
      return a.id.localeCompare(b.id);
    });

    return list;
  }, [search, sortBy, statusFilter, typeFilter, vehicles, zoneFilter]);

  return (
    <div className="page">
      <PageHeader
        title="Vehiculos"
        description="Listado completo con filtros operativos y criticidad"
        actions={
          <div className="header-actions-group">
            <span className={`source-badge source-${source}`}>{source.toUpperCase()}</span>
            <button type="button" className="ghost-button" onClick={() => void refresh()}>
              <RefreshCcw size={14} /> Refresh
            </button>
          </div>
        }
      />

      {(loading || error) && (
        <p className="muted">
          {loading ? 'Cargando vehiculos...' : null}
          {error ? ` ${error}` : null}
        </p>
      )}

      <section className="panel">
        <div className="filters-inline filters-inline-vehicles">
          <label>
            <span className="filter-label">
              <ListFilter size={14} /> Tipo
            </span>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as VehicleTypeKey | 'all')}>
              <option value="all">Todos</option>
              <option value="truck">Camiones</option>
              <option value="loader">Cargadores</option>
              <option value="tanker">Cisternas</option>
              <option value="grader">Motoniveladoras</option>
            </select>
          </label>
          <label>
            Estado
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as VehicleStatus | 'all')}
            >
              <option value="all">Todos</option>
              <option value="normal">Normal</option>
              <option value="warning">Advertencia</option>
              <option value="critical">CRITICO</option>
              <option value="offline">Offline</option>
            </select>
          </label>
          <label>
            Zona
            <select value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)}>
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone === 'all' ? 'Todas' : zone}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="filter-label">
              <ArrowDownUp size={14} /> Ordenar por
            </span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}>
              <option value="critical_desc">Mas CRITICOS</option>
              <option value="offline_desc">Mas tiempo offline</option>
              <option value="vibration_desc">Mayor vibracion</option>
              <option value="temp_desc">Mayor temperatura</option>
              <option value="updated_desc">Ultima actualizacion</option>
              <option value="id_asc">ID ascendente</option>
            </select>
          </label>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Tipo</th>
                <th>Gateway</th>
                <th>Estado</th>
                <th>Velocidad</th>
                <th>Ultimo timestamp</th>
                <th>Ubicacion</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td>{vehicle.id}</td>
                  <td>{vehicle.typeLabel}</td>
                  <td>{vehicle.gatewayId}</td>
                  <td>
                    <StatusBadge status={vehicle.status} />
                  </td>
                  <td>{formatMetric(vehicle.speedKmh, 'km/h')}</td>
                  <td>{formatDateTime(vehicle.lastSeenTs)}</td>
                  <td>{vehicle.zone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
