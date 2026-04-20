import { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DashboardOutlined, ToolOutlined } from '@ant-design/icons';

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
      background: '#f5f6f8',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle bg pattern */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(230,52,42,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(230,52,42,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }} />

      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 4,
        background: 'linear-gradient(90deg, #e6342a, #ff6b6b)',
      }} />

      {/* Portal selector */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, zIndex: 1 }}>
        <Card
          onClick={() => setPortal('admin')}
          style={{
            width: 200, cursor: 'pointer', borderRadius: 16,
            border: portal === 'admin' ? '2px solid #e6342a' : '2px solid transparent',
            background: portal === 'admin' ? '#fff' : '#fafafa',
            boxShadow: portal === 'admin' ? '0 4px 20px rgba(230,52,42,0.2)' : 'none',
            transition: 'all 0.2s',
          }}
          bodyStyle={{ padding: '20px 24px', textAlign: 'center' }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 12, margin: '0 auto 12px',
            background: portal === 'admin' ? 'linear-gradient(135deg, #e6342a, #ff6b6b)' : '#f0f0f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <DashboardOutlined style={{ fontSize: 22, color: portal === 'admin' ? '#fff' : '#888' }} />
          </div>
          <Title level={5} style={{ margin: 0, color: portal === 'admin' ? '#1a1a2e' : '#888' }}>
            系统管理员
          </Title>
          <Text style={{ fontSize: 11, color: '#9ca3af' }}>内部运维管理平台</Text>
        </Card>

        <Card
          onClick={() => navigate('/installer-portal')}
          style={{
            width: 200, cursor: 'pointer', borderRadius: 16,
            border: portal === 'installer' ? '2px solid #059669' : '2px solid transparent',
            background: portal === 'installer' ? '#fff' : '#fafafa',
            boxShadow: portal === 'installer' ? '0 4px 20px rgba(5,150,105,0.2)' : 'none',
            transition: 'all 0.2s',
          }}
          bodyStyle={{ padding: '20px 24px', textAlign: 'center' }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 12, margin: '0 auto 12px',
            background: portal === 'installer' ? 'linear-gradient(135deg, #059669, #10b981)' : '#f0f0f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ToolOutlined style={{ fontSize: 22, color: portal === 'installer' ? '#fff' : '#888' }} />
          </div>
          <Title level={5} style={{ margin: 0, color: portal === 'installer' ? '#059669' : '#888' }}>
            安装商平台
          </Title>
          <Text style={{ fontSize: 11, color: '#9ca3af' }}>安装商专属工作台</Text>
        </Card>
      </div>

      {/* Login form */}
      {portal === 'admin' && (
        <Card
          style={{
            width: 380, maxWidth: '100%',
            background: '#ffffff',
            border: '1px solid #e8eaed',
            borderRadius: 18,
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            position: 'relative', zIndex: 1,
          }}
          bodyStyle={{ padding: '36px 32px' }}
        >
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: 'linear-gradient(135deg, #e6342a, #ff6b6b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, margin: '0 auto 14px',
              boxShadow: '0 4px 16px rgba(230,52,42,0.3)',
            }}>
              ☀️
            </div>
            <Title level={3} style={{ color: '#1a1a2e', margin: 0, fontWeight: 800 }}>
              Smart<span style={{ color: '#e6342a' }}>Solar</span>
            </Title>
            <Text style={{ color: '#8896a6', fontSize: 13, display: 'block', marginTop: 6 }}>
              光储电站运维管理平台
            </Text>
          </div>

          <div style={{ height: 1, background: '#f0f2f5', marginBottom: 24 }} />

          <Form layout="vertical" onFinish={handleAdminLogin}>
            <Form.Item name="username" label={
              <span style={{ color: '#4a5568', fontSize: 12, fontWeight: 500 }}>用户名</span>
            } rules={[{ required: true }]}>
              <Input
                placeholder="admin"
                size="large"
                style={{ background: '#fafbfc', border: '1px solid #e8eaed', borderRadius: 10, height: 46 }}
              />
            </Form.Item>
            <Form.Item name="password" label={
              <span style={{ color: '#4a5568', fontSize: 12, fontWeight: 500 }}>密码</span>
            } rules={[{ required: true }]}>
              <Input.Password
                placeholder="••••••"
                size="large"
                style={{ background: '#fafbfc', border: '1px solid #e8eaed', borderRadius: 10, height: 46 }}
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
                marginTop: 4,
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
        </Card>
      )}

      {portal === 'installer' && (
        <Card
          style={{
            width: 380, maxWidth: '100%',
            background: '#ffffff',
            border: '1px solid #e8eaed',
            borderRadius: 18,
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            position: 'relative', zIndex: 1,
          }}
          bodyStyle={{ padding: '36px 32px' }}
        >
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: 'linear-gradient(135deg, #059669, #10b981)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, margin: '0 auto 14px',
              boxShadow: '0 4px 16px rgba(5,150,105,0.3)',
            }}>
              🔧
            </div>
            <Title level={3} style={{ color: '#1a1a2e', margin: 0, fontWeight: 800 }}>
              安装商<span style={{ color: '#059669' }}>平台</span>
            </Title>
            <Text style={{ color: '#8896a6', fontSize: 13, display: 'block', marginTop: 6 }}>
              专属工作台 · 安装统计 · 积分体系
            </Text>
          </div>

          <div style={{ height: 1, background: '#f0f2f5', marginBottom: 24 }} />

          <Button
            type="primary"
            block
            size="large"
            onClick={() => navigate('/installer-portal')}
            style={{
              height: 48, borderRadius: 10,
              fontWeight: 600, fontSize: 15,
              background: '#059669', border: 'none',
              boxShadow: '0 4px 16px rgba(5,150,105,0.25)',
            }}
          >
            进入安装商工作台 →
          </Button>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Text style={{ color: '#b8c0cc', fontSize: 12 }}>
              演示账号 · dist_admin / partner123
            </Text>
          </div>
        </Card>
      )}
    </div>
  );
}
