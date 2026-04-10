import { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(values: any) {
    setLoading(true);
    if (values.username === 'admin' && values.password === 'admin') {
      localStorage.setItem('smartsolar_user', JSON.stringify({ name: 'Admin', role: 'admin' }));
      navigate('/dashboard');
    } else {
      message.error('用户名或密码错误');
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050810',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(45,212,191,0.06) 0%, transparent 70%)',
      }} />

      {/* Grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }} />

      <Card
        style={{
          width: 380, maxWidth: '100%',
          background: 'rgba(17,24,39,0.8)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 20,
          boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(45,212,191,0.08)',
          backdropFilter: 'blur(20px)',
          position: 'relative', zIndex: 1,
        }}
        bodyStyle={{ padding: '36px 32px' }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, #0d9488, #2dd4bf)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, margin: '0 auto 14px',
            boxShadow: '0 4px 16px rgba(45,212,191,0.3)',
          }}>
            ☀️
          </div>
          <Title level={3} style={{
            color: '#2dd4bf', margin: 0,
            fontFamily: 'Inter, sans-serif', fontWeight: 800,
            letterSpacing: '-0.03em',
          }}>
            SmartSolar
          </Title>
          <Text style={{ color: '#64748b', fontFamily: 'Inter, sans-serif', fontSize: 13, display: 'block', marginTop: 6 }}>
            光储电站运维管理平台
          </Text>
        </div>

        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)', marginBottom: 24 }} />

        <Form layout="vertical" onFinish={handleLogin}>
          <Form.Item name="username" label={
            <span style={{ color: '#94a3b8', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500 }}>
              用户名
            </span>
          } rules={[{ required: true }]}>
            <Input
              placeholder="admin"
              size="large"
              style={{
                background: '#162032', border: '1px solid rgba(255,255,255,0.07)',
                color: '#f1f5f9', fontFamily: 'Inter, sans-serif',
                borderRadius: 10, height: 46,
              }}
            />
          </Form.Item>
          <Form.Item name="password" label={
            <span style={{ color: '#94a3b8', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500 }}>
              密码
            </span>
          } rules={[{ required: true }]}>
            <Input.Password
              placeholder="••••••"
              size="large"
              style={{
                background: '#162032', border: '1px solid rgba(255,255,255,0.07)',
                color: '#f1f5f9', fontFamily: 'Inter, sans-serif',
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
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600, fontSize: 15,
              background: 'linear-gradient(135deg, #0d9488, #2dd4bf)',
              border: 'none',
              boxShadow: '0 4px 16px rgba(45,212,191,0.3)',
              marginTop: 4,
            }}
          >
            登录
          </Button>
        </Form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Text style={{ color: '#334155', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
            演示账号 · admin / admin
          </Text>
        </div>
      </Card>
    </div>
  );
}
