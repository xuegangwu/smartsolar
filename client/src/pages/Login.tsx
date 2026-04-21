import { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

type Portal = 'admin' | 'installer';

export default function Login() {
  const [portal, setPortal] = useState<Portal>('admin');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleAdminLogin(values: any) {
    setLoading(true);
    const result = await login(values.username, values.password);
    setLoading(false);
    if (!result.success) {
      message.error(result.message || '登录失败');
      return;
    }
    message.success('登录成功');
    navigate('/dashboard', { replace: true });
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0f2f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
    }}>
      {/* Top accent line */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 4,
        background: portal === 'admin'
          ? 'linear-gradient(90deg, #e6342a, #ff6b6b)'
          : 'linear-gradient(90deg, #059669, #10b981)',
        transition: 'background 0.3s',
      }} />

      {/* Logo + Brand */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: portal === 'admin'
            ? 'linear-gradient(135deg, #e6342a, #ff6b6b)'
            : 'linear-gradient(135deg, #059669, #10b981)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, margin: '0 auto 16px',
          boxShadow: portal === 'admin'
            ? '0 8px 24px rgba(230,52,42,0.35)'
            : '0 8px 24px rgba(5,150,105,0.35)',
          transition: 'all 0.3s',
        }}>
          ☀️
        </div>
        <Title level={3} style={{ margin: 0, color: '#1a1a2e', fontWeight: 800, letterSpacing: '-0.03em' }}>
          Smart<span style={{ color: portal === 'admin' ? '#e6342a' : '#059669', transition: 'color 0.3s' }}>Solar</span>
        </Title>
        <Text style={{ color: '#8896a6', fontSize: 13 }}>
          光储电站智能运维管理平台
        </Text>
      </div>

      {/* Portal Tabs */}
      <div style={{
        display: 'flex',
        background: '#e8eaed',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
        gap: 4,
      }}>
        {[
          { key: 'admin', label: '系统管理员', icon: '🏢', color: '#e6342a' },
          { key: 'installer', label: '安装商平台', icon: '🔧', color: '#059669' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setPortal(tab.key as Portal)}
            style={{
              flex: 1,
              padding: '10px 24px',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              transition: 'all 0.2s',
              background: portal === tab.key ? '#fff' : 'transparent',
              color: portal === tab.key ? tab.color : '#8896a6',
              boxShadow: portal === tab.key ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <Space size={6}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </Space>
          </button>
        ))}
      </div>

      {/* Login Card */}
      <Card
        style={{
          width: 400,
          borderRadius: 20,
          border: 'none',
          boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
        }}
        bodyStyle={{ padding: '36px 32px' }}
      >
        {portal === 'admin' ? (
          <>
            <Title level={5} style={{ marginBottom: 24, color: '#1a1a2e' }}>
              登录到管理平台
            </Title>

            <Form layout="vertical" onFinish={handleAdminLogin}>
              <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
                <Input
                  placeholder="admin"
                  size="large"
                  style={{ borderRadius: 10, height: 46 }}
                />
              </Form.Item>
              <Form.Item name="password" label="密码" rules={[{ required: true }]}>
                <Input.Password
                  placeholder="••••••"
                  size="large"
                  style={{ borderRadius: 10, height: 46 }}
                />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                style={{
                  height: 48, borderRadius: 10,
                  fontWeight: 600, fontSize: 15,
                  background: '#e6342a', border: 'none',
                  boxShadow: '0 4px 16px rgba(230,52,42,0.25)',
                  marginTop: 8,
                }}
              >
                登录
              </Button>
            </Form>

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <Text style={{ color: '#b8c0cc', fontSize: 12 }}>
                演示账号 · admin / admin
              </Text>
            </div>
          </>
        ) : (
          <>
            <Title level={5} style={{ marginBottom: 24, color: '#1a1a2e' }}>
              登录安装商工作台
            </Title>

            <Form
              layout="vertical"
              onFinish={async (values) => {
                // Delegate to installer portal
                navigate('/installer-portal');
              }}
            >
              <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
                <Input
                  placeholder="安装商用户名"
                  size="large"
                  style={{ borderRadius: 10, height: 46 }}
                />
              </Form.Item>
              <Form.Item name="password" label="密码" rules={[{ required: true }]}>
                <Input.Password
                  placeholder="••••••"
                  size="large"
                  style={{ borderRadius: 10, height: 46 }}
                />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                style={{
                  height: 48, borderRadius: 10,
                  fontWeight: 600, fontSize: 15,
                  background: '#059669', border: 'none',
                  boxShadow: '0 4px 16px rgba(5,150,105,0.25)',
                  marginTop: 8,
                }}
              >
                进入安装商工作台
              </Button>
            </Form>

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <Text style={{ color: '#b8c0cc', fontSize: 12 }}>
                演示账号 · dist_admin / partner123
              </Text>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
