import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Typography, Space } from 'antd';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function PartnerLogin() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 已登录直接跳转
  useEffect(() => {
    const token = localStorage.getItem('partner_token');
    const userStr = localStorage.getItem('partner_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.partnerType === 'installer') {
          navigate('/installer-portal', { replace: true });
        } else {
          navigate('/partner-dashboard', { replace: true });
        }
      } catch { /* ignore */ }
    }
  }, [navigate]);

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
      // 存 partnerType 用于区分安装商/分销商
      localStorage.setItem('partner_user', JSON.stringify({
        ...data.user,
        partnerType: data.partner?.type || 'distributor',
      }));
      message.success('登录成功');
      if (data.partner?.type === 'installer') {
        navigate('/installer-portal', { replace: true });
      } else {
        navigate('/partner-dashboard', { replace: true });
      }
    } catch {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
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
      {/* Top accent */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 4,
        background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
      }} />

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, margin: '0 auto 16px',
          boxShadow: '0 8px 24px rgba(245,158,11,0.35)',
        }}>
          🏆
        </div>
        <Title level={3} style={{ margin: 0, color: '#1a1a2e', fontWeight: 800 }}>
          渠道商<span style={{ color: '#f59e0b' }}>平台</span>
        </Title>
        <Text style={{ color: '#8896a6', fontSize: 13 }}>
          分销商 / 安装商业绩与积分管理
        </Text>
      </div>

      <Card
        style={{
          width: 400,
          borderRadius: 20,
          border: 'none',
          boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
        }}
        bodyStyle={{ padding: '36px 32px' }}
      >
        <Title level={5} style={{ marginBottom: 24, color: '#1a1a2e' }}>
          渠道商登录
        </Title>

        <Form layout="vertical" onFinish={handleLogin}>
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input placeholder="渠道商用户名" size="large" style={{ borderRadius: 10, height: 46 }} />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}>
            <Input.Password placeholder="••••••" size="large" style={{ borderRadius: 10, height: 46 }} />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
            style={{
              height: 48, borderRadius: 10, fontWeight: 600, fontSize: 15,
              background: '#f59e0b', border: 'none',
              boxShadow: '0 4px 16px rgba(245,158,11,0.25)',
              marginTop: 8,
            }}
          >
            登录
          </Button>
        </Form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Text style={{ color: '#b8c0cc', fontSize: 12 }}>
            演示账号 · dist_admin / partner123
          </Text>
        </div>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Button type="link" onClick={() => navigate('/installer-portal')} style={{ color: '#059669', fontSize: 13 }}>
            🔧 我是安装商，直接进入工作台 →
          </Button>
        </div>
      </Card>
    </div>
  );
}
