import { useState, useEffect } from 'react';
import { Layout as AntLayout, Menu, Avatar, Dropdown, theme, Badge } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  DashboardOutlined, HomeOutlined, ToolOutlined, FileTextOutlined,
  BellOutlined, CalendarOutlined, UserOutlined, LogoutOutlined,
  MenuOutlined,
} from '@ant-design/icons';

const { Sider, Header, Content } = AntLayout;

const NAV_ITEMS = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '首页' },
  { key: '/stations', icon: <HomeOutlined />, label: '电站' },
  { key: '/equipment', icon: <ToolOutlined />, label: '设备' },
  { key: '/work-orders', icon: <FileTextOutlined />, label: '工单' },
  { key: '/alerts', icon: <BellOutlined />, label: '告警', badge: 0 },
  { key: '/inspection', icon: <CalendarOutlined />, label: '巡检' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { token } = theme.useToken();

  useEffect(() => {
    const checkMobile = () => setMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const userMenu = {
    items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录' }],
  };

  // ── Desktop Layout ─────────────────────────────────────────────────────────
  if (!mobile) {
    return (
      <AntLayout style={{ minHeight: '100vh' }}>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          style={{ background: token.colorBgContainer, position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }}
        >
          <div style={{
            height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderBottom: `1px solid ${token.colorBorderSecondary}`, fontSize: 18, fontWeight: 700, color: token.colorPrimary,
          }}>
            {collapsed ? <span style={{ fontSize: 22 }}>☀️</span> : <span>☀️ SmartSolar</span>}
          </div>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={NAV_ITEMS}
            onClick={({ key }) => navigate(key)}
            style={{ border: 'none', marginTop: 8 }}
          />
        </Sider>
        <AntLayout>
          <Header style={{
            background: token.colorBgContainer,
            padding: '0 24px',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            position: 'sticky', top: 0, zIndex: 100,
          }}>
            <Dropdown menu={userMenu} placement="bottomRight">
              <Avatar style={{ cursor: 'pointer' }} icon={<UserOutlined />} />
            </Dropdown>
          </Header>
          <Content style={{ margin: 24, overflow: 'initial' }}>
            <Outlet />
          </Content>
        </AntLayout>
      </AntLayout>
    );
  }

  // ── Mobile Layout ──────────────────────────────────────────────────────────
  return (
    <AntLayout style={{ minHeight: '100vh', paddingBottom: 70 }}>
      <Header style={{
        background: token.colorBgContainer,
        padding: '0 16px',
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: token.colorPrimary }}>
          ☀️ SmartSolar
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Avatar
            style={{ cursor: 'pointer' }}
            icon={<UserOutlined />}
            onClick={() => {
              const msg = window.confirm('确定退出登录？');
              if (msg) navigate('/login');
            }}
          />
        </div>
      </Header>

      <Content style={{ padding: '12px 12px 80px' }}>
        <Outlet />
      </Content>

      {/* Bottom Tab Bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: token.colorBgContainer,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
        display: 'flex', zIndex: 200,
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
                color: active ? token.colorPrimary : token.colorTextSecondary,
                fontSize: 10, gap: 2,
                transition: 'color 0.2s',
              }}
            >
              <Badge count={item.badge} size="small" offset={[6, -2]}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
              </Badge>
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>
    </AntLayout>
  );
}
