import { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Space, Tag } from 'antd';
import { useParams } from 'react-router-dom';
import { stationApi } from '../services/api';

const { Text, Title } = Typography;

function StatusDot({ status }: { status: 'online' | 'warning' | 'offline' }) {
  const colors = { online: '#16a34a', warning: '#d97706', offline: '#b8c0cc' };
  const c = colors[status] || colors.offline;
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block', boxShadow: status === 'online' ? `0 0 6px ${c}` : 'none' }} />;
}

// Node card: a round icon + label + value + status
function NodeCard({ icon, label, value, unit, color, badge }: {
  icon: string; label: string; value: number | string; unit: string; color: string; badge?: string;
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      padding: '12px 8px', borderRadius: 14,
      background: '#fff',
      border: `1.5px solid ${color}30`,
      boxShadow: `0 2px 8px ${color}15`,
      minWidth: 96,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: `${color}12`,
        border: `2px solid ${color}50`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24,
      }}>
        {icon}
      </div>
      <span style={{ fontSize: 11, color: '#8896a6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 10, color: '#b8c0cc', fontFamily: 'JetBrains Mono, monospace' }}>{unit}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <StatusDot status="online" />
        <span style={{ fontSize: 10, color: '#8896a6' }}>{badge || '在线'}</span>
      </div>
    </div>
  );
}

// Animated arrow with moving dot and power label
function FlowLine({ label, power, color, direction = 'right', dash = false }: {
  label?: string; power?: string; color?: string; direction?: 'h' | 'v'; dash?: boolean;
}) {
  const c = color || '#d97706';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      {label && (
        <div style={{
          fontSize: 10, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
          color: c, background: `${c}15`, border: `1px solid ${c}35`,
          borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap',
        }}>
          {label} {power && <span style={{ opacity: 0.7 }}>{power}</span>}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, position: 'relative' }}>
        {/* Line */}
        <div style={{
          width: direction === 'h' ? 36 : 2,
          height: direction === 'v' ? 28 : 2,
          background: dash ? 'transparent' : c,
          borderTop: dash ? `2px dashed ${c}` : `2px solid ${c}`,
          opacity: 0.5,
          position: 'relative',
        }} />
        {/* Arrow head */}
        <div style={{
          width: 0, height: 0,
          borderTop: '5px solid transparent',
          borderBottom: '5px solid transparent',
          borderLeft: `8px solid ${c}`,
          opacity: 0.7,
        }} />
        {/* Animated dot */}
        <div style={{
          position: 'absolute', top: '50%', left: 0,
          transform: 'translateY(-50%)',
          width: 6, height: 6, borderRadius: '50%', background: c,
          animation: 'flowDot 1.8s ease-in-out infinite',
        }} />
      </div>
    </div>
  );
}

