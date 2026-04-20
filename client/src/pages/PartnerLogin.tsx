import { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function PartnerLogin() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(values: any) {
    setLoading(true);
    try {
      const res = await fetch('/api/partners/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!data.success) {
        message.error(data.message || '登录失败');
        setLoading(false);
        return;
      }
      localStorage.setItem('partner_token', data.token);
      localStorage.setItem('partner_user', JSON.stringify(data.user));
      message.success('登录成功');
      navigate('/partner-dashboard', { replace: true });
    } catch {
      message.error('网络错误');
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <Card style={{ width: 380, borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }} bodyStyle={{ padding: '36px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12,
            background: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, margin: '0 auto 14px',
          }}>🏆</div>
          <Title level={3} style={{ color: '#1a1a2e', margin: 0 }}>渠道商登录</Title>
          <Text style={{ color: '#8896a6', fontSize: 13 }}>Partner Portal</Text>
        </div>

        <div style={{ height: 1, background: '#f0f2f5', marginBottom: 24 }} />

        <Form layout="vertical" onFinish={handleLogin}>
          <Form.Item name="username" rules={[{ required: true }]}>
            <Input placeholder="用户名" size="large" style={{ borderRadius: 10, height: 46 }} />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true }]}>
            <Input.Password placeholder="密码" size="large" style={{ borderRadius: 10, height: 46 }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large"
            style={{ height: 48, borderRadius: 10, background: '#3b82f6', border: 'none', fontWeight: 600 }}>
            登录
          </Button>
        </Form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Text style={{ color: '#b8c0cc', fontSize: 12 }}>
            演示账号 · dist_admin / partner123
          </Text>
        </div>
      </Card>
    </div>
  );
}
