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

// Animated arrow using CSS
function FlowArrow({ direction, label, color, biDirectional = false }: {
  direction: 'right' | 'left' | 'down' | 'up' | 'right-down' | 'left-down' | 'right-up' | 'left-up';
  label?: string; color?: string; biDirectional?: boolean;
}) {
  const bg = color || '#d97706';
  const rotations: Record<string, number> = {
    right: 0, left: 180, down: 90, up: -90,
    'right-down': 45, 'left-down': 135, 'right-up': -45, 'left-up': -135,
  };
  const rot = rotations[direction] || 0;

  const h = direction === 'down' || direction === 'up' ? 28 : 20;
  const w = direction === 'down' || direction === 'up' ? 14 : 28;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, position: 'relative' }}>
      {label && (
        <div style={{
          fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
          color: bg, background: `${bg}18`, border: `1px solid ${bg}40`,
          borderRadius: 3, padding: '1px 5px', whiteSpace: 'nowrap',
          position: 'absolute', top: biDirectional ? '50%' : 0,
          left: '50%', transform: 'translateX(-50%)',
          zIndex: 2,
        }}>
          {biDirectional ? `↔ ${label}` : `→ ${label}`}
        </div>
      )}
      <svg
        width={w} height={h}
        viewBox={biDirectional ? `0 0 ${w} ${h}` : `0 0 ${w} ${h}`}
        style={{ overflow: 'visible' }}
      >
        {/* Line */}
        <line
          x1={direction === 'left' ? w : 0} y1={direction === 'up' ? h : direction === 'down' ? 0 : h / 2}
          x2={direction === 'left' ? 0 : w} y2={direction === 'up' ? 0 : direction === 'down' ? h : h / 2}
          stroke={bg} strokeWidth={2} opacity={0.7}
        />
        {/* Arrow head */}
        <polygon
          points={biDirectional
            ? `${w},${h/2} ${w-6},${h/2-4} ${w-6},${h/2+4} 0,${h/2-4} 0,${h/2+4} ${w-6},${h/2-4}`
            : direction === 'right' ? `0,0 ${w-6},${h/2} 0,${h}` :
              direction === 'left' ? `${w},0 6,${h/2} ${w},${h}` :
              direction === 'down' ? `0,0 ${w/2},${h-6} ${w},0` :
              `0,${h} ${w/2},6 ${w},${h}`}
          fill={bg} opacity={0.8}
        />
        {/* Animated dot moving along the line */}
        <circle r={2.5} fill={bg}>
          {biDirectional ? (
            <animateTransform attributeName="transform" type="translate"
              values={`0,${h/2};${w - 5},${h/2}`} dur="1.5s" repeatCount="indefinite" />
          ) : (
            <animateTransform attributeName="transform" type="translate"
              values={
                direction === 'right' || direction === 'right-down' || direction === 'right-up'
                  ? `0,${h/2};${w - 5},${h/2}`
                  : direction === 'left' || direction === 'left-down' || direction === 'left-up'
                  ? `${w},${h/2};5,${h/2}`
                  : direction === 'down'
                  ? `${w/2},0;${w/2},${h - 5}`
                  : `${w/2},${h};${w/2},5`
              } dur="1.5s" repeatCount="indefinite" />
          )}
        </circle>
      </svg>
    </div>
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
    { icon: '☀️', label: '光伏', value: data.solar, unit: 'kW', color: '#d97706' },
    { icon: '⚡', label: 'PCS', value: data.pcs, unit: 'kW', color: '#2563eb' },
    { icon: '🔋', label: '储能', value: data.battery, unit: '%', color: '#e6342a' },
    { icon: '🏭', label: '电网', value: data.grid, unit: 'kW', color: '#7c3aed' },
    { icon: '🚗', label: '充电桩', value: data.ev, unit: 'kW', color: '#ea580c' },
  ];

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
        <Tag style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#e6342a', borderRadius: 20, fontSize: 12, padding: '2px 12px' }}>
          ● 实时拓扑
        </Tag>
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

      {/* Topology */}
      <Card
        style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: '28px 24px' } }}
      >
        {/* Legend */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Space size={6}>
            <div style={{ width: 28, height: 3, background: '#d97706', borderRadius: 2, position: 'relative' }}>
              <div style={{ position: 'absolute', right: -4, top: -3, width: 0, height: 0, borderLeft: '7px solid #d97706', borderTop: '4px solid transparent', borderBottom: '4px solid transparent' }} />
            </div>
            <span style={{ fontSize: 11, color: '#4a5568', fontWeight: 600 }}>电力流</span>
          </Space>
          <Space size={6}>
            <div style={{ width: 28, height: 3, background: '#2563eb', borderRadius: 2, borderTop: '3px dashed #2563eb', background: 'transparent' }} />
            <span style={{ fontSize: 11, color: '#4a5568', fontWeight: 600 }}>信息流</span>
          </Space>
          <Space size={6}>
            <div style={{ width: 28, height: 3, background: '#16a34a', borderRadius: 2, position: 'relative' }}>
              <div style={{ position: 'absolute', left: -4, top: -3, width: 0, height: 0, borderRight: '7px solid #16a34a', borderTop: '4px solid transparent', borderBottom: '4px solid transparent' }} />
              <div style={{ position: 'absolute', right: -4, top: -3, width: 0, height: 0, borderLeft: '7px solid #16a34a', borderTop: '4px solid transparent', borderBottom: '4px solid transparent' }} />
            </div>
            <span style={{ fontSize: 11, color: '#4a5568', fontWeight: 600 }}>双向充放电</span>
          </Space>
        </div>

        {/* Main topology: 5 nodes in a clean H-layout */}
        {/* Grid: row1=solar center, row2=PCS|battery|grid|EV spread */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
          gridTemplateRows: 'auto auto',
          gap: '0 0',
          alignItems: 'center',
          maxWidth: 860,
          margin: '0 auto',
        }}>
          {/* ── ROW 1: Solar (centered across cols 2-4) ── */}
          <div /> {/* col 1 empty */}
          {/* Solar node — spans visually through gap space */}
          <div style={{ gridColumn: '2 / 4', gridRow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingBottom: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#fff', border: '2px solid #d97706',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, boxShadow: '0 4px 12px rgba(217,119,6,0.15)',
            }}>☀️</div>
            <span style={{ fontSize: 13, color: '#4a5568', fontWeight: 600 }}>光伏</span>
            <span style={{ fontSize: 13, color: '#d97706', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{data.solar} kW</span>
            <StatusBadge label="" status="online" />
          </div>
          <div /> {/* col 4 empty */}
          <div /> {/* col 5 empty */}

          {/* ── FLOW ARROWS: Solar → PCS (down-left) ── */}
          <div style={{ gridColumn: '2', gridRow: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', paddingRight: 8, paddingBottom: 4 }}>
            <FlowArrow direction="right-down" label="DC" color="#d97706" />
          </div>
          <div /> {/* col 3 empty (solar spans 2-3) */}
          <div /> {/* col 4 empty */}
          <div /> {/* col 5 empty */}

          {/* ── ROW 2: PCS | Battery | Grid | EV ── */}
          {/* PCS */}
          <div style={{ gridColumn: '1', gridRow: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingTop: 8 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff', border: '2px solid #2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 4px 12px rgba(37,99,235,0.12)' }}>⚡</div>
            <span style={{ fontSize: 13, color: '#4a5568', fontWeight: 600 }}>PCS</span>
            <span style={{ fontSize: 13, color: '#2563eb', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{data.pcs} kW</span>
            <StatusBadge label="" status="online" />
            <div style={{ fontSize: 10, color: '#93c5fd', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 4, padding: '1px 6px', marginTop: 2 }}>EMS采集</div>
          </div>

          {/* Flow: PCS ↔ Battery (bidirectional) */}
          <div style={{ gridColumn: '1 / 3', gridRow: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0 }}>
            <FlowArrow direction="right" label="充电" color="#16a34a" />
            <div style={{ width: 8 }} />
            <FlowArrow direction="left" color="#16a34a" />
          </div>

          {/* Battery */}
          <div style={{ gridColumn: '3', gridRow: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingTop: 8 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff', border: '2px solid #e6342a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 4px 12px rgba(230,52,42,0.12)' }}>🔋</div>
            <span style={{ fontSize: 13, color: '#4a5568', fontWeight: 600 }}>储能</span>
            <span style={{ fontSize: 13, color: '#e6342a', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{data.battery} %</span>
            <StatusBadge label="" status="online" />
          </div>

          {/* Flow: PCS → Grid */}
          <div style={{ gridColumn: '3 / 5', gridRow: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <FlowArrow direction="right" label="AC 400V" color="#d97706" />
          </div>

          {/* Grid */}
          <div style={{ gridColumn: '4', gridRow: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingTop: 8 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff', border: '2px solid #7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 4px 12px rgba(124,58,237,0.12)' }}>🏭</div>
            <span style={{ fontSize: 13, color: '#4a5568', fontWeight: 600 }}>电网</span>
            <span style={{ fontSize: 13, color: '#7c3aed', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{data.grid} kW</span>
            <StatusBadge label="" status="online" />
          </div>

          {/* Flow: PCS → EV */}
          <div style={{ gridColumn: '4 / 6', gridRow: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <FlowArrow direction="right" label="AC 380V" color="#d97706" />
          </div>

          {/* EV */}
          <div style={{ gridColumn: '5', gridRow: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingTop: 8 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff', border: '2px solid #ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 4px 12px rgba(234,88,12,0.12)' }}>🚗</div>
            <span style={{ fontSize: 13, color: '#4a5568', fontWeight: 600 }}>充电桩</span>
            <span style={{ fontSize: 13, color: '#ea580c', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{data.ev} kW</span>
            <StatusBadge label="" status="online" />
          </div>
        </div>

        {/* Info flow strip (dashed blue arrows at bottom) */}
        <div style={{
          marginTop: 24, padding: '10px 20px',
          background: '#f8fafc', border: '1px solid #e8eaed',
          borderRadius: 10, textAlign: 'center',
        }}>
          <div style={{ fontSize: 10, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 700 }}>
            📡 信息流（数据采集）
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            {['☀️ 光伏', '⚡ PCS', '🔋 储能', '🏭 电网', '🚗 充电桩'].map((n, i) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#4a5568' }}>
                <span>{n}</span>
                {i < 4 && <span style={{ color: '#93c5fd', fontSize: 14 }}>⟶</span>}
              </div>
            ))}
            <div style={{ width: 1, height: 16, background: '#e8eaed', margin: '0 4px' }} />
            <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 700 }}>⟶ EMS系统</span>
            <span style={{ fontSize: 12, color: '#93c5fd' }}>⟶</span>
            <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 700 }}>云端平台</span>
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
