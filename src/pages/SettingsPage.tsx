import { Database, MapPin, Settings2, SlidersHorizontal, UploadCloud } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';

export function SettingsPage() {
  return (
    <div className="page">
      <PageHeader
        title="Configuración (Admin)"
        description="Gestión de vehículos, gateways, sensores, umbrales, geocercas y políticas OTA"
      />

      <section className="settings-grid">
        <article className="panel">
          <h3>
            <Settings2 size={16} /> Vehículos y Gateways
          </h3>
          <div className="form-grid">
            <label>
              ID vehículo
              <input type="text" placeholder="TRK-001" />
            </label>
            <label>
              Tipo
              <select>
                <option>Camión minero</option>
                <option>Cargador frontal</option>
                <option>Cisterna</option>
                <option>Motoniveladora</option>
              </select>
            </label>
            <label>
              Gateway asociado
              <input type="text" placeholder="GW-009" />
            </label>
            <label>
              Estado inicial
              <select>
                <option>Normal</option>
                <option>Advertencia</option>
                <option>CRITICO</option>
              </select>
            </label>
          </div>
          <button type="button" className="solid-button">
            Guardar unidad
          </button>
        </article>

        <article className="panel">
          <h3>
            <SlidersHorizontal size={16} /> Sensores y calibración
          </h3>
          <p className="muted settings-section-subtitle">
            Ajusta el perfil de lectura por canal y aplica calibración operativa al gateway activo.
          </p>
          <div className="form-grid">
            <label>
              Canal X
              <input type="text" value="PT100 (°C)" readOnly />
              <small className="settings-field-hint">Temperatura de refrigerante</small>
            </label>
            <label>
              Canal Y
              <input type="text" value="4-20 mA (bar)" readOnly />
              <small className="settings-field-hint">Presión hidráulica</small>
            </label>
            <label>
              Canal Z
              <input type="text" value="4-20 mA (mm/s RMS)" readOnly />
              <small className="settings-field-hint">Vibración estructural</small>
            </label>
            <label>
              Rango vibración
              <input type="text" placeholder="0 - 8.5 mm/s RMS" />
              <small className="settings-field-hint">Límite operativo recomendado</small>
            </label>
          </div>
          <div className="settings-status-grid">
            <article>
              <span>Última calibración</span>
              <strong>Hoy 09:40 AM</strong>
            </article>
            <article>
              <span>Perfil activo</span>
              <strong>Flota pesada v2</strong>
            </article>
            <article>
              <span>Tolerancia canal Z</span>
              <strong>± 0.15 mm/s RMS</strong>
            </article>
          </div>
          <div className="settings-action-row">
            <button type="button" className="solid-button">
              Actualizar calibración
            </button>
            <button type="button" className="ghost-button">
              Restaurar perfil base
            </button>
          </div>
        </article>

        <article className="panel">
          <h3>
            <MapPin size={16} /> Geocercas y reglas
          </h3>
          <div className="form-grid">
            <label>
              Nombre geocerca
              <input type="text" placeholder="Botadero Norte" />
            </label>
            <label>
              Tipo
              <select>
                <option>Zona operativa</option>
                <option>Zona restringida</option>
                <option>Ruta segura</option>
              </select>
            </label>
            <label>
              Umbral temperatura
              <input type="number" placeholder="85" />
            </label>
            <label>
              Umbral vibración
              <input type="number" placeholder="6.3" />
            </label>
          </div>
          <button type="button" className="solid-button">
            Guardar reglas
          </button>
        </article>

        <article className="panel">
          <h3>
            <UploadCloud size={16} /> OTA, respaldos y auditoría
          </h3>
          <p className="muted settings-section-subtitle">
            Administra despliegues OTA, respaldo de configuración y trazabilidad de cambios.
          </p>
          <div className="settings-status-grid">
            <article>
              <span>Último backup</span>
              <strong>Hoy 02:15 AM</strong>
            </article>
            <article>
              <span>Estado OTA global</span>
              <strong>Habilitado</strong>
            </article>
            <article>
              <span>Version gateway objetivo</span>
              <strong>v3.4.2</strong>
            </article>
            <article>
              <span>Cambios pendientes</span>
              <strong>4 configuraciones</strong>
            </article>
          </div>
          <div className="form-grid">
            <label>
              Canal OTA
              <select>
                <option>Stable</option>
                <option>Canary</option>
                <option>Hotfix</option>
              </select>
              <small className="settings-field-hint">Define origen del paquete firmware</small>
            </label>
            <label>
              Ventana de despliegue
              <input type="text" value="23:00 - 03:00" readOnly />
              <small className="settings-field-hint">Horario para actualización remota</small>
            </label>
            <label>
              Retención auditoría
              <select>
                <option>180 días</option>
                <option>365 días</option>
                <option>730 días</option>
              </select>
              <small className="settings-field-hint">Histórico visible para revisiones</small>
            </label>
            <label>
              Política de aprobación
              <select>
                <option>Supervisor + Administrador</option>
                <option>Solo Administrador</option>
                <option>Aprobación automática</option>
              </select>
              <small className="settings-field-hint">Control previo a despliegue global</small>
            </label>
          </div>
          <div className="settings-action-row">
            <button type="button" className="solid-button">
              <Database size={14} /> Ejecutar backup
            </button>
            <button type="button" className="ghost-button">
              <UploadCloud size={14} /> Programar OTA
            </button>
          </div>
        </article>
      </section>
    </div>
  );
}

