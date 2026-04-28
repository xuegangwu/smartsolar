import { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Space } from 'antd';
import { UserOutlined, LockOutlined, BankOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function DistributorLogin() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(values: { username: string; password: string }) {
    setLoading(true);
    try {
      // 分销商专用登录（使用 distributor secret 签发 token）
      const res = await fetch('/api/distributor/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: values.username, password: values.password })
      }).then(r => r.json());

      if (res.success && (res.user?.role === 'distributor' || res.user?.role === 'admin')) {
        localStorage.setItem('distributor_token', res.token);
        localStorage.setItem('distributor_user', JSON.stringify(res.user));
        navigate('/distributor/dashboard');
      } else {
        message.error('非分销商账号，请使用分销商账号登录');
      }
    } catch {
      message.error('登录失败，请检查网络');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card style={{ width: 400, boxShadow: '0 14px 40px rgba(0,0,0,0.2)', borderRadius: 16 }} size="small">
        <Space direction="vertical" style={{ width: '100%' }} align="center">
          <BankOutlined style={{ fontSize: 48, color: '#667eea' }} />
          <Title level={4}>分销商指挥塔</Title>
          <Text type="secondary">光储运维平台 · 分销商入口</Text>
        </Space>
        <Form layout="vertical" onFinish={handleLogin} style={{ marginTop: 24 }}>
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              登录
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            演示账号：dist_admin / partner123
          </Text>
        </div>
      </Card>
    </div>
  );
}
