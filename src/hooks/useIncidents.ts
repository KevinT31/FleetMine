import { useCallback, useEffect, useState } from 'react';
import { getOpenIncidents, type IncidentItem } from '../services/api';

type IncidentsStatus = 'loading' | 'error' | 'success';

interface UseIncidentsResult {
  incidents: IncidentItem[];
  status: IncidentsStatus;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useOpenIncidents(limit?: number): UseIncidentsResult {
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [status, setStatus] = useState<IncidentsStatus>('loading');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getOpenIncidents({ limit });
      setIncidents(data);
      setStatus('success');
    } catch (err) {
      setIncidents([]);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Error cargando incidentes');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    incidents,
    status,
    loading,
    error,
    refresh,
  };
}
