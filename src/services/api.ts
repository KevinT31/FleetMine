import { getAccessToken, getCurrentUser } from '../auth/authService';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: RequestMethod;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface Vehicle {
  vehicleId: string;
  siteId?: string;
  ts?: string;
  lat?: number;
  lon?: number;
  speedKmh?: number;
  [k: string]: unknown;
}

export interface Alert {
  alertId: string;
  ts: string;
  vehicleId: string;
  siteId?: string;
  severity?: string;
  type?: string;
  message?: string;
  ack?: boolean;
  sk?: string;
  [k: string]: unknown;
}

export interface VehicleHistoryItem {
  vehicleId: string;
  siteId?: string;
  ts: string;
  speedKmh?: number;
  lat?: number;
  lon?: number;
  tempC?: number | null;
}

export interface VehicleHistoryResponse {
  vehicleId: string;
  count: number;
  from: string;
  to: string;
  items: VehicleHistoryItem[];
}

export interface IncidentItem {
  incidentId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  siteId: string;
  vehicleId: string;
  severity: string;
  type: string;
  title: string;
  description?: string;
  linkedAlertIds?: string[];
  assignedTo?: string;
  lastComment?: string;
  [k: string]: unknown;
}

export interface CreateIncidentPayload {
  siteId: string;
  vehicleId: string;
  severity: string;
  type: string;
  title: string;
  description?: string;
  linkedAlertIds?: string[];
  assignedTo?: string;
}

export interface UpdateIncidentPatch {
  status?: string;
  assignedTo?: string;
  comment?: string;
  closedAt?: string;
}

export interface WorkOrderItem {
  workOrderId?: string;
  id?: string;
  vehicleId?: string;
  status?: string;
  state?: string;
  priority?: string;
  type?: string;
  source?: string;
  origin?: string;
  title?: string;
  description?: string;
  createdAt?: string;
  startedAt?: string;
  closedAt?: string;
  dueAt?: string;
  assignedTech?: string;
  component?: string;
  notes?: string;
  [k: string]: unknown;
}

export interface CreateWorkOrderPayload {
  vehicleId: string;
  title: string;
  description?: string;
  priority?: string;
  type?: string;
  source?: string;
}

export interface UpdateWorkOrderPayload {
  status?: string;
  state?: string;
  startedAt?: string;
  closedAt?: string;
  comment?: string;
  assignedTo?: string;
}

export interface NotifyCriticalAlertPayload {
  roles?: string[];
  channels?: string[];
  reason?: string;
}

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  'https://7654oihej4.execute-api.eu-central-1.amazonaws.com'
).replace(/\/+$/, '');

function parseJsonSafe(raw: string): unknown {
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

async function parseResponse<T>(response: Response, method: RequestMethod, path: string): Promise<T> {
  const text = await response.text();
  const data = parseJsonSafe(text);

  if (!response.ok) {
    const parsed = data as { error?: string; message?: string } | string | null;
    const details =
      typeof parsed === 'string'
        ? parsed
        : parsed?.error || parsed?.message || 'No error details';
    if (response.status === 401 || response.status === 403) {
      throw new Error('Sesion expirada, inicia sesion');
    }
    throw new Error(`API ${method} ${path} failed (${response.status}): ${details}`);
  }

  return data as T;
}

async function fetchWithAuth<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers } = options;
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return parseResponse<T>(response, method, path);
}

export async function getLatestVehicles(): Promise<Vehicle[]> {
  const payload = await fetchWithAuth<unknown>('/vehicles/latest');
  if (Array.isArray(payload)) {
    return payload as Vehicle[];
  }

  if (payload && typeof payload === 'object' && typeof (payload as { vehicleId?: unknown }).vehicleId === 'string') {
    return [payload as Vehicle];
  }

  const objectPayload = payload as { data?: unknown };
  if (objectPayload && Array.isArray(objectPayload.data)) {
    return objectPayload.data as Vehicle[];
  }

  throw new Error('Unexpected response format for GET /vehicles/latest');
}

export async function getRecentAlerts(
  vehicleId?: string,
  limit = 50
): Promise<{ data: Alert[]; count: number }> {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (vehicleId) {
    params.set('vehicleId', vehicleId);
  }

  const path = `/alerts/recent?${params.toString()}`;
  const payload = await fetchWithAuth<unknown>(path);

  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    const shaped = payload as { data: Alert[]; count?: number };
    return { data: shaped.data, count: typeof shaped.count === 'number' ? shaped.count : shaped.data.length };
  }

  if (Array.isArray(payload)) {
    const data = payload as Alert[];
    return { data, count: data.length };
  }

  throw new Error('Unexpected response format for GET /alerts/recent');
}

export async function ackAlert(alertId: string): Promise<unknown> {
  const authUser = getCurrentUser();
  const ackBy = authUser?.email || authUser?.preferredUsername || authUser?.username || 'unknown';

  return fetchWithAuth(`/alerts/${encodeURIComponent(alertId)}/ack`, {
    method: 'POST',
    // TODO: remove ackBy from body once backend derives identity from JWT claims.
    body: { ackBy },
  });
}

export async function notifyCriticalAlert(
  alertId: string,
  payload: NotifyCriticalAlertPayload
): Promise<unknown> {
  return fetchWithAuth(`/alerts/${encodeURIComponent(alertId)}/notify-critical`, {
    method: 'POST',
    body: payload,
  });
}

