import { useState, useEffect } from 'react';
import { Card, Table, Tag, Typography, Spin, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

const TXN_TYPE_TEXT: Record<string, string> = { earn: '赚取', redeem: '兑换', adjust: '调整', expire: '过期', deduct: '扣分' };
const TXN_COLOR: Record<string, string> = { earn: 'green', redeem: 'blue', adjust: 'orange', expire: 'default', deduct: 'red' };

export default function PartnerTransactions() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('partner_token');
    if (!token) { navigate('/partner-login'); return; }
    fetch('/api/partners/points/transactions', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(res => { if (res.success) setData(res.data); })
      .catch(() => navigate('/partner-login'))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: '时间', dataIndex: 'createdAt', render: (v: string) => new Date(v).toLocaleString('zh-CN'), width: 180 },
    { title: '类型', dataIndex: 'type', render: (t: string) => <Tag color={TXN_COLOR[t]}>{TXN_TYPE_TEXT[t] || t}</Tag>, width: 80 },
    { title: '说明', dataIndex: 'description', ellipsis: true },
    { title: '变动', dataIndex: 'amount', render: (v: number) => {
      const color = v > 0 ? '#22c55e' : '#ef4444';
      return <span style={{ color, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
        {v > 0 ? `+${v.toLocaleString()}` : v.toLocaleString()}
      </span>;
    }, width: 120 },
    { title: '余额', dataIndex: 'balance', render: (v: number) => (
      <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{v.toLocaleString()}</span>
    ), width: 120 },
  ];

  return (
    <div style={{ padding: 24, background: '#f5f6f8', minHeight: '100vh' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/partner-dashboard')} style={{ marginBottom: 16 }}>
        返回工作台
      </Button>
      <Card title="💰 积分流水" style={{ borderRadius: 12 }}>
        {loading ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div> : (
          <Table dataSource={data} columns={columns} rowKey="_id" pagination={{ pageSize: 20 }} />
        )}
      </Card>
    </div>
  );
}
