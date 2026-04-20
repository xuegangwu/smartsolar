import { useNavigate } from 'react-router-dom';
import { Card, Typography, Space, Divider } from 'antd';
import { ThunderboltOutlined, TeamOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0f1923 0%, #1a2744 50%, #0d1117 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }} />

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 48, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: 'linear-gradient(135deg, #e6342a, #ff6b6b)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, margin: '0 auto 16px',
          boxShadow: '0 8px 32px rgba(230,52,42,0.4)',
        }}>☀️</div>
        <Title level={2} style={{ color: '#fff', margin: 0, fontWeight: 900, letterSpacing: '-0.03em' }}>
          Smart<span style={{ color: '#e6342a' }}>Solar</span>
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
          光储电站智能运维管理平台
        </Text>
      </div>

      {/* Entry Cards */}
      <div style={{
        display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center',
        position: 'relative', zIndex: 1, maxWidth: 700, width: '100%',
      }}>
        {/* 内部管理系统 */}
        <Card
          hoverable
          onClick={() => navigate('/login')}
          style={{
            flex: '1 1 280px', maxWidth: 320, borderRadius: 20,
            border: '1px solid rgba(230,52,42,0.3)',
            background: 'rgba(230,52,42,0.08)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          bodyStyle={{ padding: '36px 28px', textAlign: 'center' }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #e6342a, #ff6b6b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, margin: '0 auto 20px',
            boxShadow: '0 4px 20px rgba(230,52,42,0.35)',
          }}>
            <ThunderboltOutlined style={{ color: '#fff' }} />
          </div>
          <Title level={4} style={{ color: '#fff', marginBottom: 8 }}>内部管理系统</Title>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
            运维管理 · 电站监控 · 工单调度<br />
            人员管理 · 健康分析 · AI 助手
          </Text>
          <div style={{
            marginTop: 20, padding: '8px 20px', borderRadius: 20,
            background: '#e6342a', color: '#fff', fontSize: 13,
            display: 'inline-block', fontWeight: 600,
          }}>
            进入 →
          </div>
        </Card>

        {/* 渠道商平台 */}
        <Card
          hoverable
          onClick={() => navigate('/partner-login')}
          style={{
            flex: '1 1 280px', maxWidth: 320, borderRadius: 20,
            border: '1px solid rgba(59,130,246,0.3)',
            background: 'rgba(59,130,246,0.08)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          bodyStyle={{ padding: '36px 28px', textAlign: 'center' }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, margin: '0 auto 20px',
            boxShadow: '0 4px 20px rgba(59,130,246,0.35)',
          }}>
            <TeamOutlined style={{ color: '#fff' }} />
          </div>
          <Title level={4} style={{ color: '#fff', marginBottom: 8 }}>渠道商平台</Title>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
            积分体系 · 绩效看板 · 兑换商城<br />
            分销商管理 · 安装商激励
          </Text>
          <div style={{
            marginTop: 20, padding: '8px 20px', borderRadius: 20,
            background: '#3b82f6', color: '#fff', fontSize: 13,
            display: 'inline-block', fontWeight: 600,
          }}>
            进入 →
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 48, textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
          SmartSolar · 光储电站运维平台 · 演示账号 admin / admin
        </Text>
      </div>
    </div>
  );
}
