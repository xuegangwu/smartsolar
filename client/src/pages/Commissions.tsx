import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Modal, Tag, message, Typography, Row, Col, Statistic, Select } from 'antd';
import { DollarOutlined, ExportOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = { pending: 'orange', approved: 'blue', paid: 'green', rejected: 'red' };
const STATUS_TEXT: Record<string, string> = { pending: '待审批', approved: '已通过', paid: '已付款', rejected: '已驳回' };
const TYPE_TEXT: Record<string, string> = { sales: '销售佣金', installation: '安装佣金', referral: '介绍佣金', override: 'Override' };

export default function Commissions() {
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');

  const token = localStorage.getItem('partner_token') || localStorage.getItem('smartsolar_token') || '';

  function loadCommissions() {
    setLoading(true);
    const url = filterStatus ? `/api/commissions?status=${filterStatus}` : '/api/commissions';
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(d => {
      if (d.success) setCommissions(d.data || []);
      else setCommissions([]);
    }).finally(() => setLoading(false));
  }

  useEffect(() => { loadCommissions(); }, [filterStatus]);

  async function handleApplyPay(id: string) {
    const res = await fetch(`/api/commissions/${id}/apply-pay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json());
    if (res.success) { message.success('已提交付款申请'); loadCommissions(); }
    else message.error(res.message || '申请失败');
  }

  async function handleMarkPaid(id: string) {
    const res = await fetch(`/api/commissions/${id}/paid`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ paidMethod: '银行转账' }),
    }).then(r => r.json());
    if (res.success) { message.success('已标记为付款'); loadCommissions(); }
    else message.error(res.message || '更新失败');
  }

  const columns = [
    { title: '佣金单号', dataIndex: 'commissionNo', key: 'no', render: (t: string) => <Text copyable={{ text: t }}>{t}</Text> },
    { title: '类型', dataIndex: 'type', key: 'type', render: (t: string) => TYPE_TEXT[t] || t },
    { title: '分销商', dataIndex: ['distributorId', 'name'], key: 'dist', render: (p: any) => p || '—' },
    { title: '安装商', dataIndex: ['installerId', 'name'], key: 'inst', render: (p: any) => p || '—' },
    { title: '金额', dataIndex: 'amount', key: 'amount', render: (v: number) => <Text strong style={{ color: '#52c41a' }}>¥{v.toLocaleString()}</Text> },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={STATUS_COLORS[s]}>{STATUS_TEXT[s] || s}</Tag> },
    { title: '账期', dataIndex: 'period', key: 'period' },
    { title: '创建时间', dataIndex: 'createdAt', key: 'created', render: (t: string) => new Date(t).toLocaleDateString('zh-CN') },
    {
      title: '操作', key: 'action', render: (_: any, r: any) => (
        <Space>
          {r.status === 'pending' && (
            <Button size="small" type="primary" onClick={() => handleApplyPay(r._id)}>申请付款</Button>
          )}
          {r.status === 'approved' && (
            <Button size="small" type="primary" icon={<DollarOutlined />} onClick={() => handleMarkPaid(r._id)}>确认付款</Button>
          )}
          {r.paidDate && <Text type="secondary">付款日期：{new Date(r.paidDate).toLocaleDateString('zh-CN')}</Text>}
        </Space>
      ),
    },
  ];

  const totalPending = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0);
  const totalApproved = commissions.filter(c => c.status === 'approved').reduce((s, c) => s + c.amount, 0);
  const totalPaid = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0);

  function exportCSV() {
    const csv = ['佣金单号,类型,分销商,安装商,金额,状态,账期'].concat(
      commissions.map(c =>
        `${c.commissionNo},${TYPE_TEXT[c.type] || c.type},${(c.distributorId as any)?.name || ''},${(c.installerId as any)?.name || ''},${c.amount},${STATUS_TEXT[c.status] || c.status},${c.period}`
      )
    ).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>💰 佣金管理</Title>
        <Space>
          <Select placeholder="筛选状态" allowClear style={{ width: 130 }} onChange={v => setFilterStatus(v || '')}>
            {Object.entries(STATUS_TEXT).map(([v, label]) => (
              <Select.Option key={v} value={v}>{label}</Select.Option>
            ))}
          </Select>
          <Button icon={<ExportOutlined />} onClick={exportCSV}>导出CSV</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small"><Statistic title="待审批" value={totalPending} valueStyle={{ color: '#fa8c16' }} prefix="¥" /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="已通过待付" value={totalApproved} valueStyle={{ color: '#1890ff' }} prefix="¥" /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="已付款" value={totalPaid} valueStyle={{ color: '#52c41a' }} prefix="¥" /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="佣金记录数" value={commissions.length} /></Card>
        </Col>
      </Row>

      <Card>
        <Table dataSource={commissions} columns={columns} rowKey="_id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>
    </div>
  );
}
