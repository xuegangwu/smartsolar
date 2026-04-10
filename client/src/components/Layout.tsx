import { useState, useEffect } from 'react';
import { Layout as AntLayout, Menu, Avatar, Dropdown, Badge } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  DashboardOutlined, HomeOutlined, ToolOutlined, FileTextOutlined,
  BellOutlined, CalendarOutlined, UserOutlined, LogoutOutlined, InboxOutlined, RiseOutlined,
} from '@ant-design/icons';

const { Sider, Header, Content } = AntLayout;

const NAV_ITEMS = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '首页' },
  { key: '/stations', icon: <HomeOutlined />, label: '电站' },
  { key: '/equipment', icon: <ToolOutlined />, label: '设备' },
  { key: '/work-orders', icon: <FileTextOutlined />, label: '工单' },
  { key: '/alerts', icon: <BellOutlined />, label: '告警' },
  { key: '/inspection', icon: <CalendarOutlined />, label: '巡检' },
  { key: '/spare-parts', icon: <InboxOutlined />, label: '备件' },
  { key: '/kpi', icon: <RiseOutlined />, label: 'KPI' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [sysStatus, setSysStatus] = useState({ mongo: 'checking', alerts: 0 });
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // System health + clock
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
    const t1 = setInterval(loadStatus, 30000);
    const t2 = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  const userMenu = {
    items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录' }],
  };

  const mongoColor = sysStatus.mongo === 'ok' ? '#00e676' : sysStatus.mongo === 'error' ? '#ff5252' : '#ffab40';
  const mongoLabel = sysStatus.mongo === 'ok' ? 'MongoDB ✓' : sysStatus.mongo === 'error' ? 'MongoDB ✗' : '...';

  // ── Desktop ────────────────────────────────────────────────────────────────
  if (!mobile) {
    return (
      <AntLayout style={{ minHeight: '100vh' }}>
        <Sider
          collapsible collapsed={collapsed} onCollapse={setCollapsed}
          style={{
            background: '#0f1623', borderRight: '1px solid #2a3a52',
            position: 'sticky', top: 0, height: '100vh', overflow: 'auto',
          }}
        >
          {/* Logo */}
          <div style={{
            height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderBottom: '1px solid #2a3a52', gap: 8, flexShrink: 0,
          }}>
            <span style={{ fontSize: 20 }}>☀️</span>
            {!collapsed && (
              <span style={{ fontSize: 15, fontWeight: 700, color: '#00e5c0', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em' }}>
                SMART<span style={{ color: '#c8d4e0' }}>SOLAR</span>
              </span>
            )}
          </div>

          {/* Nav */}
          <Menu mode="inline" selectedKeys={[location.pathname]} items={NAV_ITEMS}
            onClick={({ key }) => navigate(key)}
            style={{ background: 'transparent', border: 'none', marginTop: 4 }} />

          {/* Status bar */}
          {!collapsed && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '10px 16px', borderTop: '1px solid #2a3a52',
              display: 'flex', flexDirection: 'column', gap: 5,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: mongoColor, boxShadow: `0 0 6px ${mongoColor}` }} />
                <span style={{ fontSize: 10, color: '#5a6a7a', fontFamily: 'JetBrains Mono, monospace' }}>{mongoLabel}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Badge count={sysStatus.alerts} size="small" style={{ background: '#ff5252' }} />
                <span style={{ fontSize: 10, color: '#5a6a7a', fontFamily: 'JetBrains Mono, monospace' }}>未确认告警</span>
              </div>
              <div style={{ fontSize: 9, color: '#3a4a5a', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                {now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
          )}
        </Sider>

        <AntLayout>
          <Header style={{
            background: '#0f1623', borderBottom: '1px solid #2a3a52',
            padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            position: 'sticky', top: 0, zIndex: 100, height: 52,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ color: '#5a6a7a', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
                {now.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
              <Dropdown menu={userMenu} placement="bottomRight">
                <Avatar style={{ cursor: 'pointer', background: '#00e5c0', color: '#000', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                  <UserOutlined />
                </Avatar>
              </Dropdown>
            </div>
          </Header>

          <Content style={{ margin: 20, overflow: 'initial' }}>
            <Outlet />
          </Content>
        </AntLayout>
      </AntLayout>
    );
  }

  // ── Mobile ────────────────────────────────────────────────────────────────
  return (
    <AntLayout style={{ minHeight: '100vh', paddingBottom: 70, background: '#080c14' }}>
      <Header style={{
        background: '#0f1623', borderBottom: '1px solid #2a3a52',
        padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100, height: 52,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>☀️</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#00e5c0', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em' }}>SMARTSOLAR</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Badge count={sysStatus.alerts} size="small" style={{ background: '#ff5252' }} />
          <Avatar style={{ cursor: 'pointer', background: '#00e5c0', color: '#000' }}
            icon={<UserOutlined />}
            onClick={() => { if (window.confirm('确定退出？')) navigate('/login'); }} />
        </div>
      </Header>

      <Content style={{ padding: '12px', paddingBottom: 80 }}>
        <Outlet />
      </Content>

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#0f1623', borderTop: '1px solid #2a3a52',
        display: 'flex', zIndex: 200, paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {NAV_ITEMS.map(item => {
          const active = location.pathname.startsWith(item.key);
          return (
            <div key={item.key} onClick={() => navigate(item.key)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '8px 0', cursor: 'pointer',
              color: active ? '#00e5c0' : '#5a6a7a', fontSize: 10, gap: 2,
            }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>{item.label}</span>
            </div>
          );
        })}
      </div>
    </AntLayout>
  );
}
