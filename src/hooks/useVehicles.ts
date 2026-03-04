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

function pickNumber(source: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    if (isRecord(value) && typeof value.N === 'string' && value.N.trim().length > 0) {
      const parsed = Number(value.N);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return fallback;
}

function pickString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    if (isRecord(value) && typeof value.S === 'string' && value.S.trim().length > 0) {
      return value.S.trim();
    }
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collectCandidateRecords(raw: Record<string, unknown>): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [raw];
  const seen = new Set<Record<string, unknown>>([raw]);
  const nestedKeys = ['telemetry', 'latestTelemetry', 'lastTelemetry', 'metrics', 'payload', 'data', 'item', 'snapshot'];

  const addRecord = (candidate: unknown) => {
    if (!isRecord(candidate)) return;

    if (isRecord(candidate.M)) {
      addRecord(candidate.M);
    }

    if (!seen.has(candidate)) {
      seen.add(candidate);
      records.push(candidate);
    }
  };

  for (const key of nestedKeys) {
    addRecord(raw[key]);
  }
  for (const value of Object.values(raw)) {
    addRecord(value);
  }

  for (let index = 0; index < records.length; index += 1) {
    const current = records[index];
    for (const key of nestedKeys) {
      addRecord(current[key]);
    }
  }

  return records;
}

function pickNumberFromRecords(
  records: Record<string, unknown>[],
  keys: string[],
  fallback = 0
): number {
  for (const record of records) {
    const value = pickNumber(record, keys, Number.NaN);
    if (Number.isFinite(value)) {
      return value;
    }
  }
  return fallback;
}

function pickStringFromRecords(
  records: Record<string, unknown>[],
  keys: string[]
): string | undefined {
  for (const record of records) {
    const value = pickString(record, keys);
    if (value) {
      return value;
    }
  }
  return undefined;
}

function pickBooleanFromRecords(
  records: Record<string, unknown>[],
  keys: string[]
): boolean | undefined {
  for (const record of records) {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'boolean') {
        return value;
      }
      if (isRecord(value) && typeof value.BOOL === 'boolean') {
        return value.BOOL;
      }
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
        if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
      }
    }
  }
  return undefined;
}

function pickTimestampFromRecords(records: Record<string, unknown>[]): string | undefined {
  const stringTs = pickStringFromRecords(records, [
    'ts',
    'lastSeenTs',
    'timestamp',
    'eventTs',
    'updatedAt',
    'createdAt',
    'time',
    'datetime',
  ]);
  if (stringTs) return stringTs;

  const numericKeys = ['ts', 'timestamp', 'eventTs', 'tsMs', 'epochMs', 'time', 'createdAt'];
  for (const record of records) {
    for (const key of numericKeys) {
      const rawValue = record[key];
      const value =
        typeof rawValue === 'number'
          ? rawValue
          : isRecord(rawValue) && typeof rawValue.N === 'string'
            ? Number(rawValue.N)
            : Number.NaN;
      if (!Number.isFinite(value)) continue;
      const ms = value > 1_000_000_000_000 ? value : value > 1_000_000_000 ? value * 1000 : NaN;
      if (Number.isFinite(ms)) {
        return new Date(ms).toISOString();
      }
    }
  }

  return undefined;
}

function normalizeStatus(rawStatus: unknown): VehicleStatus {
  if (typeof rawStatus !== 'string') return 'normal';
  const value = rawStatus.trim().toLowerCase();
  if (value === 'normal' || value === 'ok') return 'normal';
  if (value === 'warning' || value === 'warn' || value === 'advertencia') return 'warning';
  if (value === 'critical' || value === 'critico' || value === 'crítico') return 'critical';
  if (value === 'offline' || value === 'desconectado' || value === 'down') return 'offline';
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
  const raw = apiVehicle as Record<string, unknown>;
  const records = collectCandidateRecords(raw);
  const vehicleId = pickStringFromRecords(records, ['vehicleId', 'id', 'unitId']) ?? `UNKNOWN-${index + 1}`;
  const type = inferTypeFromId(vehicleId);
  const status = normalizeStatus(
    pickStringFromRecords(records, ['status', 'state', 'vehicleStatus', 'healthState'])
  );
  const vibrationEngine = pickNumberFromRecords(records, ['vibrationEngineMmSRms', 'engineVibrationMmSRms'], Number.NaN);
  const vibrationChassis = pickNumberFromRecords(
    records,
    ['vibrationChassisMmSRms', 'chassisVibrationMmSRms'],
    Number.NaN
  );
  const vibrationMm_sRms =
    Number.isFinite(vibrationEngine) && Number.isFinite(vibrationChassis)
      ? Math.max(vibrationEngine, vibrationChassis)
      : pickNumberFromRecords(records, ['vibrationMm_sRms', 'vibrationRms', 'vibration', 'rmsVibrationMmS'], 0);
  const gatewayOnlineRaw = pickBooleanFromRecords(records, ['gatewayOnline', 'online', 'isOnline']);

  return {
    id: vehicleId,
    plate: pickStringFromRecords(records, ['plate']) ?? 'N/A',
    type,
    typeLabel: getTypeLabel(type),
    gatewayId: pickStringFromRecords(records, ['gatewayId', 'gateway', 'gatewayName']) ?? 'N/A',
    status,
    speedKmh: pickNumberFromRecords(records, ['speedKmh', 'speed', 'speed_kmh'], 0),
    tempC: pickNumberFromRecords(
      records,
      ['tempC', 'coolantTempC', 'engineOilTempC', 'hydraulicTempC', 'temperatureC'],
      0
    ),
    pressureBar: pickNumberFromRecords(
      records,
      ['pressureBar', 'hydraulicPressureBar', 'engineOilPressureBar', 'pressure'],
      0
    ),
    vibrationMm_sRms,
    lat: pickNumberFromRecords(records, ['lat', 'latitude'], 0),
    lon: pickNumberFromRecords(records, ['lon', 'longitude'], 0),
    zone: pickStringFromRecords(records, ['zone', 'siteId', 'site', 'mine']) ?? 'N/A',
    headingDeg: pickNumberFromRecords(records, ['headingDeg', 'heading'], 0),
    lastSeenTs: pickTimestampFromRecords(records) || new Date().toISOString(),
    gatewayOnline: typeof gatewayOnlineRaw === 'boolean' ? gatewayOnlineRaw : status !== 'offline',
    healthIndex: pickNumberFromRecords(records, ['healthIndex', 'health'], 0),
    failureProb72h: pickNumberFromRecords(records, ['failureProb72h', 'failureProbability72h'], 0),
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
    const intervalId = window.setInterval(() => {
      void refresh();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  return {
    vehicles,
    source,
    loading,
    error,
    refresh,
  };
}
