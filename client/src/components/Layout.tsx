import { useState } from 'react';
import { Layout as AntLayout, Menu, Avatar, Dropdown, theme } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  HomeOutlined,
  ToolOutlined,
  FileTextOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';

const { Sider, Header, Content } = AntLayout;

const NAV_ITEMS = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '监控大屏' },
  { key: '/stations', icon: <HomeOutlined />, label: '电站管理' },
  { key: '/equipment', icon: <ToolOutlined />, label: '设备台账' },
  { key: '/work-orders', icon: <FileTextOutlined />, label: '工单管理' },
  { key: '/alerts', icon: <BellOutlined />, label: '告警管理' },
  { key: '/inspection', icon: <CalendarOutlined />, label: '巡检管理' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { token } = theme.useToken();

  const userMenu = {
    items: [
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' },
    ],
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{ background: token.colorBgContainer }}
      >
        <div style={{
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}>
          {!collapsed ? (
            <span style={{ fontSize: 18, fontWeight: 700, color: token.colorPrimary }}>
              ☀️ SmartSolar
            </span>
          ) : (
            <span style={{ fontSize: 20 }}>☀️</span>
          )}
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
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
