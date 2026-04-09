import { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, Select, Statistic, Row, Col, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined } from '@ant-design/icons';
import { alertApi, stationApi } from '../services/api';

const LEVEL_COLOR: Record<string, string> = {
  critical: 'red',
  major: 'orange',
  minor: 'gold',
};
const LEVEL_TEXT: Record<string, string> = {
  critical: '严重',
  major: '重要',
  minor: '一般',
};

export default function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, critical: 0, major: 0, minor: 0, unacknowledged: 0 });
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [filterStation, setFilterStation] = useState<string>('');

  useEffect(() => { loadStats(); loadAlerts(); loadStations(); }, []);
  useEffect(() => { loadAlerts(); }, [filterLevel, filterStation]);

  async function loadStats() {
    const res = await alertApi.getStats();
    if (res.success) setStats(res.data);
  }

  async function loadAlerts() {
    setLoading(true);
    const params: any = {};
    if (filterLevel) params.level = filterLevel;
    if (filterStation) params.stationId = filterStation;
    const res = await alertApi.getAll(params);
    if (res.success) setAlerts(res.data);
    setLoading(false);
  }

  async function handleAcknowledge(id: string) {
    await alertApi.acknowledge(id);
    message.success('已确认');
    loadAlerts();
    loadStats();
  }

  async function handleBatchAck() {
    if (selectedRowKeys.length === 0) return;
    await alertApi.acknowledgeBatch(selectedRowKeys as string[]);
    message.success(`已确认 ${selectedRowKeys.length} 条告警`);
    setSelectedRowKeys([]);
    loadAlerts();
    loadStats();
  }

  const columns: ColumnsType<any> = [
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 170, render: v => new Date(v).toLocaleString('zh-CN') },
    { title: '级别', dataIndex: 'level', key: 'level', render: l => <Tag color={LEVEL_COLOR[l]}>{LEVEL_TEXT[l]}</Tag> },
    { title: '电站', dataIndex: ['stationId', 'name'], key: 'station', render: v => v || '-' },
    { title: '告警内容', dataIndex: 'message', key: 'message' },
    { title: '状态', dataIndex: 'acknowledged', key: 'acknowledged', render: a => (
      <Tag color={a ? 'green' : 'red'}>{a ? '已确认' : '未确认'}</Tag>
    )},
    { title: '操作', key: 'action', width: 100, render: (_, r) => !r.acknowledged && (
      <Button size="small" icon={<CheckOutlined />} onClick={() => handleAcknowledge(r._id)}>确认</Button>
    )},
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={5}><Statistic title="告警总数" value={stats.total} /></Col>
        <Col span={5}><Statistic title="严重" value={stats.critical} valueStyle={{ color: '#ff4d4f' }} /></Col>
        <Col span={5}><Statistic title="重要" value={stats.major} valueStyle={{ color: '#fa8c16' }} /></Col>
        <Col span={5}><Statistic title="一般" value={stats.minor} valueStyle={{ color: '#faad14' }} /></Col>
        <Col span={4}><Statistic title="未确认" value={stats.unacknowledged} valueStyle={{ color: stats.unacknowledged > 0 ? '#ff4d4f' : '#52c41a' }} /></Col>
      </Row>

      <Card
        title="告警管理"
        extra={
          <Space>
            <Select value={filterLevel} onChange={setFilterLevel} placeholder="级别筛选" allowClear style={{ width: 100 }}
              options={[{ value: 'critical', label: '严重' }, { value: 'major', label: '重要' }, { value: 'minor', label: '一般' }]} />
            <Select value={filterStation} onChange={setFilterStation} placeholder="电站筛选" allowClear style={{ width: 150 }}
              options={stations.map(s => ({ value: s._id, label: s.name }))} />
            <Button type="primary" icon={<CheckOutlined />} onClick={handleBatchAck} disabled={selectedRowKeys.length === 0}>
              批量确认 {selectedRowKeys.length > 0 && `(${selectedRowKeys.length})`}
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={alerts}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        />
      </Card>
    </div>
  );
}
