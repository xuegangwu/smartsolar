import { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Button, Space, Modal, Form, Input, Select, message,
  Popconfirm, Typography, Row, Col, Statistic, Tabs, Popconfirm as AntPopconfirm, Empty, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined,
  GiftOutlined, SwapOutlined, ArrowRightOutlined, HistoryOutlined,
  UserAddOutlined, CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { partnerApi } from '../services/api';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const LEVEL_TEXT: Record<string, string> = { bronze: '铜牌', silver: '银牌', gold: '金牌', diamond: '钻牌' };
const LEVEL_COLOR: Record<string, string> = { bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', diamond: '#b9f2ff' };
const TYPE_TEXT: Record<string, string> = { distributor: '分销商', installer: '安装商' };

const LEVEL_OPTIONS = ['bronze', 'silver', 'gold', 'diamond'].map(v => ({ value: v, label: LEVEL_TEXT[v] }));
const TYPE_OPTIONS = [{ value: 'distributor', label: '分销商' }, { value: 'installer', label: '安装商' }];

export default function PartnerAdmin() {
  const [activeTab, setActiveTab] = useState('partners');

  return (
    <div style={{ padding: 24 }}>
      <Title level={4}>🏆 渠道商管理</Title>

      <Tabs activeKey={activeTab} onChange={k => { setActiveTab(k); }}>

        {/* ── 渠道商列表 ─────────────────────────────────────────────── */}
        <TabPane tab={<><TeamOutlined /> 渠道商列表</>} key="partners">
          <PartnerList />
        </TabPane>

        {/* ── 归属分配 ─────────────────────────────────────────────── */}
        <TabPane tab={<><SwapOutlined /> 归属分配</>} key="assignment">
          <AssignmentTab onAssigned={() => setActiveTab('partners')} />
        </TabPane>

        {/* ── 兑换审核 ─────────────────────────────────────────────── */}
        <TabPane tab={<><GiftOutlined /> 兑换审核</>} key="redemptions">
          <RedemptionTab />
        </TabPane>

        {/* ── 入驻申请 ─────────────────────────────────────────────── */}
        <TabPane tab={<><UserAddOutlined /> 入驻申请</>} key="applications">
          <ApplicationsTab />
        </TabPane>
      </Tabs>
    </div>
  );
}

// ─── 渠道商列表 Tab ───────────────────────────────────────────────────────────
function PartnerList() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const [filterType, setFilterType] = useState('');
  const [filterLevel, setFilterLevel] = useState('');

  useEffect(() => { loadData(); }, [filterType, filterLevel]);

  async function loadData() {
    setLoading(true);
    const params: any = {};
    if (filterType) params.type = filterType;
    if (filterLevel) params.level = filterLevel;
    const res = await partnerApi.getAll(params);
    if (res.success) setData(res.data);
    setLoading(false);
  }

  async function handleAdd() {
    setEditing(null);
    form.resetFields();
    setModal(true);
  }

  function handleEdit(record: any) {
    setEditing(record);
    form.setFieldsValue({ ...record });
    setModal(true);
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    if (editing) {
      const res = await partnerApi.update(editing._id, values);
      if (res.success) { message.success('已更新'); loadData(); }
    } else {
      const res = await partnerApi.create(values);
      if (res.success) { message.success('已创建'); loadData(); }
    }
    setModal(false);
  }

  async function handleDelete(id: string) {
    const res = await partnerApi.update(id, { status: 'suspended' });
    if (res.success) { message.success('已禁用'); loadData(); }
  }

  const columns: ColumnsType<any> = [
    { title: '名称', dataIndex: 'name', render: (v, r) => (
      <Space direction="vertical" size={0}>
        <Space>
          <span style={{ fontWeight: 600 }}>{v}</span>
          <Tag style={{ background: LEVEL_COLOR[r.level] + '20', border: `1px solid ${LEVEL_COLOR[r.level]}`, color: LEVEL_COLOR[r.level] }}>
            {LEVEL_TEXT[r.level]}
          </Tag>
          <Tag>{TYPE_TEXT[r.type] || r.type}</Tag>
        </Space>
        <Text type="secondary" style={{ fontSize: 12 }}>{r.contactPerson} · {r.phone}</Text>
      </Space>
    )},
    { title: '区域', dataIndex: 'region', width: 90 },
    { title: '累计积分', dataIndex: 'totalPoints', render: v => <Text strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>{v?.toLocaleString()}</Text>, width: 120 },
    { title: '可用积分', dataIndex: 'availablePoints', render: v => <Text style={{ fontFamily: 'JetBrains Mono, monospace', color: '#f59e0b' }}>{v?.toLocaleString()}</Text>, width: 120 },
    { title: '状态', dataIndex: 'status', render: s => <Tag color={s === 'active' ? 'green' : 'red'}>{s === 'active' ? '正常' : '已禁用'}</Tag>, width: 80 },
    {
      title: '操作', key: 'action', width: 160,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>编辑</Button>
          <Popconfirm title="确认禁用该渠道商？" onConfirm={() => handleDelete(r._id)}>
            <Button size="small" danger icon={<DeleteOutlined />} disabled={r.status !== 'active'} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}><Statistic title="渠道商总数" value={data.length} prefix={<TeamOutlined />} /></Col>
        <Col span={4}><Statistic title="分销商" value={data.filter(d => d.type === 'distributor').length} valueStyle={{ color: '#3b82f6' }} /></Col>
        <Col span={4}><Statistic title="安装商" value={data.filter(d => d.type === 'installer').length} valueStyle={{ color: '#22c55e' }} /></Col>
        <Col span={4}><Statistic title="金牌以上" value={data.filter(d => d.level === 'gold' || d.level === 'diamond').length} valueStyle={{ color: '#f59e0b' }} /></Col>
      </Row>

      <Card extra={
        <Space>
          <Select placeholder="类型筛选" allowClear value={filterType} onChange={setFilterType} style={{ width: 110 }} options={TYPE_OPTIONS} />
          <Select placeholder="等级筛选" allowClear value={filterLevel} onChange={setFilterLevel} style={{ width: 100 }} options={LEVEL_OPTIONS} />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新建渠道商</Button>
        </Space>
      }>
        <Table columns={columns} dataSource={data} rowKey="_id" loading={loading} pagination={{ pageSize: 20 }} size="small" />
      </Card>

      <Modal title={editing ? '编辑渠道商' : '新建渠道商'} open={modal} onOk={handleSubmit} onCancel={() => setModal(false)} width={500}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="公司全称" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="type" label="类型" rules={[{ required: true }]}>
                <Select options={TYPE_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="level" label="等级" initialValue="bronze">
                <Select options={LEVEL_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="region" label="区域">
            <Input placeholder="如：华东、华北" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="contactPerson" label="联系人">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="电话">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="地址">
            <Input />
          </Form.Item>
          {!editing && (
            <>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>创建登录账号（可选）</div>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="username" label="用户名">
                    <Input placeholder="登录用户名" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="password" label="密码">
                    <Input.Password placeholder="默认 partner123" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}
        </Form>
      </Modal>
    </>
  );
}

// ─── 归属分配 Tab ──────────────────────────────────────────────────────────────
function AssignmentTab({ onAssigned }: { onAssigned?: () => void }) {
  const [allPartners, setAllPartners] = useState<any[]>([]);
  const [selectedDistId, setSelectedDistId] = useState<string>('');
  const [assignedInstallers, setAssignedInstallers] = useState<any[]>([]);
  const [unassignedInstallers, setUnassignedInstallers] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [tab, setTab] = useState<'assign' | 'history'>('assign');
  const [loading, setLoading] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [selectedInstaller, setSelectedInstaller] = useState<any>(null);
  const [assignForm] = Form.useForm();

  useEffect(() => { loadAllPartners(); }, []);

  async function loadAllPartners() {
    setLoading(true);
    const res = await partnerApi.getAll({});
    if (res.success) {
      setAllPartners(res.data);
      setUnassignedInstallers(res.data.filter((p: any) => p.type === 'installer' && !p.parentId));
    }
    setLoading(false);
  }

  async function loadAssignedInstallers(distId: string) {
    const res = await fetch(`/api/partners/installers/${distId}`).then(r => r.json());
    if (res.success) setAssignedInstallers(res.data);
  }

  async function loadTransfers() {
    const res = await fetch('/api/partners/transfers').then(r => r.json());
    if (res.success) setTransfers(res.data);
  }

  function handleSelectDistributor(distId: string) {
    setSelectedDistId(distId);
    loadAssignedInstallers(distId);
  }

  async function handleAssign(installer: any) {
    setSelectedInstaller(installer);
    assignForm.setFieldsValue({ installerName: installer.name, parentId: installer.parentId || undefined, reason: '' });
    setAssignModal(true);
  }

  async function handleSubmitAssign() {
    const values = await assignForm.validateFields();
    const res = await fetch(`/api/partners/${selectedInstaller._id}/assign`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    }).then(r => r.json());
    if (res.success) {
      message.success('归属分配成功');
      setAssignModal(false);
      loadAllPartners();
      if (selectedDistId) loadAssignedInstallers(selectedDistId);
    } else {
      message.error(res.message || '分配失败');
    }
  }

  function handleTabChange(t: 'assign' | 'history') {
    setTab(t);
    if (t === 'history') loadTransfers();
  }

  const distributors = allPartners.filter(p => p.type === 'distributor' && p.status === 'active');
  const unassigned = allPartners.filter(p => p.type === 'installer' && !p.parentId);

  const transferColumns: ColumnsType<any> = [
    { title: '时间', render: (_: any, r: any) => new Date(r.createdAt).toLocaleString('zh-CN'), width: 170 },
    { title: '安装商', render: (_: any, r: any) => (r.installerId as any)?.name || '-' },
    {
      title: '变更',
      render: (_: any, r: any) => {
        const from = (r.fromDistributorId as any)?.name;
        const to = (r.toDistributorId as any)?.name;
        if (!from && !to) return <Tag>无归属</Tag>;
        if (!from) return <span><Tag color="blue">新增</Tag> <b>{to}</b></span>;
        if (!to) return <span><Tag color="red">解除</Tag> {from}</span>;
        return <Space><Tag>{from}</Tag><ArrowRightOutlined style={{ color: '#9ca3af' }} /><Tag color="blue">{to}</Tag></Space>;
      },
    },
    { title: '原因', dataIndex: 'reason', ellipsis: true },
    { title: '操作人', dataIndex: 'operatorName', width: 120 },
  ];

  const installerColumns: ColumnsType<any> = [
    { title: '安装商名称', dataIndex: 'name', render: (v, r) => (
      <Space direction="vertical" size={0}>
        <Text strong>{v}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>{r.contactPerson} · {r.phone}</Text>
      </Space>
    )},
    { title: '区域', dataIndex: 'region', width: 90 },
    { title: '等级', dataIndex: 'level', render: v => <Tag style={{ background: LEVEL_COLOR[v] + '20', border: `1px solid ${LEVEL_COLOR[v]}`, color: LEVEL_COLOR[v] }}>{LEVEL_TEXT[v]}</Tag>, width: 80 },
    { title: '累计安装', dataIndex: 'totalInstallations', render: v => v ?? 0, width: 100 },
    { title: '累计容量', dataIndex: 'totalCapacity', render: v => v ? `${(v/1000).toFixed(1)}k kW` : '-', width: 110 },
    {
      title: '操作',
      width: 120,
      render: (_, r) => (
        <Button size="small" icon={<SwapOutlined />} onClick={() => handleAssign(r)}>
          {r.parentId ? '变更归属' : '分配归属'}
        </Button>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<SwapOutlined />} type={tab === 'assign' ? 'primary' : 'default'} onClick={() => handleTabChange('assign')}>归属分配</Button>
        <Button icon={<HistoryOutlined />} type={tab === 'history' ? 'primary' : 'default'} onClick={() => handleTabChange('history')}>变更记录</Button>
      </Space>

      {tab === 'assign' ? (
        <Row gutter={16}>
          {/* 左侧：分销商选择 + 已绑定安装商 */}
          <Col span={12}>
            <Card title="🏢 选择分销商" size="small" style={{ marginBottom: 16 }}>
              <Select
                placeholder="请选择一个分销商"
                value={selectedDistId || undefined}
                onChange={handleSelectDistributor}
                options={distributors.map(d => ({ value: d._id, label: `${d.name} ${d.region ? `(${d.region})` : ''}` }))}
                style={{ width: '100%' }}
                allowClear
              />
            </Card>

            {selectedDistId && (
              <Card title={`已绑定安装商 (${assignedInstallers.length})`} size="small">
                {assignedInstallers.length === 0 ? (
                  <Empty description="该分销商暂无绑定安装商" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <Table
                    dataSource={assignedInstallers}
                    columns={[
                      { title: '安装商', dataIndex: 'name', render: v => <Text strong>{v}</Text> },
                      { title: '区域', dataIndex: 'region', width: 80 },
                      {
                        title: '操作', width: 100,
                        render: (_, r) => (
                          <AntPopconfirm title="确认解除该安装商的归属？" onConfirm={async () => {
                            await fetch(`/api/partners/${r._id}/assign`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parentId: null, reason: '手动解除' }) }).then(r => r.json());
                            message.success('已解除归属');
                            loadAllPartners();
                            loadAssignedInstallers(selectedDistId);
                          }}>
                            <Button size="small" danger>解除</Button>
                          </AntPopconfirm>
                        ),
                      },
                    ]}
                    rowKey="_id"
                    pagination={{ pageSize: 10 }}
                    size="small"
                  />
                )}
              </Card>
            )}
          </Col>

          {/* 右侧：未绑定安装商 */}
          <Col span={12}>
            <Card
              title={<Space>🔧 未绑定安装商 <Tag>{unassigned.length}</Tag></Space>}
              extra={<Text type="secondary" style={{ fontSize: 12 }}>点击"分配归属"绑定到分销商</Text>}
              size="small"
            >
              {unassigned.length === 0 ? (
                <Empty description="所有安装商已绑定归属" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <Table
                  dataSource={unassigned}
                  columns={installerColumns}
                  rowKey="_id"
                  pagination={{ pageSize: 10 }}
                  loading={loading}
                  size="small"
                />
              )}
            </Card>
          </Col>
        </Row>
      ) : (
        <Card size="small">
          {transfers.length === 0 ? (
            <Empty description="暂无归属变更记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Table
              dataSource={transfers}
              columns={transferColumns}
              rowKey="_id"
              pagination={{ pageSize: 15 }}
              size="small"
            />
          )}
        </Card>
      )}

      {/* 分配归属 Modal */}
      <Modal
        title={<Space><SwapOutlined /> 分配归属</Space>}
        open={assignModal}
        onOk={handleSubmitAssign}
        onCancel={() => setAssignModal(false)}
        width={500}
      >
        <Form form={assignForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="安装商">
            <Input value={selectedInstaller?.name} disabled />
          </Form.Item>
          <Form.Item name="parentId" label="归属分销商" rules={[{ required: true, message: '请选择分销商' }]}>
            <Select
              placeholder="选择分销商"
              options={distributors.map(d => ({ value: d._id, label: `${d.name} ${d.region ? `(${d.region})` : ''}` }))}
              showSearch
              filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          <Form.Item name="reason" label="变更原因">
            <Input.TextArea rows={2} placeholder="选填，如：合同到期、区域调整..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ─── 兑换审核 Tab ─────────────────────────────────────────────────────────────
function RedemptionTab() {
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadRedemptions(); }, []);

  async function loadRedemptions() {
    setLoading(true);
    const token = localStorage.getItem('smartsolar_token');
    const res = await fetch('/api/partners/admin/redemptions', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
    if (res.success) setRedemptions(res.data);
    setLoading(false);
  }

  async function handleRedemption(id: string, status: string) {
    const token = localStorage.getItem('smartsolar_token');
    const res = await fetch(`/api/partners/admin/redemptions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    }).then(r => r.json());
    if (res.success) { message.success(status === 'approved' ? '已通过' : '已拒绝'); loadRedemptions(); }
  }

  return (
    <Card extra={<Button size="small" onClick={loadRedemptions}>刷新</Button>}>
      {redemptions.length === 0 ? (
        <Empty description="暂无待处理兑换申请" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Table
          dataSource={redemptions}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          loading={loading}
          columns={[
            { title: '渠道商', render: (_: any, r: any) => (r.partnerId as any)?.name || '-', width: 180 },
            { title: '兑换物品', dataIndex: 'itemName', width: 200 },
            { title: '消耗积分', dataIndex: 'pointsCost', render: (v: number) => <Text style={{ color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>{v.toLocaleString()}</Text>, width: 100 },
            { title: '收货地址', dataIndex: 'shippingAddress', ellipsis: true },
            { title: '联系电话', dataIndex: 'contactPhone', width: 130 },
            { title: '状态', dataIndex: 'status', render: s => <Tag color={s === 'pending' ? 'warning' : s === 'approved' ? 'green' : 'red'}>{s === 'pending' ? '待审核' : s === 'approved' ? '已通过' : '已拒绝'}</Tag>, width: 80 },
            {
              title: '操作', width: 140,
              render: (_: any, r: any) => r.status === 'pending' ? (
                <Space>
                  <Button size="small" type="primary" onClick={() => handleRedemption(r._id, 'approved')}>通过</Button>
                  <Button size="small" danger onClick={() => handleRedemption(r._id, 'rejected')}>拒绝</Button>
                </Space>
              ) : '—',
            },
          ]}
        />
      )}
    </Card>
  );
}

// ─── 入驻申请 Tab ──────────────────────────────────────────────────────────────
function ApplicationsTab() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');

  function loadApps() {
    setLoading(true);
    partnerApi.getApplications('pending').then((d: any) => {
      if (d.success) setApps(d.data || []);
    }).finally(() => setLoading(false));
  }

  useEffect(() => { loadApps(); }, []);

  async function handleApprove(id: string) {
    const res = await partnerApi.approveApplication(id, {});
    if (res.success) { message.success('已批准入驻申请！'); loadApps(); }
    else message.error(res.message || '操作失败');
  }

  async function handleRejectConfirm() {
    if (!rejectReason.trim()) { message.warning('请填写驳回原因'); return; }
    const res = await partnerApi.rejectApplication(rejectModal._id, rejectReason);
    if (res.success) { message.success('已驳回'); setRejectModal(null); setRejectReason(''); loadApps(); }
    else message.error(res.message);
  }

  const columns = [
    { title: '公司名称', dataIndex: 'companyName', key: 'name' },
    { title: '联系人', dataIndex: 'contactPerson', key: 'contact' },
    { title: '电话', dataIndex: 'phone', key: 'phone' },
    { title: '服务区域', dataIndex: 'serviceRegions', key: 'regions', render: (r: string[]) => r?.join('、') || '—' },
    { title: '擅长类型', dataIndex: 'specializedTypes', key: 'types', render: (r: string[]) => r?.map((t: string) => ({ residential: '家用', commercial: '商用', industrial: '工业' }[t] || t)).join('、') || '—' },
    { title: '申请时间', dataIndex: 'createdAt', key: 'time', render: (t: string) => new Date(t).toLocaleString('zh-CN') },
    { title: '操作', key: 'action', render: (_: any, r: any) => (
      <Space>
        <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleApprove(r._id)}>批准</Button>
        <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => { setRejectModal(r); setRejectReason(''); }}>驳回</Button>
      </Space>
    )},
  ];

  return (
    <Card size="small">
      {apps.length === 0 && !loading && <div style={{ textAlign: 'center', padding: 32, color: '#999' }}>暂无待审核申请 ✅</div>}
      <Table dataSource={apps} columns={columns} rowKey="_id" loading={loading} pagination={{ pageSize: 10 }}
        expandable={{ expandedRowRender: (r) => (
          <div style={{ padding: '4px 0' }}>
            <p><b>邮箱：</b>{r.email || '—'} &nbsp;&nbsp; <b>地址：</b>{r.address || '—'} &nbsp;&nbsp; <b>员工数：</b>{r.staffCount || '—'}</p>
            {r.description && <p><b>简介：</b>{r.description}</p>}
            {r.businessLicense && <p><b>信用代码：</b>{r.businessLicense}</p>}
          </div>
        ) }}
      />
      <Modal open={!!rejectModal} title="驳回入驻申请" onCancel={() => { setRejectModal(null); setRejectReason(''); }} footer={null}>
        <p>确定驳回 <b>{rejectModal?.companyName}</b> 的入驻申请？</p>
        <Input.TextArea rows={3} placeholder="请输入驳回原因" value={rejectReason} onChange={e => setRejectReason(e.target.value)} style={{ marginTop: 12 }} />
        <Space style={{ marginTop: 16 }}>
          <Button type="primary" onClick={handleRejectConfirm}>确认驳回</Button>
          <Button onClick={() => { setRejectModal(null); setRejectReason(''); }}>取消</Button>
        </Space>
      </Modal>
    </Card>
  );
}
