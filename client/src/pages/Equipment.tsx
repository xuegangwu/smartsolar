import { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, Input, Modal, Form, Select, message, Tree, Row, Col, Statistic, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined } from '@ant-design/icons';
import { stationApi, equipmentApi, type Station, type Equipment } from '../services/api';

const { Text } = Typography;

const STATUS_MAP: Record<string, { color: string; text: string }> = {
  online: { color: 'green', text: '在线' },
  offline: { color: 'red', text: '离线' },
  maintenance: { color: 'orange', text: '维护中' },
};

const TYPE_MAP: Record<string, string> = {
  solar: '光伏组件',
  battery: '储能电池',
  pcs: '储能变流器',
  meter: '电表',
  ev_charger: '充电桩',
  grid: '电网',
  other: '其他',
};

const EQ_TYPE_OPTIONS = [
  { value: 'solar', label: '光伏组件' },
  { value: 'battery', label: '储能电池' },
  { value: 'pcs', label: '储能变流器' },
  { value: 'meter', label: '电表' },
  { value: 'ev_charger', label: '充电桩' },
  { value: 'grid', label: '电网' },
  { value: 'other', label: '其他' },
];

export default function Equipment() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [equipments, setEquipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [form] = Form.useForm();
  const [keyword, setKeyword] = useState('');
  const [stats, setStats] = useState({ total: 0, online: 0, offline: 0, maintenance: 0 });

  useEffect(() => {
    loadStations();
  }, []);

  useEffect(() => {
    if (selectedStation) {
      loadEquipments();
    }
  }, [selectedStation]);

  async function loadStations() {
    const res = await stationApi.getAll();
    if (res.success) {
      setStations(res.data);
      if (res.data.length > 0 && !selectedStation) {
        setSelectedStation(res.data[0]._id);
      }
    }
  }

  async function loadEquipments() {
    setLoading(true);
    try {
      const res = await equipmentApi.getAll({ stationId: selectedStation, keyword: keyword || undefined });
      if (res.success) {
        setEquipments(res.data);
        const s = { total: res.data.length, online: 0, offline: 0, maintenance: 0 };
        res.data.forEach((e: any) => { s[e.status] = (s[e.status] || 0) + 1; });
        setStats(s);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    setEditingEquipment(null);
    form.resetFields();
    form.setFieldsValue({ stationId: selectedStation });
    setIsModalOpen(true);
  }

  async function handleEdit(record: Equipment) {
    setEditingEquipment(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  }

  async function handleDelete(id: string) {
    await equipmentApi.delete(id);
    message.success('已删除');
    loadEquipments();
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    if (editingEquipment) {
      await equipmentApi.update(editingEquipment._id, values);
      message.success('已更新');
    } else {
      await equipmentApi.create(values);
      message.success('已添加');
    }
    setIsModalOpen(false);
    loadEquipments();
  }

  const columns: ColumnsType<Equipment> = [
    { title: '设备名称', dataIndex: 'name', key: 'name', render: (v, r) => <Text strong>{v}</Text> },
    { title: '设备类型', dataIndex: 'type', key: 'type', render: t => TYPE_MAP[t] || t },
    { title: '品牌', dataIndex: 'brand', key: 'brand' },
    { title: '型号', dataIndex: 'model', key: 'model' },
    { title: '序列号', dataIndex: 'serialNumber', key: 'serialNumber', render: v => <Text code>{v || '-'}</Text> },
    { title: '额定功率', dataIndex: 'ratedPower', key: 'ratedPower', render: v => v ? `${v} kW` : '-' },
    { title: '状态', dataIndex: 'status', key: 'status', render: s => {
      const m = STATUS_MAP[s] || { color: 'default', text: s };
      return <Tag color={m.color}>{m.text}</Tag>;
    }},
    { title: '操作', key: 'action', width: 120, render: (_, r) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)} />
        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r._id)} />
      </Space>
    )},
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Statistic title="设备总数" value={stats.total} prefix={<AppstoreOutlined />} /></Col>
        <Col span={6}><Statistic title="在线" value={stats.online} valueStyle={{ color: '#52c41a' }} /></Col>
        <Col span={6}><Statistic title="离线" value={stats.offline} valueStyle={{ color: '#ff4d4f' }} /></Col>
        <Col span={6}><Statistic title="维护中" value={stats.maintenance} valueStyle={{ color: '#fa8c16' }} /></Col>
      </Row>

      <Card
        title="设备台账"
        extra={
          <Space>
            <Select
              placeholder="选择电站"
              style={{ width: 200 }}
              value={selectedStation || undefined}
              onChange={setSelectedStation}
              options={stations.map(s => ({ value: s._id, label: s.name }))}
              allowClear
            />
            <Input.Search placeholder="搜索设备" style={{ width: 200 }} onSearch={() => loadEquipments()} />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} disabled={!selectedStation}>
              添加设备
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={equipments}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title={editingEquipment ? '编辑设备' : '添加设备'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="stationId" label="所属电站" rules={[{ required: true }]}>
            <Select
              options={stations.map(s => ({ value: s._id, label: s.name }))}
              placeholder="选择电站"
            />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="name" label="设备名称" rules={[{ required: true }]}>
                <Input placeholder="如：光伏组串A-01" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="设备类型" rules={[{ required: true }]}>
                <Select options={EQ_TYPE_OPTIONS} placeholder="选择类型" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="brand" label="品牌">
                <Input placeholder="如：华为、阳光电源" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="model" label="型号">
                <Input placeholder="设备型号" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="serialNumber" label="序列号">
                <Input placeholder="设备序列号" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ratedPower" label="额定功率 (kW)">
                <Input type="number" placeholder="如：100" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="status" label="状态" initialValue="online">
                <Select options={[
                  { value: 'online', label: '在线' },
                  { value: 'offline', label: '离线' },
                  { value: 'maintenance', label: '维护中' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="warrantyExpire" label="保修到期">
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
