import { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Button, Space, Modal, Form, Input, Select, message,
  Row, Col, Statistic, Typography, Timeline, Descriptions, Divider, Popconfirm, Steps,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EditOutlined, CheckCircleOutlined, ClockCircleOutlined,
  UserOutlined, ToolOutlined, FileTextOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { workOrderApi, stationApi } from '../services/api';

const { Text, Title } = Typography;
const { TextArea } = Input;

const WORKFLOW = ['created', 'assigned', 'accepted', 'processing', 'accepted_check', 'closed'];
const WORKFLOW_LABELS = ['已创建', '已派发', '已接受', '处理中', '验收中', '已关闭'];

const STATUS_MAP: Record<string, { color: string; text: string; step: number }> = {
  created: { color: 'default', text: '已创建', step: 0 },
  assigned: { color: 'blue', text: '已派发', step: 1 },
  accepted: { color: 'cyan', text: '已接受', step: 2 },
  processing: { color: 'orange', text: '处理中', step: 3 },
  accepted_check: { color: 'purple', text: '验收中', step: 4 },
  closed: { color: 'green', text: '已关闭', step: 5 },
};

const PRIORITY_COLOR: Record<string, string> = { urgent: 'red', important: 'orange', normal: 'blue' };
const PRIORITY_TEXT: Record<string, string> = { urgent: '紧急', important: '重要', normal: '一般' };
const TYPE_TEXT: Record<string, string> = { fault: '故障维修', maintenance: '预防性维护', inspection: '巡检', upgrade: '升级改造' };

// 模拟运维人员数据（后续从 API 获取）
const TECHNICIANS = [
  { _id: 'tech-1', name: '张伟', phone: '138-1111-0001', skills: ['光伏', '储能', '充电桩'] },
  { _id: 'tech-2', name: '李强', phone: '139-2222-0002', skills: ['储能', 'PCS'] },
  { _id: 'tech-3', name: '王鹏', phone: '137-3333-0003', skills: ['光伏', '通讯'] },
  { _id: 'tech-4', name: '赵亮', phone: '136-4444-0004', skills: ['充电桩', '电气'] },
];

// ─── Stat Cards ─────────────────────────────────────────────────────────────
function StatCards({ orders }: { orders: any[] }) {
  const counts = { total: orders.length, created: 0, processing: 0, urgent: 0 };
  orders.forEach((o: any) => {
    if (o.status === 'created' || o.status === 'assigned') counts.created++;
    if (o.status === 'processing' || o.status === 'accepted_check') counts.processing++;
    if (o.priority === 'urgent') counts.urgent++;
  });
  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col span={6}><Statistic title="工单总数" value={counts.total} prefix={<FileTextOutlined />} /></Col>
      <Col span={6}><Statistic title="待处理" value={counts.created} valueStyle={{ color: '#1677ff' }} /></Col>
      <Col span={6}><Statistic title="处理中" value={counts.processing} valueStyle={{ color: '#fa8c16' }} /></Col>
      <Col span={6}><Statistic title="紧急工单" value={counts.urgent} valueStyle={{ color: '#ff4d4f' }} /></Col>
    </Row>
  );
}

