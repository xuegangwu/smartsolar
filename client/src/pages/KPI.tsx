import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Progress, Table, Tag, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined, ClockCircleOutlined, ThunderboltOutlined,
  DollarOutlined, RiseOutlined, ToolOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

// ─── KPI Card ──────────────────────────────────────────────────────────────
function KPICard({ title, value, suffix, sub, icon, color, tip }: {
  title: string; value: number | string; suffix?: string;
  sub?: string; icon: React.ReactNode; color: string; tip?: string;
}) {
  return (
    <Card
      size="small"
      style={{
        background: '#141c2e', border: `1px solid ${color}30`,
        borderRadius: 12, position: 'relative', overflow: 'hidden',
        boxShadow: `0 0 20px ${color}15`,
      }}
      bodyStyle={{ padding: '16px' }}
    >
      <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 24, opacity: 0.15, color }}>{icon}</div>
      <div style={{ color: '#5a6a7a', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
        {value}{suffix && <span style={{ fontSize: 14, marginLeft: 4, color: '#94a3b8' }}>{suffix}</span>}
      </div>
      {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6, fontFamily: 'JetBrains Mono, monospace' }}>{sub}</div>}
    </Card>
  );
}

// ─── Bar Chart (CSS only) ──────────────────────────────────────────────────
function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.map((item, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>{item.label}</Text>
            <Text style={{ fontSize: 12, color: item.color, fontFamily: 'JetBrains Mono, monospace' }}>{item.value}%</Text>
          </div>
          <div style={{ height: 6, background: '#1a2438', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              width: `${(item.value / max) * 100}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${item.color}, ${item.color}80)`,
              borderRadius: 3,
              boxShadow: `0 0 8px ${item.color}60`,
              transition: 'width 1s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Donut Chart (CSS only) ───────────────────────────────────────────────
function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  const strokes = segments.map((seg, i) => {
    const pct = seg.value / total;
    const stroke = `<circle cx="40" cy="40" r="32" fill="transparent" stroke="${seg.color}" stroke-width="10" stroke-dasharray="${(pct * 201).toFixed(1)} 201" stroke-dashoffset="${(-offset * 201).toFixed(1)}" transform="rotate(-90 40 40)" style="transition: stroke-dasharray 1s" /><text x="40" y="36" text-anchor="middle" fill="${seg.color}" font-size="10" font-family="JetBrains Mono" font-weight="600">${seg.value}</text><text x="40" y="50" text-anchor="middle" fill="#5a6a7a" font-size="8" font-family="JetBrains Mono">${seg.label}</text>`;
    offset += pct;
    return { pct, stroke };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg viewBox="0 0 80 80" width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
        {strokes.map((s, i) => (
          <g key={i} dangerouslySetInnerHTML={{ __html: `<circle cx="40" cy="40" r="32" fill="transparent" stroke="${segments[i].color}" stroke-width="10" stroke-dasharray="${(s.pct * 201).toFixed(1)} 201" stroke-dashoffset="${(-segments.slice(0, i).reduce((a, x) => a + x.value / total, 0) * 201).toFixed(1)}" />` }} />
        ))}
        <circle cx="40" cy="40" r="24" fill="#141c2e" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, boxShadow: `0 0 6px ${s.color}80` }} />
            <Text style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
              {s.label} <span style={{ color: s.color }}>{s.value}</span>
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────
export default function KPI() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  // Mock computed KPI data (in production, compute from real DB queries)
  const kpis = {
    availability: 98.5,       // 可用率 %
    mtbf: 8760,              // 小时（全年无停机示例）
    mttr: 2.4,               // 小时
    pr: 86.3,               // 性能比 %
    omCostPerKwh: 0.032,    // 元/kWh
    responseRate: 94.7,      // 响应及时率 %
    inspectionRate: 100,     // 巡检完成率 %
    workOrderClosed: 47,      // 本月已关闭工单
    workOrderTotal: 52,       // 本月总工单
    alertAckRate: 96.2,     // 告警确认率 %
    spareConsume: 12800,     // 备件消耗元
  };

  const mtbfPct = Math.min(100, (kpis.mtbf / 8760) * 100);
  const woClosedPct = Math.round((kpis.workOrderClosed / kpis.workOrderTotal) * 100);

  const availabilityData = [
    { label: '苏州工业园', value: 99.2, color: '#00e5c0' },
    { label: '无锡储能电站', value: 97.8, color: '#00b8d4' },
    { label: '杭州光储站', value: 98.6, color: '#9b7fe8' },
  ];

  const alertDistribution = [
    { label: '严重', value: 1, color: '#ff5252' },
    { label: '重要', value: 3, color: '#ffab40' },
    { label: '一般', value: 12, color: '#5a6a7a' },
  ];

  const woStatusData = [
    { label: '已关闭', value: 47, color: '#00e5c0' },
    { label: '处理中', value: 3, color: '#ffab40' },
    { label: '待处理', value: 2, color: '#ff5252' },
  ];

  const priorityData = [
    { label: '紧急', value: 3, color: '#ff5252' },
    { label: '重要', value: 12, color: '#ffab40' },
    { label: '一般', value: 37, color: '#00e5c0' },
  ];

  const kpiTableData = [
    { name: '可用率 Availability', value: `${kpis.availability}%`, target: '≥98%', status: 'green' },
    { name: 'MTBF (平均故障间隔)', value: `${kpis.mtbf}h`, target: '≥8760h', status: 'green' },
    { name: 'MTTR (平均修复时间)', value: `${kpis.mttr}h`, target: '≤4h', status: 'green' },
    { name: 'PR (性能比)', value: `${kpis.pr}%`, target: '≥85%', status: 'green' },
    { name: 'O&M Cost/kWh', value: `¥${kpis.omCostPerKwh}`, target: '≤¥0.05', status: 'green' },
    { name: '工单响应及时率', value: `${kpis.responseRate}%`, target: '≥95%', status: 'green' },
    { name: '巡检完成率', value: `${kpis.inspectionRate}%`, target: '100%', status: 'green' },
    { name: '告警确认率', value: `${kpis.alertAckRate}%`, target: '≥90%', status: 'green' },
  ];

  const columns: ColumnsType<any> = [
    { title: 'KPI 指标', dataIndex: 'name', render: v => <Text style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#94a3b8' }}>{v}</Text> },
    {
      title: '实际值', dataIndex: 'value',
      render: v => <Text style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#00e5c0' }}>{v}</Text>,
    },
    { title: '目标', dataIndex: 'target', render: v => <Text style={{ fontFamily: 'JetBrains Mono, monospace', color: '#5a6a7a' }}>{v}</Text> },
    {
      title: '状态', dataIndex: 'status',
      render: s => (
        <Space>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: s === 'green' ? '#00e5c0' : '#ff5252', boxShadow: `0 0 6px ${s === 'green' ? '#00e5c0' : '#ff5252'}` }} />
          <Text style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: s === 'green' ? '#00e5c0' : '#ff5252' }}>
            {s === 'green' ? '达标' : '未达标'}
          </Text>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* KPI Summary Row */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={8}>
          <KPICard title="可用率 Availability" value={kpis.availability} suffix="%" icon={<CheckCircleOutlined />} color="#00e5c0" sub="MTBF: 8760h (全年无停机)" />
        </Col>
        <Col xs={12} sm={8}>
          <KPICard title="性能比 PR" value={kpis.pr} suffix="%" icon={<RiseOutlined />} color="#00b8d4" sub="目标 ≥85%" />
        </Col>
        <Col xs={12} sm={8}>
          <KPICard title="MTTR" value={kpis.mttr} suffix="h" icon={<ClockCircleOutlined />} color="#ffab40" sub="目标 ≤4h" />
        </Col>
        <Col xs={12} sm={8}>
          <KPICard title="O&M 成本" value={kpis.omCostPerKwh} suffix="元/kWh" icon={<DollarOutlined />} color="#9b7fe8" sub="目标 ≤¥0.05" />
        </Col>
        <Col xs={12} sm={8}>
          <KPICard title="工单关闭率" value={woClosedPct} suffix="%" icon={<ToolOutlined />} color="#00e5c0" sub={`${kpis.workOrderClosed}/${kpis.workOrderTotal} 本月`} />
        </Col>
        <Col xs={12} sm={8}>
          <KPICard title="告警确认率" value={kpis.alertAckRate} suffix="%" icon={<ThunderboltOutlined />} color="#ffab40" sub="目标 ≥90%" />
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {/* Availability by Station */}
        <Col xs={24} lg={12}>
          <Card size="small" title={<Space><CheckCircleOutlined style={{ color: '#00e5c0' }} /><span>各电站可用率</span></Space>}>
            <BarChart data={availabilityData} />
          </Card>
        </Col>

        {/* Alert Distribution */}
        <Col xs={24} lg={12}>
          <Card size="small" title={<Space><ThunderboltOutlined style={{ color: '#ffab40' }} /><span>告警级别分布</span></Space>}>
            <DonutChart segments={alertDistribution} />
          </Card>
        </Col>
      </Row>

      {/* Bottom Row */}
      <Row gutter={[12, 12]}>
        {/* Work Order Status */}
        <Col xs={24} lg={12}>
          <Card size="small" title={<Space><ToolOutlined style={{ color: '#00e5c0' }} /><span>本月工单状态</span></Space>}>
            <DonutChart segments={woStatusData} />
            <div style={{ marginTop: 16 }}>
              <BarChart data={[
                { label: '紧急', value: 3, color: '#ff5252' },
                { label: '重要', value: 12, color: '#ffab40' },
                { label: '一般', value: 37, color: '#00e5c0' },
              ]} />
            </div>
          </Card>
        </Col>

        {/* KPI Table */}
        <Col xs={24} lg={12}>
          <Card size="small" title={<Space><CheckCircleOutlined style={{ color: '#00e5c0' }} /><span>O&M KPI 达标概览</span></Space>}>
            <Table
              columns={columns}
              dataSource={kpiTableData}
              rowKey="name"
              size="small"
              pagination={false}
              style={{ background: 'transparent' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
