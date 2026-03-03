import {
  FileBarChart2,
  LayoutDashboard,
  Settings2,
  ShieldAlert,
  Siren,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { navigationItems } from '../../data/mockData';

const iconMap = {
  LayoutDashboard,
  Truck,
  Siren,
  ShieldAlert,
  Wrench,
  FileBarChart2,
  Settings2,
  Users,
};

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-title">
        <p>Operacion Mina</p>
      </div>

      <nav>
        {navigationItems.map((item) => {
          const Icon = iconMap[item.icon as keyof typeof iconMap];
          return (
            <NavLink
              to={item.to}
              key={item.to}
              className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
              end={item.to === '/'}
            >
              <Icon size={17} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <p>FleetMine IoT v1.0</p>
        <small>AWS IoT Core Â· Timestream Â· DynamoDB</small>
      </div>
    </aside>
  );
}

