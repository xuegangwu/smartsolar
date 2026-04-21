import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { StationProvider } from './contexts/StationContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

// 路由级懒加载
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Stations = lazy(() => import('./pages/Stations'));
const StationMap = lazy(() => import('./pages/StationMap'));
const Equipment = lazy(() => import('./pages/Equipment'));
const WorkOrders = lazy(() => import('./pages/WorkOrders'));
const Alerts = lazy(() => import('./pages/Alerts'));
const Inspection = lazy(() => import('./pages/Inspection'));
const Personnel = lazy(() => import('./pages/Personnel'));
const SpareParts = lazy(() => import('./pages/SpareParts'));
const KPI = lazy(() => import('./pages/KPI'));
const EmsSimulator = lazy(() => import('./pages/EmsSimulator'));
const Reports = lazy(() => import('./pages/Reports'));
const StationTopology = lazy(() => import('./pages/StationTopology'));
const StationBuilder = lazy(() => import('./pages/StationBuilder'));
const HealthDashboard = lazy(() => import('./pages/HealthDashboard'));
const AICopilot = lazy(() => import('./pages/AICopilot'));
const PartnerLogin = lazy(() => import('./pages/PartnerLogin'));
const PartnerDashboard = lazy(() => import('./pages/PartnerDashboard'));
const PartnerTransactions = lazy(() => import('./pages/PartnerTransactions'));
const PartnerMall = lazy(() => import('./pages/PartnerMall'));
const PartnerAdmin = lazy(() => import('./pages/PartnerAdmin'));
const Installers = lazy(() => import('./pages/Installers'));
const InstallerStats = lazy(() => import('./pages/InstallerStats'));
const InstallerPortal = lazy(() => import('./pages/InstallerPortal'));
const Projects = lazy(() => import('./pages/Projects'));
const Customers = lazy(() => import('./pages/Customers'));

const PageLoader = ({ children }: { children: ReactNode }) => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <Spin indicator={<LoadingOutlined spin />} size="large" />
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
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
              <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* ── 公开入口（无需认证）── */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
                <Route path="/partner-login" element={<PartnerLogin />} />
                <Route path="/installer-portal" element={<InstallerPortal />} />

                {/* ── 渠道商 Portal ── */}
                <Route path="/partner-dashboard" element={<PartnerDashboard />} />
                <Route path="/partner-transactions" element={<PartnerTransactions />} />
                <Route path="/partner-mall" element={<PartnerMall />} />

                {/* ── 内部系统（需认证）── */}
                <Route element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/stations" element={<Stations />} />
                  <Route path="/map" element={<StationMap />} />
                  <Route path="/equipment" element={<Equipment />} />
                  <Route path="/work-orders" element={<WorkOrders />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/personnel" element={<Personnel />} />
                  <Route path="/inspection" element={<Inspection />} />
                  <Route path="/spare-parts" element={<SpareParts />} />
                  <Route path="/kpi" element={<KPI />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/stations/new/builder" element={<StationBuilder />} />
                  <Route path="/stations/:id/topology" element={<StationTopology />} />
                  <Route path="/ems-simulator" element={<EmsSimulator />} />
                  <Route path="/health" element={<HealthDashboard />} />
                  <Route path="/ai" element={<AICopilot />} />
                  <Route path="/partner-admin" element={<PartnerAdmin />} />
                  <Route path="/installers" element={<Installers />} />
                  <Route path="/installer-stats" element={<InstallerStats />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/customers" element={<Customers />} />
                  {/* 首页重定向到 dashboard */}
                  <Route index element={<Navigate to="/dashboard" replace />} />
                </Route>
              </Routes>
              </Suspense>
            </BrowserRouter>
            </NotificationProvider>
          </StationProvider>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
}
