import { useCallback, useEffect, useState } from 'react';
import { getLatestVehicles, type Vehicle as ApiVehicle } from '../services/api';
import type { Vehicle as UiVehicle, VehicleStatus, VehicleTypeKey } from '../types';

type DataSource = 'aws';

interface UseVehiclesResult {
  vehicles: UiVehicle[];
  source: DataSource;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeStatus(rawStatus: unknown): VehicleStatus {
  if (typeof rawStatus !== 'string') return 'normal';
  if (rawStatus === 'normal' || rawStatus === 'warning' || rawStatus === 'critical' || rawStatus === 'offline') {
    return rawStatus;
  }
  return 'normal';
}

function inferTypeFromId(vehicleId: string): VehicleTypeKey {
  const upper = vehicleId.toUpperCase();
  if (upper.startsWith('TRK') || upper.startsWith('TRUCK')) return 'truck';
  if (upper.startsWith('LDR') || upper.startsWith('LOADER')) return 'loader';
  if (upper.startsWith('TNK') || upper.startsWith('TANK')) return 'tanker';
  if (upper.startsWith('GRD') || upper.startsWith('GRADER')) return 'grader';
  return 'truck';
}

function getTypeLabel(type: VehicleTypeKey): string {
  if (type === 'truck') return 'Camion minero';
  if (type === 'loader') return 'Cargador frontal';
  if (type === 'tanker') return 'Cisterna';
  return 'Motoniveladora';
}

function mapApiVehicle(apiVehicle: ApiVehicle, index: number): UiVehicle {
  const vehicleId =
    typeof apiVehicle.vehicleId === 'string' && apiVehicle.vehicleId.trim().length > 0
      ? apiVehicle.vehicleId.trim()
      : `UNKNOWN-${index + 1}`;
  const type = inferTypeFromId(vehicleId);
  const status = normalizeStatus(apiVehicle.status);

  return {
    id: vehicleId,
    plate: typeof apiVehicle.plate === 'string' ? apiVehicle.plate : 'N/A',
    type,
    typeLabel: getTypeLabel(type),
    gatewayId: typeof apiVehicle.gatewayId === 'string' ? apiVehicle.gatewayId : 'N/A',
    status,
    speedKmh: toNumber(apiVehicle.speedKmh, 0),
    tempC: toNumber(apiVehicle.tempC, 0),
    pressureBar: toNumber(apiVehicle.pressureBar, 0),
    vibrationMm_sRms: toNumber(apiVehicle.vibrationMm_sRms, 0),
    lat: toNumber(apiVehicle.lat, 0),
    lon: toNumber(apiVehicle.lon, 0),
    zone: typeof apiVehicle.zone === 'string' ? apiVehicle.zone : typeof apiVehicle.siteId === 'string' ? apiVehicle.siteId : 'N/A',
    headingDeg: toNumber(apiVehicle.headingDeg, 0),
    lastSeenTs: typeof apiVehicle.ts === 'string' ? apiVehicle.ts : new Date().toISOString(),
    gatewayOnline: typeof apiVehicle.gatewayOnline === 'boolean' ? apiVehicle.gatewayOnline : status !== 'offline',
    healthIndex: toNumber(apiVehicle.healthIndex, 0),
    failureProb72h: toNumber(apiVehicle.failureProb72h, 0),
  };
}

export function useVehicles(): UseVehiclesResult {
  const [vehicles, setVehicles] = useState<UiVehicle[]>([]);
  const [source] = useState<DataSource>('aws');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const apiVehicles = await getLatestVehicles();
      setVehicles(apiVehicles.map((vehicle, index) => mapApiVehicle(vehicle, index)));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido al cargar vehiculos';
      setVehicles([]);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    vehicles,
    source,
    loading,
    error,
    refresh,
  };
}
