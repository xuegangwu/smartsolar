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
      background: '#0a0e1a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Grid background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,212,170,0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,170,0.05) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      {/* Glow orb */}
      <div style={{
        position: 'absolute',
        top: '30%',
        left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 400,
        height: 400,
        background: 'radial-gradient(circle, rgba(0,212,170,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <Card
        style={{
          width: 400,
          maxWidth: '100%',
          background: '#151d2e',
          border: '1px solid #1e2d45',
          borderRadius: 16,
          boxShadow: '0 0 60px rgba(0,0,0,0.5), 0 0 20px rgba(0,212,170,0.1)',
          position: 'relative',
          zIndex: 1,
        }}
        bodyStyle={{ padding: '32px 28px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>☀️</div>
          <Title level={3} style={{ color: '#00D4AA', margin: 0, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}>
            SMART<span style={{ color: '#fff' }}>SOLAR</span>
          </Title>
          <Text style={{ color: '#64748b', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, display: 'block', marginTop: 4 }}>
            光储电站运维管理平台
          </Text>
        </div>

        <div style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, #1e2d45, transparent)',
          marginBottom: 24,
        }} />

        <Form layout="vertical" onFinish={handleLogin}>
          <Form.Item name="username" label={<span style={{ color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</span>} rules={[{ required: true }]}>
            <Input
              placeholder="admin"
              size="large"
              style={{
                background: '#1a2540', border: '1px solid #1e2d45',
                color: '#00D4AA', fontFamily: 'JetBrains Mono, monospace',
                borderRadius: 8,
              }}
            />
          </Form.Item>
          <Form.Item name="password" label={<span style={{ color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</span>} rules={[{ required: true }]}>
            <Input.Password
              placeholder="••••••"
              size="large"
              style={{
                background: '#1a2540', border: '1px solid #1e2d45',
                color: '#00D4AA', fontFamily: 'JetBrains Mono, monospace',
                borderRadius: 8,
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
              height: 48, borderRadius: 8, fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600, fontSize: 15,
              background: '#00D4AA', border: 'none',
              boxShadow: '0 0 20px rgba(0,212,170,0.3)',
              marginTop: 8,
            }}
          >
            [ LOGIN ]
          </Button>
        </Form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Text style={{ color: '#64748b', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
            demo: admin / admin
          </Text>
        </div>
      </Card>
    </div>
  );
}
