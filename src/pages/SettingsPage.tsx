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
          <div className="form-grid">
            <label>
              Canal X
              <input type="text" value="PT100 (°C)" readOnly />
            </label>
            <label>
              Canal Y
              <input type="text" value="4-20 mA (bar)" readOnly />
            </label>
            <label>
              Canal Z
              <input type="text" value="4-20 mA (mm/s RMS)" readOnly />
            </label>
            <label>
              Rango vibración
              <input type="text" placeholder="0 - 8.5 mm/s RMS" />
            </label>
          </div>
          <button type="button" className="ghost-button">
            Actualizar calibración
          </button>
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
          <ul className="simple-list">
            <li>
              <span>Último backup</span>
              <strong>Hoy 02:15 AM</strong>
            </li>
            <li>
              <span>Estado OTA global</span>
              <strong>Habilitado</strong>
            </li>
            <li>
              <span>Version gateway objetivo</span>
              <strong>v3.4.2</strong>
            </li>
            <li>
              <span>Cambios pendientes</span>
              <strong>4 configuraciones</strong>
            </li>
          </ul>
          <button type="button" className="ghost-button">
            <Database size={14} /> Ejecutar backup
          </button>
        </article>
      </section>
    </div>
  );
}