// Battery with SOC ring
function BatteryCard({ value, color }: { value: number; color?: string }) {
  const c = color || '#e6342a';
  const r = 26;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - value / 100);
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      padding: '12px 8px', borderRadius: 14,
      background: '#fff',
      border: `1.5px solid ${c}30`,
      boxShadow: `0 2px 8px ${c}15`,
      minWidth: 96,
    }}>
      {/* SOC Ring */}
      <div style={{ position: 'relative', width: 56, height: 56 }}>
        <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="28" cy="28" r={r} fill="none" stroke={`${c}20`} strokeWidth="5" />
          <circle
            cx="28" cy="28" r={r} fill="none" stroke={c} strokeWidth="5"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: c, fontFamily: 'JetBrains Mono, monospace',
        }}>
          {value}%
        </div>
      </div>
      <span style={{ fontSize: 11, color: '#8896a6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>储能</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <StatusDot status="online" />
        <span style={{ fontSize: 10, color: '#8896a6' }}>在线</span>
      </div>
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

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @keyframes flowDot {
          0% { left: 0; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { left: calc(100% - 6px); opacity: 0; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
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
          <Space size={16} wrap>
            <Space size={5}>
              <div style={{ width: 20, height: 2, background: '#d97706', borderRadius: 1, position: 'relative' }}>
                <div style={{ position: 'absolute', right: -3, top: -2, width: 0, height: 0, borderLeft: '6px solid #d97706', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }} />
              </div>
              <span style={{ fontSize: 11, color: '#4a5568' }}>电力流</span>
            </Space>
            <Space size={5}>
              <div style={{ width: 20, height: 2, borderTop: '2px dashed #2563eb' }} />
              <span style={{ fontSize: 11, color: '#4a5568' }}>信息流</span>
            </Space>
            <Space size={5}>
              <div style={{ width: 20, height: 2, background: '#16a34a', borderRadius: 1, position: 'relative' }}>
                <div style={{ position: 'absolute', left: -3, top: -2, width: 0, height: 0, borderRight: '6px solid #16a34a', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }} />
                <div style={{ position: 'absolute', right: -3, top: -2, width: 0, height: 0, borderLeft: '6px solid #16a34a', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }} />
              </div>
              <span style={{ fontSize: 11, color: '#4a5568' }}>双向</span>
            </Space>
          </Space>
        </Space>
      </div>

      {/* Main topology card */}
      <Card
        style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: '32px 24px' } }}
      >
        {/* Row 1: Solar centered */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <NodeCard icon="☀️" label="光伏" value={data.solar} unit="kW" color="#d97706" badge="发电中" />
        </div>

        {/* Flow: Solar → PCS */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <FlowLine label="DC" power={`${data.solar}V`} color="#d97706" direction="v" />
        </div>

        {/* Row 2: PCS ←→ Battery | PCS → Grid | PCS → EV */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 0 }}>
          {/* Battery ← PCS */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <BatteryCard value={data.battery} />
            <div style={{ height: 8 }} />
            <FlowLine label="充电" power={`${data.pcs}kW`} color="#16a34a" direction="h" />
            <div style={{ height: 4 }} />
            <FlowLine color="#16a34a" direction="h" />
          </div>

          {/* PCS */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <NodeCard icon="⚡" label="PCS变流器" value={data.pcs} unit="kW" color="#2563eb" badge="EMS采集" />
            <div style={{ marginTop: 8, fontSize: 10, color: '#93c5fd', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 4, padding: '2px 8px' }}>
              能量管理
            </div>
          </div>

          {/* Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <NodeCard icon="🏭" label="电网" value={data.grid} unit="kW" color="#7c3aed" />
            <div style={{ height: 8 }} />
            <FlowLine label="AC" power={`${data.grid}V`} color="#d97706" direction="h" />
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 60, background: '#e8eaed', margin: '0 12px' }} />

          {/* EV */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <NodeCard icon="🚗" label="充电桩" value={data.ev} unit="kW" color="#ea580c" />
            <div style={{ height: 8 }} />
            <FlowLine label="AC" power={`${data.ev}V`} color="#d97706" direction="h" />
          </div>
        </div>

        {/* Info flow bar */}
        <div style={{
          marginTop: 28, padding: '12px 20px',
          background: '#f8fafc', border: '1px solid #e8eaed',
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 10, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, fontWeight: 800 }}>
            📡 信息采集链路
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, flexWrap: 'wrap' }}>
            {[
              { icon: '☀️', label: '光伏', color: '#d97706' },
              { icon: '⚡', label: 'PCS', color: '#2563eb' },
              { icon: '🔋', label: '储能', color: '#e6342a' },
              { icon: '🏭', label: '电网', color: '#7c3aed' },
              { icon: '🚗', label: '充电桩', color: '#ea580c' },
            ].map((n, i) => (
              <div key={n.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${n.color}15`, border: `1.5px solid ${n.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                  {n.icon}
                </div>
                <span style={{ fontSize: 9, color: '#8896a6', fontWeight: 600 }}>{n.label}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', margin: '0 8px' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ width: 20, height: 2, background: '#93c5fd', opacity: 0.5 + i * 0.1, marginLeft: i === 0 ? 0 : 2 }} />
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', border: '1.5px solid #2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                📺
              </div>
              <span style={{ fontSize: 9, color: '#2563eb', fontWeight: 700 }}>EMS</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', margin: '0 4px', color: '#93c5fd' }}>⟶</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f3e8ff', border: '1.5px solid #7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                ☁️
              </div>
              <span style={{ fontSize: 9, color: '#7c3aed', fontWeight: 700 }}>云端</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Power summary bar */}
      <Card
        size="small"
        style={{ marginTop: 12, background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
        styles={{ body: { padding: '10px 20px', display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' } }}
      >
        <Text style={{ fontSize: 11, color: '#8896a6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>运行状态</Text>
        {[
          { icon: '☀️', label: '光伏', v: `${data.solar} kW`, c: '#d97706' },
          { icon: '⚡', label: 'PCS', v: `${data.pcs} kW`, c: '#2563eb' },
          { icon: '🔋', label: '储能', v: `${data.battery}%`, c: '#e6342a' },
          { icon: '🏭', label: '电网', v: `${data.grid} kW`, c: '#7c3aed' },
          { icon: '🚗', label: '充电桩', v: `${data.ev} kW`, c: '#ea580c' },
        ].map(n => (
          <Space key={n.label} size={6}>
            <StatusDot status="online" />
            <span style={{ fontSize: 12, color: '#4a5568', fontWeight: 600 }}>{n.icon} {n.label}</span>
            <span style={{ fontSize: 12, color: n.c, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{n.v}</span>
          </Space>
        ))}
      </Card>
    </div>
  );
}
