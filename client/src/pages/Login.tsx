import { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleLogin(values: any) {
    setLoading(true);
    const result = await login(values.username, values.password);
    setLoading(false);
    if (!result.success) {
      message.error(result.message || '登录失败');
      return;
    }
    message.success('登录成功');
    // Force a full page reload to ensure fresh state
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 300);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f6f8',
      display: 'flex',
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
        {/* Logo */}
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
          <Title level={3} style={{
            color: '#1a1a2e', margin: 0,
            fontWeight: 800,
            letterSpacing: '-0.03em',
          }}>
            Smart<span style={{ color: '#e6342a' }}>Solar</span>
          </Title>
          <Text style={{ color: '#8896a6', fontSize: 13, display: 'block', marginTop: 6 }}>
            光储电站运维管理平台
          </Text>
        </div>

        <div style={{ height: 1, background: '#f0f2f5', marginBottom: 24 }} />

        <Form layout="vertical" onFinish={handleLogin}>
          <Form.Item name="username" label={
            <span style={{ color: '#4a5568', fontSize: 12, fontWeight: 500 }}>
              用户名
            </span>
          } rules={[{ required: true }]}>
            <Input
              placeholder="admin"
              size="large"
              style={{
                background: '#fafbfc', border: '1px solid #e8eaed',
                color: '#1a1a2e',
                borderRadius: 10, height: 46,
              }}
            />
          </Form.Item>
          <Form.Item name="password" label={
            <span style={{ color: '#4a5568', fontSize: 12, fontWeight: 500 }}>
              密码
            </span>
          } rules={[{ required: true }]}>
            <Input.Password
              placeholder="••••••"
              size="large"
              style={{
                background: '#fafbfc', border: '1px solid #e8eaed',
                color: '#1a1a2e',
                borderRadius: 10, height: 46,
              }}
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
    </div>
  );
}
