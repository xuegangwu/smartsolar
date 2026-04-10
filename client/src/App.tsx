import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { StationProvider } from './contexts/StationContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Stations from './pages/Stations';
import StationMap from './pages/StationMap';
import Equipment from './pages/Equipment';
import WorkOrders from './pages/WorkOrders';
import Alerts from './pages/Alerts';
import Inspection from './pages/Inspection';
import SpareParts from './pages/SpareParts';
import KPI from './pages/KPI';
import EmsSimulator from './pages/EmsSimulator';
import Reports from './pages/Reports';
import StationTopology from './pages/StationTopology';
import StationBuilder from './pages/StationBuilder';
import Login from './pages/Login';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ConfigProvider>
      <AntApp>
        <AuthProvider>
          <StationProvider>
            <NotificationProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="stations" element={<Stations />} />
                  <Route path="map" element={<StationMap />} />
                  <Route path="equipment" element={<Equipment />} />
                  <Route path="work-orders" element={<WorkOrders />} />
                  <Route path="alerts" element={<Alerts />} />
                  <Route path="inspection" element={<Inspection />} />
                  <Route path="spare-parts" element={<SpareParts />} />
                  <Route path="kpi" element={<KPI />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="stations/new/builder" element={<StationBuilder />} />
                  <Route path="stations/:id/topology" element={<StationTopology />} />
                  <Route path="ems-simulator" element={<EmsSimulator />} />
                </Route>
              </Routes>
            </BrowserRouter>
            </NotificationProvider>
          </StationProvider>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
}
