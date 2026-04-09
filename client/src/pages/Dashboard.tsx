import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Tag, List, Typography, Space } from 'antd';
import { AlertOutlined, ToolOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { alertApi, workOrderApi, stationApi } from '../services/api';

const { Text } = Typography;

const LEVEL_COLOR: Record<string, string> = {
  critical: 'red',
  major: 'orange',
  minor: 'gold',
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'red',
  important: 'orange',
  normal: 'blue',
};

export default function Dashboard() {
  const [alertStats, setAlertStats] = useState({ total: 0, critical: 0, major: 0, minor: 0, unacknowledged: 0 });
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [stationCount, setStationCount] = useState(0);

  useEffect(() => {
    loadData();
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

    const alerts = await alertApi.getAll({ limit: 8 });
    if (alerts.success) setRecentAlerts(alerts.data);
  }

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Statistic title="电站总数" value={stationCount} prefix={<ToolOutlined />} /></Col>
        <Col span={6}><Statistic title="未确认告警" value={alertStats.unacknowledged} valueStyle={{ color: alertStats.unacknowledged > 0 ? '#ff4d4f' : '#52c41a' }} prefix={<AlertOutlined />} /></Col>
        <Col span={6}><Statistic title="严重告警" value={alertStats.critical} valueStyle={{ color: '#ff4d4f' }} /></Col>
        <Col span={6}><Statistic title="待处理工单" value={recentOrders.length} prefix={<FileTextOutlined />} /></Col>
      </Row>

      <Row gutter={16}>
        <Col span={14}>
          <Card title="最近告警" size="small">
            <List
              size="small"
              dataSource={recentAlerts}
              renderItem={(item: any) => (
                <List.Item>
                  <Space>
                    <Tag color={LEVEL_COLOR[item.level]}>{item.level}</Tag>
                    <Text>{item.message}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(item.createdAt).toLocaleString('zh-CN')}
                    </Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col span={10}>
          <Card title="待处理工单" size="small">
            <List
              size="small"
              dataSource={recentOrders}
              renderItem={(item: any) => (
                <List.Item>
                  <Space>
                    <Tag color={PRIORITY_COLOR[item.priority]}>{item.priority}</Tag>
                    <Text>{item.title}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.orderNo}
                    </Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
