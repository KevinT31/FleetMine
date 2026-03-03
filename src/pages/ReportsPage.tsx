import { Download, FileText, Map as MapIcon, Table2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '../components/common/PageHeader';
import { alerts, reportKpis, vehicles } from '../data/mockData';
import { formatNumber } from '../utils/format';

const colors = ['#ffb020', '#ff7f50', '#ffd166', '#6cc4ff', '#9fb2c8'];

export function ReportsPage() {
  const [reportType, setReportType] = useState('vehiculo');
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');

  const alertsByType = useMemo<Array<{ name: string; value: number }>>(() => {
    const counts = new Map<string, number>();
    alerts.forEach((alert) => {
      counts.set(alert.type, (counts.get(alert.type) ?? 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, []);

  const incidentsByZone = useMemo<Array<{ zone: string; incidents: number }>>(() => {
    const counts = new Map<string, number>();
    vehicles.forEach((vehicle) => {
      counts.set(vehicle.zone, (counts.get(vehicle.zone) ?? 0) + Math.round(vehicle.failureProb72h / 25));
    });
    return Array.from(counts.entries())
      .map(([zone, incidents]) => ({ zone, incidents }))
      .sort((a, b) => b.incidents - a.incidents)
      .slice(0, 6);
  }, []);

  return (
    <div className="page">
      <PageHeader
        title="Reportes e Historial"
        description="Exportación de reportes por vehículo, tipo, fecha, alertas y zonas de mayor incidencia"
      />

      <section className="panel report-controls">
        <label>
          Tipo de reporte
          <select value={reportType} onChange={(event) => setReportType(event.target.value)}>
            <option value="vehiculo">Vehículo</option>
            <option value="tipo">Tipo de equipo</option>
            <option value="rango">Rango de fechas</option>
            <option value="alertas">Alertas por semana</option>
            <option value="zonas">Mapa de calor por zona</option>
          </select>
        </label>

        <label>
          Formato
          <select value={format} onChange={(event) => setFormat(event.target.value as 'csv' | 'pdf')}>
            <option value="csv">CSV</option>
            <option value="pdf">PDF</option>
          </select>
        </label>

        <button type="button" className="solid-button">
          <Download size={15} /> Exportar {format.toUpperCase()}
        </button>
      </section>

      <section className="grid grid-four">
        <article className="panel mini-card">
          <span>Alertas esta semana</span>
          <strong>{reportKpis.alertsThisWeek}</strong>
        </article>
        <article className="panel mini-card">
          <span>Incidentes esta semana</span>
          <strong>{reportKpis.incidentsThisWeek}</strong>
        </article>
        <article className="panel mini-card">
          <span>Horas operativas estimadas</span>
          <strong>{formatNumber(reportKpis.estimatedOperatingHours)} h</strong>
        </article>
        <article className="panel mini-card">
          <span>Zona con más eventos</span>
          <strong>{reportKpis.topIncidentZone}</strong>
        </article>
      </section>

      <section className="reports-grid">
        <article className="panel">
          <h3>
            <Table2 size={16} /> Alertas por tipo
          </h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={alertsByType} dataKey="value" nameKey="name" outerRadius={85}>
                  {alertsByType.map((item, index) => (
                    <Cell key={item.name} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <h3>
            <MapIcon size={16} /> Mapa de calor de zonas críticas
          </h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={incidentsByZone}>
                <CartesianGrid strokeDasharray="3 4" stroke="#2b3340" />
                <XAxis dataKey="zone" stroke="#9fb2c8" />
                <YAxis stroke="#9fb2c8" />
                <Tooltip />
                <Bar dataKey="incidents" fill="#ffb020" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="panel">
        <h3>
          <FileText size={16} /> Resumen ejecutivo
        </h3>
        <p className="muted">
          El patrón semanal muestra mayor concentración de alertas en rutas de botadero y frentes de carga.
          La acción recomendada es adelantar inspecciones en unidades con índice de salud menor a 60 y revisar
          estabilidad de conectividad en gateways con historial offline intermitente.
        </p>
      </section>
    </div>
  );
}
