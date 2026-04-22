import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// Attach JWT token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('smartsolar_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
let isRedirecting = false;
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && !isRedirecting) {
      const currentPath = window.location.pathname;
      // Don't redirect if already on login page or already logging in
      if (currentPath.includes('/login') || currentPath === '/') {
        return Promise.reject(err);
      }
      isRedirecting = true;
      console.error('[API 401] Redirecting to login. Path:', err.config?.url);
      localStorage.removeItem('smartsolar_token');
      localStorage.removeItem('smartsolar_user');
      window.location.href = '/login';
      // Reset flag after navigation
      setTimeout(() => { isRedirecting = false; }, 1000);
    }
    return Promise.reject(err);
  }
);

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
  updateStatus: (id: string, status: string, rating?: number) =>
    api.patch(`/work-orders/${id}/status`, rating !== undefined ? { status, rating } : { status }).then(r => r.data),
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

export const sparePartApi = {
  getAll: (params?: any) => api.get<any, any>('/spare-parts', { params }).then(r => r.data),
  create: (data: any) => api.post('/spare-parts', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/spare-parts/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/spare-parts/${id}`).then(r => r.data),
};

export const personnelApi = {
  getAll: (params?: any) => api.get<any, any>('/personnel', { params }).then(r => r.data),
  getTechnicians: (params?: any) => api.get<any, any>('/personnel/technicians', { params }).then(r => r.data),
  getById: (id: string) => api.get<any, any>(`/personnel/${id}`).then(r => r.data),
  create: (data: any) => api.post('/personnel', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/personnel/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/personnel/${id}`).then(r => r.data),
  updateWorkStatus: (id: string, workStatus: string, currentTaskId?: string) =>
    api.put(`/personnel/${id}/work-status`, { workStatus, currentTaskId }).then(r => r.data),
};

export const templateApi = {
  getAll: (params?: any) => api.get<any, any>('/inspection/templates', { params }).then(r => r.data),
  getById: (id: string) => api.get<any, any>(`/inspection/templates/${id}`).then(r => r.data),
  create: (data: any) => api.post('/inspection/templates', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/inspection/templates/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/inspection/templates/${id}`).then(r => r.data),
};

// ─── Health Score ─────────────────────────────────────────────────────────────
export const healthApi = {
  getAll: (params?: any) => api.get<any, any>('/health-scores', { params }).then(r => r.data),
  getByEquipment: (equipmentId: string) =>
    api.get<any, any>(`/health-scores/${equipmentId}`).then(r => r.data),
  getHistory: (equipmentId: string, days = 30) =>
    api.get<any, any>(`/health-scores/${equipmentId}/history`, { params: { days } }).then(r => r.data),
  calculateAll: () => api.post<any, any>('/health-scores/calculate').then(r => r.data),
  getTelemetry: (equipmentId: string, hours = 24) =>
    api.get<any, any>(`/equipment/${equipmentId}/telemetry`, { params: { hours } }).then(r => r.data),
};

// ─── Predictive Alerts ─────────────────────────────────────────────────────────
export const alertPredictiveApi = {
  getAll: (params?: any) => api.get<any, any>('/predictive-alerts', { params }).then(r => r.data),
  updateStatus: (id: string, status: string) =>
    api.patch<any, any>(`/predictive-alerts/${id}`, { status }).then(r => r.data),
};

// ─── Partner (渠道商) ──────────────────────────────────────────────────────────
export const partnerApi = {
  getAll: (params?: any) => api.get<any, any>('/partners', { params }).then(r => r.data),
  getById: (id: string) => api.get<any, any>(`/partners/${id}`).then(r => r.data),
  create: (data: any) => api.post('/partners', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/partners/${id}`, data).then(r => r.data),
  apply: (data: any) => api.post('/partners/apply', data).then(r => r.data),
  getApplications: (status?: string) => api.get<any, any>('/partners/applications', { params: { status } || {} }).then(r => r.data),
  approveApplication: (id: string, data: any) => api.patch<any, any>(`/partners/applications/${id}/approve`, data).then(r => r.data),
  rejectApplication: (id: string, reason: string) => api.patch<any, any>(`/partners/applications/${id}/reject`, { reason }).then(r => r.data),
  getRedemptions: () =>
    fetch('/api/partners/redemptions', { headers: { Authorization: `Bearer ${localStorage.getItem('partner_token') || ''}` } }).then(r => r.json()),
};
