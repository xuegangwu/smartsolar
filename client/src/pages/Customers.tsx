import { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Button, Space, Modal, Form, Input, Select,
  message, Typography, Row, Col, Statistic, Rate, Divider,
  List, Timeline, Empty, Spin, Badge,
} from 'antd';
import {
  UserOutlined, HomeOutlined, FileTextOutlined, StarOutlined,
  PhoneOutlined, BankOutlined, PlusOutlined, EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface Owner {
  _id: string;
  name: string;
  contact: string;
  phone: string;
  idCard: string;
  address: string;
  // 项目统计
  projectCount: number;
  stationCount: number;
  totalCapacity: number;
  satisfaction: number;  // 1-5
  // 服务记录
  projects: any[];
  workOrders: any[];
}

// 从后端获取业主列表（汇总 projects 的 owner 信息）
async function fetchOwners(): Promise<Owner[]> {
  const token = localStorage.getItem('smartsolar_token');
  const [projectsRes, stationsRes, workOrdersRes] = await Promise.all([
    fetch('/api/projects', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    fetch('/api/stations', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    fetch('/api/work-orders', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  ]);

  if (!projectsRes.success) return [];

  const projects = projectsRes.data || [];
  const stations: any[] = (stationsRes.data || []).map((s: any) => ({ ...s, _id: s._id?.$oid || s._id }));
  const workOrders: any[] = (workOrdersRes.data || []).map((w: any) => ({ ...w, _id: w._id?.$oid || w._id }));

  // 按业主姓名+电话聚合
  const ownerMap = new Map<string, Owner>();

  for (const p of projects) {
    if (!p.owner?.name) continue;
    const key = `${p.owner.name}||${p.owner.phone || ''}`;
    if (!ownerMap.has(key)) {
      ownerMap.set(key, {
        _id: key,
        name: p.owner.name,
        contact: p.owner.contact || '',
        phone: p.owner.phone || '',
        idCard: p.owner.idCard || '',
        address: p.owner.address || '',
        projectCount: 0,
        stationCount: 0,
        totalCapacity: 0,
        satisfaction: 4.5,
        projects: [],
        workOrders: [],
      });
    }
    const o = ownerMap.get(key)!;
    o.projectCount++;
    o.projects.push({ name: p.name, code: p.code, phase: p.phase, progress: p.progress, status: p.status });
  }

  // 关联电站
  for (const s of stations) {
    if (!s.owner) continue;
    const key = `${s.owner}||`;
    const match = Array.from(ownerMap.values()).find(o => o.name === s.owner);
    if (match) {
      match.stationCount++;
      match.totalCapacity += s.capacity || s.installedCapacity || 0;
    }
  }

  // 关联工单（按电站找业主）
  for (const wo of workOrders) {
    const station = stations.find((s: any) => (s._id?.$oid || s._id) === (wo.stationId?._id?.$oid || wo.stationId?._id));
    if (station?.owner) {
      const match = Array.from(ownerMap.values()).find(o => o.name === station.owner);
      if (match) {
        match.workOrders.push({
          orderNo: wo.orderNo,
          title: wo.title,
          status: wo.status,
          type: wo.type,
          createdAt: wo.createdAt,
        });
      }
    }
  }

  return Array.from(ownerMap.values());
}

const WO_STATUS_TEXT: Record<string, string> = {
  created: '待派发', assigned: '已派发', accepted: '已接单',
  processing: '处理中', accepted_check: '待验收', closed: '已完工',
};
const WO_STATUS_COLOR: Record<string, string> = {
  created: 'default', assigned: 'blue', accepted: 'cyan',
  processing: 'orange', accepted_check: 'purple', closed: 'green',
};

export default function Customers() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selected, setSelected] = useState<Owner | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const data = await fetchOwners();
    setOwners(data);
    setLoading(false);
  }

  function handleDetail(owner: Owner) {
    setSelected(owner);
    setDetailModal(true);
  }

  const columns: ColumnsType<Owner> = [
    { title: '业主姓名', dataIndex: 'name', render: v => <Space><UserOutlined />{v}</Space>, width: 130 },
    { title: '联系电话', dataIndex: 'phone', render: v => v || '-', width: 140 },
    { title: '关联项目', dataIndex: 'projectCount', render: v => <Badge count={v} style={{ backgroundColor: '#3b82f6' }} />, width: 90 },
    { title: '关联电站', dataIndex: 'stationCount', render: v => <Badge count={v} style={{ backgroundColor: '#22c55e' }} />, width: 90 },
    {
      title: '装机容量',
      dataIndex: 'totalCapacity',
      render: (v: number) => v > 0 ? `${(v / 1000).toFixed(1)}k kW` : '-',
      width: 120,
    },
    {
      title: '满意度',
      dataIndex: 'satisfaction',
      render: (v: number) => <Rate disabled value={v} style={{ fontSize: 12 }} />,
      width: 140,
    },
    { title: '服务工单', dataIndex: 'workOrders', render: (v: any[]) => v?.length || 0, width: 90 },
    {
      title: '操作', key: 'action', width: 100,
      render: (_, r) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => handleDetail(r)}>详情</Button>
      ),
    },
  ];

  const totalProjects = owners.reduce((s, o) => s + o.projectCount, 0);
  const totalStations = owners.reduce((s, o) => s + o.stationCount, 0);
  const totalCapacity = owners.reduce((s, o) => s + o.totalCapacity, 0);
  const avgSat = owners.length ? (owners.reduce((s, o) => s + o.satisfaction, 0) / owners.length).toFixed(1) : '5.0';

  return (
    <div style={{ padding: 24 }}>
      <Title level={4}>👤 业主管理</Title>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={5}><Statistic title="业主总数" value={owners.length} prefix={<UserOutlined />} /></Col>
        <Col span={5}><Statistic title="项目总数" value={totalProjects} valueStyle={{ color: '#3b82f6' }} /></Col>
        <Col span={5}><Statistic title="电站总数" value={totalStations} valueStyle={{ color: '#22c55e' }} /></Col>
        <Col span={5}><Statistic title="装机总容量" value={totalCapacity ? `${(totalCapacity/1000).toFixed(1)}k kW` : '-'} valueStyle={{ color: '#8b5cf6' }} /></Col>
        <Col span={4}><Statistic title="平均满意度" value={avgSat} suffix="/ 5" prefix={<StarOutlined />} valueStyle={{ color: '#f59e0b' }} /></Col>
      </Row>

      <Card extra={<Button onClick={loadData}>刷新</Button>}>
        {loading ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          : owners.length === 0 ? (
            <Empty description="暂无业主数据（创建项目时录入业主信息）" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Table columns={columns} dataSource={owners} rowKey="_id" pagination={{ pageSize: 15 }} size="small" />
          )}
      </Card>

      {/* Detail Modal */}
      <Modal
        title={<Space><UserOutlined /><span>{selected?.name}</span></Space>}
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={<Button onClick={() => setDetailModal(false)}>关闭</Button>}
        width={780}
      >
        {selected && (
          <div>
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
              <Col span={6}><Card size="small"><Statistic title="项目数" value={selected.projectCount} /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="电站数" value={selected.stationCount} valueStyle={{ color: '#22c55e' }} /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="装机容量" value={selected.totalCapacity ? `${(selected.totalCapacity/1000).toFixed(1)}k kW` : '-'} valueStyle={{ color: '#8b5cf6' }} /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="满意度" value={selected.satisfaction.toFixed(1)} suffix="/ 5" prefix={<StarOutlined />} valueStyle={{ color: '#f59e0b' }} /></Card></Col>
            </Row>

            <Row gutter={[16, 0]} style={{ marginBottom: 16 }}>
              <Col span={8}><Text type="secondary">联系电话：</Text>{selected.phone || '-'}</Col>
              <Col span={8}><Text type="secondary">联系人：</Text>{selected.contact || '-'}</Col>
              <Col span={8}><Text type="secondary">地址：</Text>{selected.address || '-'}</Col>
            </Row>

            <Divider>项目列表</Divider>
            {selected.projects.length === 0 ? (
              <Empty description="暂无项目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                dataSource={selected.projects}
                renderItem={(p: any) => (
                  <List.Item>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Space direction="vertical" size={0}>
                        <Text strong>{p.name}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{p.code}</Text>
                      </Space>
                      <Space>
                        <Tag color={p.status === 'completed' ? 'green' : p.status === 'in_progress' ? 'blue' : 'default'}>
                          {p.status === 'completed' ? '已完成' : p.status === 'in_progress' ? '进行中' : '规划中'}
                        </Tag>
                        <Tag>{p.phase}</Tag>
                        <Text style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{p.progress}%</Text>
                      </Space>
                    </Space>
                  </List.Item>
                )}
              />
            )}

            {selected.workOrders.length > 0 && (
              <>
                <Divider>服务记录（最近10条）</Divider>
                <Timeline
                  items={selected.workOrders.slice(0, 10).map((wo: any) => ({
                    color: wo.status === 'closed' ? 'green' : 'gray',
                    children: (
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space direction="vertical" size={0}>
                          <Text style={{ fontSize: 13 }}>{wo.title}</Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>{wo.orderNo}</Text>
                        </Space>
                        <Space>
                          <Tag color={WO_STATUS_COLOR[wo.status] || 'default'}>{WO_STATUS_TEXT[wo.status] || wo.status}</Tag>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {new Date(wo.createdAt).toLocaleDateString('zh-CN')}
                          </Text>
                        </Space>
                      </Space>
                    ),
                  }))}
                />
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
