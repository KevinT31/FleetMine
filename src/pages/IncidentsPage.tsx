import { RefreshCcw, Save, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { useOpenIncidents } from '../hooks/useIncidents';
import { type IncidentItem, updateIncident } from '../services/api';
import { formatDateTime } from '../utils/format';

export function IncidentsPage() {
  const { incidents, status, loading, error, refresh } = useOpenIncidents();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const ordered = useMemo(
    () =>
      incidents
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [incidents]
  );

  const selectedIncident =
    ordered.find((item) => item.incidentId === selectedIncidentId) || ordered[0] || null;

  const patchIncident = async (incident: IncidentItem, patch: { status: string }) => {
    try {
      setActionLoading(true);
      setActionError(null);

      await updateIncident(incident.incidentId, {
        status: patch.status,
        comment: comment.trim() || undefined,
        assignedTo: assignedTo.trim() || incident.assignedTo || undefined,
        closedAt: patch.status === 'CLOSED' ? new Date().toISOString() : undefined,
      });

      setComment('');
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo actualizar incidente');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Incidentes de Operacion"
        description="Listado OPEN desde AWS con acciones de seguimiento y cierre"
        actions={
          <div className="header-actions-group">
            <span className="source-badge source-aws">AWS</span>
            <button type="button" className="ghost-button" onClick={() => void refresh()} disabled={loading}>
              <RefreshCcw size={14} /> {loading ? 'Cargando...' : 'Refrescar'}
            </button>
          </div>
        }
      />

      {(error || actionError) && <p className="muted">{error || actionError}</p>}

      <section className="incidents-grid">
        <article className="panel">
          <h3>Incidentes OPEN</h3>
          {status === 'loading' && <p className="muted">Cargando incidentes...</p>}
          {status === 'error' && <p className="muted">Error cargando incidentes.</p>}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Severidad</th>
                  <th>Titulo</th>
                  <th>Vehiculo</th>
                  <th>Site</th>
                  <th>Creado</th>
                  <th>Asignado</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {ordered.map((incident) => (
                  <tr
                    key={incident.incidentId}
                    className={incident.incidentId === selectedIncident?.incidentId ? 'row-selected' : ''}
                    onClick={() => {
                      setSelectedIncidentId(incident.incidentId);
                      setAssignedTo(incident.assignedTo ?? '');
                    }}
                  >
                    <td>{incident.incidentId}</td>
                    <td>{incident.severity}</td>
                    <td>{incident.title}</td>
                    <td>{incident.vehicleId}</td>
                    <td>{incident.siteId}</td>
                    <td>{formatDateTime(incident.createdAt)}</td>
                    <td>{incident.assignedTo ?? '-'}</td>
                    <td>{incident.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <h3>Detalle incidente</h3>
          {selectedIncident ? (
            <>
              <h4>{selectedIncident.title}</h4>
              <p className="muted">{selectedIncident.description ?? 'Sin descripcion'}</p>
              <ul className="simple-list">
                <li>
                  <span>ID</span>
                  <strong>{selectedIncident.incidentId}</strong>
                </li>
                <li>
                  <span>Estado</span>
                  <strong>{selectedIncident.status}</strong>
                </li>
                <li>
                  <span>Severidad</span>
                  <strong>{selectedIncident.severity}</strong>
                </li>
                <li>
                  <span>Vehiculo</span>
                  <strong>{selectedIncident.vehicleId}</strong>
                </li>
                <li>
                  <span>Site</span>
                  <strong>{selectedIncident.siteId}</strong>
                </li>
                <li>
                  <span>Alertas vinculadas</span>
                  <strong>{selectedIncident.linkedAlertIds?.join(', ') || '-'}</strong>
                </li>
              </ul>

              <div className="focus-separator" />
              <div className="form-grid">
                <label>
                  Asignado a
                  <input
                    type="text"
                    value={assignedTo}
                    onChange={(event) => setAssignedTo(event.target.value)}
                    placeholder="Supervisor o tecnico"
                  />
                </label>
                <label>
                  Comentario
                  <input
                    type="text"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Comentario de avance"
                  />
                </label>
              </div>

              <div className="focus-actions">
                <button
                  type="button"
                  className="ghost-button"
                  disabled={actionLoading}
                  onClick={() => void patchIncident(selectedIncident, { status: 'IN_PROGRESS' })}
                >
                  <Save size={14} /> Marcar IN_PROGRESS
                </button>
                <button
                  type="button"
                  className="solid-button"
                  disabled={actionLoading}
                  onClick={() => void patchIncident(selectedIncident, { status: 'CLOSED' })}
                >
                  <ShieldCheck size={14} /> Cerrar (CLOSED)
                </button>
              </div>
            </>
          ) : (
            <p className="muted">No hay incidentes abiertos.</p>
          )}
        </article>
      </section>
    </div>
  );
}
