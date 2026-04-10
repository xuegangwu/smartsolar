import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Stations from './pages/Stations';
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

const theme = {
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 8,
  },
};

export default function App() {
  return (
    <ConfigProvider theme={theme} locale={zhCN}>
      <AntApp>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="stations" element={<Stations />} />
              <Route path="equipment" element={<Equipment />} />
              <Route path="work-orders" element={<WorkOrders />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="inspection" element={<Inspection />} />
              <Route path="spare-parts" element={<SpareParts />} />
              <Route path="kpi" element={<KPI />} />
              <Route path="ems-simulator" element={<EmsSimulator />} />
              <Route path="reports" element={<Reports />} />
              <Route path="stations/:id/topology" element={<StationTopology />} />
              <Route path="stations/new/builder" element={<StationBuilder />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}
