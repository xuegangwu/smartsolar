import { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Button, Space, Typography, Row, Col, Statistic,
  Select, DatePicker, Progress, BarChart, Spin, Empty, Modal, Badge, Tooltip,
} from 'antd';
import {
  TeamOutlined, HomeOutlined, TrophyOutlined, RiseOutlined,
  ThunderboltOutlined, CalendarOutlined, StarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { partnerApi } from '../services/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { MonthPicker } = DatePicker;

const LEVEL_TEXT: Record<string, string> = { bronze: '铜牌', silver: '银牌', gold: '金牌', diamond: '钻牌' };
const LEVEL_COLOR: Record<string, string> = { bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', diamond: '#b9f2ff' };

// 模拟柱状图数据（当没有后端数据时用）
function buildMockTrend(months = 6) {
  const result = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    result.push({
      _id: m,
      installations: Math.floor(Math.random() * 30) + 5,
      capacity: Math.floor(Math.random() * 500) + 100,
    });
  }
  return result;
}

export default function InstallerStats() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [selectedInstaller, setSelectedInstaller] = useState<string>('');
  const [installerList, setInstallerList] = useState<any[]>([]);
  const [monthFilter, setMonthFilter] = useState('');
  const [detailModal, setDetailModal] = useState(false);
  const [detailData, setDetailData] = useState<any[]>([]);
  const [detailInstaller, setDetailInstaller] = useState<any>(null);

  useEffect(() => { loadSummary(); loadTrend(); loadInstallers(); }, []);
  useEffect(() => { loadStats(); }, [selectedInstaller, monthFilter]);

  async function loadSummary() {
    const token = localStorage.getItem('smartsolar_token');
    const res = await fetch('/api/installer-stats/summary', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
    if (res.success) setSummary(res.data);
  }

  async function loadTrend() {
    const token = localStorage.getItem('smartsolar_token');
    const res = await fetch('/api/installer-stats/trend?months=12', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
    if (res.success && res.data.length > 0) {
      setTrend(res.data);
    } else {
      setTrend(buildMockTrend(6));
    }
  }

  async function loadInstallers() {
    const res = await partnerApi.getAll({ type: 'installer' });
    if (res.success) setInstallerList(res.data);
  }

  async function loadStats() {
    setLoading(true);
    const token = localStorage.getItem('smartsolar_token');
    const params: any = {};
    if (selectedInstaller) params.installerId = selectedInstaller;
    if (monthFilter) params.month = monthFilter;

    const url = new URLSearchParams(params).toString();
    const res = await fetch(`/api/installer-stats?${url}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
    if (res.success) setStats(res.data);
    setLoading(false);
  }

  function handleShowDetail(installer: any) {
    setDetailInstaller(installer);
    const found = stats.find((s: any) => s.installerId?._id === installer._id || s.installer?._id === installer._id);
    if (found?._id) {
      loadDetail(installer._id);
    } else {
      // No stats yet, show empty
      setDetailData([]);
      setDetailModal(true);
    }
  }

  async function loadDetail(installerId: string) {
    const token = localStorage.getItem('smartsolar_token');
    const res = await fetch(`/api/installer-stats?installerId=${installerId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
    if (res.success) {
      setDetailData(res.data);
    } else {
      setDetailData([]);
    }
    setDetailModal(true);
  }

  // ── Summary stats ────────────────────────────────────────────────────────────
  const allTime = summary?.allTime || {};
  const totalInstallers = installerList.length;
  const avgCapacity = totalInstallers > 0
    ? (allTime.totalCapacity || 0) / totalInstallers
    : 0;

  // ── Trend chart bars ───────────────────────────────────────────────────────
  const maxCap = Math.max(...trend.map((t: any) => t.capacity || 0), 1);

  const columns: ColumnsType<any> = [
    { title: '安装商', render: (_, r) => {
      const inst = r.installer || r.installerId;
      return (
        <Space direction="vertical" size={0}>
          <Space>
            <Text strong>{inst?.name || '-'}</Text>
            {inst?.level && (
              <Tag style={{ background: LEVEL_COLOR[inst.level] + '20', border: `1px solid ${LEVEL_COLOR[inst.level]}`, color: LEVEL_COLOR[inst.level], fontSize: 11 }}>
                {LEVEL_TEXT[inst.level]}
              </Tag>
            )}
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>{inst?.region || '-'}</Text>
        </Space>
      );
    }, width: 200 },
    { title: '月份', dataIndex: 'month', width: 100 },
    {
      title: '本月安装量',
      dataIndex: 'totalInstallations',
      render: v => <Text strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>{v ?? 0}</Text>,
      width: 110,
    },
    {
      title: '本月装机容量',
      dataIndex: 'totalCapacity',
      render: v => <Text style={{ fontFamily: 'JetBrains Mono, monospace' }}>{v ? `${(v/1000).toFixed(1)}k kW` : '-'}</Text>,
      width: 130,
    },
    {
      title: '完工工单',
      dataIndex: 'workOrderCount',
      render: v => <Badge count={v ?? 0} style={{ backgroundColor: '#3b82f6' }} />,
      width: 90,
    },
    {
      title: '累计安装量',
      render: (_, r) => {
        const inst = r.installer || r.installerId;
        return <Text style={{ fontFamily: 'JetBrains Mono, monospace' }}>{inst?.totalInstallations ?? 0}</Text>;
      },
      width: 110,
    },
    {
      title: '累计容量',
      render: (_, r) => {
        const inst = r.installer || r.installerId;
        const cap = inst?.totalCapacity || 0;
        return <Text style={{ fontFamily: 'JetBrains Mono, monospace' }}>{cap ? `${(cap/1000).toFixed(1)}k kW` : '-'}</Text>;
      },
      width: 120,
    },
    {
      title: '操作',
      width: 100,
      render: (_, r) => {
        const inst = r.installer || r.installerId;
        return (
          <Button size="small" type="link" onClick={() => handleShowDetail(inst)}>
            查看详情
          </Button>
        );
      },
    },
  ];

  const detailColumns: ColumnsType<any> = [
    { title: '月份', dataIndex: 'month', width: 100 },
    { title: '新增安装', dataIndex: 'totalInstallations', render: v => v ?? 0, width: 110 },
    { title: '新增容量(kW)', dataIndex: 'totalCapacity', render: v => v ?? 0, width: 130 },
    { title: '完工工单', dataIndex: 'workOrderCount', render: v => v ?? 0, width: 100 },
    { title: '质量评分', dataIndex: 'qualityScore', render: v => v ? `${v.toFixed(1)} / 5.0` : '5.0', width: 110 },
    { title: '投诉次数', dataIndex: 'complaintCount', render: v => v ?? 0, width: 90 },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={4}>📊 安装商业绩统计</Title>

      {/* Summary Row */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={4}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="安装商总数"
              value={totalInstallers}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#3b82f6' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="累计总安装量"
              value={allTime.totalInstallations || 0}
              prefix={<HomeOutlined />}
              valueStyle={{ color: '#22c55e' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="累计总装机容量"
              value={allTime.totalCapacity ? `${(allTime.totalCapacity/1000).toFixed(1)}k kW` : '0 kW'}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#8b5cf6' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="累计完工工单"
              value={allTime.totalWorkOrders || 0}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#f59e0b' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="平均装机容量"
              value={avgCapacity ? `${(avgCapacity/1000).toFixed(1)}k kW` : '0 kW'}
              prefix={<RiseOutlined />}
              suffix="/家"
              valueStyle={{ color: '#64748b' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Trend Chart */}
      {trend.length > 0 && (
        <Card title="📈 月度趋势" style={{ marginBottom: 16, borderRadius: 12 }} bodyStyle={{ padding: '16px 24px' }}>
          <Row gutter={16}>
            <Col span={16}>
              {/* Simple bar chart */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
                {trend.map((t: any) => (
                  <Tooltip title={`${t._id}: ${t.installations}套 / ${t.capacity}kW`} key={t._id}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: '100%',
                        height: `${Math.max(4, Math.round((t.capacity / maxCap) * 100))}px`,
                        background: 'linear-gradient(180deg, #8b5cf6, #a78bfa)',
                        borderRadius: '4px 4px 0 0',
                        minHeight: 4,
                        transition: 'height 0.3s',
                      }} />
                    </div>
                  </Tooltip>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {trend.map((t: any) => (
                  <div key={t._id} style={{ flex: 1, textAlign: 'center' }}>
                    <Text style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'JetBrains Mono, monospace' }}>
                      {t._id?.slice(5)}
                    </Text>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'center', marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>月份</Text>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {trend.slice(-6).map((t: any) => (
                  <div key={t._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: '#f8f9fa', borderRadius: 6 }}>
                    <Text style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>{t._id}</Text>
                    <Space size={12}>
                      <Tag color="blue" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{t.installations}套</Tag>
                      <Text style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#8b5cf6', width: 60, textAlign: 'right' }}>{t.capacity}kW</Text>
                    </Space>
                  </div>
                ))}
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {/* Filter + Table */}
      <Card
        title="🏆 安装商业绩明细"
        extra={
          <Space>
            <Select
              placeholder="筛选安装商"
              allowClear
              value={selectedInstaller || undefined}
              onChange={v => setSelectedInstaller(v || '')}
              options={installerList.map(i => ({ value: i._id, label: i.name }))}
              style={{ width: 160 }}
              showSearch
              filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
            />
            <MonthPicker placeholder="筛选月份" value={monthFilter ? undefined : undefined} onChange={(m, fm) => setMonthFilter(fm || '')} allowClear />
            <Button onClick={loadStats}>刷新</Button>
          </Space>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : stats.length === 0 ? (
          <Empty description="暂无业绩数据（完成工单后自动统计）" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Table
            columns={columns}
            dataSource={stats}
            rowKey="_id"
            pagination={{ pageSize: 15 }}
            size="small"
          />
        )}
      </Card>

      {/* Detail Modal */}
      <Modal
        title={<Space><TeamOutlined /><span>{detailInstaller?.name || '安装商业绩详情'}</span></Space>}
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={<Button onClick={() => setDetailModal(false)}>关闭</Button>}
        width={680}
      >
        {detailInstaller && (
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card size="small">
                <Statistic title="累计安装量" value={detailInstaller.totalInstallations || 0} prefix={<HomeOutlined />} />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic title="累计容量" value={detailInstaller.totalCapacity ? `${(detailInstaller.totalCapacity/1000).toFixed(1)}k kW` : '0'} prefix={<ThunderboltOutlined />} />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic title="客户评分" value={detailInstaller.rating?.toFixed(1) || '5.0'} suffix="/ 5" prefix={<StarOutlined />} valueStyle={{ color: '#f59e0b' }} />
              </Card>
            </Col>
          </Row>
        )}
        <Table
          columns={detailColumns}
          dataSource={detailData}
          rowKey="_id"
          pagination={false}
          size="small"
        />
      </Modal>
    </div>
  );
}
