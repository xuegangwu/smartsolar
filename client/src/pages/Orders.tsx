import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, InputNumber, message, Typography, Row, Col, Tag, Divider, Statistic } from 'antd';
import { PlusOutlined, EyeOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

const PRODUCT_TYPES = [
  { label: '光伏', value: 'pv' },
  { label: '储能', value: 'storage' },
  { label: '充电桩', value: 'ev_charger' },
  { label: '光储充一体', value: 'hybrid' },
];
const STATUS_COLORS: Record<string, string> = {
  pending: 'orange', confirmed: 'blue', shipped: 'cyan',
  installed: 'purple', completed: 'green', cancelled: 'red',
};
const STATUS_TEXT: Record<string, string> = {
  pending: '待确认', confirmed: '已确认', shipped: '已发货',
  installed: '已安装', completed: '已完成', cancelled: '已取消',
};
const STATUS_OPTIONS = Object.entries(STATUS_TEXT).map(([v, label]) => ({ value: v, label }));

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form] = Form.useForm();
  const [partners, setPartners] = useState<any[]>([]);

  const token = localStorage.getItem('smartsolar_token') || '';

  function loadOrders() {
    setLoading(true);
    fetch('/api/orders', {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(d => {
      if (d.success) setOrders(d.data || []);
    }).finally(() => setLoading(false));
  }

  function loadPartners() {
    fetch('/api/partners?page=1&limit=100', {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(d => {
      if (d.success) setPartners(d.data || []);
    }).catch(() => {});
  }

  useEffect(() => { loadOrders(); loadPartners(); }, []);

  async function handleCreate() {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      }).then(r => r.json());
      if (res.success) {
        message.success('订单创建成功！');
        setCreateOpen(false);
        form.resetFields();
        loadOrders();
      } else {
        message.error(res.message || '创建失败');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    }).then(r => r.json());
    if (res.success) {
      message.success(`订单已变更为「${STATUS_TEXT[newStatus]}」`);
      loadOrders();
    } else {
      message.error(res.message || '状态更新失败');
    }
  }

  const columns = [
    { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', render: (t: string) => <Text copyable={{ text: t }}>{t}</Text> },
    { title: '客户名称', dataIndex: 'customerName', key: 'name' },
    { title: '联系电话', dataIndex: 'customerPhone', key: 'phone' },
    { title: '产品类型', dataIndex: 'productType', key: 'type', render: (t: string) => PRODUCT_TYPES.find(x => x.value === t)?.label || t },
    { title: '数量', dataIndex: 'quantity', key: 'qty', render: (v: number) => `${v || 1}套` },
    { title: '订单金额', dataIndex: 'totalAmount', key: 'amount', render: (v: number) => v ? `¥${v.toLocaleString()}` : '—' },
    { title: '分销商', dataIndex: ['sourcePartnerId', 'name'], key: 'dist', render: (p: any) => p || '—' },
    { title: '安装商', dataIndex: ['assignedInstallerId', 'name'], key: 'inst', render: (p: any) => p || '—' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={STATUS_COLORS[s]}>{STATUS_TEXT[s] || s}</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', key: 'created', render: (t: string) => new Date(t).toLocaleDateString('zh-CN') },
    {
      title: '操作', key: 'action', render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelected(r); setDetailOpen(true); }}>详情</Button>
          {r.status === 'pending' && (
            <Button size="small" type="primary" onClick={() => handleStatusChange(r._id, 'confirmed')}>确认</Button>
          )}
          {r.status === 'confirmed' && (
            <Button size="small" onClick={() => handleStatusChange(r._id, 'shipped')}>发货</Button>
          )}
          {r.status === 'shipped' && (
            <Button size="small" type="primary" onClick={() => handleStatusChange(r._id, 'installed')}>确认安装</Button>
          )}
          {r.status === 'installed' && (
            <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleStatusChange(r._id, 'completed')}>完工</Button>
          )}
        </Space>
      ),
    },
  ];

  // 统计
  const totalAmount = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const completedCount = orders.filter(o => o.status === 'completed').length;

  const nextStatusAction: Record<string, { label: string, next: string }> = {
    pending: { label: '确认订单', next: 'confirmed' },
    confirmed: { label: '确认发货', next: 'shipped' },
    shipped: { label: '确认安装', next: 'installed' },
    installed: { label: '确认完工', next: 'completed' },
  };

  const distributorOptions = partners.filter(p => p.type === 'distributor').map(p => ({ value: p._id, label: `${p.name} (${p.level})` }));
  const installerOptions = partners.filter(p => p.type === 'installer').map(p => ({ value: p._id, label: `${p.name} (${p.level})` }));

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>📦 订单管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新建订单</Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small"><Statistic title="订单总数" value={orders.length} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="待确认" value={pendingCount} valueStyle={{ color: '#fa8c16' }} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="已完成" value={completedCount} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="订单总额" value={`¥${totalAmount.toLocaleString()}`} valueStyle={{ color: '#1890ff' }} /></Card>
        </Col>
      </Row>

      <Card>
        <Table dataSource={orders} columns={columns} rowKey="_id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>

      {/* 新建订单 */}
      <Modal open={createOpen} title="新建订单" onCancel={() => setCreateOpen(false)} footer={null} width={700}>
        <Form form={form} layout="vertical" size="large">
          <Divider>客户信息</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="customerName" label="客户名称" rules={[{ required: true, message: '请输入客户名称' }]}>
                <Input placeholder="请输入客户名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="customerPhone" label="联系电话" rules={[{ required: true, message: '请输入联系电话' }]}>
                <Input placeholder="手机号码" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="customerAddress" label="项目地址">
                <Input placeholder="请输入详细地址" />
              </Form.Item>
            </Col>
          </Row>
          <Divider>产品与订单</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="productType" label="产品类型" rules={[{ required: true, message: '请选择产品类型' }]}>
                <Select placeholder="请选择" options={PRODUCT_TYPES} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="productModel" label="产品型号">
                <Input placeholder="如：RS-HV5000" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="quantity" label="数量">
                <InputNumber min={1} defaultValue={1} style={{ width: '100%' }} placeholder="数量" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="totalAmount" label="订单金额 (元)">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="如：50000" />
              </Form.Item>
            </Col>
          </Row>
          <Divider>渠道分配</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sourcePartnerId" label="分销商">
                <Select placeholder="请选择分销商" options={distributorOptions} allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="assignedInstallerId" label="安装商">
                <Select placeholder="请选择安装商" options={installerOptions} allowClear />
              </Form.Item>
            </Col>
          </Row>
          <Divider>备注</Divider>
          <Form.Item name="notes" label="备注">
            <TextArea rows={3} placeholder="订单备注、特殊要求等" />
          </Form.Item>
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCreateOpen(false)}>取消</Button>
              <Button type="primary" loading={loading} onClick={handleCreate}>创建订单</Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* 订单详情 */}
      <Modal open={detailOpen} title="订单详情" onCancel={() => setDetailOpen(false)} footer={null} width={650}>
        {selected && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}><Text type="secondary">订单号：</Text>{selected.orderNo}</Col>
              <Col span={12}><Text type="secondary">状态：</Text><Tag color={STATUS_COLORS[selected.status]}>{STATUS_TEXT[selected.status]}</Tag></Col>
              <Col span={12}><Text type="secondary">客户名称：</Text>{selected.customerName}</Col>
              <Col span={12}><Text type="secondary">联系电话：</Text>{selected.customerPhone}</Col>
              <Col span={24}><Text type="secondary">项目地址：</Text>{selected.customerAddress || '—'}</Col>
              <Col span={12}><Text type="secondary">产品类型：</Text>{PRODUCT_TYPES.find(x => x.value === selected.productType)?.label || '—'}</Col>
              <Col span={12}><Text type="secondary">产品型号：</Text>{selected.productModel || '—'}</Col>
              <Col span={12}><Text type="secondary">数量：</Text>{selected.quantity || 1}套</Col>
              <Col span={12}><Text type="secondary">订单金额：</Text>{selected.totalAmount ? `¥${selected.totalAmount.toLocaleString()}` : '—'}</Col>
              <Col span={12}><Text type="secondary">分销商：</Text>{(selected.sourcePartnerId as any)?.name || '—'}</Col>
              <Col span={12}><Text type="secondary">安装商：</Text>{(selected.assignedInstallerId as any)?.name || '—'}</Col>
              {selected.installationDate && <Col span={12}><Text type="secondary">安装日期：</Text>{new Date(selected.installationDate).toLocaleDateString('zh-CN')}</Col>}
              {selected.completionDate && <Col span={12}><Text type="secondary">完工日期：</Text>{new Date(selected.completionDate).toLocaleDateString('zh-CN')}</Col>}
              <Col span={12}><Text type="secondary">创建时间：</Text>{new Date(selected.createdAt).toLocaleString('zh-CN')}</Col>
              {selected.notes && <Col span={24}><Text type="secondary">备注：</Text>{selected.notes}</Col>}
            </Row>

            {selected.workOrderId && (
              <>
                <Divider>关联工单</Divider>
                <Text type="secondary">工单号：</Text>{(selected.workOrderId as any)?.orderNo || '—'}
                &nbsp;|&nbsp;<Text type="secondary">状态：</Text><Tag>{(selected.workOrderId as any)?.status || '—'}</Tag>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
