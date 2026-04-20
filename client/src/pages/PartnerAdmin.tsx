import { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, Modal, Form, Input, Select, message, Popconfirm, Typography, Row, Col, Statistic, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, GiftOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { partnerApi } from '../services/api';

const { Title, Text } = Typography;
const LEVEL_TEXT: Record<string, string> = { bronze: '铜牌', silver: '银牌', gold: '金牌', diamond: '钻牌' };
const LEVEL_COLOR: Record<string, string> = { bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', diamond: '#b9f2ff' };
const TYPE_TEXT: Record<string, string> = { distributor: '分销商', installer: '安装商' };

const LEVEL_OPTIONS = ['bronze', 'silver', 'gold', 'diamond'].map(v => ({ value: v, label: LEVEL_TEXT[v] }));
const TYPE_OPTIONS = [{ value: 'distributor', label: '分销商' }, { value: 'installer', label: '安装商' }];

export default function PartnerAdmin() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const [filterType, setFilterType] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('partners');

  useEffect(() => { loadData(); if (activeTab === 'redemptions') loadRedemptions(); }, [filterType, filterLevel, activeTab]);

  async function loadRedemptions() {
    const token = localStorage.getItem('smartsolar_token');
    const res = await fetch('/api/partners/admin/redemptions', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
    if (res.success) setRedemptions(res.data);
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

  async function handleEdit(record: any) {
    setEditing(record);
    form.setFieldsValue({ ...record, name: record.name, type: record.type, phone: record.phone, address: record.address, contactPerson: record.contactPerson, region: record.region, status: record.status });
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
      <Space>
        <span>{v}</span>
        <Tag style={{ background: LEVEL_COLOR[r.level] + '20', border: `1px solid ${LEVEL_COLOR[r.level]}`, color: LEVEL_COLOR[r.level] }}>
          {LEVEL_TEXT[r.level]}
        </Tag>
      </Space>
    )},
    { title: '类型', dataIndex: 'type', render: t => <Tag>{TYPE_TEXT[t] || t}</Tag>, width: 90 },
    { title: '区域', dataIndex: 'region', width: 90 },
    { title: '累计积分', dataIndex: 'totalPoints', render: v => <Text strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>{v?.toLocaleString()}</Text>, width: 120 },
    { title: '可用积分', dataIndex: 'availablePoints', render: v => <Text style={{ fontFamily: 'JetBrains Mono, monospace', color: '#f59e0b' }}>{v?.toLocaleString()}</Text>, width: 120 },
    { title: '联系电话', dataIndex: 'phone', width: 140 },
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
    <div style={{ padding: 24 }}>
      <Title level={4}>🏆 渠道商管理</Title>

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
        <Table columns={columns} dataSource={data} rowKey="_id" loading={loading} pagination={{ pageSize: 20 }} />
      </Card>

      {/* 兑换审核 Tab */}
      <Card
        title={<><GiftOutlined /> 兑换审核</>}
        extra={<Button size="small" onClick={loadRedemptions}>刷新</Button>}
        style={{ marginTop: 16 }}
      >
        {redemptions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>暂无待处理兑换申请</div>
        ) : (
          <Table
            dataSource={redemptions}
            rowKey="_id"
            pagination={{ pageSize: 10 }}
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
    </div>
  );
}
