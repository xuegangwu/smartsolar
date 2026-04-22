import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Card, Table, Tag, Button, Space, Modal, Form, Input, Select, message,
  Row, Col, Statistic, Typography, Timeline, Descriptions, Divider, Popconfirm, Steps, Rate,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EditOutlined, CheckCircleOutlined, ClockCircleOutlined,
  UserOutlined, ToolOutlined, FileTextOutlined, ExclamationCircleOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { workOrderApi, stationApi, sparePartApi, personnelApi, equipmentApi, partnerApi } from '../services/api';

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
      <Col span={6}><Statistic title="待处理" value={counts.created} valueStyle={{ color: '#e6342a' }} /></Col>
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
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [aiResult, setAiResult] = useState<string>('');
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingTargetId, setRatingTargetId] = useState<string>('');
  const [ratingValue, setRatingValue] = useState<number>(5);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [form] = Form.useForm();

  async function loadOrders() {
    setLoading(true);
    const params: any = { page, limit: pageSize };
    if (filterStatus) params.status = filterStatus;
    if (filterPriority) params.priority = filterPriority;
    const res = await workOrderApi.getAll(params);
    if (res.success) { setOrders(res.data); setTotal(res.total || 0); }
    setLoading(false);
  }

  useEffect(() => { loadOrders(); loadStations(); loadPersonnel(); loadPartners(); }, []);
  useEffect(() => { setPage(1); loadOrders(); }, [filterStatus, filterPriority]);
  useEffect(() => { loadOrders(); }, [page, pageSize]);

  async function loadStations() {
    const res = await stationApi.getAll();
    if (res.success) setStations(res.data);
  }

  async function loadPersonnel() {
    // 只加载技术人员（可派工）
    const res = await personnelApi.getAll({ role: 'technician' });
    if (res.success) setPersonnel(res.data);
  }

  async function loadPartners() {
    // 只加载安装商（用于工单关联）
    const res = await partnerApi.getAll({ type: 'installer' });
    if (res.success) setPartners(res.data);
  }

  async function handleAIFaultAnalysis(order: any) {
    setAiLoading(true);
    setAiResult('');
    setAiModalOpen(true);
    try {
      const token = localStorage.getItem('smartsolar_token');
      const equipment = order.equipmentId || {};
      const station = order.stationId || {};
      const res = await fetch('/api/ai/fault-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          faultDescription: `${order.title}。${order.description || ''}`,
          equipmentType: equipment.type || order.type || 'unknown',
          equipmentBrand: equipment.brand || '',
          equipmentModel: equipment.model || '',
          stationName: typeof station === 'object' ? station.name : '',
        }),
      });
      const data = await res.json();
      setAiResult(data.success ? data.data.reply : data.message || '分析失败');
    } catch { setAiResult('网络错误，请稍后重试'); }
    setAiLoading(false);
  }

  async function loadEquipment(stationId: string) {
    const res = await equipmentApi.getAll({ stationId });
    if (res.success) setEquipmentList(res.data);
  }

  async function handleAdd() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ type: 'fault', priority: 'normal', status: 'created', stationId: stations[0]?._id });
    if (stations[0]?._id) loadEquipment(stations[0]._id);
    const res = await sparePartApi.getAll();
    if (res.success) setSpareParts(res.data);
    setIsModalOpen(true);
  }

  async function handleEdit(record: any) {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      stationId: typeof record.stationId === 'object' ? record.stationId?._id : record.stationId,
      equipmentId: typeof record.equipmentId === 'object' ? record.equipmentId?._id : record.equipmentId,
      // spareParts is [{sparePartId, quantity}], convert to array of IDs for Select
      spareParts: (record.spareParts || []).map((s: any) => s.sparePartId),
    });
    const recStationId = typeof record.stationId === 'object' ? record.stationId?._id : record.stationId;
    if (recStationId) loadEquipment(recStationId);
    const res = await sparePartApi.getAll();
    if (res.success) setSpareParts(res.data);
    setIsModalOpen(true);
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    // Transform spareParts from array of IDs to [{sparePartId, quantity}] format
    const payload = {
      ...values,
      spareParts: (values.spareParts || []).map((id: string) => ({ sparePartId: id, quantity: 1 })),
    };
    if (editing) {
      const res = await workOrderApi.update(editing._id, payload);
      if (res.success) { message.success('已更新'); loadOrders(); }
    } else {
      const res = await workOrderApi.create(payload);
      if (res.success) { message.success('工单已创建'); loadOrders(); }
    }
    setIsModalOpen(false);
  }

  async function handleStatusChange(id: string, newStatus: string) {
    if (newStatus === 'closed') {
      setRatingTargetId(id);
      setRatingValue(5);
      setRatingModalOpen(true);
      return;
    }
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

  async function handleRatingConfirm() {
    const res = await workOrderApi.updateStatus(ratingTargetId, 'closed', ratingValue);
    if (res.success) {
      message.success('工单已关闭，感谢评分！');
      setRatingModalOpen(false);
      loadOrders();
      if (detailOpen && detail?._id === ratingTargetId) {
        const refreshed = await workOrderApi.getById(ratingTargetId);
        if (refreshed.success) setDetail(refreshed.data);
      }
    } else {
      message.error(res.message || '关闭失败');
    }
  }

  async function handleAssignTech(orderId: string, techId: string) {
    const tech = personnel.find((t: any) => t._id === techId);
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
                options={personnel.map((t: any) => ({ value: t._id, label: `${t.name}（${t.workStatus === 'available' ? '空闲' : t.workStatus === 'busy' ? '忙碌' : '离线'}）` }))}
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
        <Table className="mobile-card-list" columns={columns} dataSource={orders} rowKey="_id" loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps || 20); },
          }}
          scroll={{ x: 1100 }}
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
                <Select options={stations.map(s => ({ value: s._id, label: s.name }))} placeholder="选择电站" onChange={v => loadEquipment(v as string)} />
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
          <Form.Item name="equipmentId" label="关联设备">
            <Select
              allowClear
              placeholder="选择关联设备（可选）"
              options={equipmentList.map((e: any) => ({ value: e._id, label: `${e.name}（${e.model || e.type || '—'}）` }))}
            />
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
            <TextArea rows={3} placeholder="问题详细描述、故障现象、处理方案建议等" />
          </Form.Item>

          {/* Spare Parts Selector */}
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="partnerId" label="安装商（计积分）">
                <Select
                  allowClear
                  placeholder="选择安装商（工单关闭时给该安装商计积分）"
                  options={partners.map((p: any) => ({ value: p._id, label: `${p.name} [${p.level}] ${p.totalPoints}分` }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            label="备件消耗"
            name="spareParts"
            valuePropName="value"
          >
            <Select
              mode="multiple"
              placeholder="选择所需备件（工单关闭时自动扣减库存）"
              options={spareParts.map((sp: any) => ({
                value: sp._id,
                label: `${sp.name}（库存: ${sp.quantity} ${sp.unit || '个'}）`,
              }))}
            />
          </Form.Item>
          {form.getFieldValue('spareParts')?.length > 0 && (
            <div style={{ marginTop: -8, marginBottom: 12, fontSize: 11, color: '#8896a6' }}>
              已选 {form.getFieldValue('spareParts').length} 项备件，工单完成后自动扣库存
            </div>
          )}
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
                    options={personnel.map((t: any) => ({ value: t._id, label: `${t.name}（${t.workStatus === 'available' ? '空闲' : t.workStatus === 'busy' ? '忙碌' : '离线'}）` }))}
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
                <Button icon={<RobotOutlined />} onClick={() => handleAIFaultAnalysis(detail)} loading={aiLoading}>
                  AI 故障分析
                </Button>
              </Space>
            </div>

            {/* 操作时间线 */}
            {detail.handlingSteps && detail.handlingSteps.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Divider style={{ marginBottom: 12 }}>操作时间线</Divider>
                <Timeline
                  items={detail.handlingSteps.map((s: any, i: number) => ({
                    color: i === detail.handlingSteps.length - 1 ? 'blue' : 'gray',
                    children: (
                      <div>
                        <b>{s.step}</b>
                        <div style={{ fontSize: 12, color: '#888' }}>
                          {s.operator && `操作人：${s.operator}`}
                          {s.at && ` · ${new Date(s.at).toLocaleString('zh-CN')}`}
                        </div>
                        {s.note && <div style={{ fontSize: 12, color: '#666' }}>{s.note}</div>}
                      </div>
                    ),
                  }))}
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* AI 故障分析结果 Modal */}
      <Modal
        title={<Space><RobotOutlined /><span>🤖 AI 故障分析报告</span></Space>}
        open={aiModalOpen}
        onCancel={() => setAiModalOpen(false)}
        footer={null}
        width={680}
      >
        {aiLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin tip="正在分析故障，请稍候..." size="large" />
          </div>
        ) : aiResult ? (
          <div style={{ fontSize: 13, lineHeight: 1.8, maxHeight: 500, overflowY: 'auto', padding: '4px 0' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiResult}</ReactMarkdown>
          </div>
        ) : null}
      </Modal>

      {/* 关闭工单评分弹窗 */}
      <Modal
        title="关闭工单"
        open={ratingModalOpen}
        onOk={handleRatingConfirm}
        onCancel={() => setRatingModalOpen(false)}
        okText="确认关闭"
        cancelText="取消"
      >
        <div style={{ padding: '16px 0' }}>
          <p style={{ marginBottom: 12, color: '#555' }}>请对本次服务进行评分：</p>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <Rate value={ratingValue} onChange={setRatingValue} allowHalf />
          </div>
          <p style={{ textAlign: 'center', marginTop: 8, color: '#888', fontSize: 12 }}>
            {ratingValue <= 2 ? '😞 感谢反馈，我们会改进' : ratingValue <= 3 ? '😐 感谢您的评价' : ratingValue <= 4 ? '😊 感谢好评！' : '🌟 感谢您的满分支持！'}
          </p>
        </div>
      </Modal>

      <style>{`
        .urgent-row { background: #fff2f0; }
        .urgent-row:hover { background: #ffebe8 !important; }
      `}</style>
    </div>
  );
}
