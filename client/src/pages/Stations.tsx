import { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, Modal, Form, Input, Select, InputNumber, message, Row, Col } from 'antd';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, NodeIndexOutlined } from '@ant-design/icons';
import { stationApi, type Station } from '../services/api';

const STATUS_MAP: Record<string, { color: string; text: string }> = {
  online: { color: 'green', text: '在线' },
  offline: { color: 'red', text: '离线' },
  maintenance: { color: 'orange', text: '维护中' },
};

const TYPE_MAP: Record<string, { color: string; text: string }> = {
  solar: { color: 'gold', text: '光伏' },
  storage: { color: 'blue', text: '储能' },
  solar_storage: { color: 'green', text: '光储一体化' },
};

export default function Stations() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Station | null>(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => { loadStations(); }, []);

  async function loadStations() {
    setLoading(true);
    const res = await stationApi.getAll();
    if (res.success) setStations(res.data);
    setLoading(false);
  }

  async function handleAdd() {
    setEditing(null);
    form.resetFields();
    setIsModalOpen(true);
  }

  async function handleEdit(record: Station) {
    setEditing(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  }

  async function handleDelete(id: string) {
    await stationApi.delete(id);
    message.success('已删除');
    loadStations();
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    if (editing) {
      await stationApi.update(editing._id, values);
      message.success('已更新');
    } else {
      await stationApi.create(values);
      message.success('已添加');
    }
    setIsModalOpen(false);
    loadStations();
  }

  const columns: ColumnsType<Station> = [
    { title: '电站名称', dataIndex: 'name', key: 'name', render: v => <b>{v}</b> },
    { title: '类型', dataIndex: 'type', key: 'type', render: t => {
      const m = TYPE_MAP[t] || { color: 'default', text: t };
      return <Tag color={m.color}>{m.text}</Tag>;
    }},
    { title: '装机容量', dataIndex: 'installedCapacity', key: 'installedCapacity', render: v => v ? `${v} kW` : '-' },
    { title: '峰值功率', dataIndex: 'peakPower', key: 'peakPower', render: v => v ? `${v} kW` : '-' },
    { title: '业主', dataIndex: 'owner', key: 'owner' },
    { title: '联系人', dataIndex: 'contact', key: 'contact' },
    { title: '状态', dataIndex: 'status', key: 'status', render: s => {
      const m = STATUS_MAP[s] || { color: 'default', text: s };
      return <Tag color={m.color}>{m.text}</Tag>;
    }},
    { title: '并网日期', dataIndex: 'gridConnectionDate', key: 'gridConnectionDate' },
    { title: '操作', key: 'action', width: 160, render: (_, r) => (
      <Space>
        <Button size="small" icon={<NodeIndexOutlined />} onClick={() => navigate(`/stations/${r._id}/topology`)}
          style={{ borderColor: '#00e5c0', color: '#00e5c0' }}>
          拓扑
        </Button>
        <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)} />
        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r._id)} />
      </Space>
    )},
  ];

  return (
    <Card title="电站管理" extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加电站</Button>}>
      <Table className="mobile-card-list" columns={columns} dataSource={stations} rowKey="_id" loading={loading} pagination={{ pageSize: 20 }} />

      <Modal title={editing ? '编辑电站' : '添加电站'} open={isModalOpen} onOk={handleSubmit} onCancel={() => setIsModalOpen(false)} width={640}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="name" label="电站名称" rules={[{ required: true }]}>
                <Input placeholder="如：苏州工业园光储电站" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="电站类型" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'solar', label: '光伏' },
                  { value: 'storage', label: '储能' },
                  { value: 'solar_storage', label: '光储一体化' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name={['location', 'address']} label="地址">
                <Input placeholder="电站详细地址" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="状态" initialValue="online">
                <Select options={[
                  { value: 'online', label: '在线' },
                  { value: 'offline', label: '离线' },
                  { value: 'maintenance', label: '维护中' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="installedCapacity" label="装机容量 (kW)">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="peakPower" label="峰值功率 (kW)">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="capacity" label="储能容量 (kWh)">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="owner" label="业主">
                <Input placeholder="业主单位名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contact" label="联系人">
                <Input placeholder="联系人及电话" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="gridConnectionDate" label="并网日期">
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
