import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Tag, List, Typography, Space, Badge } from 'antd';
import { AlertOutlined, ToolOutlined, FileTextOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { alertApi, workOrderApi, stationApi } from '../services/api';

const { Text } = Typography;

const LEVEL_COLOR: Record<string, string> = {
  critical: 'red', major: 'orange', minor: 'gold',
};
const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'red', important: 'orange', normal: 'blue',
};
const PRIORITY_TEXT: Record<string, string> = {
  urgent: '紧急', important: '重要', normal: '一般',
};

function StatCard({ title, value, icon, color, onClick }: {
  title: string; value: number; icon: React.ReactNode; color?: string; onClick?: () => void;
}) {
  return (
    <Card
      size="small"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', borderRadius: 12, textAlign: 'center' }}
      bodyStyle={{ padding: '12px 8px' }}
    >
      <Statistic
        title={<span style={{ fontSize: 12 }}>{title}</span>}
        value={value}
        valueStyle={{ fontSize: 24, color: color || '#333', fontWeight: 700 }}
      />
      <div style={{ fontSize: 20 }}>{icon}</div>
    </Card>
  );
}

export default function Dashboard() {
  const [alertStats, setAlertStats] = useState({ total: 0, critical: 0, major: 0, minor: 0, unacknowledged: 0 });
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [stationCount, setStationCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

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
    <div>
      {/* Stat Cards — 2x2 grid on mobile, 4-col on desktop */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }} className="stat-grid">
        <Col xs={12} sm={6}>
          <StatCard title="电站总数" value={stationCount} icon={<ToolOutlined />} onClick={() => navigate('/stations')} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="未确认告警" value={alertStats.unacknowledged}
            icon={<Badge count={alertStats.unacknowledged} size="small" offset={[8, -4]}><AlertOutlined /></Badge>}
            color={alertStats.unacknowledged > 0 ? '#ff4d4f' : '#52c41a'}
            onClick={() => navigate('/alerts')}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="严重告警" value={alertStats.critical}
            icon={<AlertOutlined style={{ color: '#ff4d4f' }} />}
            color="#ff4d4f"
            onClick={() => navigate('/alerts?level=critical')}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="待处理工单" value={recentOrders.length}
            icon={<FileTextOutlined />}
            onClick={() => navigate('/work-orders')}
          />
        </Col>
      </Row>

      {/* Recent Alerts */}
      <Card
        title={<Space><AlertOutlined />最近告警</Space>}
        size="small"
        extra={<a onClick={() => navigate('/alerts')}>查看全部 <RightOutlined /></a>}
        style={{ borderRadius: 12, marginBottom: 12 }}
        bodyStyle={{ padding: 0 }}
      >
        {recentAlerts.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>暂无告警</div>
        ) : (
          recentAlerts.map((item: any, i: number) => (
            <div
              key={item._id || i}
              onClick={() => navigate('/alerts')}
              style={{
                padding: '10px 16px', borderBottom: i < recentAlerts.length - 1 ? '1px solid #f0f0f0' : 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                background: item.level === 'critical' && !item.acknowledged ? '#fff2f0' : 'transparent',
              }}
            >
              <Tag color={LEVEL_COLOR[item.level]} style={{ flexShrink: 0 }}>{LEVEL_TEXT[item.level]}</Tag>
              <Text style={{ flex: 1, fontSize: 13 }} ellipsis>{item.message}</Text>
              <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
                {new Date(item.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </div>
          ))
        )}
      </Card>

      {/* Recent Work Orders */}
      <Card
        title={<Space><FileTextOutlined />待处理工单</Space>}
        size="small"
        extra={<a onClick={() => navigate('/work-orders')}>查看全部 <RightOutlined /></a>}
        style={{ borderRadius: 12 }}
        bodyStyle={{ padding: 0 }}
      >
        {recentOrders.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>暂无待处理工单</div>
        ) : (
          recentOrders.map((item: any, i: number) => (
            <div
              key={item._id || i}
              onClick={() => navigate('/work-orders')}
              style={{
                padding: '10px 16px', borderBottom: i < recentOrders.length - 1 ? '1px solid #f0f0f0' : 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <Tag color={PRIORITY_COLOR[item.priority]} style={{ flexShrink: 0 }}>{PRIORITY_TEXT[item.priority]}</Tag>
              <Text style={{ flex: 1, fontSize: 13 }} ellipsis>{item.title}</Text>
              <Text code style={{ fontSize: 11, flexShrink: 0 }}>{item.orderNo}</Text>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

const LEVEL_TEXT: Record<string, string> = {
  critical: '严重', major: '重要', minor: '一般',
};
