import { useState, useEffect } from 'react';
import {
  Card, Row, Col, Statistic, Table, Tag, Button, Space, Spin, List,
  Badge, Typography, Progress, Avatar, Empty, message, Modal, Descriptions,
} from 'antd';
import {
  HomeOutlined, FileTextOutlined, TrophyOutlined, GiftOutlined,
  LogoutOutlined, ToolOutlined, ThunderboltOutlined, StarOutlined,
  UserOutlined, RightOutlined, SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

const LEVEL_TEXT: Record<string, string> = { bronze: '铜牌', silver: '银牌', gold: '金牌', diamond: '钻牌' };
const LEVEL_COLOR: Record<string, string> = { bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', diamond: '#b9f2ff' };
const LEVEL_THRESHOLDS: Record<string, number> = { bronze: 0, silver: 5000, gold: 20000, diamond: 50000 };
const WO_STATUS_TEXT: Record<string, string> = {
  created: '待派发', assigned: '已派发', accepted: '已接单',
  processing: '处理中', accepted_check: '待验收', closed: '已完工',
};
const WO_STATUS_COLOR: Record<string, string> = {
  created: 'default', assigned: 'blue', accepted: 'cyan',
  processing: 'orange', accepted_check: 'purple', closed: 'green',
};

export default function InstallerPortal() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<'overview' | 'workorders' | 'transactions'>('overview');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('partner_token');
    if (!token) { navigate('/partner-login'); return; }
    loadDashboard(token);
  }, []);

  async function loadDashboard(token: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/partners/installer/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json());
      if (res.success) {
        setData(res.data);
      } else {
        navigate('/partner-login');
      }
    } catch {
      navigate('/partner-login');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('partner_token');
    localStorage.removeItem('partner_user');
    navigate('/partner-login');
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f6f8' }}>
      <Spin size="large" />
    </div>
  );
  if (!data) return null;

  const { partner, stats, recentWorkOrders, recentTransactions } = data;

  const nextLevel = partner.level === 'diamond' ? null
    : partner.level === 'gold' ? 'diamond'
    : partner.level === 'silver' ? 'gold' : 'silver';
  const currentThreshold = LEVEL_THRESHOLDS[partner.level] || 0;
  const nextThreshold = nextLevel ? LEVEL_THRESHOLDS[nextLevel] : 0;
  const progress = nextThreshold
    ? Math.min(100, Math.round(((partner.totalPoints - currentThreshold) / (nextThreshold - currentThreshold)) * 100))
    : 100;

  const woColumns = [
    { title: '工单号', dataIndex: 'orderNo', render: (v: string) => <Text code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{v}</Text>, width: 160 },
    { title: '电站', render: (_: any, r: any) => (r.stationId as any)?.name || '-', width: 160 },
    { title: '类型', dataIndex: 'type', render: (t: string) => <Tag>{t === 'fault' ? '故障' : t === 'maintenance' ? '运维' : t === 'inspection' ? '巡检' : '升级'}</Tag>, width: 80 },
    { title: '状态', dataIndex: 'status', render: (s: string) => <Tag color={WO_STATUS_COLOR[s]}>{WO_STATUS_TEXT[s] || s}</Tag>, width: 90 },
    { title: '创建时间', dataIndex: 'createdAt', render: (v: string) => new Date(v).toLocaleDateString('zh-CN'), width: 100 },
  ];

  const txnColumns = [
    { title: '时间', render: (_: any, r: any) => new Date(r.createdAt).toLocaleDateString('zh-CN'), width: 100 },
    { title: '说明', dataIndex: 'description', ellipsis: true },
    { title: '变动', dataIndex: 'amount', render: (v: number) => (
      <Text strong style={{ color: v > 0 ? '#22c55e' : '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>
        {v > 0 ? `+${v}` : v}
      </Text>
    ), width: 90 },
    { title: '余额', dataIndex: 'balance', render: (v: number) => (
      <Text style={{ fontFamily: 'JetBrains Mono, monospace' }}>{v?.toLocaleString()}</Text>
    ), width: 100 },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6f8' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%)',
        padding: '24px 32px',
        color: 'white',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <Text style={{ color: '#9ca3af', fontSize: 13 }}>安装商工作台</Text>
            <Title level={3} style={{ color: 'white', margin: '4px 0 8px' }}>{partner.name}</Title>
            <Space>
              <Tag style={{ background: LEVEL_COLOR[partner.level] + '30', border: `1px solid ${LEVEL_COLOR[partner.level]}`, color: LEVEL_COLOR[partner.level], fontWeight: 700 }}>
                {LEVEL_TEXT[partner.level]}
              </Tag>
              <Text style={{ color: '#9ca3af', fontSize: 12 }}>{partner.region}</Text>
            </Space>
          </div>
          <Button icon={<LogoutOutlined />} onClick={handleLogout} style={{ color: '#9ca3af', borderColor: '#4b5563' }}>
            退出
          </Button>
        </div>

        {/* 积分进度条 */}
        <div style={{
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '16px 20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: '#d1d5db', fontSize: 13 }}>等级进度</Text>
            <Text style={{ color: LEVEL_COLOR[partner.level], fontWeight: 700, fontSize: 13 }}>
              {partner.totalPoints.toLocaleString()} / {nextThreshold ? nextThreshold.toLocaleString() : '—'} 积分
            </Text>
          </div>
          <Progress
            percent={progress}
            strokeColor={LEVEL_COLOR[partner.level]}
            trailColor="rgba(255,255,255,0.15)"
            size="small"
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {['bronze', 'silver', 'gold', 'diamond'].map(lv => (
              <div key={lv} style={{
                flex: 1, textAlign: 'center', padding: '4px 0', borderRadius: 6,
                background: partner.level === lv ? LEVEL_COLOR[lv] + '30' : 'rgba(255,255,255,0.06)',
                color: partner.level === lv ? LEVEL_COLOR[lv] : '#6b7280',
                fontSize: 10, fontWeight: 700,
              }}>
                {LEVEL_TEXT[lv]}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {/* Stats */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card style={{ borderRadius: 12, textAlign: 'center' }} bodyStyle={{ padding: '20px 16px' }}>
              <div style={{ fontSize: 32, marginBottom: 4 }}>💰</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>
                {partner.availablePoints.toLocaleString()}
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>可用积分</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ borderRadius: 12, textAlign: 'center' }} bodyStyle={{ padding: '20px 16px' }}>
              <div style={{ fontSize: 32, marginBottom: 4 }}>🏠</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#3b82f6', fontFamily: 'JetBrains Mono, monospace' }}>
                {stats.totalStations}
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>我的电站</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ borderRadius: 12, textAlign: 'center' }} bodyStyle={{ padding: '20px 16px' }}>
              <div style={{ fontSize: 32, marginBottom: 4 }}>📋</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' }}>
                {stats.totalWorkOrders}
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>累计工单</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ borderRadius: 12, textAlign: 'center' }} bodyStyle={{ padding: '20px 16px' }}>
              <div style={{ fontSize: 32, marginBottom: 4 }}>⚡</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#8b5cf6', fontFamily: 'JetBrains Mono, monospace' }}>
                {partner.totalInstallations || 0}
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>累计安装量</Text>
            </Card>
          </Col>
        </Row>

        {/* Tab Nav */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { key: 'overview', label: '工单总览', icon: <FileTextOutlined /> },
            { key: 'workorders', label: '我的工单', icon: <ToolOutlined /> },
            { key: 'transactions', label: '积分流水', icon: <GiftOutlined /> },
          ].map(t => (
            <Button
              key={t.key}
              type={tab === t.key ? 'primary' : 'default'}
              icon={t.icon}
              onClick={() => setTab(t.key as any)}
              style={{ borderRadius: 8 }}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'overview' && (
          <Row gutter={16}>
            <Col span={16}>
              <Card
                title="📋 最近工单"
                extra={<Button type="link" onClick={() => setTab('workorders')}>查看全部 <RightOutlined /></Button>}
                style={{ borderRadius: 12 }}
                bodyStyle={{ padding: 0 }}
              >
                {recentWorkOrders.length === 0 ? (
                  <Empty description="暂无工单" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }} />
                ) : (
                  <Table
                    dataSource={recentWorkOrders}
                    columns={woColumns}
                    rowKey="_id"
                    pagination={false}
                    size="small"
                  />
                )}
              </Card>
            </Col>
            <Col span={8}>
              <Card title="🎁 积分流水" style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
                {recentTransactions.length === 0 ? (
                  <Empty description="暂无流水" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }} />
                ) : (
                  <List
                    dataSource={recentTransactions}
                    renderItem={(item: any) => (
                      <List.Item style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                          <div>
                            <div style={{ fontSize: 13 }}>{item.description || item.type}</div>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(item.createdAt).toLocaleDateString('zh-CN')}</div>
                          </div>
                          <Text strong style={{ color: item.amount > 0 ? '#22c55e' : '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>
                            {item.amount > 0 ? '+' : ''}{item.amount}
                          </Text>
                        </div>
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </Col>
          </Row>
        )}

        {tab === 'workorders' && (
          <Card style={{ borderRadius: 12 }}>
            <Table
              dataSource={recentWorkOrders}
              columns={woColumns}
              rowKey="_id"
              pagination={{ pageSize: 15 }}
            />
          </Card>
        )}

        {tab === 'transactions' && (
          <Card style={{ borderRadius: 12 }}>
            <Table
              dataSource={recentTransactions}
              columns={txnColumns}
              rowKey="_id"
              pagination={{ pageSize: 15 }}
            />
          </Card>
        )}
      </div>
    </div>
  );
}
