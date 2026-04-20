import { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Button, Space, Modal, Form, Input, Select, message,
  Popconfirm, Typography, Row, Col, Statistic, Tabs, Rate, DatePicker,
  InputNumber, Divider, Descriptions, Badge, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined,
  HomeOutlined, BankOutlined, SafetyCertificateOutlined,
  TrophyOutlined, StarOutlined, PhoneOutlined, GlobalOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { partnerApi } from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const LEVEL_TEXT: Record<string, string> = { bronze: '铜牌', silver: '银牌', gold: '金牌', diamond: '钻牌' };
const LEVEL_COLOR: Record<string, string> = { bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', diamond: '#b9f2ff' };
const TYPE_TEXT: Record<string, string> = { residential: '家用', commercial: '商用', industrial: '工商业' };
const TYPE_TAG_COLOR: Record<string, string> = { residential: 'blue', commercial: 'green', industrial: 'orange' };

const LEVEL_OPTIONS = ['bronze', 'silver', 'gold', 'diamond'].map(v => ({ value: v, label: LEVEL_TEXT[v] }));
const SPECIALIZED_OPTIONS = [
  { value: 'residential', label: '家用' },
  { value: 'commercial', label: '商用' },
  { value: 'industrial', label: '工商业' },
];
const REGION_OPTIONS = [
  '北京市','上海市','广州市','深圳市','杭州市','南京市','武汉市','成都市',
  '重庆市','西安市','苏州市','天津市','长沙市','郑州市','东莞市','青岛市',
  '沈阳市','宁波市','昆明市','大连市','厦门市','合肥市','佛山市','无锡市',
  '福州市','哈尔滨市','济南市','温州市','长春市','石家庄市','南宁市','贵阳市',
  '南昌市','太原市','嘉兴市','金华市','惠州市','台州市','兰州市','银川市',
].map(v => ({ value: v, label: v }));

interface Installer extends any {
  _id: string;
  name: string;
  type: string;
  level: string;
  phone: string;
  address: string;
  contactPerson: string;
  region: string;
  status: string;
  description: string;
  // 安装商专属
  businessLicense?: string;
  establishmentDate?: string;
  staffCount?: number;
  serviceRegions?: string[];
  specializedTypes?: string[];
  qualifications?: Array<{ name: string; number: string; expireDate: string; fileUrl?: string }>;
  totalInstallations?: number;
  totalCapacity?: number;
  rating?: number;
  totalPoints?: number;
  availablePoints?: number;
}

export default function Installers() {
  const [data, setData] = useState<Installer[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [editing, setEditing] = useState<Installer | null>(null);
  const [selected, setSelected] = useState<Installer | null>(null);
  const [form] = Form.useForm();
  const [filterRegion, setFilterRegion] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => { loadData(); }, [filterRegion, filterLevel, filterStatus]);

  async function loadData() {
    setLoading(true);
    const params: any = { type: 'installer' };
    if (filterRegion) params.region = filterRegion;
    if (filterLevel) params.level = filterLevel;
    if (filterStatus) params.status = filterStatus;
    const res = await partnerApi.getAll(params);
    if (res.success) setData(res.data);
    setLoading(false);
  }

  function handleAdd() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ type: 'installer', level: 'bronze', status: 'active', specializedTypes: [], serviceRegions: [] });
    setModal(true);
  }

  function handleEdit(record: Installer) {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      establishmentDate: record.establishmentDate ? new Date(record.establishmentDate) : undefined,
    });
    setModal(true);
  }

  function handleDetail(record: Installer) {
    setSelected(record);
    setDetailModal(true);
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    if (values.establishmentDate) values.establishmentDate = values.establishmentDate.format('YYYY-MM-DD');
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

  async function handleRestore(id: string) {
    const res = await partnerApi.update(id, { status: 'active' });
    if (res.success) { message.success('已恢复'); loadData(); }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const activeData = data.filter(d => d.status === 'active');
  const stats = {
    total: data.length,
    active: activeData.length,
    totalInstallations: activeData.reduce((s, d) => s + (d.totalInstallations || 0), 0),
    totalCapacity: activeData.reduce((s, d) => s + (d.totalCapacity || 0), 0),
    avgRating: activeData.length
      ? (activeData.reduce((s, d) => s + (d.rating || 5), 0) / activeData.length).toFixed(1)
      : '5.0',
  };

  const columns: ColumnsType<Installer> = [
    { title: '安装商名称', dataIndex: 'name', render: (v, r) => (
      <Space direction="vertical" size={0}>
        <Space>
          <span style={{ fontWeight: 600 }}>{v}</span>
          <Tag style={{ background: LEVEL_COLOR[r.level] + '20', border: `1px solid ${LEVEL_COLOR[r.level]}`, color: LEVEL_COLOR[r.level], fontSize: 11 }}>
            {LEVEL_TEXT[r.level]}
          </Tag>
        </Space>
        <Text type="secondary" style={{ fontSize: 12 }}>{r.contactPerson} · {r.phone}</Text>
      </Space>
    )},
    { title: '区域', dataIndex: 'region', width: 90 },
    { title: '服务区域', dataIndex: 'serviceRegions', render: (v: string[]) => v?.map(r => (
      <Tag key={r} style={{ fontSize: 11 }}>{r}</Tag>
    )) || '-', width: 200 },
    { title: '擅长类型', dataIndex: 'specializedTypes', render: (v: string[]) => v?.map(t => (
      <Tag key={t} color={TYPE_TAG_COLOR[t]} style={{ fontSize: 11 }}>{TYPE_TEXT[t] || t}</Tag>
    )) || '-', width: 140 },
    { title: '累计安装', dataIndex: 'totalInstallations', render: v => (
      <Text strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>{v ?? 0}</Text>
    ), width: 100 },
    { title: '累计容量(kW)', dataIndex: 'totalCapacity', render: v => (
      <Text style={{ fontFamily: 'JetBrains Mono, monospace' }}>{((v || 0) / 1000).toFixed(1)}k</Text>
    ), width: 110 },
    { title: '评分', dataIndex: 'rating', render: (v: number) => <Rate disabled value={v || 5} style={{ fontSize: 12 }} />, width: 120 },
    { title: '积分', dataIndex: 'availablePoints', render: v => (
      <Text style={{ color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>{v?.toLocaleString()}</Text>
    ), width: 100 },
    { title: '状态', dataIndex: 'status', render: s => (
      <Badge status={s === 'active' ? 'success' : 'default'} text={s === 'active' ? '正常' : '已禁用'} />
    ), width: 80 },
    {
      title: '操作', key: 'action', width: 200,
      render: (_, r) => (
        <Space>
          <Button size="small" type="link" onClick={() => handleDetail(r)}>详情</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>编辑</Button>
          {r.status === 'active'
            ? <Popconfirm title="确认禁用该安装商？" onConfirm={() => handleDelete(r._id)}>
                <Button size="small" danger>禁用</Button>
              </Popconfirm>
            : <Button size="small" type="link" onClick={() => handleRestore(r._id)}>恢复</Button>
          }
        </Space>
      ),
    },
  ];

  const qualColumns: ColumnsType<any> = [
    { title: '证书名称', dataIndex: 'name', width: 160 },
    { title: '证书编号', dataIndex: 'number', width: 180 },
    { title: '过期时间', dataIndex: 'expireDate', render: (v: string) => v ? new Date(v).toLocaleDateString('zh-CN') : '-', width: 120 },
    {
      title: '状态',
      dataIndex: 'expireDate',
      render: (v: string) => {
        if (!v) return <Tag>无日期</Tag>;
        const expired = new Date(v) < new Date();
        return <Tag color={expired ? 'red' : 'green'}>{expired ? '已过期' : '有效'}</Tag>;
      },
      width: 90,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={4}>🔧 安装商管理</Title>

      {/* Stats Row */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}><Statistic title="安装商总数" value={stats.total} prefix={<TeamOutlined />} /></Col>
        <Col span={4}><Statistic title="正常运营" value={stats.active} valueStyle={{ color: '#22c55e' }} /></Col>
        <Col span={4}><Statistic title="累计安装量" value={stats.totalInstallations.toLocaleString()} prefix={<HomeOutlined />} valueStyle={{ color: '#3b82f6' }} /></Col>
        <Col span={4}><Statistic title="累计装机容量" value={`${(stats.totalCapacity / 1000).toFixed(1)}k kW`} valueStyle={{ color: '#8b5cf6' }} /></Col>
        <Col span={4}><Statistic title="平均评分" value={stats.avgRating} prefix={<StarOutlined />} suffix="/ 5" valueStyle={{ color: '#f59e0b' }} /></Col>
      </Row>

      <Card extra={
        <Space>
          <Select placeholder="区域筛选" allowClear value={filterRegion} onChange={setFilterRegion} style={{ width: 130 }} options={REGION_OPTIONS} />
          <Select placeholder="等级筛选" allowClear value={filterLevel} onChange={setFilterLevel} style={{ width: 100 }} options={LEVEL_OPTIONS} />
          <Select placeholder="状态筛选" allowClear value={filterStatus} onChange={setFilterStatus} style={{ width: 100 }}
            options={[{ value: 'active', label: '正常' }, { value: 'suspended', label: '已禁用' }]} />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新建安装商</Button>
        </Space>
      }>
        <Table columns={columns} dataSource={data} rowKey="_id" loading={loading} pagination={{ pageSize: 15 }} size="small" />
      </Card>

      {/* ── 新建/编辑 Modal ─────────────────────────────────────────────── */}
      <Modal
        title={editing ? '编辑安装商' : '新建安装商'}
        open={modal}
        onOk={handleSubmit}
        onCancel={() => setModal(false)}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="name" label="安装商名称" rules={[{ required: true }]}>
                <Input placeholder="例如：上海腾耀新能源安装有限公司" size="large" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="level" label="等级" rules={[{ required: true }]}>
                <Select options={LEVEL_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="contactPerson" label="联系人">
                <Input placeholder="张三" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="联系电话">
                <Input placeholder="138-0000-0000" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="address" label="公司地址">
                <Input placeholder="上海市浦东新区张江高科技园区..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="region" label="主区域">
                <Select placeholder="选择主区域" options={REGION_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="staffCount" label="员工数量">
                <InputNumber min={0} placeholder="例如：50" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="establishmentDate" label="成立时间">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="businessLicense" label="统一社会信用代码">
                <Input placeholder="91310000XXXXXXXXX" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="serviceRegions" label="服务区域（可多选）">
                <Select mode="multiple" placeholder="选择服务覆盖的区域" options={REGION_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="specializedTypes" label="擅长安装类型">
                <Select mode="multiple" placeholder="选择擅长的安装类型" options={SPECIALIZED_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Divider>资质证书</Divider>

          <Form.Item label="资质证书列表">
            <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
              点击"添加证书"录入安装商的资质文件（电气施工资质、安全生产许可证等）
            </Paragraph>
          </Form.Item>

          <Divider>银行账户</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name={['bankAccount', 'bankName']} label="开户银行">
                <Input placeholder="中国工商银行上海分行" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['bankAccount', 'accountName']} label="账户名称">
                <Input placeholder="上海腾耀新能源安装有限公司" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['bankAccount', 'accountNumber']} label="账号">
                <Input placeholder="6222 **** **** 1234" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="备注">
            <TextArea rows={3} placeholder="其他补充说明..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── 详情 Modal ───────────────────────────────────────────────────── */}
      <Modal
        title={<Space><TeamOutlined /><span>{selected?.name}</span></Space>}
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={
          <Space>
            <Button icon={<EditOutlined />} onClick={() => { setDetailModal(false); handleEdit(selected!); }}>编辑</Button>
            <Button onClick={() => setDetailModal(false)}>关闭</Button>
          </Space>
        }
        width={720}
      >
        {selected && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="等级">
                    <Tag style={{ background: LEVEL_COLOR[selected.level] + '20', border: `1px solid ${LEVEL_COLOR[selected.level]}`, color: LEVEL_COLOR[selected.level] }}>
                      {LEVEL_TEXT[selected.level]}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="联系电话">{selected.phone || '-'}</Descriptions.Item>
                  <Descriptions.Item label="联系人">{selected.contactPerson || '-'}</Descriptions.Item>
                  <Descriptions.Item label="主区域">{selected.region || '-'}</Descriptions.Item>
                  <Descriptions.Item label="公司地址">{selected.address || '-'}</Descriptions.Item>
                  <Descriptions.Item label="统一社会信用代码">{selected.businessLicense || '-'}</Descriptions.Item>
                  <Descriptions.Item label="成立时间">{selected.establishmentDate ? new Date(selected.establishmentDate).toLocaleDateString('zh-CN') : '-'}</Descriptions.Item>
                  <Descriptions.Item label="员工数量">{selected.staffCount ?? '-'}</Descriptions.Item>
                  <Descriptions.Item label="状态">
                    <Badge status={selected.status === 'active' ? 'success' : 'default'} text={selected.status === 'active' ? '正常' : '已禁用'} />
                  </Descriptions.Item>
                </Descriptions>
              </Col>
              <Col span={12}>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="累计安装量">
                    <Text strong style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16 }}>{selected.totalInstallations ?? 0}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="累计装机容量">
                    <Text strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>{((selected.totalCapacity || 0) / 1000).toFixed(2)}k kW</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="客户评分">
                    <Rate disabled value={selected.rating || 5} style={{ fontSize: 14 }} />
                    <Text style={{ marginLeft: 8 }}>{selected.rating?.toFixed(1) || '5.0'}/5</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="可用积分">
                    <Text style={{ color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>{selected.availablePoints?.toLocaleString() || 0}</Text>
                  </Descriptions.Item>
                </Descriptions>

                <Divider style={{ margin: '12px 0' }}>擅长类型</Divider>
                <Space wrap>
                  {(selected.specializedTypes || []).map(t => (
                    <Tag key={t} color={TYPE_TAG_COLOR[t]}>{TYPE_TEXT[t] || t}</Tag>
                  ))}
                  {(!selected.specializedTypes || selected.specializedTypes.length === 0) && <Text type="secondary">未设置</Text>}
                </Space>

                <Divider style={{ margin: '12px 0' }}>服务区域</Divider>
                <Space wrap>
                  {(selected.serviceRegions || []).map(r => <Tag key={r}>{r}</Tag>)}
                  {(!selected.serviceRegions || selected.serviceRegions.length === 0) && <Text type="secondary">未设置</Text>}
                </Space>
              </Col>
            </Row>

            {selected.qualifications && selected.qualifications.length > 0 && (
              <>
                <Divider>资质证书</Divider>
                <Table
                  columns={qualColumns}
                  dataSource={selected.qualifications}
                  rowKey="_id"
                  pagination={false}
                  size="small"
                />
              </>
            )}

            {selected.bankAccount && (
              <>
                <Divider>银行账户</Divider>
                <Descriptions column={3} size="small">
                  <Descriptions.Item label="开户银行">{selected.bankAccount.bankName || '-'}</Descriptions.Item>
                  <Descriptions.Item label="账户名称">{selected.bankAccount.accountName || '-'}</Descriptions.Item>
                  <Descriptions.Item label="账号">{selected.bankAccount.accountNumber ? '****' + selected.bankAccount.accountNumber.slice(-4) : '-'}</Descriptions.Item>
                </Descriptions>
              </>
            )}

            {selected.description && (
              <>
                <Divider>备注</Divider>
                <Paragraph>{selected.description}</Paragraph>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