// ─── Workflow Steps ────────────────────────────────────────────────────────────
function WorkflowSteps({ currentStep, status }: { currentStep: number; status: string }) {
  const isClosed = status === 'closed';
  return (
    <Steps
      current={isClosed ? WORKFLOW.length - 1 : currentStep}
      size="small"
      items={WORKFLOW.map((s, i) => ({
        title: WORKFLOW_LABELS[i],
        icon: i < currentStep ? <CheckCircleOutlined /> : i === currentStep ? <ClockCircleOutlined /> : undefined,
      }))}
    />
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function WorkOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [form] = Form.useForm();

  useEffect(() => { loadOrders(); loadStations(); }, []);
  useEffect(() => { loadOrders(); }, [filterStatus, filterPriority]);

  async function loadOrders() {
    setLoading(true);
    const params: any = {};
    if (filterStatus) params.status = filterStatus;
    if (filterPriority) params.priority = filterPriority;
    const res = await workOrderApi.getAll(params);
    if (res.success) setOrders(res.data);
    setLoading(false);
  }

  async function loadStations() {
    const res = await stationApi.getAll();
    if (res.success) setStations(res.data);
  }

  async function handleAdd() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ type: 'fault', priority: 'normal', status: 'created' });
    setIsModalOpen(true);
  }

  async function handleEdit(record: any) {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      stationId: typeof record.stationId === 'object' ? record.stationId?._id : record.stationId,
      equipmentId: typeof record.equipmentId === 'object' ? record.equipmentId?._id : record.equipmentId,
    });
    setIsModalOpen(true);
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    if (editing) {
      const res = await workOrderApi.update(editing._id, values);
      if (res.success) { message.success('已更新'); loadOrders(); }
    } else {
      const res = await workOrderApi.create(values);
      if (res.success) { message.success('工单已创建'); loadOrders(); }
    }
    setIsModalOpen(false);
  }

  async function handleStatusChange(id: string, newStatus: string) {
    const res = await workOrderApi.updateStatus(id, newStatus);
    if (res.success) {
      message.success(`已更新为：${WORKFLOW_LABELS[WORKFLOW.indexOf(newStatus)]}`);
      loadOrders();
      if (detailOpen && detail?._id === id) {
        const refreshed = await workOrderApi.getById(id);
        if (refreshed.success) setDetail(refreshed.data);
      }
    } else {
      message.error(res.message || '状态更新失败');
    }
  }

  async function handleAssignTech(orderId: string, techId: string) {
    const tech = TECHNICIANS.find(t => t._id === techId);
    const res = await workOrderApi.update(orderId, { assigneeId: techId, status: 'assigned' });
    if (res.success) {
      message.success(`已派发给：${tech?.name}`);
      loadOrders();
    }
  }

  async function handleViewDetail(record: any) {
    const res = await workOrderApi.getById(record._id);
    if (res.success) { setDetail(res.data); setDetailOpen(true); }
  }

  const columns: ColumnsType<any> = [
    {
      title: '工单号', dataIndex: 'orderNo', width: 140,
      render: v => <Text code style={{ fontSize: 12 }}>{v}</Text>,
      filters: [], onFilter: () => true,
    },
    {
      title: '标题', dataIndex: 'title',
      render: (v, r) => <a onClick={() => handleViewDetail(r)}><b>{v}</b></a>,
      ellipsis: true,
    },
    {
      title: '电站', dataIndex: ['stationId', 'name'],
      render: v => v || '-', width: 150,
    },
    {
      title: '类型', dataIndex: 'type', width: 100,
      render: t => TYPE_TEXT[t] || t,
    },
    {
      title: '优先级', dataIndex: 'priority', width: 80,
      render: p => <Tag color={PRIORITY_COLOR[p]}>{PRIORITY_TEXT[p]}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: s => {
        const m = STATUS_MAP[s] || { color: 'default', text: s };
        return <Tag color={m.color}>{m.text}</Tag>;
      },
      filters: WORKFLOW.map(s => ({ text: STATUS_MAP[s].text, value: s })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: '处理人', dataIndex: ['assigneeId', 'name'],
      render: (v, r) => {
        if (v) return <Space><UserOutlined />{v}</Space>;
        if (r.status === 'created') return <Tag icon={<ExclamationCircleOutlined />} color="warning">待派发</Tag>;
        return '-';
      }, width: 120,
    },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 160,
      render: v => new Date(v).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    },
    {
      title: '操作', key: 'action', width: 280, fixed: 'right',
      render: (_, r) => {
        const step = STATUS_MAP[r.status]?.step ?? 0;
        const nextStatus = WORKFLOW[step + 1];
        const prevStatus = WORKFLOW[step - 1];
        return (
          <Space size="small">
            <Button size="small" onClick={() => handleViewDetail(r)}>详情</Button>
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)} />
            {r.status === 'created' && (
              <Select
                size="small" placeholder="派发" style={{ width: 100 }}
                onChange={v => handleAssignTech(r._id, v)}
                options={TECHNICIANS.map(t => ({ value: t._id, label: t.name }))}
              />
            )}
            {prevStatus && prevStatus !== 'created' && (
              <Popconfirm title={`确认退回「${STATUS_MAP[prevStatus].text}」？`} onConfirm={() => handleStatusChange(r._id, prevStatus)}>
                <Button size="small" danger>← 退回</Button>
              </Popconfirm>
            )}
            {nextStatus && (
              <Button size="small" type="primary" onClick={() => handleStatusChange(r._id, nextStatus)}>
                {STATUS_MAP[nextStatus].text} →
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <StatCards orders={orders} />

      <Card
        title="工单管理"
        extra={
          <Space>
            <Select value={filterStatus} onChange={setFilterStatus} placeholder="状态筛选" allowClear style={{ width: 120 }}
              options={Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.text }))} />
            <Select value={filterPriority} onChange={setFilterPriority} placeholder="优先级筛选" allowClear style={{ width: 100 }}
              options={[{ value: 'urgent', label: '紧急' }, { value: 'important', label: '重要' }, { value: 'normal', label: '一般' }]} />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新建工单</Button>
          </Space>
        }
      >
        <Table columns={columns} dataSource={orders} rowKey="_id" loading={loading}
          pagination={{ pageSize: 20 }} scroll={{ x: 1100 }}
          rowClassName={r => r.priority === 'urgent' ? 'urgent-row' : ''}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editing ? '编辑工单' : '新建工单'}
        open={isModalOpen} onOk={handleSubmit} onCancel={() => setIsModalOpen(false)} width={640}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name="stationId" label="所属电站" rules={[{ required: true }]}>
                <Select options={stations.map(s => ({ value: s._id, label: s.name }))} placeholder="选择电站" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="priority" label="优先级" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'urgent', label: '🔴 紧急' },
                  { value: 'important', label: '🟠 重要' },
                  { value: 'normal', label: '🔵 一般' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="title" label="工单标题" rules={[{ required: true }]}>
            <Input placeholder="简要描述问题或任务" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="type" label="工单类型" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'fault', label: '🔧 故障维修' },
                  { value: 'maintenance', label: '🛠 预防性维护' },
                  { value: 'inspection', label: '📋 巡检' },
                  { value: 'upgrade', label: '⬆️ 升级改造' },
                ]} />
              </Form.Item>
            </Col>
            {editing && (
              <Col span={12}>
                <Form.Item name="status" label="当前状态">
                  <Select options={WORKFLOW.map(s => ({ value: s, label: STATUS_MAP[s].text }))} />
                </Form.Item>
              </Col>
            )}
          </Row>
          <Form.Item name="description" label="详细描述">
            <TextArea rows={4} placeholder="问题详细描述、故障现象、处理方案建议等" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>工单详情</span>
            {detail && <Tag color={STATUS_MAP[detail.status]?.color}>{STATUS_MAP[detail.status]?.text}</Tag>}
          </Space>
        }
        open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={700}
      >
        {detail && (
          <div>
            {/* Header */}
            <div style={{ marginBottom: 16 }}>
              <Title level={5} style={{ marginBottom: 4 }}>{detail.title}</Title>
              <Space>
                <Text code>{detail.orderNo}</Text>
                <Tag color={PRIORITY_COLOR[detail.priority]}>{PRIORITY_TEXT[detail.priority]}</Tag>
                <Tag>{TYPE_TEXT[detail.type]}</Tag>
              </Space>
            </div>

            {/* Workflow */}
            <Card size="small" style={{ marginBottom: 16, background: '#f8f9fa' }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>处理进度</Text>
              <WorkflowSteps currentStep={STATUS_MAP[detail.status]?.step ?? 0} status={detail.status} />
            </Card>

            {/* Info Grid */}
            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Text type="secondary">电站</Text><br />
                <Text strong>{typeof detail.stationId === 'object' ? detail.stationId?.name : detail.stationId}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">设备</Text><br />
                <Text>{typeof detail.equipmentId === 'object' ? detail.equipmentId?.name : detail.equipmentId || '-'}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">处理人</Text><br />
                {detail.assigneeId ? (
                  <Space>
                    <UserOutlined />
                    <Text>{typeof detail.assigneeId === 'object' ? detail.assigneeId?.name : detail.assigneeId}</Text>
                    {typeof detail.assigneeId === 'object' && detail.assigneeId?.phone && (
                      <Text type="secondary">{detail.assigneeId.phone}</Text>
                    )}
                  </Space>
                ) : <Text type="secondary">待派发</Text>}
              </Col>
              <Col span={12}>
                <Text type="secondary">创建时间</Text><br />
                <Text>{new Date(detail.createdAt).toLocaleString('zh-CN')}</Text>
              </Col>
            </Row>

            <Divider style={{ margin: '16px 0' }} />

            {/* Description */}
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>详细描述</Text>
              <div style={{ background: '#fafafa', padding: 12, borderRadius: 8, minHeight: 60 }}>
                <Text>{detail.description || '（无）'}</Text>
              </div>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            {/* Action Buttons */}
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>快捷操作</Text>
              <Space wrap>
                {detail.status === 'created' && (
                  <Select
                    placeholder="→ 派发给"
                    style={{ width: 140 }}
                    onChange={v => handleAssignTech(detail._id, v)}
                    options={TECHNICIANS.map(t => ({ value: t._id, label: t.name }))}
                  />
                )}
                {STATUS_MAP[detail.status]?.step < 5 && (
                  <Button
                    type="primary"
                    onClick={() => handleStatusChange(detail._id, WORKFLOW[STATUS_MAP[detail.status]?.step + 1])}
                  >
                    {WORKFLOW[STATUS_MAP[detail.status]?.step + 1] ? `→ ${WORKFLOW_LABELS[STATUS_MAP[detail.status]?.step + 1]}` : '完成'}
                  </Button>
                )}
                {STATUS_MAP[detail.status]?.step > 1 && (
                  <Popconfirm title={`退回「${WORKFLOW_LABELS[STATUS_MAP[detail.status]?.step - 1]}」？`} onConfirm={() => handleStatusChange(detail._id, WORKFLOW[STATUS_MAP[detail.status]?.step - 1])}>
                    <Button danger>← 退回</Button>
                  </Popconfirm>
                )}
                {STATUS_MAP[detail.status]?.step === 5 && (
                  <Tag color="green" icon={<CheckCircleOutlined />}>工单已关闭</Tag>
                )}
              </Space>
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        .urgent-row { background: #fff2f0; }
        .urgent-row:hover { background: #ffebe8 !important; }
      `}</style>
    </div>
  );
}
