import { Shield, UserPlus, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { users } from '../data/mockData';

export function UsersPage() {
  const [roleFilter, setRoleFilter] = useState('all');
  const rolePermissions = [
    { role: 'Operador', access: 'Dashboard + Incidentes' },
    { role: 'Supervisor', access: 'Mapa + Alertas + Incidentes' },
    { role: 'Mantenimiento', access: 'Mantenimiento + OTs + Fallas' },
    { role: 'Admin', access: 'Acceso total + Configuracion' },
  ];

  const filtered = users.filter((user) => roleFilter === 'all' || user.role === roleFilter);

  return (
    <div className="page">
      <PageHeader
        title="Usuarios y Roles"
        description="Control de acceso por rol operativo: operador, supervisor, mantenimiento y admin"
      />

      <section className="users-grid">
        <article className="panel">
          <div className="panel-toolbar">
            <h3>
              <UsersRound size={16} /> Usuarios activos
            </h3>
            <label>
              Rol
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <option value="all">Todos</option>
                <option value="Operador">Operador</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Admin">Admin</option>
              </select>
            </label>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th>Mina</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.name}</td>
                    <td>{user.role}</td>
                    <td>{user.mine}</td>
                    <td>{user.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <h3>
            <UserPlus size={16} /> Crear usuario
          </h3>
          <div className="form-grid">
            <label>
              Nombre
              <input type="text" placeholder="Nombre completo" />
            </label>
            <label>
              Correo
              <input type="email" placeholder="correo@fleetmine.com" />
            </label>
            <label>
              Rol
              <select>
                <option>Operador</option>
                <option>Supervisor</option>
                <option>Mantenimiento</option>
                <option>Admin</option>
              </select>
            </label>
            <label>
              Mina asignada
              <select>
                <option>San Miguel</option>
                <option>La Esperanza</option>
                <option>Pampa Norte</option>
              </select>
            </label>
          </div>
          <button type="button" className="solid-button">
            Crear usuario
          </button>

          <div className="focus-separator" />
          <h4>
            <Shield size={14} /> Permisos por rol
          </h4>
          <div className="role-permissions">
            {rolePermissions.map((item) => (
              <article key={item.role} className="role-permission-item">
                <span className="role-permission-role">{item.role}</span>
                <strong>{item.access}</strong>
              </article>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
