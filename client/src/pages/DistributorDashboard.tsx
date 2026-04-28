import { useState, useEffect } from 'react';
import {
  Card, Row, Col, Statistic, Progress, Tag, Table, Typography, Space, Button,
  Spin, List, Badge, Tabs, Rate, Modal, Form, InputNumber, message, Select,
  Drawer, Timeline, Alert, Tooltip, Popconfirm, Divider
} from 'antd';
import {
  ThunderboltOutlined, GiftOutlined, TeamOutlined, ShopOutlined,
  BankOutlined, RiseOutlined, AlertOutlined, RobotOutlined,
  EditOutlined, DeleteOutlined, PlusOutlined, CalculatorOutlined,
  CheckCircleOutlined, WarningOutlined, ArrowUpOutlined, BulbOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const LEVEL_TEXT: Record<string, string> = { bronze: '铜牌', silver: '银牌', gold: '金牌', diamond: '钻牌' };
const LEVEL_COLOR: Record<string, string> = { bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', diamond: '#b9f2ff' };
const PROJECT_TYPE_TEXT: Record<string, string> = { residential: '家用', commercial: '商用', industrial: '工业' };

interface Installer {
  id: string; name: string; level: string;
  monthlyQuota: number; quotaAchieved: number; quotaRate: number;
  completedThisMonth: number; totalCompleted: number; pointsThisMonth: number;
}

// ─── 佣金规则管理组件 ────────────────────────────────────────────────────────
function CommissionRuleManager({ distributorId, token }: { distributorId: string; token: string }) {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const [form] = Form.useForm();

  function loadRules() {
    fetch('/api/distributor/commission-rules', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(res => { if (res.success) setRules(res.data); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadRules(); }, []);

  function handleAdd() { form.resetFields(); setModal({ title: '新增佣金规则', mode: 'add' }); }
  function handleEdit(rule: any) { form.setFieldsValue(rule); setModal({ title: '编辑佣金规则', mode: 'edit', rule }); }
  async function handleDelete(id: string) {
    await fetch(`/api/distributor/commission-rules/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    message.success('已删除'); loadRules();
  }
  async function handleSubmit() {
    const values = await form.validateFields();
    const url = modal.mode === 'edit' ? `/api/distributor/commission-rules/${modal.rule._id}` : '/api/distributor/commission-rules';
    const method = modal.mode === 'edit' ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...values, distributorId })
    }).then(r => r.json());
    if (res.success) { message.success('保存成功'); setModal(null); loadRules(); }
    else message.error(res.message);
  }

  const columns: ColumnsType<any> = [
    { title: '规则名称', dataIndex: 'name' },
    { title: '安装商等级', dataIndex: 'installerLevel', render: v => <Tag color={LEVEL_COLOR[v]}>{LEVEL_TEXT[v]}</Tag> },
    { title: '项目类型', dataIndex: 'projectType', render: v => PROJECT_TYPE_TEXT[v] || v },
    { title: '区域', dataIndex: 'region', render: v => v || '全部' },
    { title: '基础佣金(元)', dataIndex: 'baseCommission', render: v => `¥${v}` },
    { title: '容量奖励(元/kW)', dataIndex: 'capacityBonus' },
    { title: '状态', dataIndex: 'status', render: v => <Tag color={v === 'active' ? 'green' : 'red'}>{v === 'active' ? '生效中' : '已停用'}</Tag> },
    { title: '操作', render: (_, r) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>编辑</Button>
        <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r._id)}>
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    )}
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增规则</Button>
      </div>
      <Table columns={columns} dataSource={rules} rowKey="_id" loading={loading} pagination={false} size="small" />
      <Modal open={!!modal} title={modal?.title} onOk={handleSubmit} onCancel={() => setModal(null)} width={500}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="规则名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="installerLevel" label="安装商等级" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="bronze">铜牌</Select.Option>
                  <Select.Option value="silver">银牌</Select.Option>
                  <Select.Option value="gold">金牌</Select.Option>
                  <Select.Option value="diamond">钻牌</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="projectType" label="项目类型" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="residential">家用</Select.Option>
                  <Select.Option value="commercial">商用</Select.Option>
                  <Select.Option value="industrial">工业</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="region" label="适用区域"><Input placeholder="空=全部区域" /></Form.Item>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="baseCommission" label="基础佣金(元)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="capacityBonus" label="容量奖励(元/kW)"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="quotaMultiplier" label="超配额倍数"><InputNumber style={{ width: '100%' }} min={1} max={5} step={0.1} /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="effectiveFrom" label="生效日期" rules={[{ required: true }]}>
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="effectiveTo" label="失效日期">
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="status" label="状态" initialValue="active">
            <Select><Select.Option value="active">生效中</Select.Option><Select.Option value="inactive">已停用</Select.Option></Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ─── 安装商配额管理组件 ──────────────────────────────────────────────────────
function QuotaManager({ token }: { token: string }) {
  const [installers, setInstallers] = useState<Installer[]>([]);
  const [loading, setLoading] = useState(true);
  const [quotaModal, setQuotaModal] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetch('/api/distributor/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(res => { if (res.success) setInstallers(res.data.installers); })
      .finally(() => setLoading(false));
  }, []);

  function handleSetQuota(inst: Installer) {
    form.setFieldsValue({ monthlyQuota: inst.monthlyQuota });
    setQuotaModal(inst);
  }

  async function submitQuota() {
    const values = await form.validateFields();
    const res = await fetch(`/api/distributor/installers/${quotaModal.id}/quota`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(values)
    }).then(r => r.json());
    if (res.success) {
      message.success('配额已更新');
      setQuotaModal(null);
      // 重新加载
      fetch('/api/distributor/dashboard', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(res => { if (res.success) setInstallers(res.data.installers); });
    } else message.error(res.message);
  }

  const columns: ColumnsType<Installer> = [
    { title: '安装商', render: (_, r) => (
      <Space>
        <Tag color={LEVEL_COLOR[r.level]}>{LEVEL_TEXT[r.level]}</Tag>
        <Text strong>{r.name}</Text>
      </Space>
    )},
    { title: '本月完成', dataIndex: 'completedThisMonth', render: v => <Text type="success">{v} 套</Text> },
    { title: '月度配额', dataIndex: 'monthlyQuota', render: v => v > 0 ? `${v} 套` : '未设置' },
    {
      title: '配额完成率',
      render: (_, r) => {
        if (r.monthlyQuota === 0) return <Tag>未设置</Tag>;
        const rate = r.quotaRate;
        let color = 'green';
        if (rate >= 90) color = 'green';
        else if (rate >= 70) color = 'orange';
        else color = 'red';
        return <Progress percent={rate} size="small" strokeColor={color} />;
      }
    },
    { title: '累计完成', dataIndex: 'totalCompleted' },
    {
      title: '预警',
      render: (_, r) => {
        if (r.monthlyQuota === 0) return null;
        if (r.quotaRate >= 90) return <Tag icon={<WarningOutlined />} color="orange">即将达标</Tag>;
        if (r.quotaRate < 50) return <Tag icon={<AlertOutlined />} color="red">落后较多</Tag>;
        return null;
      }
    },
    {
      title: '操作',
      render: (_, r) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => handleSetQuota(r)}>调整配额</Button>
      )
    }
  ];

  return (
    <div>
      <Table columns={columns} dataSource={installers} rowKey="id" loading={loading} pagination={false} size="small" />
      <Modal open={!!quotaModal} title={`调整 ${quotaModal?.name} 的配额`} onOk={submitQuota} onCancel={() => setQuotaModal(null)}>
        <Form form={form} layout="vertical">
          <Form.Item name="monthlyQuota" label="月度配额（套数）" rules={[{ required: true }]}>
            <InputNumber min={0} max={1000} style={{ width: 200 }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ─── AI 建议组件 ────────────────────────────────────────────────────────────
function AIAdvisor({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchSuggestion() {
    setLoading(true); setError(null); setSuggestion(null);
    const res = await fetch('/api/distributor/ai/suggestions', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json());
    setLoading(false);
    if (res.success) setSuggestion(res.data.suggestion);
    else setError(res.message || '获取建议失败');
  }

  return (
    <div>
      <Button type="primary" icon={<RobotOutlined />} loading={loading} onClick={fetchSuggestion} style={{ marginBottom: 16 }}>
        {suggestion ? '重新分析' : '获取 AI 运营建议'}
      </Button>
      {error && <Alert type="warning" message={error} style={{ marginBottom: 16 }} />}
      {suggestion && (
        <Card style={{ background: '#f0f9ff' }}>
          <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{suggestion}</Paragraph>
        </Card>
      )}
      {!suggestion && !error && !loading && (
        <Alert type="info" message="点击上方按钮，基于当前安装商业绩数据获取 AI 运营分析建议。" />
      )}
    </div>
  );
}

// ─── 主页面 ─────────────────────────────────────────────────────────────────
export default function DistributorDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();
  const token = localStorage.getItem('distributor_token');

  useEffect(() => {
    if (!token) { navigate('/distributor-login'); return; }
    fetch('/api/distributor/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(res => {
        if (res.success) setData(res.data);
        else navigate('/distributor-login');
      })
      .catch(() => navigate('/distributor-login'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin size="large" /></div>;
  if (!data) return null;

  const { distributor, summary, installers } = data;

  const quotaColor = (rate: number) => {
    if (rate >= 90) return '#52c41a';
    if (rate >= 70) return '#faad14';
    return '#ff4d4f';
  };

  const quotaProgress = (rate: number) => {
    if (summary.overallQuotaRate >= 90) return 'success';
    if (summary.overallQuotaRate >= 70) return 'normal';
    return 'exception';
  };

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      {/* 头部 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <BankOutlined style={{ marginRight: 8 }} />
            分销商指挥塔 — {distributor.name}
          </Title>
          <Space style={{ marginTop: 4 }}>
            <Tag color={LEVEL_COLOR[distributor.level]}>{LEVEL_TEXT[distributor.level]}</Tag>
            <Text type="secondary">共 {summary.installerCount} 个下级安装商</Text>
          </Space>
        </div>
        <Button icon={<HomeOutlined />} onClick={() => navigate('/')}>返回主系统</Button>
      </div>

      {/* 核心指标卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="本月完工" value={summary.totalCompletedThisMonth} suffix="套"
              valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="配额完成率" value={summary.overallQuotaRate} suffix="%"
              valueStyle={{ color: quotaColor(summary.overallQuotaRate) }} />
            <Progress percent={summary.overallQuotaRate} size="small" strokeColor={quotaColor(summary.overallQuotaRate)} style={{ marginTop: 4 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="本月应付佣金" value={summary.totalCommission} suffix="元"
              valueStyle={{ color: '#1890ff' }} prefix={<GiftOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="待结佣金" value={summary.pendingCommission} suffix="元"
              valueStyle={{ color: summary.pendingCommission > 0 ? '#faad14' : '#999' }} />
          </Card>
        </Col>
      </Row>

      {/* Tab 切换 */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="📊 业绩总览" tabKey="overview">
            <Row gutter={16}>
              <Col span={16}>
                <Title level={5}>安装商业绩排名</Title>
                <Table
                  dataSource={installers}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: '安装商',
                      render: (_, r) => (
                        <Space>
                          <Tag color={LEVEL_COLOR[r.level]}>{LEVEL_TEXT[r.level]}</Tag>
                          <Text strong>{r.name}</Text>
                        </Space>
                      )
                    },
                    {
                      title: '配额完成率',
                      render: (_, r) => {
                        if (r.monthlyQuota === 0) return <Text type="secondary">未设配额</Text>;
                        return <Progress percent={r.quotaRate} size="small" strokeColor={quotaColor(r.quotaRate)} />;
                      }
                    },
                    { title: '本月完成', dataIndex: 'completedThisMonth', render: v => `${v} 套` },
                    { title: '累计完成', dataIndex: 'totalCompleted', render: v => `${v} 套` },
                    {
                      title: '积分收益',
                      dataIndex: 'pointsThisMonth',
                      render: v => <Text type="success">{v.toLocaleString()} 分</Text>
                    },
                    {
                      title: '状态',
                      render: (_, r) => {
                        if (r.monthlyQuota === 0) return <Tag>未配额</Tag>;
                        if (r.quotaRate >= 90) return <Tag color="green">优秀</Tag>;
                        if (r.quotaRate >= 70) return <Tag color="blue">正常</Tag>;
                        if (r.quotaRate >= 50) return <Tag color="orange">预警</Tag>;
                        return <Tag color="red">严重落后</Tag>;
                      }
                    }
                  ]}
                />
              </Col>
              <Col span={8}>
                <Title level={5}>配额预警</Title>
                <List
                  size="small"
                  dataSource={installers.filter((i: any) => i.monthlyQuota > 0 && i.quotaRate < 70)}
                  renderItem={(item: any) => (
                    <List.Item>
                      <Space>
                        <AlertOutlined style={{ color: '#ff4d4f' }} />
                        <Text>{item.name}</Text>
                        <Tag color="red">{item.quotaRate}%</Tag>
                      </Space>
                    </List.Item>
                  )}
                  locale={{ emptyText: <Text type="secondary">暂无预警</Text> }}
                />
              </Col>
            </Row>
          </TabPane>

          <TabPane tab="⚙️ 配额管理" tabKey="quota">
            <QuotaManager token={token} />
          </TabPane>

          <TabPane tab="💰 佣金规则" tabKey="rules">
            <CommissionRuleManager distributorId={distributor.id} token={token} />
          </TabPane>

          <TabPane tab="🤖 AI 运营分析" tabKey="ai">
            <AIAdvisor token={token} />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}
