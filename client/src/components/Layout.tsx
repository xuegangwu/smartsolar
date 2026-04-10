import { useState, useEffect } from 'react';
import { Layout as AntLayout, Menu, Avatar, Dropdown, Badge } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  DashboardOutlined, HomeOutlined, ToolOutlined, FileTextOutlined,
  BellOutlined, CalendarOutlined, UserOutlined, LogoutOutlined, InboxOutlined,
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
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const userMenu = {
    items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录' }],
  };

  // ── Desktop ────────────────────────────────────────────────────────────────
  if (!mobile) {
    return (
      <AntLayout style={{ minHeight: '100vh' }}>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          style={{
            background: '#111827',
            borderRight: '1px solid #1e2d45',
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflow: 'auto',
          }}
        >
          {/* Logo */}
          <div style={{
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #1e2d45',
            gap: 8,
          }}>
            <span style={{ fontSize: 22 }}>☀️</span>
            {!collapsed && (
              <span style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#00D4AA',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.05em',
              }}>
                SMART<span style={{ color: '#fff' }}>SOLAR</span>
              </span>
            )}
          </div>

          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={NAV_ITEMS}
            onClick={({ key }) => navigate(key)}
            style={{ background: 'transparent', border: 'none', marginTop: 8 }}
          />
        </Sider>

        <AntLayout>
          <Header style={{
            background: '#111827',
            borderBottom: '1px solid #1e2d45',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: '#64748b', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
                ADMIN
              </span>
              <Dropdown menu={userMenu} placement="bottomRight">
                <Avatar style={{ cursor: 'pointer', background: '#00D4AA', color: '#000', fontFamily: 'JetBrains Mono, monospace' }}>
                  <UserOutlined />
                </Avatar>
              </Dropdown>
            </div>
          </Header>

          <Content style={{ margin: 24, overflow: 'initial' }}>
            <Outlet />
          </Content>
        </AntLayout>
      </AntLayout>
    );
  }

  // ── Mobile ────────────────────────────────────────────────────────────────
  return (
    <AntLayout style={{ minHeight: '100vh', paddingBottom: 70, background: '#0a0e1a' }}>
      <Header style={{
        background: '#111827',
        borderBottom: '1px solid #1e2d45',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>☀️</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#00D4AA', fontFamily: 'JetBrains Mono, monospace' }}>
            SMARTSOLAR
          </span>
        </div>
        <Avatar
          style={{ cursor: 'pointer', background: '#00D4AA', color: '#000' }}
          icon={<UserOutlined />}
          onClick={() => { if (window.confirm('确定退出？')) navigate('/login'); }}
        />
      </Header>

      <Content style={{ padding: '12px', paddingBottom: 80 }}>
        <Outlet />
      </Content>

      {/* Bottom Tab Bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#111827',
        borderTop: '1px solid #1e2d45',
        display: 'flex',
        zIndex: 200,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {NAV_ITEMS.map(item => {
          const active = location.pathname.startsWith(item.key);
          return (
            <div
              key={item.key}
              onClick={() => navigate(item.key)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '8px 0', cursor: 'pointer',
                color: active ? '#00D4AA' : '#64748b',
                fontSize: 10, gap: 3,
              }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{item.label}</span>
            </div>
          );
        })}
      </div>
    </AntLayout>
  );
}
