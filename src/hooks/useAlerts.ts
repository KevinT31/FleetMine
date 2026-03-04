import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type Alert } from '../services/api';

type Source = 'aws';
const DEFAULT_ALERTS_VEHICLE_ID = 'TRUCK-007';

interface UseAlertsResult {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  source: Source;
  refresh: () => Promise<void>;
  ack: (alertId: string) => Promise<void>;
  notifyCritical: (alertId: string) => Promise<void>;
}

export function useAlerts(vehicleId?: string, limit = 50): UseAlertsResult {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source] = useState<Source>('aws');

  const normalizedVehicleId = useMemo(() => {
    if (!vehicleId) return undefined;
    const value = vehicleId.trim();
    return value.length > 0 ? value : undefined;
  }, [vehicleId]);
  const vehicleIdForRequest = normalizedVehicleId ?? DEFAULT_ALERTS_VEHICLE_ID;

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getRecentAlerts(vehicleIdForRequest, limit);
      setAlerts(res.data ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando alertas';
      setError(message);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [limit, vehicleIdForRequest]);

  const ack = async (alertId: string) => {
    await api.ackAlert(alertId);
    await refresh();
  };

  const notifyCritical = async (alertId: string) => {
    await api.notifyCriticalAlert(alertId, {
      roles: ['SUPERVISOR', 'OPERADOR'],
      channels: ['SNS'],
      reason: 'critical-threshold',
    });
  };

  useEffect(() => {
    void refresh();
    const intervalId = window.setInterval(() => {
      void refresh();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  return { alerts, loading, error, source, refresh, ack, notifyCritical };
}
