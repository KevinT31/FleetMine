import {
  ChevronDown,
  LogIn,
  LogOut,
  Search,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { mines, timeRanges } from '../../data/mockData';

interface TopbarProps {
  mine: string;
  timeRange: string;
  search: string;
  onMineChange: (value: string) => void;
  onTimeRangeChange: (value: string) => void;
  onSearchChange: (value: string) => void;
}

export function Topbar({
  mine,
  timeRange,
  search,
  onMineChange,
  onTimeRangeChange,
  onSearchChange,
}: TopbarProps) {
  const { isAuthenticated, login, logout, user, loading } = useAuth();
  const userLabel = user?.email || user?.preferredUsername || user?.username || 'Usuario';

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <div className="brand-badge">FM</div>
        <div>
          <strong>FleetMine IoT</strong>
          <small>Plataforma Inteligente de Gestión de Flota</small>
        </div>
      </div>

      <div className="topbar-controls">
        <label className="select-wrap">
          <span>Mina</span>
          <select value={mine} onChange={(event) => onMineChange(event.target.value)}>
            {mines.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>

        <label className="select-wrap">
          <span>Rango</span>
          <select value={timeRange} onChange={(event) => onTimeRangeChange(event.target.value)}>
            {timeRanges.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>

        <label className="search-wrap">
          <Search size={15} />
          <input
            type="text"
            placeholder="Buscar ID vehículo, placa o gateway..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>

        {isAuthenticated ? (
          <button type="button" className="topbar-user" onClick={logout}>
            <LogOut size={18} />
            <div>
              <strong>{userLabel}</strong>
              <small>Cerrar sesion</small>
            </div>
          </button>
        ) : (
          <button
            type="button"
            className="topbar-user"
            onClick={() => {
              void login().catch((err) => {
                console.error('[Auth] Login failed', err);
              });
            }}
            disabled={loading}
          >
            <LogIn size={18} />
            <div>
              <strong>Iniciar sesion</strong>
              <small>Cognito Hosted UI</small>
            </div>
          </button>
        )}
      </div>
    </header>
  );
}
