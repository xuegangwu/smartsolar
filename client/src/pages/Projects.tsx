import { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Button, Space, Modal, Form, Input, Select,
  message, Popconfirm, Typography, Row, Col, Statistic, Progress,
  Timeline, Divider, Badge, DatePicker, InputNumber, List, Checkbox,
  Empty, Spin, Tooltip, Steps,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined,
  ClockCircleOutlined, CloseCircleOutlined, FieldTimeOutlined,
  TrophyOutlined, FileTextOutlined, BuildOutlined, ThunderboltOutlined,
  SafetyCertificateOutlined, RocketOutlined, BankOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { partnerApi } from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const PHASES = ['设计', '设计审批', '设备采购', '施工建设', '并网申请', '并网验收', '完工移交'];
const PHASE_ICONS: Record<string, React.ReactNode> = {
  '设计': <BuildOutlined />, '设计审批': <SafetyCertificateOutlined />,
  '设备采购': <FileTextOutlined />, '施工建设': <FieldTimeOutlined />,
  '并网申请': <ThunderboltOutlined />, '并网验收': <TrophyOutlined />, '完工移交': <RocketOutlined />,
};
const PHASE_COLOR: Record<string, string> = {
  '设计': '#3b82f6', '设计审批': '#8b5cf6', '设备采购': '#f59e0b',
  '施工建设': '#ef4444', '并网申请': '#06b6d4', '并网验收': '#22c55e', '完工移交': '#10b981',
};
const PHASE_STEP: Record<string, number> = { '设计': 0, '设计审批': 1, '设备采购': 2, '施工建设': 3, '并网申请': 4, '并网验收': 5, '完工移交': 6 };
const STATUS_TEXT: Record<string, string> = { planning: '规划中', in_progress: '进行中', suspended: '已暂停', completed: '已完成', cancelled: '已取消' };
const STATUS_COLOR: Record<string, string> = { planning: 'default', in_progress: 'processing', suspended: 'warning', completed: 'success', cancelled: 'error' };
const TYPE_TEXT: Record<string, string> = { solar: '光伏', storage: '储能', solar_storage: '光储' };

interface Project extends any {
  _id: string; code: string; name: string; type: string;
  location: any; capacity: number; phase: string; progress: number;
  status: string; phases: any[]; budget: number; actualCost: number;
  owner: any; installerPartnerId: any; managerId: any; stationId: any;
  planStartDate: string; planEndDate: string;
  actualStartDate: string; actualEndDate: string;
  milestones: any[]; docs: any[];
}

export default function Projects() {
  const [data, setData] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [selected, setSelected] = useState<Project | null>(null);
  const [form] = Form.useForm();
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPhase, setFilterPhase] = useState('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => { loadData(); loadStats(); }, [filterStatus, filterPhase]);

  async function loadStats() {
    const token = localStorage.getItem('smartsolar_token');
    const res = await fetch('/api/projects/stats/summary', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
    if (res.success) setStats(res.data);
  }

  async function loadData() {
    setLoading(true);
    const token = localStorage.getItem('smartsolar_token');
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (filterPhase) params.set('phase', filterPhase);
    const res = await fetch(`/api/projects?${params}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
    if (res.success) setData(res.data);
    setLoading(false);
  }

  function handleAdd() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 'planning', type: 'solar_storage' });
    setModal(true);
  }

  function handleEdit(record: Project) {
    setEditing(record);
    form.setFieldsValue(record);
    setModal(true);
  }

  function handleDetail(record: Project) {
    loadProjectDetail(record._id);
  }

  async function loadProjectDetail(id: string) {
    const token = localStorage.getItem('smartsolar_token');
    const res = await fetch(`/api/projects/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
    if (res.success) {
      setSelected(res.data);
      setDetailModal(true);
    }
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    const token = localStorage.getItem('smartsolar_token');
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/projects/${editing._id}` : '/api/projects';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(values),
    }).then(r => r.json());
    if (res.success) { message.success(editing ? '已更新' : '已创建'); loadData(); loadStats(); }
    setModal(false);
  }

  async function handlePhaseUpdate(phaseName: string, status: string, progress: number) {
    const token = localStorage.getItem('smartsolar_token');
    const res = await fetch(`/api/projects/${selected._id}/phase`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phaseName, status, progress }),
    }).then(r => r.json());
    if (res.success) {
      message.success('阶段已更新');
      loadProjectDetail(selected._id);
      loadData();
      loadStats();
    } else {
      message.error(res.message);
    }
  }

  async function handleAddMilestone(values: any) {
    const token = localStorage.getItem('smartsolar_token');
    const res = await fetch(`/api/projects/${selected._id}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(values),
    }).then(r => r.json());
    if (res.success) { message.success('里程碑已添加'); loadProjectDetail(selected._id); }
  }

  async function handleToggleMilestone(milestone: any) {
    const token = localStorage.getItem('smartsolar_token');
    await fetch(`/api/projects/${selected._id}/milestones/${milestone._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ completed: !milestone.completedAt }),
    }).then(r => r.json());
    loadProjectDetail(selected._id);
  }

  const columns: ColumnsType<Project> = [
    { title: '项目名称', render: (_, r) => (
      <Space direction="vertical" size={0}>
        <Space>
          <Text strong>{r.name}</Text>
          <Tag color={STATUS_COLOR[r.status]}>{STATUS_TEXT[r.status]}</Tag>
        </Space>
        <Text type="secondary" style={{ fontSize: 12 }}>{r.code}</Text>
      </Space>
    ), width: 240 },
    { title: '类型', dataIndex: 'type', render: t => <Tag>{TYPE_TEXT[t] || t}</Tag>, width: 80 },
    { title: '当前阶段', dataIndex: 'phase', render: (p: string) => (
      <Space>
        <Tag color={PHASE_COLOR[p]}>{p}</Tag>
      </Space>
    ), width: 100 },
    { title: '进度', dataIndex: 'progress', render: (v: number) => (
      <Progress percent={v} size="small" strokeColor={PHASE_COLOR[r.phase]} style={{ width: 100 }} />
    ), width: 130 },
    { title: '预算', dataIndex: 'budget', render: (v: number) => v ? `${v}万元` : '-', width: 90 },
    { title: '实际成本', dataIndex: 'actualCost', render: (v: number) => v ? `${v}万元` : '-', width: 100 },
    { title: '安装商', render: (_, r) => r.installerPartnerId?.name || '-', width: 140 },
    { title: '计划工期', render: (_, r) => {
      if (!r.planStartDate) return '-';
      const s = new Date(r.planStartDate).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
      const e = r.planEndDate ? new Date(r.planEndDate).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) : '-';
      return `${s} ~ ${e}`;
    }, width: 130 },
    {
      title: '操作', key: 'action', width: 140,
      render: (_, r) => (
        <Space>
          <Button size="small" type="link" onClick={() => handleDetail(r)}>详情</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)} />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={4}>🏗️ 项目建设管理</Title>

      {/* Stats */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={4}><Statistic title="项目总数" value={stats.total || 0} prefix={<BuildOutlined />} /></Col>
          <Col span={4}><Statistic title="进行中" value={stats.byStatus?.in_progress || 0} valueStyle={{ color: '#3b82f6' }} /></Col>
          <Col span={4}><Statistic title="已完成" value={stats.byStatus?.completed || 0} valueStyle={{ color: '#22c55e' }} /></Col>
          <Col span={4}><Statistic title="规划中" value={stats.byStatus?.planning || 0} valueStyle={{ color: '#94a3b8' }} /></Col>
        </Row>
      )}

      <Card extra={
        <Space>
          <Select placeholder="阶段筛选" allowClear value={filterPhase || undefined} onChange={v => setFilterPhase(v || '')} style={{ width: 120 }}
            options={PHASES.map(p => ({ value: p, label: p }))} />
          <Select placeholder="状态筛选" allowClear value={filterStatus || undefined} onChange={v => setFilterStatus(v || '')} style={{ width: 110 }}
            options={Object.entries(STATUS_TEXT).map(([v, l]) => ({ value: v, label: l }))} />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新建项目</Button>
        </Space>
      }>
        <Table columns={columns} dataSource={data} rowKey="_id" loading={loading} pagination={{ pageSize: 12 }} size="small" />
      </Card>

      {/* New/Edit Modal */}
      <Modal title={editing ? '编辑项目' : '新建项目'} open={modal} onOk={handleSubmit} onCancel={() => setModal(false)} width={600} destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name="name" label="项目名称" rules={[{ required: true }]}>
                <Input placeholder="如：苏州工业园光储充一体化项目" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="type" label="项目类型" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'solar', label: '光伏' },
                  { value: 'storage', label: '储能' },
                  { value: 'solar_storage', label: '光储' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={24}>
              <Form.Item name="location" label="项目地址">
                <Input placeholder="详细地址" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="capacity" label="装机容量(kW/kWh)">
                <InputNumber min={0} placeholder="如：1000" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="budget" label="预算(万元)">
                <InputNumber min={0} placeholder="如：500" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="项目状态" initialValue="planning">
                <Select options={Object.entries(STATUS_TEXT).map(([v, l]) => ({ value: v, label: l }))} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="planStartDate" label="计划开工">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="planEndDate" label="计划完工">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Divider style={{ margin: '12px 0' }}>业主信息</Divider>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name={['owner', 'name']} label="业主姓名">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['owner', 'contact']} label="联系人">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['owner', 'phone']} label="联系电话">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        title={<Space><BuildOutlined /><span>{selected?.name}</span> <Tag color={STATUS_COLOR[selected?.status || '']}>{STATUS_TEXT[selected?.status || '']}</Tag></Space>}
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        width={900}
        footer={null}
      >
        {selected && (
          <div>
            <Row gutter={16} style={{ marginBottom: 20 }}>
              <Col span={6}><Statistic title="当前阶段" value={selected.phase} valueStyle={{ color: PHASE_COLOR[selected.phase] }} /></Col>
              <Col span={6}><Statistic title="总进度" suffix="%" value={selected.progress} /></Col>
              <Col span={6}><Statistic title="预算" value={selected.budget ? `${selected.budget}万元` : '-'} /></Col>
              <Col span={6}><Statistic title="实际成本" value={selected.actualCost ? `${selected.actualCost}万元` : '-'} /></Col>
            </Row>

            {/* Phase Steps */}
            <Card title="📋 项目阶段" size="small" style={{ marginBottom: 16 }}>
              <Steps
                current={PHASE_STEP[selected.phase] ?? 0}
                size="small"
                items={PHASES.map(p => ({
                  title: p,
                  icon: PHASE_ICONS[p],
                  status: (selected.phases || []).find((ph: any) => ph.name === p)?.status === 'completed' ? 'finish' : 'wait',
                }))}
              />
            </Card>

            {/* Phase Controls */}
            <Row gutter={12} style={{ marginBottom: 16 }}>
              {PHASES.map(p => {
                const ph = (selected.phases || []).find((ph: any) => ph.name === p);
                const isActive = p === selected.phase;
                return (
                  <Col span={3} key={p}>
                    <Card size="small" bodyStyle={{ padding: '8px 10px', textAlign: 'center' }}
                      style={{ borderColor: isActive ? PHASE_COLOR[p] : undefined, background: isActive ? PHASE_COLOR[p] + '10' : undefined }}>
                      <div style={{ color: PHASE_COLOR[p], fontSize: 12, marginBottom: 4 }}>{PHASE_ICONS[p]}</div>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>{p}</div>
                      <Progress percent={ph?.progress || 0} size="small" strokeColor={PHASE_COLOR[p]} style={{ marginTop: 4 }} />
                      <Select
                        size="small"
                        value={ph?.status || 'pending'}
                        onChange={v => handlePhaseUpdate(p, v, v === 'completed' ? 100 : v === 'in_progress' ? Math.max(ph?.progress || 0, 10) : 0)}
                        style={{ width: '100%', marginTop: 4 }}
                        options={[
                          { value: 'pending', label: '待开始' },
                          { value: 'in_progress', label: '进行中' },
                          { value: 'completed', label: '已完成' },
                        ]}
                      />
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {/* Milestones */}
            <Card
              title="🎯 里程碑"
              size="small"
              extra={
                <MilestoneForm phases={PHASES} onAdd={handleAddMilestone} />
              }
              style={{ marginBottom: 16 }}
            >
              {(selected.milestones || []).length === 0 ? (
                <Empty description="暂无里程碑" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <Timeline
                  items={(selected.milestones || []).map((m: any) => ({
                    color: m.completedAt ? 'green' : 'gray',
                    children: (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                          <Checkbox checked={!!m.completedAt} onChange={() => handleToggleMilestone(m)} />
                          <span style={{ textDecoration: m.completedAt ? 'line-through' : 'none', color: m.completedAt ? '#9ca3af' : '#1a1a2e' }}>
                            {m.name}
                          </span>
                          <Tag style={{ fontSize: 10 }}>{m.phase}</Tag>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {m.dueDate ? `截止 ${new Date(m.dueDate).toLocaleDateString('zh-CN')}` : ''}
                          {m.completedAt && ` | 完成于 ${new Date(m.completedAt).toLocaleDateString('zh-CN')}`}
                        </Text>
                      </div>
                    ),
                  }))}
                />
              )}
            </Card>

            {/* Owner Info */}
            {selected.owner && (
              <Card title="👤 业主信息" size="small">
                <Row gutter={12}>
                  <Col span={8}><Text type="secondary">业主姓名：</Text>{selected.owner.name || '-'}</Col>
                  <Col span={8}><Text type="secondary">联系人：</Text>{selected.owner.contact || '-'}</Col>
                  <Col span={8}><Text type="secondary">联系电话：</Text>{selected.owner.phone || '-'}</Col>
                </Row>
              </Card>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// Milestone add form (inline)
function MilestoneForm({ phases, onAdd }: { phases: string[]; onAdd: (v: any) => void }) {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  if (!open) return <Button size="small" onClick={() => setOpen(true)}>+ 添加里程碑</Button>;
  return (
    <Space>
      <Form form={form} layout="inline" size="small">
        <Form.Item name="name" rules={[{ required: true }]}>
          <Input placeholder="里程碑名称" style={{ width: 160 }} />
        </Form.Item>
        <Form.Item name="phase" rules={[{ required: true }]}>
          <Select placeholder="阶段" style={{ width: 120 }} options={phases.map(p => ({ value: p, label: p }))} />
        </Form.Item>
        <Form.Item name="dueDate">
          <DatePicker placeholder="截止日期" />
        </Form.Item>
      </Form>
      <Button size="small" type="primary" onClick={async () => {
        try {
          const v = await form.validateFields();
          onAdd(v);
          form.resetFields();
          setOpen(false);
        } catch {}
      }}>添加</Button>
      <Button size="small" onClick={() => setOpen(false)}>取消</Button>
    </Space>
  );
}
