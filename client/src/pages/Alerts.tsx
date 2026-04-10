import { useState, useEffect, useRef } from 'react';
import {
  Card, Table, Tag, Button, Space, Select, Statistic, Row, Col, message,
  Modal, Form, Input, Divider, Typography, Tooltip, Badge,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckOutlined, ThunderboltOutlined, AlertOutlined,
  WarningOutlined, FireOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { alertApi, stationApi, workOrderApi } from '../services/api';

const { Text, Title } = Typography;
const { TextArea } = Input;

const LEVEL_COLOR: Record<string, string> = {
  critical: 'red',
  major: 'orange',
  minor: 'gold',
};
const LEVEL_TEXT: Record<string, string> = {
  critical: '严重', major: '重要', minor: '一般',
};
const LEVEL_ICON: Record<string, React.ReactNode> = {
  critical: <FireOutlined />,
  major: <WarningOutlined />,
  minor: <ExclamationCircleOutlined />,
};

// ─── Mini Pie Chart (CSS only) ─────────────────────────────────────────────────
function MiniPie({ critical, major, minor }: { critical: number; major: number; minor: number }) {
  const total = critical + major + minor || 1;
  const cPct = (critical / total * 100).toFixed(1);
  const mPct = (major / total * 100).toFixed(1);
  const iPct = (minor / total * 100).toFixed(1);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg viewBox="0 0 32 32" width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
        <circle r="16" cx="16" cy="16" fill="transparent" stroke="#ff4d4f" strokeWidth="8"
          strokeDasharray={`${(critical / total * 100.4).toFixed(1)} 100.4`} strokeDashoffset="0" />
        <circle r="16" cx="16" cy="16" fill="transparent" stroke="#fa8c16" strokeWidth="8"
          strokeDasharray={`${(major / total * 100.4).toFixed(1)} 100.4`}
          strokeDashoffset={`${(-(critical / total * 100.4)).toFixed(1)}`} />
        <circle r="16" cx="16" cy="16" fill="transparent" stroke="#faad14" strokeWidth="8"
          strokeDasharray={`${(minor / total * 100.4).toFixed(1)} 100.4`}
          strokeDashoffset={`${(-((critical + major) / total * 100.4)).toFixed(1)}`} />
      </svg>
      <div style={{ fontSize: 12 }}>
        <div style={{ color: '#ff4d4f' }}>● 严重 {critical} ({cPct}%)</div>
        <div style={{ color: '#fa8c16' }}>● 重要 {major} ({mPct}%)</div>
        <div style={{ color: '#faad14' }}>● 一般 {minor} ({iPct}%)</div>
      </div>
    </div>
  );
}

