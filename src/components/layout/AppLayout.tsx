import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export interface AppViewContext {
  mine: string;
  timeRange: string;
  search: string;
}

interface AppLayoutProps extends AppViewContext {
  onMineChange: (value: string) => void;
  onTimeRangeChange: (value: string) => void;
  onSearchChange: (value: string) => void;
}

export function AppLayout({
  mine,
  timeRange,
  search,
  onMineChange,
  onTimeRangeChange,
  onSearchChange,
}: AppLayoutProps) {
  return (
    <div className="app-shell">
      <Topbar
        mine={mine}
        timeRange={timeRange}
        search={search}
        onMineChange={onMineChange}
        onTimeRangeChange={onTimeRangeChange}
        onSearchChange={onSearchChange}
      />
      <div className="app-body">
        <Sidebar />
        <main className="content">
          <Outlet context={{ mine, timeRange, search }} />
        </main>
      </div>
    </div>
  );
}
