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
      background: '#080c14',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,229,192,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,229,192,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'absolute',
        top: '30%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(0,229,192,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <Card
        style={{
          width: 400, maxWidth: '100%',
          background: '#141c2e',
          border: '1px solid #2a3a52',
          borderRadius: 14,
          boxShadow: '0 0 60px rgba(0,0,0,0.6), 0 0 30px rgba(0,229,192,0.1)',
          position: 'relative', zIndex: 1,
        }}
        bodyStyle={{ padding: '36px 32px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>☀️</div>
          <Title level={3} style={{ color: '#00e5c0', margin: 0, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.12em', fontWeight: 700 }}>
            SMART<span style={{ color: '#c8d4e0' }}>SOLAR</span>
          </Title>
          <Text style={{ color: '#5a6a7a', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, display: 'block', marginTop: 6 }}>
            光储电站运维管理平台
          </Text>
        </div>

        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #2a3a52, transparent)', marginBottom: 24 }} />

        <Form layout="vertical" onFinish={handleLogin}>
          <Form.Item name="username" label={
            <span style={{ color: '#8899aa', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Username
            </span>
          } rules={[{ required: true }]}>
            <Input
              placeholder="admin"
              size="large"
              style={{
                background: '#1e2a3d', border: '1px solid #2a3a52',
                color: '#f0f4f8', fontFamily: 'JetBrains Mono, monospace',
                borderRadius: 8, height: 44,
              }}
            />
          </Form.Item>
          <Form.Item name="password" label={
            <span style={{ color: '#8899aa', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Password
            </span>
          } rules={[{ required: true }]}>
            <Input.Password
              placeholder="••••••"
              size="large"
              style={{
                background: '#1e2a3d', border: '1px solid #2a3a52',
                color: '#f0f4f8', fontFamily: 'JetBrains Mono, monospace',
                borderRadius: 8, height: 44,
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
              height: 48, borderRadius: 8,
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 700, fontSize: 15, letterSpacing: '0.06em',
              background: '#00e5c0', border: 'none',
              boxShadow: '0 0 24px rgba(0,229,192,0.35)',
              marginTop: 4,
            }}
          >
            [ LOGIN ]
          </Button>
        </Form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Text style={{ color: '#5a6a7a', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
            demo · admin / admin
          </Text>
        </div>
      </Card>
    </div>
  );
}