// ─── Alert Detail Modal ───────────────────────────────────────────────────────
function AlertDetailModal({
  alert, stations, onClose, onAcknowledge, onConvertToWorkOrder,
}: {
  alert: any; stations: any[]; onClose: () => void;
  onAcknowledge: (id: string) => void;
  onConvertToWorkOrder: (alert: any) => void;
}) {
  const [form] = Form.useForm();
  return (
    <Modal
      title={
        <Space>
          <AlertOutlined style={{ color: LEVEL_COLOR[alert?.level] }} />
          <span>告警详情</span>
          <Tag color={LEVEL_COLOR[alert?.level]}>{LEVEL_TEXT[alert?.level]}</Tag>
          {alert?.acknowledged ? <Tag color="green">已确认</Tag> : <Tag color="red">未确认</Tag>}
        </Space>
      }
      open={!!alert} onCancel={onClose} width={640}
      footer={
        <Space>
          {!alert?.acknowledged && (
            <Button type="primary" icon={<CheckOutlined />} onClick={() => { onAcknowledge(alert._id); onClose(); }}>
              确认告警
            </Button>
          )}
          <Button icon={<ThunderboltOutlined />} onClick={() => onConvertToWorkOrder(alert)}>
            一键转工单
          </Button>
          <Button onClick={onClose}>关闭</Button>
        </Space>
      }
    >
      {alert && (
        <div>
          <Row gutter={[16, 8]} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Text type="secondary">告警时间</Text><br />
              <Text>{new Date(alert.createdAt).toLocaleString('zh-CN')}</Text>
            </Col>
            <Col span={12}>
              <Text type="secondary">告警代码</Text><br />
              <Text code>{alert.code || '—'}</Text>
            </Col>
            <Col span={12}>
              <Text type="secondary">电站</Text><br />
              <Text>{typeof alert.stationId === 'object' ? alert.stationId?.name : (alert.stationId || '—')}</Text>
            </Col>
            <Col span={12}>
              <Text type="secondary">设备</Text><br />
              <Text>{typeof alert.equipmentId === 'object' ? alert.equipmentId?.name : (alert.equipmentId || '—')}</Text>
            </Col>
          </Row>
          <Divider style={{ margin: '12px 0' }} />
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>告警内容</Text>
            <div style={{ background: '#fafafa', padding: 12, borderRadius: 8, borderLeft: `4px solid ${LEVEL_COLOR[alert.level]}` }}>
              <Text strong style={{ fontSize: 15 }}>{alert.message}</Text>
            </div>
          </div>
          {alert.acknowledged && alert.acknowledgedAt && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <Text type="secondary">
                已确认于 {new Date(alert.acknowledgedAt).toLocaleString('zh-CN')}
              </Text>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

// ─── Convert to WorkOrder Modal ───────────────────────────────────────────────
function ConvertToWorkOrderModal({
  alert, stations, open, onClose, onSuccess,
}: {
  alert: any; stations: any[]; open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [form] = Form.useForm();
  useEffect(() => {
    if (open && alert) {
      const priority = alert.level === 'critical' ? 'urgent' : alert.level === 'major' ? 'important' : 'normal';
      form.setFieldsValue({
        stationId: typeof alert.stationId === 'object' ? alert.stationId?._id : alert.stationId,
        title: `[告警] ${alert.message}`.slice(0, 100),
        type: 'fault',
        priority,
        description: `告警代码: ${alert.code || '无'}\n告警内容: ${alert.message}\n电站: ${typeof alert.stationId === 'object' ? alert.stationId?.name : alert.stationId}\n设备: ${typeof alert.equipmentId === 'object' ? alert.equipmentId?.name : alert.equipmentId}\n发生时间: ${new Date(alert.createdAt).toLocaleString('zh-CN')}\n\n建议处理方案:\n1. 现场检查确认告警情况\n2. 分析告警原因\n3. 制定处置方案并执行\n4. 完成后关闭工单`,
      });
    }
  }, [open, alert]);

  async function handleSubmit() {
    const values = await form.validateFields();
    const res = await workOrderApi.create(values);
    if (res.success) {
      message.success('工单已创建！');
      onSuccess();
      onClose();
    }
  }

  return (
    <Modal title="告警 → 创建工单" open={open} onOk={handleSubmit} onCancel={onClose} width={680} okText="创建工单">
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Row gutter={12}>
          <Col span={16}>
            <Form.Item name="stationId" label="所属电站" rules={[{ required: true }]}>
              <Select options={stations.map(s => ({ value: s._id, label: s.name }))} placeholder="选择电站" />
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
          <Input placeholder="工单标题" />
        </Form.Item>
        <Form.Item name="type" label="工单类型" initialValue="fault">
          <Select options={[
            { value: 'fault', label: '🔧 故障维修' },
            { value: 'maintenance', label: '🛠 预防性维护' },
            { value: 'inspection', label: '📋 巡检' },
          ]} />
        </Form.Item>
        <Form.Item name="description" label="详细描述">
          <TextArea rows={6} placeholder="描述" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, critical: 0, major: 0, minor: 0, unacknowledged: 0 });
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [filterStation, setFilterStation] = useState<string>('');
  const [filterAck, setFilterAck] = useState<string>('');
  const [detailAlert, setDetailAlert] = useState<any>(null);
  const [convertAlert, setConvertAlert] = useState<any>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { loadStations(); loadStats(); loadAlerts(); }, []);
  useEffect(() => { loadAlerts(); }, [filterLevel, filterStation, filterAck]);

  // Auto-poll every 30s for new alerts
  useEffect(() => {
    pollRef.current = setInterval(() => { loadStats(); loadAlerts(); }, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [filterLevel, filterStation, filterAck]);

  async function loadStats() {
    const res = await alertApi.getStats();
    if (res.success) setStats(res.data);
  }

  async function loadAlerts() {
    setLoading(true);
    const params: any = {};
    if (filterLevel) params.level = filterLevel;
    if (filterStation) params.stationId = filterStation;
    if (filterAck) params.acknowledged = filterAck === 'acked';
    const res = await alertApi.getAll(params);
    if (res.success) setAlerts(res.data);
    setLoading(false);
  }

  async function handleAcknowledge(id: string) {
    await alertApi.acknowledge(id);
    message.success('已确认');
    loadAlerts();
    loadStats();
  }

  async function handleBatchAck() {
    if (selectedRowKeys.length === 0) return;
    await alertApi.acknowledgeBatch(selectedRowKeys as string[]);
    message.success(`已确认 ${selectedRowKeys.length} 条告警`);
    setSelectedRowKeys([]);
    loadAlerts();
    loadStats();
  }

  function handleConvertToWorkOrder(alert: any) {
    setDetailAlert(null);
    setConvertAlert(alert);
    setConvertOpen(true);
  }

  async function handleAckAndConvert(alert: any) {
    if (!alert.acknowledged) await alertApi.acknowledge(alert._id);
    setDetailAlert(null);
    setConvertAlert(alert);
    setConvertOpen(true);
  }

  const columns: ColumnsType<any> = [
    {
      title: '级别', dataIndex: 'level', width: 90,
      render: l => (
        <Space>
          {LEVEL_ICON[l]}
          <Tag color={LEVEL_COLOR[l]}>{LEVEL_TEXT[l]}</Tag>
        </Space>
      ),
      filters: [
        { text: '🔴 严重', value: 'critical' },
        { text: '🟠 重要', value: 'major' },
        { text: '🟡 一般', value: 'minor' },
      ],
      onFilter: (value, record) => record.level === value,
    },
    {
      title: '告警时间', dataIndex: 'createdAt', width: 160,
      render: v => new Date(v).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    },
    { title: '电站', dataIndex: ['stationId', 'name'], render: v => v || '-', width: 140 },
    {
      title: '告警内容', dataIndex: 'message', ellipsis: true,
      render: (v, r) => (
        <a onClick={() => setDetailAlert(r)} style={{ color: r.level === 'critical' ? '#ff4d4f' : undefined }}>
          {v}
        </a>
      ),
    },
    {
      title: '状态', dataIndex: 'acknowledged', width: 90,
      render: a => <Badge status={a ? 'success' : 'error'} text={a ? '已确认' : '未确认'} />,
      filters: [
        { text: '已确认', value: 'acked' },
        { text: '未确认', value: 'unacked' },
      ],
      onFilter: (value, record) => value === 'acked' ? record.acknowledged : !record.acknowledged,
    },
    {
      title: '操作', key: 'action', width: 200,
      render: (_, r) => (
        <Space size="small">
          <Button size="small" onClick={() => setDetailAlert(r)}>详情</Button>
          {!r.acknowledged && (
            <Button size="small" type="link" icon={<CheckOutlined />} onClick={() => handleAcknowledge(r._id)}>确认</Button>
          )}
          <Tooltip title="一键转工单">
            <Button size="small" type="link" icon={<ThunderboltOutlined />} onClick={() => handleAckAndConvert(r)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Stats Row */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={5}>
          <Card size="small" style={{ background: 'linear-gradient(135deg, #e6f7ff, #bae7ff)' }}>
            <Statistic
              title={<Space><AlertOutlined /> 告警总数</Space>}
              value={stats.total}
              valueStyle={{ fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" style={{ background: 'linear-gradient(135deg, #fff2f0, #ffccc7)' }}>
            <Statistic
              title={<Space><FireOutlined style={{ color: '#ff4d4f' }} /> 严重</Space>}
              value={stats.critical}
              valueStyle={{ fontSize: 28, color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" style={{ background: 'linear-gradient(135deg, #fff7e6, #ffd591)' }}>
            <Statistic
              title={<Space><WarningOutlined style={{ color: '#fa8c16' }} /> 重要</Space>}
              value={stats.major}
              valueStyle={{ fontSize: 28, color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" style={{ background: 'linear-gradient(135deg, #fffbe6, #ffe58f)' }}>
            <Statistic
              title={<Space><ExclamationCircleOutlined style={{ color: '#faad14' }} /> 一般</Space>}
              value={stats.minor}
              valueStyle={{ fontSize: 28, color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="未确认"
              value={stats.unacknowledged}
              valueStyle={{ fontSize: 28, color: stats.unacknowledged > 0 ? '#ff4d4f' : '#52c41a' }}
            />
            <div style={{ marginTop: 4 }}>
              <MiniPie critical={stats.critical} major={stats.major} minor={stats.minor} />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Main Table */}
      <Card
        title={
          <Space>
            <AlertOutlined />
            <span>告警记录</span>
            <Text type="secondary" style={{ fontSize: 12 }}>
              每30秒自动刷新 · 共 {stats.total} 条
            </Text>
          </Space>
        }
        extra={
          <Space>
            <Select value={filterLevel} onChange={setFilterLevel} placeholder="级别" allowClear style={{ width: 100 }}
              options={[{ value: 'critical', label: '严重' }, { value: 'major', label: '重要' }, { value: 'minor', label: '一般' }]} />
            <Select value={filterStation} onChange={setFilterStation} placeholder="电站" allowClear style={{ width: 150 }}
              options={stations.map(s => ({ value: s._id, label: s.name }))} />
            <Select value={filterAck} onChange={setFilterAck} placeholder="状态" allowClear style={{ width: 100 }}
              options={[{ value: 'acked', label: '已确认' }, { value: 'unacked', label: '未确认' }]} />
            <Button type="primary" icon={<CheckOutlined />} onClick={handleBatchAck}
              disabled={selectedRowKeys.length === 0}>
              批量确认 {selectedRowKeys.length > 0 ? `(${selectedRowKeys.length})` : ''}
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={alerts}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          rowClassName={r => r.level === 'critical' && !r.acknowledged ? 'critical-unack-row' : ''}
        />
      </Card>

      {/* Detail Modal */}
      {detailAlert && (
        <AlertDetailModal
          alert={detailAlert} stations={stations}
          onClose={() => setDetailAlert(null)}
          onAcknowledge={handleAcknowledge}
          onConvertToWorkOrder={handleConvertToWorkOrder}
        />
      )}

      {/* Convert to WorkOrder Modal */}
      <ConvertToWorkOrderModal
        alert={convertAlert} stations={stations}
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        onSuccess={() => { loadAlerts(); loadStats(); }}
      />

      <style>{`
        .critical-unack-row { background: #fff2f0; }
        .critical-unack-row:hover td { background: #ffebe8 !important; }
      `}</style>
    </div>
  );
}
