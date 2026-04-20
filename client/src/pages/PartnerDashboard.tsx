import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, Tag, Table, Typography, Space, Button, Spin, List, Badge } from 'antd';
import { ThunderboltOutlined, GiftOutlined, TeamOutlined, ShopOutlined, LogoutOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';

const { Title, Text } = Typography;

const LEVEL_TEXT: Record<string, string> = { bronze: '铜牌', silver: '银牌', gold: '金牌', diamond: '钻牌' };
const LEVEL_COLOR: Record<string, string> = { bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', diamond: '#b9f2ff' };
const TXN_TYPE_TEXT: Record<string, string> = { earn: '赚取', redeem: '兑换', adjust: '调整', expire: '过期', deduct: '扣分' };
const TXN_COLOR: Record<string, string> = { earn: 'green', redeem: 'blue', adjust: 'orange', expire: 'default', deduct: 'red' };

export default function PartnerDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('partner_token');
    if (!token) { navigate('/partner-login'); return; }

    fetch('/api/partners/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(res => {
        if (res.success) setData(res.data);
        else navigate('/partner-login');
      })
      .catch(() => navigate('/partner-login'))
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    localStorage.removeItem('partner_token');
    localStorage.removeItem('partner_user');
    navigate('/partner-login');
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin size="large" /></div>;
  if (!data) return null;

  const { partner, levelProgress, stats, recentTransactions, subPartners } = data;

  return (
    <div style={{ padding: 24, background: '#f5f6f8', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <Link to="/partner-login" style={{ color: '#9ca3af', fontSize: 13 }}><HomeOutlined /> 返回主站</Link>
          </div>
          <Title level={4} style={{ margin: 0 }}>渠道商工作台</Title>
          <Text type="secondary">{partner.name}</Text>
        </div>
        <Space wrap>
          <Tag style={{ background: LEVEL_COLOR[partner.level] + '30', border: `1px solid ${LEVEL_COLOR[partner.level]}`, color: LEVEL_COLOR[partner.level], fontWeight: 700 }}>
            {LEVEL_TEXT[partner.level]} {partner.type === 'distributor' ? '分销商' : '安装商'}
          </Tag>
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>退出</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        {/* 积分卡片 */}
        <Col span={8}>
          <Card style={{ borderRadius: 12, background: 'linear-gradient(135deg, #1a1a2e, #2d2d44)' }}>
            <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 8 }}>可用积分</div>
            <div style={{ fontSize: 40, fontWeight: 800, color: '#ffd700', fontFamily: 'JetBrains Mono, monospace' }}>
              {partner.availablePoints.toLocaleString()}
            </div>
            <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>累计 {partner.totalPoints.toLocaleString()} 分</div>
          </Card>
        </Col>

        {/* 等级进度 */}
        <Col span={8}>
          <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text strong>等级进度</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>{LEVEL_TEXT[partner.level]} → {levelProgress.nextLevel ? LEVEL_TEXT[levelProgress.nextLevel] : '已满级'}</Text>
            </div>
            <Progress
              percent={levelProgress.progress}
              strokeColor={LEVEL_COLOR[partner.level]}
              trailColor="#e5e7eb"
              size="small"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>{partner.totalPoints.toLocaleString()} 分</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>{levelProgress.nextThreshold ? `${levelProgress.nextThreshold.toLocaleString()} 分升级` : '已满级'}</Text>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              {['bronze', 'silver', 'gold', 'diamond'].map(lv => (
                <div key={lv} style={{
                  flex: 1, textAlign: 'center', padding: '4px 0', borderRadius: 6,
                  background: partner.level === lv ? LEVEL_COLOR[lv] + '20' : '#f3f4f6',
                  color: partner.level === lv ? LEVEL_COLOR[lv] : '#9ca3af',
                  fontSize: 10, fontWeight: 700,
                }}>
                  {LEVEL_TEXT[lv]}
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* 快捷统计 */}
        <Col span={8}>
          <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 20 }}>
            <Row gutter={[8, 8]}>
              <Col span={12}><Statistic title="工单总数" value={stats.totalWorkOrders} size="small" /></Col>
              <Col span={12}><Statistic title="待处理" value={stats.openWorkOrders} size="small" valueStyle={{ color: '#e6342a' }} /></Col>
              <Col span={12}><Statistic title="下级渠道" value={stats.subPartners} size="small" /></Col>
              <Col span={12}><Statistic title="待审核兑换" value={stats.pendingRedemptions} size="small" valueStyle={{ color: '#fa8c16' }} /></Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* 积分流水 */}
        <Col span={14}>
          <Card title="💰 积分流水" extra={<Button size="small" onClick={() => navigate('/partner-transactions')}>查看全部</Button>} style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
            {recentTransactions.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>暂无流水记录</div>
            ) : (
              <List
                dataSource={recentTransactions}
                renderItem={(item: any) => (
                  <List.Item style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, color: '#1a1a2e' }}>{item.description}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(item.createdAt).toLocaleString('zh-CN')}</div>
                      </div>
                      <Space>
                        <Tag color={TXN_COLOR[item.type]}>{TXN_TYPE_TEXT[item.type] || item.type}</Tag>
                        <Text strong style={{ color: item.amount > 0 ? '#22c55e' : '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>
                          {item.amount > 0 ? '+' : ''}{item.amount.toLocaleString()}
                        </Text>
                      </Space>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        {/* 积分商城 */}
        <Col span={10}>
          <Card title="🎁 积分商城" extra={<Button size="small" type="primary" icon={<ShopOutlined />} onClick={() => navigate('/partner-mall')}>兑换</Button>} style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
            <div style={{ padding: 20 }}>
              {[
                { name: '小米充电宝 10000mAh', points: 500, img: '🔋' },
                { name: '公牛插排 6位', points: 300, img: '🔌' },
                { name: '光伏运维工具套装', points: 2000, img: '🛠️' },
                { name: '大疆无人机 Mavic 3', points: 50000, img: '🚁' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 3 ? '1px solid #f0f2f5' : 'none' }}>
                  <div style={{ fontSize: 28 }}>{item.img}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>{item.points.toLocaleString()} 分</div>
                  </div>
                  <Button size="small" disabled={partner.availablePoints < item.points}>兑换</Button>
                </div>
              ))}
            </div>
          </Card>

          {/* 下级渠道 */}
          {subPartners.length > 0 && (
            <Card title="🏗️ 下级渠道" style={{ borderRadius: 12, marginTop: 16 }} bodyStyle={{ padding: 0 }}>
              <List
                dataSource={subPartners}
                renderItem={(item: any) => (
                  <List.Item style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <Text>{item.name}</Text>
                      <Space>
                        <Tag style={{ background: LEVEL_COLOR[item.level] + '20', border: `1px solid ${LEVEL_COLOR[item.level]}`, color: LEVEL_COLOR[item.level] }}>
                          {LEVEL_TEXT[item.level]}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>{item.totalPoints.toLocaleString()} 分</Text>
                      </Space>
                    </div>
                  </List.Item>
                )}
              />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
