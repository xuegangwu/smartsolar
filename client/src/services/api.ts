import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export default api;

// ─── Types ──────────────────────────────────────────────────────────────────────
export interface Station {
  _id: string;
  name: string;
  type: 'solar' | 'storage' | 'solar_storage';
  location: { address: string; lat: number; lng: number };
  capacity: number;
  installedCapacity: number;
  peakPower: number;
  owner: string;
  contact: string;
  status: 'online' | 'offline' | 'maintenance';
  gridConnectionDate: string;
  categories?: EquipmentCategory[];
}

export interface EquipmentCategory {
  _id: string;
  stationId: string;
  name: string;
  type: string;
}

export interface Equipment {
  _id: string;
  stationId: Station | string;
  categoryId: EquipmentCategory | string;
  name: string;
  type: string;
  brand: string;
  model: string;
  serialNumber: string;
  ratedPower: number;
  ratedVoltage: number;
  efficiency: number;
  installationDate: string;
  warrantyExpire: string;
  status: 'online' | 'offline' | 'maintenance';
}

export interface WorkOrder {
  _id: string;
  orderNo: string;
  stationId: Station | string;
  equipmentId: Equipment | string;
  title: string;
  description: string;
  type: 'fault' | 'maintenance' | 'inspection' | 'upgrade';
  priority: 'urgent' | 'important' | 'normal';
  status: 'created' | 'assigned' | 'accepted' | 'processing' | 'accepted_check' | 'closed';
  assigneeId: any;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface Alert {
  _id: string;
  stationId: Station | string;
  equipmentId: Equipment | string;
  level: 'critical' | 'major' | 'minor';
  code: string;
  message: string;
  acknowledged: boolean;
  createdAt: string;
}

// ─── API ────────────────────────────────────────────────────────────────────────
export const stationApi = {
  getAll: () => api.get<any, any>('/stations').then(r => r.data),
  getById: (id: string) => api.get<any, any>(`/stations/${id}`).then(r => r.data),
  create: (data: Partial<Station>) => api.post('/stations', data).then(r => r.data),
  update: (id: string, data: Partial<Station>) => api.put(`/stations/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/stations/${id}`).then(r => r.data),
  getTree: (stationId: string) => api.get<any, any>(`/stations/${stationId}/tree`).then(r => r.data),
};

export const equipmentApi = {
  getAll: (params?: any) => api.get<any, any>('/equipments', { params }).then(r => r.data),
  getById: (id: string) => api.get<any, any>(`/equipments/${id}`).then(r => r.data),
  create: (data: Partial<Equipment>) => api.post('/equipments', data).then(r => r.data),
  update: (id: string, data: Partial<Equipment>) => api.put(`/equipments/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/equipments/${id}`).then(r => r.data),
};

export const workOrderApi = {
  getAll: (params?: any) => api.get<any, any>('/work-orders', { params }).then(r => r.data),
  getById: (id: string) => api.get<any, any>(`/work-orders/${id}`).then(r => r.data),
  create: (data: Partial<WorkOrder>) => api.post('/work-orders', data).then(r => r.data),
  update: (id: string, data: Partial<WorkOrder>) => api.put(`/work-orders/${id}`, data).then(r => r.data),
  updateStatus: (id: string, status: string) => api.patch(`/work-orders/${id}/status`, { status }).then(r => r.data),
  delete: (id: string) => api.delete(`/work-orders/${id}`).then(r => r.data),
};

export const alertApi = {
  getAll: (params?: any) => api.get<any, any>('/alerts', { params }).then(r => r.data),
  getStats: (params?: any) => api.get<any, any>('/alerts/stats', { params }).then(r => r.data),
  acknowledge: (id: string, technicianId?: string) =>
    api.post(`/alerts/${id}/acknowledge`, { technicianId }).then(r => r.data),
  acknowledgeBatch: (ids: string[], technicianId?: string) =>
    api.post('/alerts/acknowledge-batch', { ids, technicianId }).then(r => r.data),
};
