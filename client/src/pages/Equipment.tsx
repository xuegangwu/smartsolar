import { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Button, Space, Input, Modal, Form, Select, message,
  Row, Col, Statistic, Typography, Tree, Drawer, Descriptions, Timeline, Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  AppstoreOutlined, FolderOutlined, ToolOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { stationApi, equipmentApi, type Station, type Equipment, type EquipmentCategory } from '../services/api';

const { Text, Title } = Typography;
const { confirm } = Modal;

const STATUS_MAP: Record<string, { color: string; text: string }> = {
  online: { color: 'green', text: '在线' },
  offline: { color: 'red', text: '离线' },
  maintenance: { color: 'orange', text: '维护中' },
};

const EQ_TYPE_MAP: Record<string, string> = {
  solar: '光伏组件', battery: '储能电池', pcs: '储能变流器',
  meter: '电表', ev_charger: '充电桩', grid: '电网', other: '其他',
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

const CAT_TYPE_OPTIONS = [
  { value: 'solar', label: '光伏' },
  { value: 'battery', label: '储能' },
  { value: 'pcs', label: '变流器' },
  { value: 'meter', label: '电表' },
  { value: 'ev_charger', label: '充电桩' },
  { value: 'grid', label: '电网' },
  { value: 'other', label: '其他' },
];

// ─── Category Modal ──────────────────────────────────────────────────────────
function CategoryModal({
  open, stationId, editing, onClose, onOk,
}: {
  open: boolean; stationId: string; editing: EquipmentCategory | null;
  onClose: () => void; onOk: () => void;
}) {
  const [form] = Form.useForm();
  useEffect(() => {
    if (open) {
      if (editing) form.setFieldsValue(editing);
      else form.resetFields();
    }
  }, [open, editing]);
  return (
    <Modal title={editing ? '编辑分类' : '添加设备分类'} open={open} onOk={async () => {
      const v = await form.validateFields();
      // eslint-disable-next-line no-unused-vars
      const { $_, ...rest } = v as any;
      if (editing) {
        await fetch(`/api/categories/${editing._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rest) });
      } else {
        await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...rest, stationId }) });
      }
      message.success(editing ? '已更新' : '已添加');
      onOk();
      onClose();
    }} onCancel={onClose}>
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="name" label="分类名称" rules={[{ required: true }]}>
          <Input placeholder="如：光伏组串A区、储能电池簇" />
        </Form.Item>
        <Form.Item name="type" label="设备类型" rules={[{ required: true }]}>
          <Select options={CAT_TYPE_OPTIONS} placeholder="选择类型" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ─── Equipment Modal ──────────────────────────────────────────────────────────
function EquipmentModal({
  open, stationId, categories, editing, onClose, onOk,
}: {
  open: boolean; stationId: string; categories: EquipmentCategory[]; editing: Equipment | null;
  onClose: () => void; onOk: () => void;
}) {
  const [form] = Form.useForm();
  useEffect(() => {
    if (open) {
      if (editing) {
        form.setFieldsValue({
          ...editing,
          stationId: typeof editing.stationId === 'object' ? (editing.stationId as any)?._id : editing.stationId,
          categoryId: typeof editing.categoryId === 'object' ? (editing.categoryId as any)?._id : editing.categoryId,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ stationId, status: 'online' });
      }
    }
  }, [open, editing]);

  return (
    <Modal title={editing ? '编辑设备' : '添加设备'} open={open} width={680} onOk={async () => {
      const v = await form.validateFields();
      const sid = typeof v.stationId === 'object' ? (v.stationId as any)?._id : v.stationId;
      const cid = typeof v.categoryId === 'object' ? (v.categoryId as any)?._id : v.categoryId;
      const body = { ...v, stationId: sid || stationId, categoryId: cid };
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/api/equipments/${editing._id}` : '/api/equipments';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      message.success(editing ? '已更新' : '已添加');
      onOk();
      onClose();
    }} onCancel={onClose}>
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="name" label="设备名称" rules={[{ required: true }]}>
              <Input placeholder="如：华为组串式逆变器SUN2000-185KTL" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="type" label="设备类型" rules={[{ required: true }]}>
              <Select options={EQ_TYPE_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="brand" label="品牌">
              <Input placeholder="华为、阳光电源等" />
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
              <Input placeholder="序列号" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="ratedPower" label="额定功率 (kW)">
              <Input type="number" placeholder="如：185" />
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
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="installationDate" label="投产日期">
              <Input type="date" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="categoryId" label="所属分类">
              <Select options={categories.map(c => ({ value: c._id, label: c.name }))} placeholder="选择分类" allowClear />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function Equipment() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, online: 0, offline: 0, maintenance: 0 });

  // Modals
  const [catModal, setCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<EquipmentCategory | null>(null);
  const [eqModal, setEqModal] = useState(false);
  const [editingEq, setEditingEq] = useState<Equipment | null>(null);

  // Detail drawer
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEq, setDetailEq] = useState<Equipment | null>(null);

  const [form] = Form.useForm();

  useEffect(() => { loadStations(); }, []);

  useEffect(() => {
    if (selectedStation) { loadCategories(); loadEquipments(); }
  }, [selectedStation]);

  async function loadStations() {
    const res = await stationApi.getAll();
    if (res.success) {
      setStations(res.data);
      if (res.data.length > 0 && !selectedStation) {
        // Find the first station that has categories/equipment — batch check all stations at once
        const checkResults = await Promise.all(
          res.data.map(s =>
            fetch(`/api/stations/${s._id}/categories`).then(r => r.json()).then(d => ({ id: s._id, count: d.success ? d.data.length : 0 }))
          )
        );
        const withData = checkResults.filter(r => r.count > 0);
        setSelectedStation(withData.length > 0 ? withData[0].id : res.data[0]._id);
      }
    }
  }

  async function loadCategories() {
    const res = await fetch(`/api/stations/${selectedStation}/categories`);
    const data = await res.json();
    if (data.success) setCategories(data.data);
  }

  async function loadEquipments() {
    setLoading(true);
    try {
      const res = await equipmentApi.getAll({ stationId: selectedStation });
      if (res.success) {
        setEquipments(res.data);
        const s = { total: res.data.length, online: 0, offline: 0, maintenance: 0 };
        res.data.forEach((e: any) => { s[e.status] = (s[e.status] || 0) + 1; });
        setStats(s);
      }
    } finally { setLoading(false); }
  }

  // Build tree data
  function buildTree(): DataNode[] {
    if (!selectedStation) return [];
    const stationNode = stations.find(s => s._id === selectedStation);
    return [{
      title: stationNode?.name || '电站',
      key: `station-${selectedStation}`,
      icon: <FolderOutlined />,
      children: categories.map(cat => ({
        title: `${cat.name} (${EQ_TYPE_MAP[cat.type] || cat.type})`,
        key: `cat-${cat._id}`,
        icon: <AppstoreOutlined />,
        children: equipments
          .filter(e => {
            const cid = typeof e.categoryId === 'object' ? (e.categoryId as any)?._id : e.categoryId;
            return cid === cat._id;
          })
          .map(eq => ({
            title: (
              <Space>
                <ToolOutlined />
                <span>{eq.name}</span>
                <Tag color={STATUS_MAP[eq.status]?.color}>{STATUS_MAP[eq.status]?.text}</Tag>
              </Space>
            ),
            key: `eq-${eq._id}`,
            isLeaf: true,
          })),
      })),
    }];
  }

  async function handleDeleteCategory(id: string) {
    await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    message.success('已删除');
    loadCategories();
  }

  async function handleDeleteEquipment(id: string) {
    await equipmentApi.delete(id);
    message.success('已删除');
    loadEquipments();
  }

  const columns: ColumnsType<Equipment> = [
    { title: '设备名称', dataIndex: 'name', key: 'name', render: (v, r) => <a onClick={() => { setDetailEq(r); setDetailOpen(true); }}><b>{v}</b></a> },
    { title: '类型', dataIndex: 'type', key: 'type', render: t => EQ_TYPE_MAP[t] || t },
    { title: '品牌', dataIndex: 'brand', key: 'brand' },
    { title: '型号', dataIndex: 'model', key: 'model' },
    { title: '序列号', dataIndex: 'serialNumber', key: 'serialNumber', render: v => <Text code>{v || '-'}</Text> },
    { title: '功率', dataIndex: 'ratedPower', key: 'ratedPower', render: v => v ? `${v} kW` : '-' },
    { title: '状态', dataIndex: 'status', key: 'status', render: s => <Tag color={STATUS_MAP[s]?.color}>{STATUS_MAP[s]?.text}</Tag> },
    { title: '操作', key: 'action', width: 140, render: (_, r) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingEq(r); setEqModal(true); }} />
        <Popconfirm title="删除设备？" onConfirm={() => handleDeleteEquipment(r._id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      {/* Stats Row */}
      <Row gutter={[12,12]} style={{ marginBottom: 16 }} className="stat-grid">
        <Col xs={12} sm={6}><Statistic title="设备总数" value={stats.total} prefix={<AppstoreOutlined />} /></Col>
        <Col xs={12} sm={6}><Statistic title="在线" value={stats.online} valueStyle={{ color: '#52c41a' }} /></Col>
        <Col xs={12} sm={6}><Statistic title="离线" value={stats.offline} valueStyle={{ color: '#ff4d4f' }} /></Col>
        <Col xs={12} sm={6}><Statistic title="维护中" value={stats.maintenance} valueStyle={{ color: '#fa8c16' }} /></Col>
      </Row>

      <Row gutter={16}>
        {/* Left: Tree */}
        <Col span={8}>
          <Card
            title="设备结构树"
            extra={
              <Space direction="vertical">
                <Select
                  value={selectedStation || undefined}
                  onChange={v => setSelectedStation(v)}
                  style={{ width: 180 }}
                  placeholder="选择电站"
                  options={stations.map(s => ({ value: s._id, label: s.name }))}
                />
                <Space>
                  <Button size="small" icon={<PlusOutlined />} onClick={() => { setEditingCat(null); setCatModal(true); }}>添加分类</Button>
                  <Button size="small" icon={<PlusOutlined />} onClick={() => { setEditingEq(null); setEqModal(true); }}>添加设备</Button>
                </Space>
              </Space>
            }
          >
            <Tree
              showIcon
              treeData={buildTree()}
              onSelect={() => {}}
              style={{ minHeight: 400 }}
            />
          </Card>
        </Col>

        {/* Right: Table */}
        <Col span={16}>
          <Card
            title="设备台账列表"
            extra={
              <Space>
                <Input.Search placeholder="搜索设备" style={{ width: 200 }} onSearch={loadEquipments} />
                <Button icon={<PlusOutlined />} onClick={() => { setEditingEq(null); setEqModal(true); }}>添加设备</Button>
              </Space>
            }
          >
            <Table className="mobile-card-list" columns={columns} dataSource={equipments} rowKey="_id" loading={loading} pagination={{ pageSize: 20 }} />
          </Card>
        </Col>
      </Row>

      {/* Category Modal */}
      <CategoryModal
        open={catModal} stationId={selectedStation} editing={editingCat}
        onClose={() => setCatModal(false)} onOk={loadCategories}
      />

      {/* Equipment Modal */}
      <EquipmentModal
        open={eqModal} stationId={selectedStation} categories={categories} editing={editingEq}
        onClose={() => setEqModal(false)} onOk={loadEquipments}
      />

      {/* Equipment Detail Drawer */}
      <Drawer title="设备详情" open={detailOpen} onClose={() => setDetailOpen(false)} width={520}>
        {detailEq && (
          <div>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="设备名称"><b>{detailEq.name}</b></Descriptions.Item>
              <Descriptions.Item label="类型">{EQ_TYPE_MAP[detailEq.type] || detailEq.type}</Descriptions.Item>
              <Descriptions.Item label="品牌">{detailEq.brand || '-'}</Descriptions.Item>
              <Descriptions.Item label="型号">{detailEq.model || '-'}</Descriptions.Item>
              <Descriptions.Item label="序列号"><Text code>{detailEq.serialNumber || '-'}</Text></Descriptions.Item>
              <Descriptions.Item label="额定功率">{detailEq.ratedPower ? `${detailEq.ratedPower} kW` : '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={STATUS_MAP[detailEq.status]?.color}>{STATUS_MAP[detailEq.status]?.text}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="投产日期">{detailEq.installationDate ? new Date(detailEq.installationDate).toLocaleDateString('zh-CN') : '-'}</Descriptions.Item>
              <Descriptions.Item label="保修到期">{detailEq.warrantyExpire ? new Date(detailEq.warrantyExpire).toLocaleDateString('zh-CN') : '-'}</Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 24 }}>
              <Title level={5}>处理进度</Title>
              <Timeline
                items={[
                  { color: 'green', children: '设备登记入库' },
                  { color: STATUS_MAP[detailEq.status]?.color === 'green' ? 'green' : 'gray', children: `当前状态: ${STATUS_MAP[detailEq.status]?.text}` },
                  ...(detailEq.warrantyExpire ? [{ color: 'blue', children: `保修至: ${new Date(detailEq.warrantyExpire).toLocaleDateString('zh-CN')}` }] : []),
                ]}
              />
            </div>

            <Space style={{ marginTop: 24 }}>
              <Button icon={<EditOutlined />} onClick={() => { setEditingEq(detailEq); setDetailOpen(false); setEqModal(true); }}>编辑</Button>
              <Popconfirm title="删除设备？" onConfirm={async () => {
                await handleDeleteEquipment(detailEq._id);
                setDetailOpen(false);
              }}>
                <Button danger>删除</Button>
              </Popconfirm>
            </Space>
          </div>
        )}
      </Drawer>
    </div>
  );
}
