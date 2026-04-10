import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Tag, Typography, Space } from 'antd';
import { AlertOutlined, ToolOutlined, FileTextOutlined, RightOutlined, ThunderboltOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { alertApi, workOrderApi, stationApi } from '../services/api';

const { Text } = Typography;

const LEVEL_COLOR: Record<string, string> = {
  critical: '#ff5252', major: '#ffab40', minor: '#5a6a7a',
};
const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#ff5252', important: '#ffab40', normal: '#5a6a7a',
};
const PRIORITY_TEXT: Record<string, string> = {
  urgent: '紧急', important: '重要', normal: '一般',
};
const LEVEL_TEXT: Record<string, string> = {
  critical: '严重', major: '重要', minor: '一般',
};

// ─── Stat Card ────────────────────────────────────────────────────────────
function StatCard({ title, value, icon, accentColor, onClick }: {
  title: string; value: number; icon: React.ReactNode; accentColor?: string; onClick?: () => void;
}) {
  return (
    <Card
      size="small"
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        background: '#141c2e',
        border: `1px solid ${accentColor ? accentColor + '30' : '#2a3a52'}`,
        borderRadius: 10,
        textAlign: 'center',
        transition: 'border-color 0.2s, transform 0.2s',
      }}
      styles={{ body: { padding: '14px 10px' } }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = accentColor || '#00e5c0'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = accentColor ? accentColor + '30' : '#2a3a52'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
    >
      <div style={{ color: '#5a6a7a', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, color: accentColor || '#00e5c0', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 18, marginTop: 6, color: accentColor ? accentColor + '99' : '#5a6a7a' }}>{icon}</div>
    </Card>
  );
}

// ─── Alert Item ────────────────────────────────────────────────────────────
function AlertItem({ item, onClick }: { item: any; onClick?: () => void }) {
  const isUrgent = item.level === 'critical' && !item.acknowledged;
  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 16px', borderBottom: '1px solid #1e2d42',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
        background: isUrgent ? 'rgba(255,82,82,0.06)' : 'transparent',
        transition: 'background 0.2s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1a2438'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isUrgent ? 'rgba(255,82,82,0.06)' : 'transparent'; }}
    >
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: LEVEL_COLOR[item.level], boxShadow: `0 0 6px ${LEVEL_COLOR[item.level]}`, flexShrink: 0 }} />
      <Tag style={{ background: LEVEL_COLOR[item.level] + '15', border: `1px solid ${LEVEL_COLOR[item.level]}50`, color: LEVEL_COLOR[item.level], fontSize: 10, padding: '0 6px', flexShrink: 0 }}>
        {LEVEL_TEXT[item.level]}
      </Tag>
      <Text style={{ flex: 1, fontSize: 13, color: isUrgent ? LEVEL_COLOR[item.level] : '#c8d4e0', fontFamily: 'Inter, sans-serif' }} ellipsis>
        {item.message}
      </Text>
      <Text style={{ fontSize: 11, color: '#5a6a7a', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
        {new Date(item.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
      </Text>
    </div>
  );
}

// ─── Order Item ────────────────────────────────────────────────────────────
function OrderItem({ item, onClick }: { item: any; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 16px', borderBottom: '1px solid #1e2d42',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
        transition: 'background 0.2s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1a2438'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <Tag style={{ background: PRIORITY_COLOR[item.priority] + '15', border: `1px solid ${PRIORITY_COLOR[item.priority]}50`, color: PRIORITY_COLOR[item.priority], fontSize: 10, padding: '0 6px', flexShrink: 0 }}>
        {PRIORITY_TEXT[item.priority]}
      </Tag>
      <Text style={{ flex: 1, fontSize: 13, color: '#c8d4e0', fontFamily: 'Inter, sans-serif' }} ellipsis>
        {item.title}
      </Text>
      <Text style={{ fontSize: 11, color: '#5a6a7a', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
        {item.orderNo}
      </Text>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [alertStats, setAlertStats] = useState({ total: 0, critical: 0, major: 0, minor: 0, unacknowledged: 0 });
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [stationCount, setStationCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 60000); // refresh every minute
    return () => clearInterval(t);
  }, []);

  async function loadData() {
    const [alertRes, orderRes, stationRes] = await Promise.all([
      alertApi.getStats(),
      workOrderApi.getAll({ status: 'created' }),
      stationApi.getAll(),
    ]);
    if (alertRes.success) setAlertStats(alertRes.data);
    if (orderRes.success) setRecentOrders(orderRes.data.slice(0, 5));
    if (stationRes.success) setStationCount(stationRes.data.length);
    const alerts = await alertApi.getAll({ limit: 10 });
    if (alerts.success) setRecentAlerts(alerts.data);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stat Cards */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}>
          <StatCard title="电站总数" value={stationCount} icon={<ToolOutlined />} accentColor="#00e5c0" onClick={() => navigate('/stations')} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="未确认告警" value={alertStats.unacknowledged} icon={<AlertOutlined />} accentColor={alertStats.unacknowledged > 0 ? '#ff5252' : '#00e676'} onClick={() => navigate('/alerts')} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="严重告警" value={alertStats.critical} icon={<ThunderboltOutlined />} accentColor="#ff5252" onClick={() => navigate('/alerts?level=critical')} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="待处理工单" value={recentOrders.length} icon={<FileTextOutlined />} accentColor="#ffab40" onClick={() => navigate('/work-orders')} />
        </Col>
      </Row>

      {/* Content */}
      <Row gutter={[12, 12]}>
        {/* Recent Alerts */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <AlertOutlined style={{ color: '#00e5c0' }} />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: '#c8d4e0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>最近告警</span>
              </Space>
            }
            extra={<a onClick={() => navigate('/alerts')} style={{ color: '#00e5c0', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer' }}>查看全部 <RightOutlined /></a>}
            style={{ background: '#141c2e', border: '1px solid #2a3a52', borderRadius: 10 }}
            styles={{ body: { padding: 0 } }}
          >
            {recentAlerts.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#5a6a7a', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>暂无告警 ✅</div>
            ) : (
              recentAlerts.map((item, i) => <AlertItem key={item._id || i} item={item} onClick={() => navigate('/alerts')} />)
            )}
          </Card>
        </Col>

        {/* Recent Work Orders */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <FileTextOutlined style={{ color: '#00e5c0' }} />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: '#c8d4e0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>待处理工单</span>
              </Space>
            }
            extra={<a onClick={() => navigate('/work-orders')} style={{ color: '#00e5c0', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer' }}>查看全部 <RightOutlined /></a>}
            style={{ background: '#141c2e', border: '1px solid #2a3a52', borderRadius: 10 }}
            styles={{ body: { padding: 0 } }}
          >
            {recentOrders.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#5a6a7a', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>暂无待处理工单 ✅</div>
            ) : (
              recentOrders.map((item, i) => <OrderItem key={item._id || i} item={item} onClick={() => navigate('/work-orders')} />)
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
