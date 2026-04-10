import { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Space, Tag } from 'antd';
import { useParams } from 'react-router-dom';
import { stationApi } from '../services/api';

const { Text, Title } = Typography;

function StatusBadge({ label, status }: { label: string; status: 'online' | 'warning' | 'offline' }) {
  const colors = { online: '#16a34a', warning: '#d97706', offline: '#b8c0cc' };
  const c = colors[status] || colors.offline;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block', boxShadow: status === 'online' ? `0 0 6px ${c}` : 'none' }} />
      <span style={{ fontSize: 12, color: '#4a5568', fontFamily: 'Inter, sans-serif' }}>{label}</span>
      <span style={{ fontSize: 11, color: c, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
        {status === 'online' ? '在线' : status === 'warning' ? '告警' : '离线'}
      </span>
    </div>
  );
}

// Power flow arrow: SVG line with animated moving dot
function PowerFlowArrow({ x1, y1, x2, y2, color = '#d97706', label, dash = false }: {
  x1: number; y1: number; x2: number; y2: number;
  color?: string; label?: string; dash?: boolean;
}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  // Arrow head
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const headLen = 8;

  return (
    <g>
      {/* Line */}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color}
        strokeWidth={dash ? 1.5 : 2}
        strokeDasharray={dash ? '6 4' : 'none'}
        opacity={0.6}
      />
      {/* Animated moving dot */}
      <circle r={3} fill={color}>
        <animateMotion dur={`${len / 80}s`} repeatCount="indefinite" path={`M${x1},${y1} L${x2},${y2}`} />
      </circle>
      {/* Arrow head at end */}
      <polygon
        points={`0,${-headLen / 2} 0,${headLen / 2} ${headLen},0`}
        fill={color}
        opacity={0.7}
        transform={`translate(${x2},${y2}) rotate(${angle})`}
      />
      {/* Label */}
      {label && (
        <text x={mx} y={my - 6} textAnchor="middle" fontSize={10} fill={color} opacity={0.9} fontFamily="JetBrains Mono, monospace">
          {label}
        </text>
      )}
    </g>
  );
}

