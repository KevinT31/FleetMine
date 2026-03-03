export type VehicleStatus = 'normal' | 'warning' | 'critical' | 'offline';

export type VehicleTypeKey = 'truck' | 'loader' | 'tanker' | 'grader';

export type AlertType =
  | 'temp'
  | 'pressure'
  | 'vibration'
  | 'geofence'
  | 'offline'
  | 'gps';

export type AlertState = 'abierta' | 'reconocida' | 'cerrada';

export type Severity = 'baja' | 'media' | 'alta' | 'critica';

export type IncidentState = 'nuevo' | 'en_atencion' | 'resuelto';

export type WorkOrderState =
  | 'creada'
  | 'asignada'
  | 'en_progreso'
  | 'completada'
  | 'cancelada';

export type WorkOrderType = 'correctiva' | 'preventiva' | 'predictiva';

export interface Vehicle {
  id: string;
  plate: string;
  type: VehicleTypeKey;
  typeLabel: string;
  gatewayId: string;
  status: VehicleStatus;
  speedKmh: number;
  tempC: number;
  pressureBar: number;
  vibrationMm_sRms: number;
  lat: number;
  lon: number;
  zone: string;
  headingDeg: number;
  lastSeenTs: string;
  gatewayOnline: boolean;
  healthIndex: number;
  failureProb72h: number;
}

export interface TelemetryPoint {
  ts: string;
  tempC: number;
  pressureBar: number;
  vibrationMm_sRms: number;
  speedKmh: number;
}

export interface Alert {
  id: string;
  ts: string;
  vehicleId: string;
  type: AlertType;
  severity: Severity;
  state: AlertState;
  value: number;
  threshold: number;
  message: string;
  zone: string;
}

export interface Incident {
  id: string;
  ts: string;
  title: string;
  vehicleId: string;
  severity: Severity;
  assignedTo: string;
  status: IncidentState;
  description: string;
  evidenceCount: number;
  relatedAlertIds: string[];
}

export interface WorkOrder {
  id: string;
  vehicleId: string;
  type: WorkOrderType;
  status: WorkOrderState;
  assignedTech: string;
  createdAt: string;
  dueAt: string;
  origin: 'manual' | 'alerta' | 'ia';
  component: string;
  notes: string;
}

export interface Geofence {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface KpiTrend {
  value: number;
  delta: number;
}
