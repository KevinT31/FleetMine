import { useCallback, useEffect, useState } from 'react';
import {
  createWorkOrder,
  getOpenWorkOrders,
  updateWorkOrder,
  type CreateWorkOrderPayload,
  type UpdateWorkOrderPayload,
  type WorkOrderItem,
} from '../services/api';

export type WorkOrderStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | string;

export interface MaintenanceWorkOrder {
  workOrderId: string;
  vehicleId: string;
  status: WorkOrderStatus;
  priority: string;
  type: string;
  source: string;
  title: string;
  description: string;
  createdAt: string;
  startedAt?: string;
  closedAt?: string;
}

interface UseMaintenanceResult {
  workOrders: MaintenanceWorkOrder[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (payload: CreateWorkOrderPayload) => Promise<void>;
  setStatus: (
    workOrderId: string,
    status: 'IN_PROGRESS' | 'CLOSED',
    extra?: Omit<UpdateWorkOrderPayload, 'status' | 'state'>
  ) => Promise<void>;
}

function normalizeStatus(raw: unknown): WorkOrderStatus {
  if (typeof raw !== 'string') return 'OPEN';
  const value = raw.trim().toUpperCase();
  if (value === 'OPEN' || value === 'CREADA' || value === 'CREATED') return 'OPEN';
  if (value === 'IN_PROGRESS' || value === 'EN_PROGRESO' || value === 'EN PROGRESO') return 'IN_PROGRESS';
  if (value === 'CLOSED' || value === 'COMPLETADA' || value === 'COMPLETED') return 'CLOSED';
  return value;
}

function normalizeWorkOrder(item: WorkOrderItem, index: number): MaintenanceWorkOrder {
  const workOrderId =
    typeof item.workOrderId === 'string'
      ? item.workOrderId
      : typeof item.id === 'string'
        ? item.id
        : `WO-${index + 1}`;

  return {
    workOrderId,
    vehicleId: typeof item.vehicleId === 'string' ? item.vehicleId : 'N/A',
    status: normalizeStatus(item.status ?? item.state),
    priority: typeof item.priority === 'string' ? item.priority.toUpperCase() : 'MEDIUM',
    type: typeof item.type === 'string' ? item.type.toUpperCase() : 'CORRECTIVE',
    source:
      typeof item.source === 'string'
        ? item.source.toUpperCase()
        : typeof item.origin === 'string'
          ? item.origin.toUpperCase()
          : 'MANUAL',
    title: typeof item.title === 'string' ? item.title : 'Orden de trabajo',
    description:
      typeof item.description === 'string'
        ? item.description
        : typeof item.notes === 'string'
          ? item.notes
          : '',
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
    startedAt: typeof item.startedAt === 'string' ? item.startedAt : undefined,
    closedAt: typeof item.closedAt === 'string' ? item.closedAt : undefined,
  };
}

export function useMaintenance(): UseMaintenanceResult {
  const [workOrders, setWorkOrders] = useState<MaintenanceWorkOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getOpenWorkOrders();
      setWorkOrders(response.map((item, index) => normalizeWorkOrder(item, index)));
    } catch (err) {
      setWorkOrders([]);
      setError(err instanceof Error ? err.message : 'Error cargando ordenes de trabajo');
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(
    async (payload: CreateWorkOrderPayload) => {
      setError(null);
      try {
        await createWorkOrder(payload);
        await refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo crear la orden de trabajo';
        setError(message);
        throw new Error(message);
      }
    },
    [refresh]
  );

  const setStatus = useCallback(
    async (
      workOrderId: string,
      status: 'IN_PROGRESS' | 'CLOSED',
      extra?: Omit<UpdateWorkOrderPayload, 'status' | 'state'>
    ) => {
      setError(null);
      try {
        await updateWorkOrder(workOrderId, { status, ...(extra ?? {}) });
        await refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo actualizar la orden de trabajo';
        setError(message);
        throw new Error(message);
      }
    },
    [refresh]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    workOrders,
    loading,
    error,
    refresh,
    create,
    setStatus,
  };
}
