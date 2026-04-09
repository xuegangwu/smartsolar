import { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, Modal, Form, Input, Select, message, Row, Col, Timeline, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { workOrderApi, stationApi, equipmentApi } from '../services/api';

const { Text } = Typography;

const STATUS_MAP: Record<string, { color: string; text: string; step: number }> = {
  created: { color: 'default', text: '已创建', step: 0 },
  assigned: { color: 'blue', text: '已派发', step: 1 },
  accepted: { color: 'cyan', text: '已接受', step: 2 },
  processing: { color: 'orange', text: '处理中', step: 3 },
  accepted_check: { color: 'purple', text: '验收中', step: 4 },
  closed: { color: 'green', text: '已关闭', step: 5 },
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'red',
  important: 'orange',
  normal: 'blue',
};

const PRIORITY_TEXT: Record<string, string> = {
  urgent: '紧急',
  important: '重要',
  normal: '一般',
};

const TYPE_TEXT: Record<string, string> = {
  fault: '故障维修',
  maintenance: '预防性维护',
  inspection: '巡检',
  upgrade: '升级改造',
};

const WORKFLOW = ['created', 'assigned', 'accepted', 'processing', 'accepted_check', 'closed'];

export default function WorkOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [form] = Form.useForm();
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');

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
      if (res.success) message.success('已更新');
    } else {
      const res = await workOrderApi.create(values);
      if (res.success) message.success('已创建');
    }
    setIsModalOpen(false);
    loadOrders();
  }

  async function handleStatusChange(id: string, newStatus: string) {
    const res = await workOrderApi.updateStatus(id, newStatus);
    if (res.success) {
      message.success(`状态更新为：${STATUS_MAP[newStatus]?.text}`);
      loadOrders();
    } else {
      message.error(res.message || '状态更新失败');
    }
  }

  async function handleViewDetail(record: any) {
    const res = await workOrderApi.getById(record._id);
    if (res.success) {
      setDetail(res.data);
      setDetailOpen(true);
    }
  }

  const columns: ColumnsType<any> = [
    { title: '工单号', dataIndex: 'orderNo', key: 'orderNo', render: v => <Text code>{v}</Text> },
    { title: '标题', dataIndex: 'title', key: 'title', render: (v, r) => <a onClick={() => handleViewDetail(r)}>{v}</a> },
    { title: '电站', dataIndex: ['stationId', 'name'], key: 'station' },
    { title: '类型', dataIndex: 'type', key: 'type', render: t => TYPE_TEXT[t] || t },
    { title: '优先级', dataIndex: 'priority', key: 'priority', render: p => (
      <Tag color={PRIORITY_COLOR[p]}>{PRIORITY_TEXT[p]}</Tag>
    )},
    { title: '状态', dataIndex: 'status', key: 'status', render: s => {
      const m = STATUS_MAP[s] || { color: 'default', text: s };
      return <Tag color={m.color}>{m.text}</Tag>;
    }},
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: v => new Date(v).toLocaleString('zh-CN') },
    { title: '操作', key: 'action', width: 200, render: (_, r) => {
      const currentStep = STATUS_MAP[r.status]?.step ?? 0;
      const nextStatus = WORKFLOW[currentStep + 1];
      return (
        <Space>
          <Button size="small" onClick={() => handleEdit(r)}>编辑</Button>
          {nextStatus && (
            <Button size="small" type="primary" onClick={() => handleStatusChange(r._id, nextStatus)}>
              → {STATUS_MAP[nextStatus].text}
            </Button>
          )}
        </Space>
      );
    }},
  ];

  return (
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
      <Table columns={columns} dataSource={orders} rowKey="_id" loading={loading} pagination={{ pageSize: 20 }} />

      <Modal title={editing ? '编辑工单' : '新建工单'} open={isModalOpen} onOk={handleSubmit} onCancel={() => setIsModalOpen(false)} width={600}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="stationId" label="所属电站" rules={[{ required: true }]}>
            <Select options={stations.map(s => ({ value: s._id, label: s.name }))} placeholder="选择电站" />
          </Form.Item>
          <Form.Item name="title" label="工单标题" rules={[{ required: true }]}>
            <Input placeholder="简要描述问题" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="type" label="工单类型" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'fault', label: '故障维修' },
                  { value: 'maintenance', label: '预防性维护' },
                  { value: 'inspection', label: '巡检' },
                  { value: 'upgrade', label: '升级改造' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="priority" label="优先级" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'urgent', label: '紧急' },
                  { value: 'important', label: '重要' },
                  { value: 'normal', label: '一般' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="状态">
                <Select options={WORKFLOW.map(s => ({ value: s, label: STATUS_MAP[s].text }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="详细描述">
            <Input.TextArea rows={4} placeholder="问题详细描述、处理方案等" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="工单详情" open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={600}>
        {detail && (
          <div>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col span={12}><Text type="secondary">工单号</Text><br /><Text strong><code>{detail.orderNo}</code></Text></Col>
              <Col span={12}><Text type="secondary">状态</Text><br />
                <Tag color={STATUS_MAP[detail.status]?.color}>{STATUS_MAP[detail.status]?.text}</Tag>
              </Col>
              <Col span={12}><Text type="secondary">类型</Text><br /><Text>{TYPE_TEXT[detail.type]}</Text></Col>
              <Col span={12}><Text type="secondary">优先级</Text><br />
                <Tag color={PRIORITY_COLOR[detail.priority]}>{PRIORITY_TEXT[detail.priority]}</Tag>
              </Col>
              <Col span={24}><Text type="secondary">电站</Text><br /><Text>{typeof detail.stationId === 'object' ? detail.stationId?.name : detail.stationId}</Text></Col>
              <Col span={24}><Text type="secondary">描述</Text><br /><Text>{detail.description || '-'}</Text></Col>
            </Row>
            <div>
              <Text strong style={{ marginBottom: 12, display: 'block' }}>处理进度</Text>
              <Timeline
                items={WORKFLOW.map((s, i) => ({
                  color: (STATUS_MAP[detail.status]?.step ?? 0) >= i ? 'green' : 'gray',
                  children: STATUS_MAP[s].text,
                }))}
              />
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}
