import { useEffect, useMemo, useState } from 'react';
import { getVehicleHistory, type VehicleHistoryResponse } from '../services/api';

type HistoryStatus = 'idle' | 'loading' | 'success' | 'error';

function toIsoNoMs(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

interface UseVehicleHistoryResult {
  status: HistoryStatus;
  data: VehicleHistoryResponse | null;
  error: string | null;
  fromISO: string;
  toISO: string;
}

export function useVehicleHistory(vehicleId: string, hoursBack = 24): UseVehicleHistoryResult {
  const [status, setStatus] = useState<HistoryStatus>('idle');
  const [data, setData] = useState<VehicleHistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { fromISO, toISO } = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - hoursBack * 60 * 60 * 1000);
    return {
      fromISO: toIsoNoMs(from),
      toISO: toIsoNoMs(to),
    };
  }, [hoursBack]);

  useEffect(() => {
    if (!vehicleId) {
      return;
    }

    let alive = true;

    const load = async () => {
      try {
        if (alive) {
          setStatus('loading');
          setError(null);
        }

        const payload = await getVehicleHistory(vehicleId, fromISO, toISO);

        if (alive) {
          setData(payload);
          setStatus('success');
        }
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : 'Error cargando historial');
          setStatus('error');
        }
      }
    };

    void load();

    return () => {
      alive = false;
    };
  }, [fromISO, toISO, vehicleId]);

  if (!vehicleId) {
    return { status: 'idle', data: null, error: null, fromISO, toISO };
  }

  return { status, data, error, fromISO, toISO };
}
