import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, message, Typography, Row, Col, Tag, Divider, Statistic } from 'antd';
import { PlusOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

const PROJECT_TYPES = [
  { label: '家用光伏', value: 'residential' },
  { label: '商用光伏', value: 'commercial' },
  { label: '工业光伏', value: 'industrial' },
];
const STATUS_COLORS: Record<string, string> = {
  pending: 'orange', approved: 'green', rejected: 'red', converted: 'blue', expired: 'default',
};
const STATUS_TEXT: Record<string, string> = {
  pending: '待审批', approved: '已通过', rejected: '已驳回', converted: '已转化', expired: '已过期',
};

export default function Leads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form] = Form.useForm();
  const user = JSON.parse(localStorage.getItem('partner_user') || '{}');

  function loadLeads() {
    setLoading(true);
    fetch('/api/leads', {
      headers: { Authorization: `Bearer ${localStorage.getItem('partner_token') || ''}` },
    }).then(r => r.json()).then(d => {
      if (d.success) setLeads(d.data || []);
    }).finally(() => setLoading(false));
  }

  useEffect(() => { loadLeads(); }, []);

  async function handleCreate() {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('partner_token') || ''}` },
        body: JSON.stringify(values),
      }).then(r => r.json());
      if (res.success) {
        message.success('线索提交成功！');
        setCreateOpen(false);
        form.resetFields();
        loadLeads();
      } else {
        message.error(res.message || '提交失败');
      }
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    { title: '客户名称', dataIndex: 'customerName', key: 'name' },
    { title: '电话', dataIndex: 'customerPhone', key: 'phone' },
    { title: '地址', dataIndex: 'customerAddress', key: 'addr', ellipsis: true },
    { title: '项目类型', dataIndex: 'projectType', key: 'type', render: (t: string) => PROJECT_TYPES.find(x => x.value === t)?.label || t },
    { title: '预估容量', dataIndex: 'estimatedCapacity', key: 'cap', render: (v: number) => v ? `${v} kW` : '—' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={STATUS_COLORS[s]}>{STATUS_TEXT[s] || s}</Tag> },
    { title: '有效期至', dataIndex: 'protectExpiresAt', key: 'expire', render: (t: string) => t ? new Date(t).toLocaleDateString('zh-CN') : '—' },
    {
      title: '操作', key: 'action',
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelected(r); setDetailOpen(true); }}>详情</Button>
          {r.status === 'pending' && user.role === 'owner' && (
            <Button size="small" type="primary" onClick={() => {
              fetch(`/api/leads/${r._id}/convert`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('partner_token') || ''}` },
                body: JSON.stringify({}),
              }).then(r2 => r2.json()).then(d => {
                if (d.success) { message.success('已标记为转化'); loadLeads(); }
                else message.error(d.message);
              });
            }}>标记转化</Button>
          )}
        </Space>
      ),
    },
  ];

  const pendingCount = leads.filter(l => l.status === 'pending').length;
  const approvedCount = leads.filter(l => l.status === 'approved').length;
  const convertedCount = leads.filter(l => l.status === 'converted').length;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>📋 客户线索管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>录入线索</Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic title="待审批" value={pendingCount} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="已通过" value={approvedCount} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="已转化" value={convertedCount} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table dataSource={leads} columns={columns} rowKey="_id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>

      {/* 录入线索弹窗 */}
      <Modal open={createOpen} title="录入客户线索" onCancel={() => setCreateOpen(false)} footer={null} width={600}>
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
              <Form.Item name="customerAddress" label="项目地址" rules={[{ required: true, message: '请输入项目地址' }]}>
                <Input placeholder="请输入详细地址" />
              </Form.Item>
            </Col>
          </Row>
          <Divider>项目信息</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="projectType" label="项目类型" rules={[{ required: true, message: '请选择项目类型' }]}>
                <Select placeholder="请选择" options={PROJECT_TYPES} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="estimatedCapacity" label="预估容量 (kW)">
                <Input type="number" placeholder="如：100" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="备注">
                <TextArea rows={3} placeholder="客户需求、意向情况等" />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCreateOpen(false)}>取消</Button>
              <Button type="primary" loading={loading} onClick={handleCreate}>提交线索</Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* 线索详情弹窗 */}
      <Modal open={detailOpen} title="线索详情" onCancel={() => setDetailOpen(false)} footer={null} width={600}>
        {selected && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}><Text type="secondary">客户名称：</Text>{selected.customerName}</Col>
              <Col span={12}><Text type="secondary">联系电话：</Text>{selected.customerPhone}</Col>
              <Col span={24}><Text type="secondary">项目地址：</Text>{selected.customerAddress}</Col>
              <Col span={12}><Text type="secondary">项目类型：</Text>{PROJECT_TYPES.find(x => x.value === selected.projectType)?.label}</Col>
              <Col span={12}><Text type="secondary">预估容量：</Text>{selected.estimatedCapacity ? `${selected.estimatedCapacity} kW` : '—'}</Col>
              <Col span={12}><Text type="secondary">状态：</Text><Tag color={STATUS_COLORS[selected.status]}>{STATUS_TEXT[selected.status]}</Tag></Col>
              <Col span={12}><Text type="secondary">有效期至：</Text>{selected.protectExpiresAt ? new Date(selected.protectExpiresAt).toLocaleDateString('zh-CN') : '—'}</Col>
              <Col span={12}><Text type="secondary">提交时间：</Text>{new Date(selected.createdAt).toLocaleString('zh-CN')}</Col>
              {selected.distributorId && <Col span={12}><Text type="secondary">分配分销商：</Text>{(selected.distributorId as any)?.name}</Col>}
              {selected.rejectionReason && <Col span={24}><Text type="secondary">驳回原因：</Text>{selected.rejectionReason}</Col>}
              {selected.description && <Col span={24}><Text type="secondary">备注：</Text>{selected.description}</Col>}
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
}
