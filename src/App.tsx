import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { useState } from 'react';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { mines, timeRanges } from './data/mockData';
import { AlertsPage } from './pages/AlertsPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { DashboardPage } from './pages/DashboardPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { LoginPage } from './pages/LoginPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { SettingsPage } from './pages/SettingsPage';
import { VehicleDetailPage } from './pages/VehicleDetailPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { UsersPage } from './pages/UsersPage';

function App() {
  const [mine, setMine] = useState(mineInitialValue());
  const [timeRange, setTimeRange] = useState(timeRangeInitialValue());
  const [search, setSearch] = useState('');

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout
                  mine={mine}
                  timeRange={timeRange}
                  search={search}
                  onMineChange={setMine}
                  onTimeRangeChange={setTimeRange}
                  onSearchChange={setSearch}
                />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/vehiculos" element={<VehiclesPage />} />
            <Route path="/vehiculos/:vehicleId" element={<VehicleDetailPage />} />
            <Route path="/alertas" element={<AlertsPage />} />
            <Route path="/incidentes" element={<IncidentsPage />} />
            <Route path="/incidents" element={<IncidentsPage />} />
            <Route path="/mantenimiento" element={<MaintenancePage />} />
            <Route path="/configuracion" element={<SettingsPage />} />
            <Route path="/usuarios" element={<UsersPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

function mineInitialValue() {
  return mines[0] ?? 'San Miguel';
}

function timeRangeInitialValue() {
  return timeRanges[0] ?? 'En vivo';
}

export default App;