export default function StationTopology() {
  const { id } = useParams();
  const [station, setStation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ solar: 847, battery: 75, pcs: 320, grid: 120, ev: 45 });

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    stationApi.getAll().then(r => {
      if (r.success) setStation(r.data.find((s: any) => s._id === id));
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    const t = setInterval(() => {
      setData(d => ({
        solar: 800 + Math.floor(Math.random() * 100),
        battery: Math.round(Math.min(100, Math.max(20, d.battery + (Math.random() - 0.5) * 4))),
        pcs: 300 + Math.floor(Math.random() * 50),
        grid: 100 + Math.floor(Math.random() * 40),
        ev: 40 + Math.floor(Math.random() * 20),
      }));
    }, 5000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <Text style={{ color: '#8896a6', fontFamily: 'Inter, sans-serif' }}>加载中...</Text>
      </div>
    );
  }

  if (!station) {
    return (
      <Card style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 14, padding: 40, textAlign: 'center' }}>
        <Text style={{ color: '#8896a6', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>未找到该电站</Text>
      </Card>
    );
  }

  const nodes = [
    { icon: '☀️', label: '光伏', value: data.solar, unit: 'kW', color: '#d97706', col: 2 },
    { icon: '⚡', label: 'PCS', value: data.pcs, unit: 'kW', color: '#2563eb', col: 1 },
    { icon: '🔋', label: '储能', value: data.battery, unit: '%', color: '#e6342a', col: 3 },
    { icon: '🏭', label: '电网', value: data.grid, unit: 'kW', color: '#7c3aed', col: 2 },
    { icon: '🚗', label: '充电桩', value: data.ev, unit: 'kW', color: '#ea580c', col: 4 },
  ];

  // Grid positions for nodes (4 cols, 2 rows), normalized to percentage
  // Col positions: col1=15%, col2=38%, col3=62%, col4=85%
  // Row positions: row1=25%, row2=75%
  const colPct = [15, 38, 62, 85];
  const rowPct = [28, 72];

  const solarCol = 2, pcsCol = 1, battCol = 2, gridCol = 3, evCol = 4;
  const solarX = colPct[solarCol - 1], solarY = rowPct[0];
  const pcsX = colPct[pcsCol - 1], pcsY = rowPct[1];
  const battX = colPct[battCol - 1], battY = rowPct[1];
  const gridX = colPct[gridCol - 1], gridY = rowPct[1];
  const evX = colPct[evCol - 1], evY = rowPct[1];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#1a1a2e', fontWeight: 700, fontSize: 18 }}>
            ⚡ {station.name}
          </Title>
          <Text style={{ fontSize: 13, color: '#8896a6', marginTop: 2, display: 'block' }}>
            {typeof station.location === 'string' ? station.location : station.location?.address} · 装机 {station.capacity || station.installedCapacity || 0}MW
          </Text>
        </div>
        <Space direction="vertical" align="end" size={4}>
          <Tag style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#e6342a', borderRadius: 20, fontSize: 12, padding: '2px 12px' }}>
            ● 实时拓扑
          </Tag>
          <Space size={12} wrap>
            <Space size={4}>
              <div style={{ width: 24, height: 2, background: '#d97706', borderRadius: 1 }} />
              <span style={{ fontSize: 11, color: '#8896a6' }}>电力流</span>
            </Space>
            <Space size={4}>
              <div style={{ width: 24, height: 2, background: '#2563eb', borderRadius: 1, borderTop: '2px dashed #2563eb', background: 'transparent' }} />
              <span style={{ fontSize: 11, color: '#8896a6' }}>信息流</span>
            </Space>
          </Space>
        </Space>
      </div>

      {/* KPI Row */}
      <Row gutter={[10, 10]}>
        {nodes.map(n => (
          <Col xs={12} sm={8} md={4} key={n.label}>
            <Card
              size="small"
              style={{
                background: '#fff',
                border: `1px solid ${n.color}25`,
                borderRadius: 10,
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
              styles={{ body: { padding: '12px 8px' } }}
            >
              <div style={{ fontSize: 10, color: '#8896a6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                {n.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: n.color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
                {n.value}
                <span style={{ fontSize: 12, color: '#b8c0cc', marginLeft: 2 }}>{n.unit}</span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Topology — CSS grid + SVG overlay for flows */}
      <Card
        style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: '28px 24px' } }}
      >
        {/* Legend */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Space size={6}>
            <svg width="40" height="12"><line x1="0" y1="6" x2="40" y2="6" stroke="#d97706" strokeWidth="2"/><circle r="3" fill="#d97706"><animateMotion dur="1.5s" repeatCount="indefinite" path="M0,6 L40,6"/></circle></svg>
            <span style={{ fontSize: 11, color: '#4a5568', fontWeight: 600 }}>电力流</span>
          </Space>
          <Space size={6}>
            <svg width="40" height="12"><line x1="0" y1="6" x2="40" y2="6" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="5 3"/><circle r="2.5" fill="#2563eb"><animateMotion dur="1.8s" repeatCount="indefinite" path="M0,6 L40,6"/></circle></svg>
            <span style={{ fontSize: 11, color: '#4a5568', fontWeight: 600 }}>信息流</span>
          </Space>
          <Space size={6}>
            <svg width="40" height="12"><line x1="0" y1="6" x2="40" y2="6" stroke="#16a34a" strokeWidth="2"/><circle r="3" fill="#16a34a"><animateMotion dur="1.2s" repeatCount="indefinite" path="M0,6 L40,6"/></circle></svg>
            <span style={{ fontSize: 11, color: '#4a5568', fontWeight: 600 }}>双向充放电</span>
          </Space>
        </div>

        {/* Topology grid with SVG overlay */}
        <div style={{ position: 'relative' }}>
          {/* SVG overlay for flow arrows */}
          <svg
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <marker id="arrow-power" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#d97706" opacity="0.7"/>
              </marker>
              <marker id="arrow-info" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#2563eb" opacity="0.7"/>
              </marker>
              <marker id="arrow-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#16a34a" opacity="0.7"/>
              </marker>
            </defs>

            {/* ── POWER FLOWS (solid orange lines) ── */}
            {/* Solar → PCS */}
            <PowerFlowArrow x1={solarX} y1={solarY + 10} x2={pcsX + 5} y2={pcsY - 10} color="#d97706" label="DC 1000V" />
            {/* PCS → Grid */}
            <PowerFlowArrow x1={pcsX + 5} y1={pcsY} x2={gridX - 5} y2={gridY} color="#d97706" label="AC 400V" />
            {/* PCS → EV */}
            <PowerFlowArrow x1={pcsX + 5} y1={pcsY} x2={evX - 5} y2={evY} color="#d97706" label="AC 380V" />

            {/* ── BATTERY ↔ PCS (bidirectional green) ── */}
            {/* PCS → Battery (charging) */}
            <PowerFlowArrow x1={pcsX + 5} y1={pcsY - 5} x2={battX - 5} y2={battY + 5} color="#16a34a" label="充电" />
            {/* Battery → PCS (discharging) */}
            <PowerFlowArrow x1={battX + 5} y1={battY} x2={pcsX - 5} y2={pcsY + 5} color="#16a34a" />

            {/* ── INFORMATION FLOWS (dashed blue) ── */}
            {/* All equipment → EMS (center top area) */}
            {/* Solar info → PCS info */}
            <PowerFlowArrow x1={solarX} y1={solarY} x2={pcsX} y2={pcsY - 12} color="#2563eb" dash label="数据" />
            {/* PCS info → EMS (center) */}
            <PowerFlowArrow x1={pcsX + 3} y1={pcsY - 10} x2={pcsX + 3} y2={pcsY - 18} color="#2563eb" dash />
            {/* Battery info → EMS */}
            <PowerFlowArrow x1={battX} y1={battY - 10} x2={pcsX + 3} y2={pcsY - 18} color="#2563eb" dash />
            {/* Grid info → EMS */}
            <PowerFlowArrow x1={gridX} y1={gridY - 10} x2={pcsX + 3} y2={pcsY - 18} color="#2563eb" dash />
            {/* EV info → EMS */}
            <PowerFlowArrow x1={evX} y1={evY - 10} x2={pcsX + 3} y2={pcsY - 18} color="#2563eb" dash />

            {/* EMS → Cloud (top center → up) */}
            <PowerFlowArrow x1={50} y1={8} x2={50} y2={2} color="#2563eb" dash label="上报云端" />
          </svg>

          {/* CSS Grid for nodes */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '15% 23% 23% 23% 16%',
            gridTemplateRows: 'auto auto',
            gap: 20,
            position: 'relative',
            zIndex: 1,
          }}>
            {/* Solar — top center (col 3) */}
            <div style={{ gridColumn: '3', gridRow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#fff', border: '2px solid #d97706',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 30, boxShadow: '0 4px 12px rgba(217,119,6,0.15)',
                position: 'relative', zIndex: 3,
              }}>☀️</div>
              <span style={{ fontSize: 13, color: '#4a5568', fontWeight: 600 }}>光伏</span>
              <span style={{ fontSize: 13, color: '#d97706', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{data.solar} kW</span>
              <StatusBadge label="" status="online" />
            </div>

            {/* Empty cells to balance grid */}
            <div style={{ gridColumn: '1', gridRow: 1 }} />
            <div style={{ gridColumn: '2', gridRow: 1 }} />
            <div style={{ gridColumn: '4', gridRow: 1 }} />
            <div style={{ gridColumn: '5', gridRow: 1 }} />

            {/* PCS — bottom col 2 */}
            <div style={{ gridColumn: '2', gridRow: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff', border: '2px solid #2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 4px 12px rgba(37,99,235,0.12)', position: 'relative', zIndex: 3 }}>⚡</div>
              <span style={{ fontSize: 13, color: '#4a5568', fontWeight: 600 }}>PCS</span>
              <span style={{ fontSize: 13, color: '#2563eb', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{data.pcs} kW</span>
              <StatusBadge label="" status="online" />
              {/* EMS label */}
              <div style={{ fontSize: 10, color: '#93c5fd', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 4, padding: '1px 6px', marginTop: 2 }}>EMS采集</div>
            </div>

            {/* Battery — bottom col 3 */}
            <div style={{ gridColumn: '3', gridRow: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff', border: '2px solid #e6342a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 4px 12px rgba(230,52,42,0.12)', position: 'relative', zIndex: 3 }}>🔋</div>
              <span style={{ fontSize: 13, color: '#4a5568', fontWeight: 600 }}>储能</span>
              <span style={{ fontSize: 13, color: '#e6342a', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{data.battery} %</span>
              <StatusBadge label="" status="online" />
            </div>

            {/* Grid — bottom col 4 */}
            <div style={{ gridColumn: '4', gridRow: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff', border: '2px solid #7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 4px 12px rgba(124,58,237,0.12)', position: 'relative', zIndex: 3 }}>🏭</div>
              <span style={{ fontSize: 13, color: '#4a5568', fontWeight: 600 }}>电网</span>
              <span style={{ fontSize: 13, color: '#7c3aed', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{data.grid} kW</span>
              <StatusBadge label="" status="online" />
            </div>

            {/* EV — bottom col 5 */}
            <div style={{ gridColumn: '5', gridRow: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff', border: '2px solid #ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 4px 12px rgba(234,88,12,0.12)', position: 'relative', zIndex: 3 }}>🚗</div>
              <span style={{ fontSize: 13, color: '#4a5568', fontWeight: 600 }}>充电桩</span>
              <span style={{ fontSize: 13, color: '#ea580c', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{data.ev} kW</span>
              <StatusBadge label="" status="online" />
            </div>
          </div>
        </div>

        {/* Flow description */}
        <div style={{ marginTop: 16, padding: '10px 14px', background: '#f8f9fa', borderRadius: 8, border: '1px solid #e8eaed' }}>
          <div style={{ fontSize: 11, color: '#8896a6', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>能量流向说明</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12 }}>
            <Text style={{ color: '#4a5568' }}><span style={{ color: '#d97706', fontWeight: 600 }}>☀️ 光伏</span> 直流电 → <span style={{ color: '#2563eb', fontWeight: 600 }}>⚡ PCS</span> 整流/逆变</Text>
            <Text style={{ color: '#4a5568' }}><span style={{ color: '#2563eb', fontWeight: 600 }}>⚡ PCS</span> → <span style={{ color: '#7c3aed', fontWeight: 600 }}>🏭 电网</span> / <span style={{ color: '#ea580c', fontWeight: 600 }}>🚗 充电桩</span></Text>
            <Text style={{ color: '#4a5568' }}><span style={{ color: '#e6342a', fontWeight: 600 }}>🔋 储能</span> ↔ <span style={{ color: '#2563eb', fontWeight: 600 }}>⚡ PCS</span> 充放电双向流动</Text>
            <Text style={{ color: '#4a5568' }}><span style={{ color: '#2563eb', fontWeight: 600 }}>━</span> 所有设备数据 → EMS → 云端平台</Text>
          </div>
        </div>
      </Card>

      {/* Status bar */}
      <Card
        size="small"
        style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: '10px 16px' } }}
      >
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <StatusBadge label="光伏" status="online" />
          <StatusBadge label="PCS" status="online" />
          <StatusBadge label="储能" status="online" />
          <StatusBadge label="电网" status="online" />
          <StatusBadge label="充电桩" status="online" />
        </div>
      </Card>
    </div>
  );
}
