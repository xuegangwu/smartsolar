import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Modal, Form, InputNumber, Select, message, Typography, Row, Col, Tag, Statistic } from 'antd';
import { DollarOutlined, CheckCircleOutlined, ReloadOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = { pending: 'orange', confirmed: 'blue', paid: 'green' };
const STATUS_TEXT: Record<string, string> = { pending: '待确认', confirmed: '已确认', paid: '已付款' };

function getCurrentYearMonth() {
  const now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
}

function genMonthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const v = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    opts.push({ value: v, label: v });
  }
  return opts;
}

export default function Settlements() {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [yearMonth, setYearMonth] = useState<string>(getCurrentYearMonth());
  const user = JSON.parse(localStorage.getItem('partner_user') || '{}');

  function loadSettlements() {
    setLoading(true);
    fetch(`/api/settlements?yearMonth=${yearMonth}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('partner_token') || ''}` },
    }).then(r => r.json()).then(d => {
      if (d.success) setSettlements(d.data || []);
    }).finally(() => setLoading(false));
  }

  useEffect(() => { loadSettlements(); }, [yearMonth]);

  async function handleGenerate() {
    setGenerating(true);
    const res = await fetch('/api/settlements/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('partner_token') || ''}` },
      body: JSON.stringify({ yearMonth }),
    }).then(r => r.json());
    setGenerating(false);
    if (res.success) {
      message.success(`生成 ${yearMonth} 结算单成功！共 ${res.data.length} 条`);
      loadSettlements();
    } else {
      message.error(res.message || '生成失败');
    }
  }

  async function handleConfirm(id: string) {
    const res = await fetch(`/api/settlements/${id}/confirm`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('partner_token') || ''}` },
    }).then(r => r.json());
    if (res.success) { message.success('已确认结算'); loadSettlements(); }
    else message.error(res.message);
  }

  async function handleMarkPaid(id: string) {
    const res = await fetch(`/api/settlements/${id}/paid`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('partner_token') || ''}` },
      body: JSON.stringify({ paymentMethod: '银行转账' }),
    }).then(r => r.json());
    if (res.success) { message.success('已标记为付款'); loadSettlements(); }
    else message.error(res.message);
  }

  const columns = [
    { title: '安装商', dataIndex: ['partnerId', 'name'], key: 'partner', render: (p: any) => p?.name || '—' },
    { title: '月份', dataIndex: 'yearMonth', key: 'month' },
    { title: '安装套数', dataIndex: 'installationsCount', key: 'count' },
    { title: '配额', dataIndex: 'monthlyQuota', key: 'quota', render: (v: number) => v || '未设置' },
    { title: '完成率', dataIndex: 'quotaAchieved', key: 'rate', render: (v: number) => v ? `${v}%` : '—' },
    { title: '佣金比例', dataIndex: 'commissionRate', key: 'rate2', render: (v: number) => `${v}%` },
    { title: '佣金金额', dataIndex: 'commissionAmount', key: 'amount', render: (v: number) => `¥${v.toLocaleString()}` },
    { title: '获得积分', dataIndex: 'pointsEarned', key: 'points', render: (v: number) => v.toLocaleString() },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={STATUS_COLORS[s]}>{STATUS_TEXT[s]}</Tag> },
    {
      title: '操作', key: 'action', render: (_: any, r: any) => (
        <Space>
          {r.status === 'pending' && user.role !== 'installer' && (
            <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleConfirm(r._id)}>确认</Button>
          )}
          {r.status === 'confirmed' && user.role !== 'installer' && (
            <Button size="small" type="primary" icon={<DollarOutlined />} onClick={() => handleMarkPaid(r._id)}>付款</Button>
          )}
          {r.status === 'paid' && <Text type="secondary">已完成</Text>}
        </Space>
      ),
    },
  ];

  const totalCommission = settlements.reduce((s, r) => s + (r.commissionAmount || 0), 0);
  const pendingCount = settlements.filter(r => r.status === 'pending').length;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>💰 月度结算</Title>
        <Space>
          <Select value={yearMonth} onChange={setYearMonth} options={genMonthOptions()} style={{ width: 130 }} />
          <Button icon={<ReloadOutlined />} loading={generating} onClick={handleGenerate}>生成结算单</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card size="small"><Statistic title="结算单数" value={settlements.length} /></Card>
        </Col>
        <Col span={8}>
          <Card size="small"><Statistic title="待确认" value={pendingCount} valueStyle={{ color: '#fa8c16' }} /></Card>
        </Col>
        <Col span={8}>
          <Card size="small"><Statistic title="合计佣金" value={`¥${totalCommission.toLocaleString()}`} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
      </Row>

      <Card>
        <Table dataSource={settlements} columns={columns} rowKey="_id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>
    </div>
  );
}
