import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, message, Typography, Row, Col, Tag, Divider, Statistic, Progress, Descriptions } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STAGE_COLORS: Record<string, string> = {
  initial_contact: 'default',
  qualification: 'blue',
  proposal: 'cyan',
  negotiation: 'orange',
  site_survey: 'purple',
  contract: 'green',
  won: 'green',
  lost: 'red',
};
const STAGE_LABELS: Record<string, string> = {
  initial_contact: '初步接触',
  qualification: '需求确认',
  proposal: '方案报价',
  negotiation: '商务谈判',
  site_survey: '现场勘查',
  contract: '合同签署',
  won: '已成交',
  lost: '已流失',
};
const PRODUCT_TYPES: Record<string, string> = {
  pv: '光伏',
  storage: '储能',
  hybrid: '光储一体',
  ev_charger: '充电桩',
};

const PIPELINE_STAGES = ['initial_contact', 'qualification', 'proposal', 'negotiation', 'site_survey', 'contract'];

export default function Opportunities() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form] = Form.useForm();

  function loadOpportunities() {
    setLoading(true);
    fetch('/api/opportunities', {
      headers: { Authorization: `Bearer ${localStorage.getItem('smartsolar_token') || ''}` },
    }).then(r => r.json()).then(d => {
      if (d.success) setOpportunities(d.data || []);
    }).finally(() => setLoading(false));
  }

  useEffect(() => { loadOpportunities(); }, []);

  async function handleCreate() {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const res = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('smartsolar_token') || ''}` },
        body: JSON.stringify(values),
      }).then(r => r.json());
      if (res.success) {
        message.success('商机创建成功');
        setCreateOpen(false);
        form.resetFields();
        loadOpportunities();
      } else {
        message.error(res.message || '创建失败');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/opportunities/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('smartsolar_token') || ''}` },
    }).then(r => r.json());
    if (res.success) { message.success('已删除'); loadOpportunities(); }
    else message.error(res.message);
  }

  const totalAmount = opportunities.reduce((s, o) => s + (o.estimatedAmount || 0), 0);
  const wonAmount = opportunities.filter(o => o.stage === 'won').reduce((s, o) => s + (o.estimatedAmount || 0), 0);
  const wonCount = opportunities.filter(o => o.stage === 'won').length;
  const totalCount = opportunities.length;

  // Pipeline stage counts
  // Pipeline stage counts
  const stageCounts: Record<string, number> = {};
  for (const s of PIPELINE_STAGES) { stageCounts[s] = opportunities.filter((o: any) => o.stage === s).length; }

  const columns = [
    { title: '商机标题', dataIndex: 'title', key: 'title', ellipsis: true },
    { title: '客户', dataIndex: 'customerName', key: 'customer' },
    { title: '产品类型', dataIndex: 'productType', key: 'product', render: (t: string) => PRODUCT_TYPES[t] || t },
    { title: '装机容量', dataIndex: 'systemCapacity', key: 'cap', render: (v: number) => v ? `${v} kW` : '—' },
    { title: '预估金额', dataIndex: 'estimatedAmount', key: 'amount', render: (v: number) => v ? `¥${v.toLocaleString()}` : '—' },
    { title: '赢单概率', dataIndex: 'probability', key: 'prob', render: (v: number) => v ? `${v}%` : '—' },
    { title: '阶段', dataIndex: 'stage', key: 'stage', render: (s: string) => <Tag color={STAGE_COLORS[s]}>{STAGE_LABELS[s] || s}</Tag> },
    { title: '预计签单', dataIndex: 'expectedCloseDate', key: 'close', render: (t: string) => t ? new Date(t).toLocaleDateString('zh-CN') : '—' },
    {
      title: '操作', key: 'action',
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelected(r); setDetailOpen(true); }}>详情</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => {
            form.setFieldsValue(r);
            setSelected(r);
            setCreateOpen(true);
          }}>编辑</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r._id)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>🔭 商机/销售漏斗</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setSelected(null); form.resetFields(); setCreateOpen(true); }}>创建商机</Button>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="商机总数" value={totalCount} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="预估总额" value={totalAmount} prefix="¥" valueStyle={{ fontSize: 16 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="已成交" value={wonCount} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="成交金额" value={wonAmount} prefix="¥" valueStyle={{ color: '#52c41a', fontSize: 16 }} />
          </Card>
        </Col>
      </Row>

      {/* 销售漏斗 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {PIPELINE_STAGES.map(stage => {
          const count = stageCounts[stage] || 0;
          const pct = totalCount > 0 ? Math.round(count / totalCount * 100) : 0;
          return (
            <Col span={4} key={stage}>
              <Card size="small" bodyStyle={{ textAlign: 'center' }}>
                <div style={{ color: STAGE_COLORS[stage], fontWeight: 600, marginBottom: 4 }}>{STAGE_LABELS[stage]}</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{count}</div>
                <Text type="secondary" style={{ fontSize: 12 }}>{pct}%</Text>
                <Progress percent={pct} showInfo={false} strokeColor={STAGE_COLORS[stage]} size="small" style={{ marginTop: 8 }} />
              </Card>
            </Col>
          );
        })}
      </Row>

      <Card>
        <Table dataSource={opportunities} columns={columns} rowKey="_id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>

      {/* 详情弹窗 */}
      <Modal open={detailOpen} title="商机详情" onCancel={() => setDetailOpen(false)} footer={
        <Button onClick={() => setDetailOpen(false)}>关闭</Button>
      } width={700}>
        {selected && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="商机编号">{selected.oppNo}</Descriptions.Item>
            <Descriptions.Item label="产品类型">{PRODUCT_TYPES[selected.productType] || selected.productType}</Descriptions.Item>
            <Descriptions.Item label="商机标题" span={2}>{selected.title}</Descriptions.Item>
            <Descriptions.Item label="客户名称">{selected.customerName}</Descriptions.Item>
            <Descriptions.Item label="联系电话">{selected.customerPhone}</Descriptions.Item>
            <Descriptions.Item label="装机容量">{selected.systemCapacity ? `${selected.systemCapacity} kW` : '—'}</Descriptions.Item>
            <Descriptions.Item label="预估金额">{selected.estimatedAmount ? `¥${selected.estimatedAmount.toLocaleString()}` : '—'}</Descriptions.Item>
            <Descriptions.Item label="赢单概率">{selected.probability ? `${selected.probability}%` : '—'}</Descriptions.Item>
            <Descriptions.Item label="当前阶段"><Tag color={STAGE_COLORS[selected.stage]}>{STAGE_LABELS[selected.stage]}</Tag></Descriptions.Item>
            <Descriptions.Item label="预计签单">{selected.expectedCloseDate ? new Date(selected.expectedCloseDate).toLocaleDateString('zh-CN') : '—'}</Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>{selected.notes || '—'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 创建/编辑弹窗 */}
      <Modal open={createOpen} title={selected ? '编辑商机' : '创建商机'} onCancel={() => { setCreateOpen(false); form.resetFields(); }} footer={null} width={700}>
        <Form form={form} layout="vertical" size="large">
          <Divider>基本信息</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="title" label="商机标题" rules={[{ required: true, message: '请输入商机标题' }]}>
                <Input placeholder="如：【客户名】项目名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="oppNo" label="商机编号">
                <Input placeholder="自动生成" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="customerName" label="客户名称" rules={[{ required: true, message: '请输入客户名称' }]}>
                <Input placeholder="客户名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="customerPhone" label="联系电话">
                <Input placeholder="手机号码" />
              </Form.Item>
            </Col>
          </Row>
          <Divider>项目信息</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="productType" label="产品类型" rules={[{ required: true, message: '请选择产品类型' }]}>
                <Select placeholder="请选择">
                  {Object.entries(PRODUCT_TYPES).map(([k, v]) => <Select.Option key={k} value={k}>{v}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="systemCapacity" label="装机容量 (kW)">
                <Input type="number" placeholder="如：15" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="estimatedAmount" label="预估金额 (元)">
                <Input type="number" placeholder="如：128000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="probability" label="赢单概率 (%)">
                <Input type="number" placeholder="0-100" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="stage" label="当前阶段" initialValue="initial_contact">
                <Select placeholder="请选择阶段">
                  {Object.entries(STAGE_LABELS).map(([k, v]) => <Select.Option key={k} value={k}>{v}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expectedCloseDate" label="预计签单日期">
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="备注">
            <TextArea rows={2} placeholder="备注信息..." />
          </Form.Item>
          <Button type="primary" onClick={handleCreate} loading={loading} style={{ width: '100%' }}>
            {selected ? '保存修改' : '创建商机'}
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
