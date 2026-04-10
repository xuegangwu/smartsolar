import { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Button, Space, Select, Row, Col, message,
  Modal, Form, Input, Typography, Badge, Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckOutlined, ThunderboltOutlined, AlertOutlined,
  WarningOutlined, FireOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { alertApi } from '../services/api';

const { Text } = Typography;

const LEVEL_COLOR: Record<string, string> = {
  critical: '#ff5252',
  major: '#ffab40',
  minor: '#5a6a7a',
};
const LEVEL_TEXT: Record<string, string> = {
  critical: '严重', major: '重要', minor: '一般',
};

// ─── Mini Donut ──────────────────────────────────────────────────────────────
function MiniDonut({ critical, major, minor }: { critical: number; major: number; minor: number }) {
  const total = critical + major + minor || 1;
  const r = 32, circ = 2 * Math.PI * r;
  const cPct = critical / total;
  const mPct = major / total;
  const iPct = minor / total;
  const cDash = (cPct * circ).toFixed(1);
  const mDash = (mPct * circ).toFixed(1);
  const iDash = (iPct * circ).toFixed(1);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <svg viewBox="0 0 80 80" width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="40" cy="40" r={r} fill="transparent" stroke="#1a2438" strokeWidth="10" />
        <circle cx="40" cy="40" r={r} fill="transparent" stroke="#ff5252" strokeWidth="10"
          strokeDasharray={`${cDash} ${circ}`} strokeDashoffset="0" />
        <circle cx="40" cy="40" r={r} fill="transparent" stroke="#ffab40" strokeWidth="10"
          strokeDasharray={`${mDash} ${circ}`} strokeDashoffset={`${(-cPct * circ).toFixed(1)}`} />
        <circle cx="40" cy="40" r={r} fill="transparent" stroke="#5a6a7a" strokeWidth="10"
          strokeDasharray={`${iDash} ${circ}`} strokeDashoffset={`${(-(cPct + mPct) * circ).toFixed(1)}`} />
        <circle cx="40" cy="40" r="24" fill="#141c2e" />
      </svg>
      <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', lineHeight: 2 }}>
        <div style={{ color: '#ff5252' }}>● 严重 {critical}</div>
        <div style={{ color: '#ffab40' }}>● 重要 {major}</div>
        <div style={{ color: '#5a6a7a' }}>● 一般 {minor}</div>
      </div>
    </div>
  );
}

