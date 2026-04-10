import { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Button, Space, Modal, Form, Input, Select, DatePicker,
  message, Row, Col, Statistic, Typography, Divider, List, Avatar, Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, CheckCircleOutlined, ClockCircleOutlined,
  CalendarOutlined, FileTextOutlined, TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { TextArea } = Input;

const PERIOD_MAP: Record<string, { color: string; text: string }> = {
  daily: { color: 'green', text: '每日' },
  weekly: { color: 'blue', text: '每周' },
  monthly: { color: 'orange', text: '每月' },
  quarterly: { color: 'purple', text: '每季度' },
  yearly: { color: 'default', text: '每年' },
};

const PERIOD_OPTIONS = [
  { value: 'daily', label: '🟢 每日' },
  { value: 'weekly', label: '🔵 每周' },
  { value: 'monthly', label: '🟠 每月' },
  { value: 'quarterly', label: '🟣 每季度' },
  { value: 'yearly', label: '⚪ 每年' },
];

// 模拟运维人员
const TECHNICIANS = [
  { _id: 'tech-1', name: '张伟', phone: '138-1111-0001' },
  { _id: 'tech-2', name: '李强', phone: '139-2222-0002' },
  { _id: 'tech-3', name: '王鹏', phone: '137-3333-0003' },
  { _id: 'tech-4', name: '赵亮', phone: '136-4444-0004' },
];

// 模拟巡检项模板
const TEMPLATE_ITEMS: Record<string, string[]> = {
  solar: ['组件表面清洁度检查', '支架紧固检查', '接线盒温度测量', '逆变器运行状态', '直流电缆检查'],
  battery: ['电池簇电压测量', 'BMS温度检查', '液冷系统检查', '电池舱通风检查', '消防系统检查'],
  pcs: ['IGBT温度记录', '功率模块检查', '冷却风扇运转', '电网侧接线检查'],
  ev_charger: ['充电枪检查', '显示屏测试', '接地电阻测量', '急停功能测试'],
  default: ['外观检查', '运行参数记录', '告警记录查询', '周边环境检查'],
};

// ─── Stat Cards ─────────────────────────────────────────────────────────────
function StatCards({ stats }: { stats: any }) {
  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col span={6}><Statistic title="巡检计划" value={stats.totalPlans} prefix={<CalendarOutlined />} /></Col>
      <Col span={6}><Statistic title="启用中" value={stats.enabledPlans} valueStyle={{ color: '#52c41a' }} /></Col>
      <Col span={6}><Statistic title="执行记录" value={stats.totalRecords} prefix={<FileTextOutlined />} /></Col>
      <Col span={6}><Statistic title="本周执行" value={stats.recentRecords} valueStyle={{ color: '#1677ff' }} /></Col>
    </Row>
  );
}

// ─── Plan Modal ──────────────────────────────────────────────────────────────
function PlanModal({ open, editing, stations, onClose, onOk }: {
  open: boolean; editing: any; stations: any[]; onClose: () => void; onOk: () => void;
}) {
  const [form] = Form.useForm();
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [selectedEqType, setSelectedEqType] = useState<string>('default');

  useEffect(() => {
    if (open) {
      if (editing) {
        const sid = typeof editing.stationId === 'object' ? editing.stationId?._id : editing.stationId;
        form.setFieldsValue(editing);
        setSelectedStation(sid || '');
        setSelectedEqType(editing.equipmentType || 'default');
      } else {
        form.resetFields();
        setSelectedStation(stations[0]?._id || '');
        setSelectedEqType('default');
        form.setFieldsValue({ enabled: true, period: 'weekly' });
      }
    }
  }, [open, editing]);

  async function handleSubmit() {
    const values = await form.validateFields();
    const items = values.useTemplate ? (TEMPLATE_ITEMS[selectedEqType] || TEMPLATE_ITEMS.default) : (values.items || []);
    const body = { ...values, items, stationId: selectedStation };

    const url = editing ? `/api/inspection/plans/${editing._id}` : '/api/inspection/plans';
    const method = editing ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    message.success(editing ? '已更新' : '已创建');
    onOk();
    onClose();
  }

  const itemsPreview = TEMPLATE_ITEMS[selectedEqType] || [];

  return (
    <Modal title={editing ? '编辑巡检计划' : '新建巡检计划'} open={open} onOk={handleSubmit} onCancel={onClose} width={680}>
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Row gutter={12}>
          <Col span={16}>
            <Form.Item name="stationId" label="所属电站" rules={[{ required: true }]}>
              <Select placeholder="选择电站" options={stations.map(s => ({ value: s._id, label: s.name }))} onChange={v => setSelectedStation(v)} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="period" label="周期" rules={[{ required: true }]}>
              <Select options={PERIOD_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={16}>
            <Form.Item name="name" label="计划名称" rules={[{ required: true }]}>
              <Input placeholder="如：苏州站光伏组件周巡检" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="enabled" label="状态" initialValue={true}>
              <Select options={[{ value: true, label: '✅ 启用' }, { value: false, label: '⏸ 停用' }]} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="useTemplate" label="快速添加巡检项" valuePropName="checked" initialValue={true}>
          <Select
            placeholder="选择设备类型自动填充巡检项"
            options={[
              { value: 'solar', label: '☀️ 光伏组件' },
              { value: 'battery', label: '🔋 储能电池' },
              { value: 'pcs', label: '⚡ 储能变流器' },
              { value: 'ev_charger', label: '🚗 充电桩' },
              { value: 'default', label: '📋 通用巡检' },
            ]}
            onChange={v => { setSelectedEqType(v); form.setFieldValue('equipmentType', v); }}
          />
        </Form.Item>
        {form.getFieldValue('useTemplate') && (
          <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '12px 16px', marginBottom: 12 }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>巡检项预览：</Text>
            {itemsPreview.map((item, i) => (
              <Tag key={i} style={{ marginBottom: 4 }}>{item}</Tag>
            ))}
          </div>
        )}
      </Form>
    </Modal>
  );
}

