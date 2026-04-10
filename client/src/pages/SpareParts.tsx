import { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Button, Space, Modal, Form, Input, InputNumber,
  message, Row, Col, Statistic, Typography, List, Avatar, Popconfirm, Progress,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, ToolOutlined, WarningOutlined, StopOutlined,
  ExportOutlined, InboxOutlined, DollarOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

// ─── Stat Cards ──────────────────────────────────────────────────────────────
function StatCards({ stats }: { stats: any }) {
  return (
    <Row gutter={[12, 12]} className="stat-grid" style={{ marginBottom: 16 }}>
      <Col xs={12} sm={6}>
        <Card size="small" style={{ borderRadius: 12, textAlign: 'center' }}>
          <Statistic title={<span style={{ fontSize: 12 }}>备件种类</span>} value={stats.total} prefix={<InboxOutlined />} />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card size="small" style={{ borderRadius: 12, textAlign: 'center', background: 'linear-gradient(135deg,#fff7e6,#ffd591)' }}>
          <Statistic title={<span style={{ fontSize: 12 }}>库存不足</span>} value={stats.lowStock} valueStyle={{ color: '#fa8c16' }} prefix={<WarningOutlined />} />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card size="small" style={{ borderRadius: 12, textAlign: 'center', background: 'linear-gradient(135deg,#fff2f0,#ffccc7)' }}>
          <Statistic title={<span style={{ fontSize: 12 }}>已耗尽</span>} value={stats.outOfStock} valueStyle={{ color: '#ff4d4f' }} prefix={<StopOutlined />} />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card size="small" style={{ borderRadius: 12, textAlign: 'center' }}>
          <Statistic title={<span style={{ fontSize: 12 }}>库存总值</span>} value={stats.totalValue} precision={0} prefix={<DollarOutlined />} suffix="元" valueStyle={{ fontSize: 18 }} />
        </Card>
      </Col>
    </Row>
  );
}

// ─── Consume Modal ───────────────────────────────────────────────────────────
function ConsumeModal({ open, part, orders, onClose, onOk }: {
  open: boolean; part: any; orders: any[]; onClose: () => void; onOk: () => void;
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && part) form.setFieldsValue({ sparePartId: part._id, quantity: 1 });
  }, [open, part]);

  async function handleSubmit() {
    const values = await form.validateFields();
    setLoading(true);
    const res = await fetch('/api/spare-parts/consume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      message.success(`已领用 ${values.quantity} 件`);
      onOk();
      onClose();
    } else {
      message.error(data.message || '领用失败');
    }
  }

  if (!part) return null;
  return (
    <Modal title={`📦 领用备件 — ${part.name}`} open={open} onOk={handleSubmit} onCancel={onClose} okText="确认领用" confirmLoading={loading}>
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="当前库存"><Text strong>{part.quantity} {part.unit || '件'}</Text></Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="安全库存"><Text type="secondary">{part.safeStock} {part.unit || '件'}</Text></Form.Item>
          </Col>
        </Row>
        <Form.Item name="quantity" label="领用数量" rules={[{ required: true, type: 'number', min: 1, message: '至少领用1件' }]}>
          <InputNumber min={1} max={part.quantity} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="workOrderId" label="关联工单" rules={[{ required: true, message: '请选择关联工单' }]}>
          <Input.Search
            placeholder="搜索工单号..."
            enterButton="查找"
            onSearch={async (val) => {
              const res = await fetch(`/api/work-orders?keyword=${val}`);
              const data = await res.json();
              if (data.success) {
                const wo = data.data[0];
                if (wo) { form.setFieldsValue({ workOrderId: wo._id }); message.info(`已选择: ${wo.orderNo}`); }
                else message.warning('未找到工单');
              }
            }}
          />
        </Form.Item>
        <Form.Item name="technicianId" label="领用人">
          <Input placeholder="输入领用人姓名" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ─── Part Modal ───────────────────────────────────────────────────────────────
function PartModal({ open, editing, onClose, onOk }: {
  open: boolean; editing: any; onClose: () => void; onOk: () => void;
}) {
  const [form] = Form.useForm();
  useEffect(() => {
    if (open) {
      if (editing) form.setFieldsValue(editing);
      else form.resetFields();
    }
  }, [open, editing]);

  async function handleSubmit() {
    const v = await form.validateFields();
    const url = editing ? `/api/spare-parts/${editing._id}` : '/api/spare-parts';
    const method = editing ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) });
    message.success(editing ? '已更新' : '已添加');
    onOk();
    onClose();
  }

  return (
    <Modal title={editing ? '编辑备件' : '添加备件'} open={open} onOk={handleSubmit} onCancel={onClose}>
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="name" label="备件名称" rules={[{ required: true }]}>
              <Input placeholder="如：华为逆变器IGBT模块" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="model" label="型号">
              <Input placeholder="型号" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="warehouse" label="仓库" initialValue="中央仓库">
              <Input placeholder="仓库名称" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="unit" label="单位" initialValue="件">
              <Input placeholder="件/个/台" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item name="quantity" label="当前库存" initialValue={0}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="safeStock" label="安全库存" initialValue={5}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="unitCost" label="单价(元)" initialValue={0}>
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function SpareParts() {
  const [parts, setParts] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, lowStock: 0, outOfStock: 0, totalValue: 0 });
  const [loading, setLoading] = useState(false);
  const [partModal, setPartModal] = useState(false);
  const [editingPart, setEditingPart] = useState<any>(null);
  const [consumeModal, setConsumeModal] = useState(false);
  const [consumePart, setConsumePart] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [filterWarehouse, setFilterWarehouse] = useState<string>('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    await Promise.all([loadParts(), loadRecords(), loadStats()]);
  }

  async function loadParts() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterWarehouse) params.set('warehouse', filterWarehouse);
    const res = await fetch(`/api/spare-parts?${params}`);
    const data = await res.json();
    if (data.success) setParts(data.data);
    setLoading(false);
  }

  async function loadRecords() {
    const res = await fetch('/api/spare-parts/consume-records');
    const data = await res.json();
    if (data.success) setRecords(data.data.slice(0, 10));
  }

  async function loadStats() {
    const res = await fetch('/api/spare-parts/stats');
    const data = await res.json();
    if (data.success) setStats(data.data);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/spare-parts/${id}`, { method: 'DELETE' });
    message.success('已删除');
    loadAll();
  }

  const columns: ColumnsType<any> = [
    {
      title: '备件名称', dataIndex: 'name',
      render: (v, r) => (
        <div>
          <b>{v}</b>
          {r.model && <div><Text type="secondary" style={{ fontSize: 12 }}>{r.model}</Text></div>}
        </div>
      ),
    },
    {
      title: '库存', dataIndex: 'quantity',
      render: (v, r) => {
        const pct = r.safeStock > 0 ? Math.min(100, (v / r.safeStock) * 100) : 100;
        const color = v === 0 ? '#ff4d4f' : v <= r.safeStock ? '#fa8c16' : '#52c41a';
        return (
          <div>
            <Text strong style={{ color }}>{v} {r.unit}</Text>
            <Progress percent={pct} size="small" showInfo={false} stroke={color} style={{ width: 60 }} />
          </div>
        );
      }, width: 90,
    },
    {
      title: '安全库存', dataIndex: 'safeStock', width: 80,
      render: v => <Text type="secondary">{v}</Text>,
    },
    {
      title: '仓库', dataIndex: 'warehouse', width: 100,
      render: v => <Tag>{v}</Tag>,
    },
    {
      title: '单价', dataIndex: 'unitCost', width: 80,
      render: v => v ? `¥${v.toFixed(0)}` : '-',
    },
    {
      title: '操作', key: 'action', width: 160,
      render: (_, r) => (
        <Space size="small" wrap>
          <Button size="small" icon={<ExportOutlined />} onClick={() => { setConsumePart(r); setConsumeModal(true); }}>领用</Button>
          <Button size="small" onClick={() => { setEditingPart(r); setPartModal(true); }}>编辑</Button>
          <Popconfirm title="删除备件？" onConfirm={() => handleDelete(r._id)}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const warehouses = [...new Set(parts.map(p => p.warehouse).filter(Boolean))];

  return (
    <div>
      <StatCards stats={stats} />

      <Row gutter={16}>
        <Col xs={24} lg={16}>
          <Card
            title={<Space><InboxOutlined /> 备件列表</Space>}
            extra={
              <Space wrap>
                <Button size="small" onClick={() => { setEditingPart(null); setPartModal(true); }} icon={<PlusOutlined />}>添加备件</Button>
              </Space>
            }
          >
            <Table
              className="mobile-card-list"
              columns={columns}
              dataSource={parts}
              rowKey="_id"
              loading={loading}
              pagination={{ pageSize: 20 }}
              size="small"
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title={<Space><ExportOutlined /> 最近领用记录</Space>} size="small">
            <List
              size="small"
              dataSource={records}
              renderItem={(item: any) => (
                <List.Item style={{ padding: '8px 0' }}>
                  <List.Item.Meta
                    avatar={<Avatar size="small" style={{ background: '#e6342a' }} icon={<ToolOutlined />} />}
                    title={<Text style={{ fontSize: 13 }}>{item.sparePartId?.name || '—'}</Text>}
                    description={
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {item.technicianId?.name || '—'} · 领用{item.quantity}件
                        · {new Date(item.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <PartModal
        open={partModal} editing={editingPart}
        onClose={() => setPartModal(false)} onOk={loadParts}
      />
      <ConsumeModal
        open={consumeModal} part={consumePart} orders={orders}
        onClose={() => setConsumeModal(false)} onOk={loadAll}
      />
    </div>
  );
}