// ─── Stat Cards ──────────────────────────────────────────────────────────────
function StatCards({ stats, onClick }: { stats: any; onClick?: () => void }) {
  return (
    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
      <Col xs={12} sm={5}>
        <Card size="small" style={{ background: '#141c2e', border: '1px solid #2a3a52', borderRadius: 12, textAlign: 'center', cursor: onClick ? 'pointer' : 'default' }} bodyStyle={{ padding: '12px 8px' }} onClick={onClick}>
          <div style={{ color: '#5a6a7a', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', marginBottom: 6 }}>
            告警总数
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#00e5c0', fontFamily: 'JetBrains Mono, monospace' }}>
            {stats.total}
          </div>
        </Card>
      </Col>
      <Col xs={12} sm={5}>
        <Card size="small" style={{ background: '#141c2e', border: '1px solid #ff525230', borderRadius: 12, textAlign: 'center' }} bodyStyle={{ padding: '12px 8px' }}>
          <div style={{ color: '#5a6a7a', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', marginBottom: 6 }}>
            🔴 严重
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#ff5252', fontFamily: 'JetBrains Mono, monospace' }}>
            {stats.critical}
          </div>
        </Card>
      </Col>
      <Col xs={12} sm={5}>
        <Card size="small" style={{ background: '#141c2e', border: '1px solid #ffab4030', borderRadius: 12, textAlign: 'center' }} bodyStyle={{ padding: '12px 8px' }}>
          <div style={{ color: '#5a6a7a', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', marginBottom: 6 }}>
            🟠 重要
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#ffab40', fontFamily: 'JetBrains Mono, monospace' }}>
            {stats.major}
          </div>
        </Card>
      </Col>
      <Col xs={12} sm={5}>
        <Card size="small" style={{ background: '#141c2e', border: '1px solid #5a6a7a30', borderRadius: 12, textAlign: 'center' }} bodyStyle={{ padding: '12px 8px' }}>
          <div style={{ color: '#5a6a7a', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', marginBottom: 6 }}>
            🟡 一般
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#5a6a7a', fontFamily: 'JetBrains Mono, monospace' }}>
            {stats.minor}
          </div>
        </Card>
      </Col>
      <Col xs={12} sm={4}>
        <Card size="small" style={{ background: '#141c2e', border: '1px solid #2a3a52', borderRadius: 12, textAlign: 'center' }} bodyStyle={{ padding: '12px 8px' }}>
          <div style={{ color: '#5a6a7a', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', marginBottom: 6 }}>
            未确认
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: stats.unacknowledged > 0 ? '#ff5252' : '#00e5c0', fontFamily: 'JetBrains Mono, monospace' }}>
            {stats.unacknowledged}
          </div>
          {stats.total > 0 && <MiniDonut critical={stats.critical} major={stats.major} minor={stats.minor} />}
        </Card>
      </Col>
    </Row>
  );
}

// ─── Convert to WorkOrder Modal ─────────────────────────────────────────────
function ConvertModal({ alert, open, onClose, onOk }: { alert: any; open: boolean; onClose: () => void; onOk: () => void }) {
  const [form] = Form.useForm();
  useEffect(() => {
    if (open && alert) {
      const priority = alert.level === 'critical' ? 'urgent' : alert.level === 'major' ? 'important' : 'normal';
      form.setFieldsValue({
        title: `[告警] ${alert.message}`.slice(0, 100),
        type: 'fault',
        priority,
        description: `告警代码: ${alert.code || '无'}\n告警内容: ${alert.message}\n发生时间: ${new Date(alert.createdAt).toLocaleString('zh-CN')}`,
      });
    }
  }, [open, alert]);

  async function handleSubmit() {
    const values = await form.validateFields();
    const res = await fetch('/api/work-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (data.success) { message.success('工单已创建！'); onOk(); onClose(); }
    else message.error('创建失败');
  }

  return (
    <Modal title="⚡ 告警 → 创建工单" open={open} onOk={handleSubmit} onCancel={onClose} width={600} okText="创建工单">
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="title" label="工单标题" rules={[{ required: true }]}>
          <Input style={{ background: '#1a2438', borderColor: '#2a3a52', color: '#e2e8f0' }} />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="type" label="工单类型" initialValue="fault">
              <Select style={{ width: '100%' }}
                options={[{ value: 'fault', label: '故障维修' }, { value: 'maintenance', label: '预防性维护' }]}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="priority" label="优先级">
              <Select style={{ width: '100%' }}
                options={[{ value: 'urgent', label: '🔴 紧急' }, { value: 'important', label: '🟠 重要' }, { value: 'normal', label: '🔵 一般' }]}
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="description" label="详细描述">
          <Input.TextArea rows={5} style={{ background: '#1a2438', borderColor: '#2a3a52', color: '#e2e8f0' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────
export default function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, critical: 0, major: 0, minor: 0, unacknowledged: 0 });
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [filterAck, setFilterAck] = useState<string>('');
  const [convertAlert, setConvertAlert] = useState<any>(null);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadAlerts(); }, [filterLevel, filterAck]);

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(loadAll, 30000);
    return () => clearInterval(t);
  }, []);

  async function loadAll() {
    await Promise.all([loadStats(), loadAlerts()]);
  }

  async function loadStats() {
    const res = await alertApi.getStats();
    if (res.success) setStats(res.data);
  }

  async function loadAlerts() {
    setLoading(true);
    const params: any = {};
    if (filterLevel) params.level = filterLevel;
    if (filterAck === 'acked') params.acknowledged = true;
    else if (filterAck === 'unacked') params.acknowledged = false;
    const res = await alertApi.getAll(params);
    if (res.success) setAlerts(res.data);
    setLoading(false);
  }

  async function handleAck(id: string) {
    await alertApi.acknowledge(id);
    message.success('已确认');
    loadAll();
  }

  async function handleBatchAck() {
    if (!selectedRowKeys.length) return;
    await alertApi.acknowledgeBatch(selectedRowKeys as string[]);
    message.success(`已确认 ${selectedRowKeys.length} 条`);
    setSelectedRowKeys([]);
    loadAll();
  }

  const columns: ColumnsType<any> = [
    {
      title: '级别', dataIndex: 'level', width: 90,
      render: l => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: LEVEL_COLOR[l], boxShadow: `0 0 6px ${LEVEL_COLOR[l]}` }} />
          <Tag style={{ borderColor: LEVEL_COLOR[l], color: LEVEL_COLOR[l], background: `${LEVEL_COLOR[l]}15` }}>
            {LEVEL_TEXT[l]}
          </Tag>
        </div>
      ),
    },
    {
      title: '时间', dataIndex: 'createdAt', width: 150,
      render: v => (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#8899aa' }}>
          {new Date(v).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    { title: '电站', dataIndex: ['stationId', 'name'], width: 140, render: v => <span style={{ color: '#8899aa' }}>{v || '—'}</span> },
    {
      title: '告警内容', dataIndex: 'message',
      render: (v, r) => (
        <span style={{ color: r.level === 'critical' && !r.acknowledged ? '#ff5252' : '#e2e8f0' }}>
          {v}
        </span>
      ),
    },
    {
      title: '状态', dataIndex: 'acknowledged', width: 90,
      render: a => a
        ? <Tag style={{ background: '#00e5c015', color: '#00e5c0', borderColor: '#00e5c0' }}>已确认</Tag>
        : <Tag style={{ background: '#ff525215', color: '#ff5252', borderColor: '#ff5252' }}>未确认</Tag>,
    },
    {
      title: '操作', key: 'action', width: 160,
      render: (_, r) => (
        <Space size="small">
          {!r.acknowledged && (
            <Button size="small" icon={<CheckOutlined />} onClick={() => handleAck(r._id)} style={{ background: '#00e5c015', borderColor: '#00e5c0', color: '#00e5c0' }}>
              确认
            </Button>
          )}
          <Button size="small" icon={<ThunderboltOutlined />} onClick={() => setConvertAlert(r)} style={{ background: '#ffab4015', borderColor: '#ffab40', color: '#ffab40' }}>
            转工单
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <StatCards stats={stats} />

      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertOutlined style={{ color: '#00e5c0' }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              告警记录
            </span>
            <span style={{ fontSize: 12, color: '#5a6a7a', fontFamily: 'JetBrains Mono, monospace' }}>
              · 每30秒自动刷新
            </span>
          </div>
        }
        extra={
          <Space wrap>
            <Select value={filterLevel} onChange={v => { setFilterLevel(v); }} placeholder="级别" allowClear style={{ width: 100 }}
              options={[{ value: 'critical', label: '严重' }, { value: 'major', label: '重要' }, { value: 'minor', label: '一般' }]} />
            <Select value={filterAck} onChange={setFilterAck} placeholder="状态" allowClear style={{ width: 100 }}
              options={[{ value: 'acked', label: '已确认' }, { value: 'unacked', label: '未确认' }]} />
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleBatchAck}
              disabled={!selectedRowKeys.length}
              style={{ background: '#00e5c0', border: 'none' }}
            >
              批量确认 {selectedRowKeys.length > 0 ? `(${selectedRowKeys.length})` : ''}
            </Button>
          </Space>
        }
        style={{ background: '#141c2e', border: '1px solid #2a3a52', borderRadius: 12 }}
      >
        <Table
          columns={columns}
          dataSource={alerts}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          rowClassName={r => r.level === 'critical' && !r.acknowledged ? 'critical-unack' : ''}
          style={{ background: 'transparent' }}
        />
      </Card>

      <ConvertModal alert={convertAlert} open={!!convertAlert} onClose={() => setConvertAlert(null)} onOk={loadAll} />

      <style>{`
        .critical-unack td {
          background: rgba(239,68,68,0.05) !important;
          border-left: 3px solid #ff5252 !important;
        }
        .ant-table {
          background: transparent !important;
        }
        .ant-table-thead > tr > th {
          background: #111827 !important;
          color: #00e5c0 !important;
          border-bottom: 1px solid #2a3a52 !important;
          font-family: JetBrains Mono, monospace !important;
          font-size: 11px !important;
          text-transform: uppercase;
        }
        .ant-table-tbody > tr > td {
          background: transparent !important;
          border-bottom: 1px solid #2a3a52 !important;
          color: #8899aa !important;
        }
        .ant-table-tbody > tr:hover > td {
          background: #1a2438 !important;
        }
        .ant-pagination {
          color: #8899aa !important;
        }
        .ant-tag {
          font-family: JetBrains Mono, monospace !important;
          font-size: 11px !important;
        }
        .ant-select-dropdown {
          background: #141c2e !important;
          border: 1px solid #2a3a52 !important;
        }
        .ant-select-item {
          color: #8899aa !important;
        }
        .ant-select-item-option-selected {
          background: rgba(0,212,170,0.1) !important;
          color: #00e5c0 !important;
        }
        .ant-input, .ant-select-selector {
          background: #1a2438 !important;
          border: 1px solid #2a3a52 !important;
          color: #e2e8f0 !important;
        }
        @media (max-width: 767px) {
          .ant-table-thead { display: none; }
          .ant-table-tbody > tr { display: block; background: #141c2e !important; border: 1px solid #2a3a52 !important; border-radius: 12px; margin-bottom: 12px; padding: 12px; }
          .ant-table-tbody > tr > td { display: block; padding: 4px 0; border: none !important; }
        }
      `}</style>
    </div>
  );
}