// ─── Record Modal ────────────────────────────────────────────────────────────
function RecordModal({ open, plans, onClose, onOk }: {
  open: boolean; plans: any[]; onClose: () => void; onOk: () => void;
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) { form.resetFields(); form.setFieldsValue({ signedAt: dayjs().format('YYYY-MM-DD HH:mm') }); }
  }, [open]);

  async function handleSubmit() {
    const values = await form.validateFields();
    await fetch('/api/inspection/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    message.success('巡检记录已提交！');
    onOk();
    onClose();
  }

  return (
    <Modal title="📋 提交巡检记录" open={open} onOk={handleSubmit} onCancel={onClose} width={640}>
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Row gutter={12}>
          <Col span={16}>
            <Form.Item name="planId" label="巡检计划" rules={[{ required: true }]}>
              <Select placeholder="选择巡检计划" options={plans.filter(p => p.enabled).map(p => ({
                value: p._id, label: `${p.name} (${p.stationId?.name || '电站'})`
              }))} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="inspectorId" label="巡检人员" rules={[{ required: true }]}>
              <Select placeholder="选择人员" options={TECHNICIANS.map(t => ({ value: t._id, label: t.name }))} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="result" label="巡检结果" rules={[{ required: true }]}>
          <Select options={[
            { value: '正常', label: '✅ 正常' },
            { value: '异常已处理', label: '⚠️ 异常已处理' },
            { value: '异常待处理', label: '🚨 异常待处理' },
          ]} placeholder="选择巡检结果" />
        </Form.Item>
        <Form.Item name="notes" label="备注说明">
          <TextArea rows={3} placeholder="记录发现的异常情况、处理措施或建议..." />
        </Form.Item>
        <Form.Item name="signedAt" label="巡检时间">
          <Input type="datetime-local" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────
export default function Inspection() {
  const [plans, setPlans] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalPlans: 0, enabledPlans: 0, totalRecords: 0, recentRecords: 0 });
  const [loading, setLoading] = useState(false);
  const [planModal, setPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [recordModal, setRecordModal] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<string>('');

  useEffect(() => { loadStations(); loadStats(); loadPlans(); loadRecords(); }, []);

  async function loadStations() {
    const res = await fetch('/api/stations');
    const data = await res.json();
    if (data.success) setStations(data.data);
  }

  async function loadStats() {
    const res = await fetch('/api/inspection/stats');
    const data = await res.json();
    if (data.success) setStats(data.data);
  }

  async function loadPlans() {
    const params = new URLSearchParams();
    if (filterPeriod) params.set('period', filterPeriod);
    const res = await fetch(`/api/inspection/plans?${params}`);
    const data = await res.json();
    if (data.success) setPlans(data.data);
  }

  async function loadRecords() {
    const res = await fetch('/api/inspection/records?limit=20');
    const data = await res.json();
    if (data.success) setRecords(data.data);
  }

  async function handleDeletePlan(id: string) {
    await fetch(`/api/inspection/plans/${id}`, { method: 'DELETE' });
    message.success('已删除');
    loadPlans();
    loadStats();
  }

  async function handleTogglePlan(plan: any) {
    await fetch(`/api/inspection/plans/${plan._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !plan.enabled }),
    });
    message.success(plan.enabled ? '已停用' : '已启用');
    loadPlans();
    loadStats();
  }

  const planColumns: ColumnsType<any> = [
    { title: '计划名称', dataIndex: 'name', render: v => <b>{v}</b>, ellipsis: true },
    {
      title: '电站', dataIndex: ['stationId', 'name'],
      render: v => v || '-', width: 130,
    },
    {
      title: '周期', dataIndex: 'period', width: 90,
      render: p => <Tag color={PERIOD_MAP[p]?.color}>{PERIOD_MAP[p]?.text || p}</Tag>,
    },
    {
      title: '状态', dataIndex: 'enabled', width: 80,
      render: e => <Tag color={e ? 'green' : 'default'}>{e ? '启用' : '停用'}</Tag>,
    },
    {
      title: '下次执行', dataIndex: 'nextRunAt', width: 110,
      render: v => v ? new Date(v).toLocaleDateString('zh-CN') : <Text type="secondary">—</Text>,
    },
    {
      title: '操作', key: 'action', width: 200,
      render: (_, r) => (
        <Space size="small">
          <Button size="small" type="primary" onClick={() => { setEditingPlan(r); setRecordModal(true); }}>执行</Button>
          <Button size="small" onClick={() => { setEditingPlan(r); setPlanModal(true); }}>编辑</Button>
          <Button size="small" onClick={() => handleTogglePlan(r)}>{r.enabled ? '停用' : '启用'}</Button>
          <Popconfirm title="删除计划？" onConfirm={() => handleDeletePlan(r._id)}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const recordColumns: ColumnsType<any> = [
    {
      title: '巡检时间', dataIndex: 'signedAt', width: 150,
      render: v => new Date(v).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    },
    { title: '计划', dataIndex: ['planId', 'name'], render: v => v || '-', ellipsis: true },
    {
      title: '人员', dataIndex: ['inspectorId', 'name'],
      render: (v, r) => (
        <Space>
          <Avatar size="small" icon={<TeamOutlined />} />
          {v}
        </Space>
      ), width: 100,
    },
    {
      title: '结果', dataIndex: 'result',
      render: v => {
        const color = v === '正常' ? 'green' : v.includes('待处理') ? 'red' : 'orange';
        return <Tag color={color}>{v}</Tag>;
      }, width: 120,
    },
    { title: '备注', dataIndex: 'notes', render: v => v || '-', ellipsis: true },
  ];

  return (
    <div>
      <StatCards stats={stats} />

      <Row gutter={16}>
        {/* Plans */}
        <Col span={14}>
          <Card
            title={<Space><CalendarOutlined /> 巡检计划</Space>}
            extra={
              <Space>
                <Select value={filterPeriod} onChange={v => { setFilterPeriod(v); loadPlans(); }} placeholder="周期筛选" allowClear style={{ width: 100 }}
                  options={Object.entries(PERIOD_MAP).map(([k, v]) => ({ value: k, label: v.text }))} />
                <Button icon={<PlusOutlined />} onClick={() => { setEditingPlan(null); setPlanModal(true); }}>新建计划</Button>
              </Space>
            }
          >
            <Table columns={planColumns} dataSource={plans} rowKey="_id" loading={loading} pagination={{ pageSize: 10 }} />
          </Card>
        </Col>

        {/* Recent Records */}
        <Col span={10}>
          <Card
            title={<Space><FileTextOutlined /> 最近执行记录</Space>}
            extra={<Button size="small" type="link" onClick={loadRecords}>刷新</Button>}
          >
            <List
              size="small"
              dataSource={records.slice(0, 10)}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar size="small" style={{ background: item.result === '正常' ? '#52c41a' : item.result.includes('待处理') ? '#ff4d4f' : '#fa8c16' }} icon={<CheckCircleOutlined />} />}
                    title={<Space>
                      {item.planId?.name || '计划'}
                      <Tag>{PERIOD_MAP[item.planId?.period]?.text || item.planId?.period}</Tag>
                    </Space>}
                    description={
                      <Space direction="vertical" size={0}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <TeamOutlined /> {item.inspectorId?.name || '—'} · {new Date(item.signedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <Text style={{ fontSize: 13 }}>
                          <Tag color={item.result === '正常' ? 'green' : item.result.includes('待处理') ? 'red' : 'orange'} style={{ marginRight: 4 }}>{item.result}</Tag>
                        </Text>
                        {item.notes && <Text type="secondary" style={{ fontSize: 12 }} ellipsis>{item.notes}</Text>}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Modals */}
      <PlanModal
        open={planModal} editing={editingPlan} stations={stations}
        onClose={() => setPlanModal(false)} onOk={() => { loadPlans(); loadStats(); }}
      />
      <RecordModal
        open={recordModal} plans={plans}
        onClose={() => setRecordModal(false)} onOk={() => { loadRecords(); loadStats(); }}
      />
    </div>
  );
}
