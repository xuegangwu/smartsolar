import { useState, useEffect } from 'react';
import { Layout as AntLayout, Menu, Avatar, Dropdown, Badge } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  DashboardOutlined, HomeOutlined, ToolOutlined, FileTextOutlined,
  BellOutlined, CalendarOutlined, UserOutlined, LogoutOutlined,
  InboxOutlined, RiseOutlined, ApiOutlined, DownloadOutlined, PlusSquareOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';

const { Sider, Header, Content } = AntLayout;

const NAV_ITEMS = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '首页' },
  { key: '/stations', icon: <HomeOutlined />, label: '电站' },
  { key: '/map', icon: <EnvironmentOutlined />, label: '地图' },
  { key: '/equipment', icon: <ToolOutlined />, label: '设备' },
  { key: '/work-orders', icon: <FileTextOutlined />, label: '工单' },
  { key: '/alerts', icon: <BellOutlined />, label: '告警' },
  { key: '/inspection', icon: <CalendarOutlined />, label: '巡检' },
  { key: '/spare-parts', icon: <InboxOutlined />, label: '备件' },
  { key: '/kpi', icon: <RiseOutlined />, label: 'KPI' },
  { key: '/reports', icon: <DownloadOutlined />, label: '导出' },
  { key: '/stations/new/builder', icon: <PlusSquareOutlined />, label: '建站' },
  { key: '/ems-simulator', icon: <ApiOutlined />, label: 'EMS模拟' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [sysStatus, setSysStatus] = useState({ mongo: 'checking', alerts: 0 });

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    async function loadStatus() {
      try {
        const r = await fetch('/api/health');
        const d = await r.json();
        setSysStatus(s => ({ ...s, mongo: d.mongo === 'connected' ? 'ok' : 'error' }));
      } catch { setSysStatus(s => ({ ...s, mongo: 'error' })); }
      try {
        const r = await fetch('/api/alerts/stats');
        const d = await r.json();
        if (d.success) setSysStatus(s => ({ ...s, alerts: d.data.unacknowledged || 0 }));
      } catch {}
    }
    loadStatus();
    const t = setInterval(loadStatus, 30000);
    return () => clearInterval(t);
  }, []);

  const userMenu = {
    items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录' }],
  };

  const mongoColor = sysStatus.mongo === 'ok' ? '#16a34a' : sysStatus.mongo === 'error' ? '#dc2626' : '#d97706';

  // ── Desktop ─────────────────────────────────────────────────────────────
  if (!mobile) {
    return (
      <AntLayout style={{ minHeight: '100vh' }}>
        <Sider
          collapsible collapsed={collapsed} onCollapse={setCollapsed}
          style={{
            background: '#ffffff',
            borderRight: '1px solid #e8eaed',
            position: 'sticky', top: 0, height: '100vh', overflow: 'auto',
            boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
            zIndex: 100,
          }}
          width={200}
          collapsedWidth={64}
        >
          {/* Logo */}
          <div style={{
            height: 60, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 20px',
            borderBottom: '1px solid #e8eaed', gap: 10, flexShrink: 0,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #e6342a, #ff6b6b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, flexShrink: 0, boxShadow: '0 2px 8px rgba(230,52,42,0.3)',
            }}>
              ☀️
            </div>
            {!collapsed && (
              <div>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }}>
                  Smart<span style={{ color: '#e6342a' }}>Solar</span>
                </span>
              </div>
            )}
          </div>

          {/* Nav */}
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={NAV_ITEMS}
            onClick={({ key }) => navigate(key)}
            style={{ background: 'transparent', border: 'none', marginTop: 8, padding: '0 8px' }}
          />

          {/* Status */}
          {!collapsed && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '12px 16px', borderTop: '1px solid #e8eaed',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: mongoColor, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#8896a6', fontFamily: 'Inter, sans-serif' }}>
                  {sysStatus.mongo === 'ok' ? '系统正常' : sysStatus.mongo === 'error' ? '系统异常' : '连接中...'}
                </span>
              </div>
              {sysStatus.alerts > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge count={sysStatus.alerts} size="small" style={{ background: '#e6342a' }} />
                  <span style={{ fontSize: 11, color: '#8896a6', fontFamily: 'Inter, sans-serif' }}>未确认告警</span>
                </div>
              )}
            </div>
          )}
        </Sider>

        <AntLayout>
          <Header style={{
            background: '#ffffff', borderBottom: '1px solid #e8eaed',
            padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            position: 'sticky', top: 0, zIndex: 100, height: 56,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ color: '#8896a6', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
                {new Date().toLocaleString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
                <Avatar style={{ cursor: 'pointer', background: '#e6342a', color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13, flexShrink: 0 }} size={34}>
                  <UserOutlined />
                </Avatar>
              </Dropdown>
            </div>
          </Header>

          <Content style={{ padding: 24, background: '#f5f6f8', minHeight: 'calc(100vh - 56px)' }}>
            <Outlet />
          </Content>
        </AntLayout>
      </AntLayout>
    );
  }

  // ── Mobile ───────────────────────────────────────────────────────────────
  return (
    <AntLayout style={{ minHeight: '100vh', paddingBottom: 72, background: '#f5f6f8' }}>
      <Header style={{
        background: '#ffffff', borderBottom: '1px solid #e8eaed',
        padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100, height: 52,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #e6342a, #ff6b6b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
            ☀️
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', fontFamily: 'Inter, sans-serif' }}>
            Smart<span style={{ color: '#e6342a' }}>Solar</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Badge count={sysStatus.alerts} size="small" style={{ background: '#e6342a' }} />
          <Avatar style={{ cursor: 'pointer', background: '#e6342a', color: '#fff', fontSize: 12 }} size={30}
            icon={<UserOutlined />}
            onClick={() => { if (window.confirm('确定退出？')) navigate('/login'); }} />
        </div>
      </Header>

      <Content style={{ padding: '14px', paddingBottom: 80 }}>
        <Outlet />
      </Content>

      {/* Bottom tab bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#ffffff',
        borderTop: '1px solid #e8eaed',
        display: 'flex', zIndex: 200,
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
      }}>
        {NAV_ITEMS.slice(0, 5).map(item => {
          const active = location.pathname.startsWith(item.key);
          return (
            <div key={item.key} onClick={() => navigate(item.key)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '8px 0', cursor: 'pointer',
              color: active ? '#e6342a' : '#8896a6',
              fontSize: 10, gap: 2, transition: 'color 0.15s',
            }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: active ? 600 : 400 }}>{item.label}</span>
            </div>
          );
        })}
      </div>
    </AntLayout>
  );
}
