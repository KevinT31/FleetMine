import { CheckCircle2, ClipboardList, PlayCircle, RefreshCcw, Wrench } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { TelemetryTrendChart } from '../components/charts/TelemetryTrendChart';
import { KpiCard } from '../components/common/KpiCard';
import { PageHeader } from '../components/common/PageHeader';
import { useMaintenance, type MaintenanceWorkOrder } from '../hooks/useMaintenance';
import { useVehicleHistory } from '../hooks/useVehicleHistory';
import { formatDateTime, formatMetric } from '../utils/format';

type WorkOrderForm = {
  vehicleId: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: 'CORRECTIVE' | 'PREVENTIVE';
  source: 'MANUAL' | 'ALERT';
};

function isToday(dateIso: string): boolean {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function toStatusLabel(status: string): string {
  const value = status.toUpperCase();
  if (value === 'OPEN') return 'OPEN';
  if (value === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (value === 'CLOSED') return 'CLOSED';
  return value;
}

function statusColors(status: string): { border: string; text: string; dot: string } {
  const value = status.toUpperCase();
  if (value === 'OPEN') return { border: '#ffb02066', text: '#ffcf5a', dot: '#ffb020' };
  if (value === 'IN_PROGRESS') return { border: '#6cc4ff66', text: '#9fd8ff', dot: '#6cc4ff' };
  if (value === 'CLOSED') return { border: '#4cc07a66', text: '#8eebb3', dot: '#4cc07a' };
  return { border: '#8f97a866', text: '#c8cfda', dot: '#8f97a8' };
}

function canStart(order: MaintenanceWorkOrder): boolean {
  return order.status.toUpperCase() === 'OPEN';
}

function canClose(order: MaintenanceWorkOrder): boolean {
  return order.status.toUpperCase() === 'IN_PROGRESS';
}

export function MaintenancePage() {
  const { workOrders, loading, error, refresh, create, setStatus } = useMaintenance();
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [historyVehicleId, setHistoryVehicleId] = useState('');
  const [historyHoursBack, setHistoryHoursBack] = useState<number>(24);
  const [form, setForm] = useState<WorkOrderForm>({
    vehicleId: '',
    title: '',
    description: '',
    priority: 'MEDIUM',
    type: 'CORRECTIVE',
    source: 'MANUAL',
  });

  const kpis = useMemo(() => {
    const backlog = workOrders.filter((item) => item.status.toUpperCase() === 'OPEN').length;
    const inProgress = workOrders.filter((item) => item.status.toUpperCase() === 'IN_PROGRESS').length;
    const closedToday = workOrders.filter((item) => item.status.toUpperCase() === 'CLOSED' && item.closedAt && isToday(item.closedAt)).length;

    const closedWithDuration = workOrders
      .filter((item) => item.status.toUpperCase() === 'CLOSED' && item.closedAt)
      .map((item) => {
        const startRef = item.startedAt ?? item.createdAt;
        const startMs = Date.parse(startRef);
        const endMs = Date.parse(item.closedAt as string);
        if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
        return (endMs - startMs) / 3_600_000;
      })
      .filter((value): value is number => typeof value === 'number');

    const mttrHours =
      closedWithDuration.length > 0
        ? closedWithDuration.reduce((acc, value) => acc + value, 0) / closedWithDuration.length
        : 0;

    return { backlog, inProgress, closedToday, mttrHours };
  }, [workOrders]);

  const historyVehicleOptions = useMemo(() => {
    const values = new Set<string>();
    workOrders.forEach((item) => {
      if (item.vehicleId && item.vehicleId !== 'N/A') {
        values.add(item.vehicleId);
      }
    });
    return Array.from(values).sort();
  }, [workOrders]);

  const effectiveHistoryVehicleId = historyVehicleId || historyVehicleOptions[0] || '';
  const { status: historyStatus, data: historyData, error: historyError } = useVehicleHistory(
    effectiveHistoryVehicleId,
    historyHoursBack
  );

  const historyChartData = useMemo(() => {
    if (!historyData?.items) return [];
    return historyData.items
      .slice()
      .sort((a, b) => a.ts.localeCompare(b.ts))
      .map((item) => ({
        ts: item.ts,
        t: item.ts.slice(11, 16),
        speedKmh: typeof item.speedKmh === 'number' && Number.isFinite(item.speedKmh) ? item.speedKmh : 0,
        tempC: typeof item.tempC === 'number' && Number.isFinite(item.tempC) ? item.tempC : null,
      }));
  }, [historyData]);

  const handleRefresh = async () => {
    await refresh();
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!form.vehicleId.trim() || !form.title.trim()) {
      setFormError('Vehicle ID y titulo son obligatorios');
      return;
    }

    setCreating(true);
    try {
      await create({
        vehicleId: form.vehicleId.trim(),
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        type: form.type,
        source: form.source,
      });
      setForm((prev) => ({ ...prev, title: '', description: '' }));
    } catch {
      // Error surface comes from hook.
    } finally {
      setCreating(false);
    }
  };

  const handleStart = async (workOrderId: string) => {
    setUpdatingId(workOrderId);
    try {
      await setStatus(workOrderId, 'IN_PROGRESS', { startedAt: new Date().toISOString() });
    } catch {
      // Error surface comes from hook.
    } finally {
      setUpdatingId(null);
    }
  };

  const handleClose = async (workOrderId: string) => {
    setUpdatingId(workOrderId);
    try {
      await setStatus(workOrderId, 'CLOSED', { closedAt: new Date().toISOString() });
    } catch {
      // Error surface comes from hook.
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Mantenimiento"
        description="Gestion basica de ordenes de trabajo usando datos reales del backend"
        actions={
          <div className="header-actions-group">
            <span className="source-badge source-aws">AWS</span>
            <button type="button" className="ghost-button" onClick={() => void handleRefresh()} disabled={loading}>
              <RefreshCcw size={14} /> {loading ? 'Cargando...' : 'Refresh'}
            </button>
          </div>
        }
      />

      {error ? <p className="muted">{error}</p> : null}

      <section className="grid grid-four">
        <KpiCard
          title="Backlog"
          value={kpis.backlog}
          subtitle="Ordenes OPEN"
          delta={0}
          icon={<ClipboardList size={18} />}
          highlight="warning"
          hideFooter
        />
        <KpiCard
          title="En progreso"
          value={kpis.inProgress}
          subtitle="Ordenes IN_PROGRESS"
          delta={0}
          icon={<PlayCircle size={18} />}
          highlight="neutral"
          hideFooter
        />
        <KpiCard
          title="Cerradas hoy"
          value={kpis.closedToday}
          subtitle="Ordenes CLOSED"
          delta={0}
          icon={<CheckCircle2 size={18} />}
          highlight="positive"
          hideFooter
        />
        <KpiCard
          title="MTTR promedio"
          value={formatMetric(kpis.mttrHours, 'h', 1)}
          subtitle="Tiempo medio de reparacion"
          delta={0}
          icon={<Wrench size={18} />}
          highlight="critical"
          hideFooter
        />
      </section>

      <section className="maintenance-grid">
        <article className="panel">
          <h3>Ordenes de trabajo</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Vehiculo</th>
                  <th>Titulo</th>
                  <th>Prioridad</th>
                  <th>Estado</th>
                  <th>Creada</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7}>Cargando ordenes...</td>
                  </tr>
                ) : workOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No hay ordenes disponibles</td>
                  </tr>
                ) : (
                  workOrders.map((order) => {
                    const colors = statusColors(order.status);
                    return (
                      <tr key={order.workOrderId}>
                        <td>{order.workOrderId}</td>
                        <td>{order.vehicleId}</td>
                        <td>{order.title}</td>
                        <td>{order.priority}</td>
                        <td>
                          <span
                            className="status-badge"
                            style={{ borderColor: colors.border, color: colors.text }}
                          >
                            <i className="status-dot" style={{ background: colors.dot }} />
                            {toStatusLabel(order.status)}
                          </span>
                        </td>
                        <td>{formatDateTime(order.createdAt)}</td>
                        <td>
                          <div className="table-actions">
                            {canStart(order) ? (
                              <button
                                type="button"
                                className="ghost-button"
                                onClick={() => void handleStart(order.workOrderId)}
                                disabled={updatingId === order.workOrderId}
                              >
                                Start
                              </button>
                            ) : null}
                            {canClose(order) ? (
                              <button
                                type="button"
                                className="ghost-button"
                                onClick={() => void handleClose(order.workOrderId)}
                                disabled={updatingId === order.workOrderId}
                              >
                                Close
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <h3>Crear orden de trabajo</h3>
          <form className="form-grid" onSubmit={(event) => void handleCreate(event)}>
            <label>
              Vehicle ID
              <input
                value={form.vehicleId}
                onChange={(event) => setForm((prev) => ({ ...prev, vehicleId: event.target.value }))}
                placeholder="TRUCK-007"
                required
              />
            </label>
            <label>
              Prioridad
              <select
                value={form.priority}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, priority: event.target.value as WorkOrderForm['priority'] }))
                }
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </label>
            <label>
              Titulo
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Inspeccion de sistema hidraulico"
                required
              />
            </label>
            <label>
              Tipo
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, type: event.target.value as WorkOrderForm['type'] }))
                }
              >
                <option value="CORRECTIVE">CORRECTIVE</option>
                <option value="PREVENTIVE">PREVENTIVE</option>
              </select>
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              Descripcion
              <input
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Detalle de la orden"
              />
            </label>
            <label>
              Source
              <select
                value={form.source}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, source: event.target.value as WorkOrderForm['source'] }))
                }
              >
                <option value="MANUAL">MANUAL</option>
                <option value="ALERT">ALERT</option>
              </select>
            </label>
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <button type="submit" className="solid-button" disabled={creating}>
                {creating ? 'Creando...' : 'Crear OT'}
              </button>
            </div>
          </form>
          {formError ? <p className="muted">{formError}</p> : null}
        </article>
      </section>

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Historial para analisis de mantenimiento</h2>
            <p className="muted">Consulta real desde /vehicles/{'{vehicleId}'}/history</p>
          </div>
        </div>
        <div className="filters-inline">
          <label>
            Vehicle ID
            <select
              value={effectiveHistoryVehicleId}
              onChange={(event) => setHistoryVehicleId(event.target.value)}
              disabled={historyVehicleOptions.length === 0}
            >
              {historyVehicleOptions.length === 0 ? (
                <option value="">Sin vehiculos</option>
              ) : (
                historyVehicleOptions.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))
              )}
            </select>
          </label>
          <label>
            Rango
            <select
              value={String(historyHoursBack)}
              onChange={(event) => setHistoryHoursBack(Number(event.target.value))}
            >
              <option value="6">Ultimas 6 h</option>
              <option value="24">Ultimas 24 h</option>
              <option value="72">Ultimas 72 h</option>
            </select>
          </label>
        </div>
        {historyError ? <p className="muted">{historyError}</p> : null}
        <div style={{ height: 280, minHeight: 280, width: '100%' }}>
          {historyStatus === 'loading' ? (
            <p className="muted">Cargando historial...</p>
          ) : historyChartData.length === 0 ? (
            <p className="muted">Sin datos historicos para el vehiculo seleccionado</p>
          ) : (
            <TelemetryTrendChart data={historyChartData} mode="history" />
          )}
        </div>
      </section>
    </div>
  );
}