export async function getVehicleHistory(
  vehicleId: string,
  fromISO: string,
  toISO: string
): Promise<VehicleHistoryResponse> {
  const path =
    `/vehicles/${encodeURIComponent(vehicleId)}/history` +
    `?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`;

  const payload = await fetchWithAuth<unknown>(path);
  if (!payload || typeof payload !== 'object') {
    throw new Error('Unexpected response format for GET /vehicles/{vehicleId}/history');
  }

  const parsed = payload as Partial<VehicleHistoryResponse>;
  if (!Array.isArray(parsed.items)) {
    throw new Error('Invalid history payload: items is missing or not an array');
  }

  return {
    vehicleId: typeof parsed.vehicleId === 'string' ? parsed.vehicleId : vehicleId,
    count: typeof parsed.count === 'number' ? parsed.count : parsed.items.length,
    from: typeof parsed.from === 'string' ? parsed.from : fromISO,
    to: typeof parsed.to === 'string' ? parsed.to : toISO,
    items: parsed.items as VehicleHistoryItem[],
  };
}

export async function createIncident(payload: CreateIncidentPayload): Promise<IncidentItem> {
  const response = await fetchWithAuth<unknown>('/incidents', {
    method: 'POST',
    body: payload,
  });

  if (response && typeof response === 'object' && 'incidentId' in response) {
    return response as IncidentItem;
  }

  const shaped = response as { data?: unknown; item?: unknown } | null;
  if (shaped && typeof shaped.data === 'object' && shaped.data !== null && 'incidentId' in shaped.data) {
    return shaped.data as IncidentItem;
  }
  if (shaped && typeof shaped.item === 'object' && shaped.item !== null && 'incidentId' in shaped.item) {
    return shaped.item as IncidentItem;
  }

  throw new Error('Unexpected response format for POST /incidents');
}

export async function getOpenIncidents(params?: { limit?: number }): Promise<IncidentItem[]> {
  const limitPart = params?.limit ? `?limit=${encodeURIComponent(String(params.limit))}` : '';
  const response = await fetchWithAuth<unknown>(`/incidents/open${limitPart}`);

  if (Array.isArray(response)) {
    return response as IncidentItem[];
  }

  if (response && typeof response === 'object') {
    const shaped = response as { data?: unknown; items?: unknown };
    if (Array.isArray(shaped.data)) {
      return shaped.data as IncidentItem[];
    }
    if (Array.isArray(shaped.items)) {
      return shaped.items as IncidentItem[];
    }
  }

  throw new Error('Unexpected response format for GET /incidents/open');
}

export async function updateIncident(
  incidentId: string,
  patch: UpdateIncidentPatch
): Promise<IncidentItem> {
  const response = await fetchWithAuth<unknown>(`/incidents/${encodeURIComponent(incidentId)}`, {
    method: 'PATCH',
    body: patch,
  });

  if (response && typeof response === 'object' && 'incidentId' in response) {
    return response as IncidentItem;
  }

  const shaped = response as { data?: unknown; item?: unknown } | null;
  if (shaped && typeof shaped.data === 'object' && shaped.data !== null && 'incidentId' in shaped.data) {
    return shaped.data as IncidentItem;
  }
  if (shaped && typeof shaped.item === 'object' && shaped.item !== null && 'incidentId' in shaped.item) {
    return shaped.item as IncidentItem;
  }

  throw new Error('Unexpected response format for PATCH /incidents/{incidentId}');
}

export async function getOpenWorkOrders(): Promise<WorkOrderItem[]> {
  const response = await fetchWithAuth<unknown>('/work-orders/open');

  if (Array.isArray(response)) {
    return response as WorkOrderItem[];
  }

  if (response && typeof response === 'object') {
    const shaped = response as { data?: unknown; items?: unknown };
    if (Array.isArray(shaped.data)) {
      return shaped.data as WorkOrderItem[];
    }
    if (Array.isArray(shaped.items)) {
      return shaped.items as WorkOrderItem[];
    }
  }

  throw new Error('Unexpected response format for GET /work-orders/open');
}

export async function createWorkOrder(payload: CreateWorkOrderPayload): Promise<WorkOrderItem> {
  const response = await fetchWithAuth<unknown>('/work-orders', {
    method: 'POST',
    body: payload,
  });

  if (response && typeof response === 'object' && ('workOrderId' in response || 'id' in response)) {
    return response as WorkOrderItem;
  }

  const shaped = response as { data?: unknown; item?: unknown } | null;
  if (shaped && typeof shaped.data === 'object' && shaped.data !== null) {
    return shaped.data as WorkOrderItem;
  }
  if (shaped && typeof shaped.item === 'object' && shaped.item !== null) {
    return shaped.item as WorkOrderItem;
  }

  throw new Error('Unexpected response format for POST /work-orders');
}

export async function updateWorkOrder(
  workOrderId: string,
  patch: UpdateWorkOrderPayload
): Promise<WorkOrderItem> {
  const response = await fetchWithAuth<unknown>(`/work-orders/${encodeURIComponent(workOrderId)}`, {
    method: 'PATCH',
    body: patch,
  });

  if (response && typeof response === 'object' && ('workOrderId' in response || 'id' in response)) {
    return response as WorkOrderItem;
  }

  const shaped = response as { data?: unknown; item?: unknown } | null;
  if (shaped && typeof shaped.data === 'object' && shaped.data !== null) {
    return shaped.data as WorkOrderItem;
  }
  if (shaped && typeof shaped.item === 'object' && shaped.item !== null) {
    return shaped.item as WorkOrderItem;
  }

  throw new Error('Unexpected response format for PATCH /work-orders/{workOrderId}');
}

export const api = {
  getLatestVehicles,
  getRecentAlerts,
  ackAlert,
  notifyCriticalAlert,
  getVehicleHistory,
  createIncident,
  getOpenIncidents,
  updateIncident,
  getOpenWorkOrders,
  createWorkOrder,
  updateWorkOrder,
};
