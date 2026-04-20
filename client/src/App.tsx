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
import Personnel from './pages/Personnel';
import SpareParts from './pages/SpareParts';
import KPI from './pages/KPI';
import EmsSimulator from './pages/EmsSimulator';
import Reports from './pages/Reports';
import StationTopology from './pages/StationTopology';
import StationBuilder from './pages/StationBuilder';
import HealthDashboard from './pages/HealthDashboard';
import AICopilot from './pages/AICopilot';
import Login from './pages/Login';
import PartnerLogin from './pages/PartnerLogin';
import PartnerDashboard from './pages/PartnerDashboard';
import PartnerTransactions from './pages/PartnerTransactions';
import PartnerMall from './pages/PartnerMall';
import PartnerAdmin from './pages/PartnerAdmin';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
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
                <Route path="/partner-login" element={<PartnerLogin />} />
                <Route path="/partner-dashboard" element={<PartnerDashboard />} />
                <Route path="/partner-transactions" element={<PartnerTransactions />} />
                <Route path="/partner-mall" element={<PartnerMall />} />
                <Route path="/partner-admin" element={<PartnerAdmin />} />
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
                  <Route path="personnel" element={<Personnel />} />
                  <Route path="inspection" element={<Inspection />} />
                  <Route path="spare-parts" element={<SpareParts />} />
                  <Route path="kpi" element={<KPI />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="stations/new/builder" element={<StationBuilder />} />
                  <Route path="stations/:id/topology" element={<StationTopology />} />
                  <Route path="ems-simulator" element={<EmsSimulator />} />
                  <Route path="health" element={<HealthDashboard />} />
                  <Route path="ai" element={<AICopilot />} />
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
