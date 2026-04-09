import { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(values: any) {
    setLoading(true);
    // 内部使用，简化验证
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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Card style={{ width: 400, borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>☀️</div>
          <Title level={3}>SmartSolar</Title>
          <Text type="secondary">光储电站运维管理平台</Text>
        </div>

        <Form layout="vertical" onFinish={handleLogin}>
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input placeholder="admin" size="large" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}>
            <Input.Password placeholder="admin" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large" style={{ marginTop: 8 }}>
            登录
          </Button>
        </Form>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>演示账号: admin / admin</Text>
        </div>
      </Card>
    </div>
  );
}
