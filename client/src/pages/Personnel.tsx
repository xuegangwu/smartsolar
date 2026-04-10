import { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, Modal, Form, Input, Select, message, Popconfirm, Row, Col, Statistic, Divider } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { personnelApi } from '../services/api';

const ROLE_TEXT: Record<string, string> = {
  admin: '管理员', operator: '运维', technician: '技术员', supervisor: '值班长', manager: '经理',
};
const ROLE_COLOR: Record<string, string> = {
  admin: 'red', operator: 'blue', technician: 'green', supervisor: 'purple', manager: 'orange',
};
const WORK_STATUS_TEXT: Record<string, string> = {
  available: '空闲', busy: '忙碌', offline: '离线',
};
const WORK_STATUS_COLOR: Record<string, string> = {
  available: 'success', busy: 'error', offline: 'default',
};
const STATUS_TEXT: Record<string, string> = { active: '在职', leave: '休假', fired: '离职' };
const STATUS_COLOR: Record<string, string> = { active: 'green', leave: 'orange', fired: 'red' };

const ORG_OPTIONS = ['集团总部', '华东区域', '华北区域', '华南区域', '西南区域'];
const SKILL_OPTIONS = ['光伏', '储能', '充电桩', 'PCS', '电气', '通讯', 'BMS'];

export default function Personnel() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterOrg, setFilterOrg] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const res = await personnelApi.getAll();
    if (res.success) setData(res.data);
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 'active', workStatus: 'available', skills: [] });
    setModal(true);
  }

  function openEdit(record: any) {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      skills: record.skills || [],
    });
    setModal(true);
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    if (editing) {
      const res = await personnelApi.update(editing._id, values);
      if (res.success) { message.success('已更新'); setModal(false); loadData(); }
      else message.error(res.message || '更新失败');
    } else {
      const res = await personnelApi.create(values);
      if (res.success) { message.success('已添加'); setModal(false); loadData(); }
      else message.error(res.message || '添加失败');
    }
  }

  async function handleDelete(id: string) {
    const res = await personnelApi.delete(id);
    if (res.success) { message.success('已删除'); loadData(); }
    else message.error(res.message || '删除失败');
  }

  async function handleWorkStatusChange(id: string, workStatus: string) {
    const res = await personnelApi.updateWorkStatus(id, workStatus);
    if (res.success) { message.success(`已更新为：${WORK_STATUS_TEXT[workStatus]}`); loadData(); }
    else message.error('更新失败');
  }

  const filtered = data.filter(p => {
    if (filterRole && p.role !== filterRole) return false;
    if (filterOrg && p.organization !== filterOrg) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return true;
  });

  const columns: ColumnsType<any> = [
    { title: '姓名', dataIndex: 'name', render: v => <b>{v}</b> },
    {
      title: '角色', dataIndex: 'role', width: 90,
      render: (v: string) => <Tag color={ROLE_COLOR[v]}>{ROLE_TEXT[v] || v}</Tag>,
    },
    {
      title: '在职状态', dataIndex: 'status', width: 90,
      render: (v: string) => <Tag color={STATUS_COLOR[v]}>{STATUS_TEXT[v] || v}</Tag>,
    },
    {
      title: '工作状态', dataIndex: 'workStatus', width: 90,
      render: (v: string) => <Tag color={WORK_STATUS_COLOR[v]}>{WORK_STATUS_TEXT[v] || v}</Tag>,
    },
    { title: '组织', dataIndex: 'organization', width: 110 },
    { title: '电话', dataIndex: 'phone', width: 130 },
    {
      title: '技能', dataIndex: 'skills', width: 180,
      render: (arr: string[]) => arr?.map(s => <Tag key={s} style={{ marginBottom: 2 }}>{s}</Tag>) || '-',
    },
    { title: '邮箱', dataIndex: 'email', width: 160 },
    {
      title: '操作', width: 130, fixed: 'right',
      render: (_: any, r: any) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r._id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const techs = data.filter(p => p.role === 'technician' && p.status === 'active');
  const availableCount = techs.filter(t => t.workStatus === 'available').length;
  const busyCount = techs.filter(t => t.workStatus === 'busy').length;
  const offlineCount = techs.filter(t => t.workStatus === 'offline').length;

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}><Statistic title="总人数" value={data.length} prefix={<UserOutlined />} /></Col>
        <Col span={4}><Statistic title="技术人员" value={techs.length} valueStyle={{ color: '#16a34a' }} /></Col>
        <Col span={4}><Statistic title="空闲" value={availableCount} valueStyle={{ color: '#16a34a' }} /></Col>
        <Col span={4}><Statistic title="忙碌" value={busyCount} valueStyle={{ color: '#ef4444' }} /></Col>
        <Col span={4}><Statistic title="离线" value={offlineCount} valueStyle={{ color: '#94a3b8' }} /></Col>
      </Row>

      <Card
        title="人员档案管理"
        extra={
          <Space>
            <Select placeholder="角色" allowClear style={{ width: 100 }} onChange={v => setFilterRole(v)}>
              {Object.entries(ROLE_TEXT).map(([k, v]) => <Select.Option key={k} value={k}>{v}</Select.Option>)}
            </Select>
            <Select placeholder="组织" allowClear style={{ width: 110 }} onChange={v => setFilterOrg(v)}>
              {ORG_OPTIONS.map(o => <Select.Option key={o} value={o}>{o}</Select.Option>)}
            </Select>
            <Select placeholder="在职状态" allowClear style={{ width: 100 }} onChange={v => setFilterStatus(v)}>
              {Object.entries(STATUS_TEXT).map(([k, v]) => <Select.Option key={k} value={k}>{v}</Select.Option>)}
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增人员</Button>
          </Space>
        }
        bodyStyle={{ padding: 0 }}
      >
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1100 }}
        />
      </Card>

      <Modal
        title={editing ? '编辑人员' : '新增人员'}
        open={modal}
        onOk={handleSubmit}
        onCancel={() => setModal(false)}
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
                <Input placeholder="真实姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="电话" rules={[{ required: true }]}>
                <Input placeholder="138-xxxx-xxxx" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="role" label="角色" rules={[{ required: true }]}>
                <Select>
                  {Object.entries(ROLE_TEXT).map(([k, v]) => <Select.Option key={k} value={k}>{v}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="organization" label="组织">
                <Select>
                  {ORG_OPTIONS.map(o => <Select.Option key={o} value={o}>{o}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="status" label="在职状态" initialValue="active">
                <Select>
                  {Object.entries(STATUS_TEXT).map(([k, v]) => <Select.Option key={k} value={k}>{v}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="workStatus" label="工作状态" initialValue="available">
                <Select>
                  {Object.entries(WORK_STATUS_TEXT).map(([k, v]) => <Select.Option key={k} value={k}>{v}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="email" label="邮箱">
                <Input placeholder="xxx@example.com" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="skills" label="技能标签">
            <Select mode="multiple" placeholder="选择技能">
              {SKILL_OPTIONS.map(s => <Select.Option key={s} value={s}>{s}</Select.Option>)}
            </Select>
          </Form.Item>
          {editing && (
            <>
              <Divider />
              <Form.Item label="快捷操作">
                <Space>
                  {Object.entries(WORK_STATUS_TEXT).map(([k, v]) => (
                    <Button
                      key={k}
                      size="small"
                      type={editing.workStatus === k ? 'primary' : 'default'}
                      onClick={() => handleWorkStatusChange(editing._id, k)}
                    >
                      {v}
                    </Button>
                  ))}
                </Space>
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
