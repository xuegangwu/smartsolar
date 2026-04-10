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

      {/* Topology — CSS grid layout */}
      <Card
        style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: '28px 24px' } }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gridTemplateRows: 'auto auto', gap: 20, maxWidth: 700, margin: '0 auto' }}>
          {/* Solar — top center */}
          <div style={{ gridColumn: '2 / 4', gridRow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
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

          {/* PCS — bottom left */}
          <div style={{ gridColumn: '1', gridRow: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff', border: '2px solid #2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 4px 12px rgba(37,99,235,0.12)' }}>⚡</div>
            <span style={{ fontSize: 13, color: '#4a5568', fontWeight: 600 }}>PCS</span>
            <span style={{ fontSize: 13, color: '#2563eb', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{data.pcs} kW</span>
            <StatusBadge label="" status="online" />
          </div>

          {/* Battery — bottom center-left */}
          <div style={{ gridColumn: '2', gridRow: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff', border: '2px solid #e6342a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 4px 12px rgba(230,52,42,0.12)' }}>🔋</div>
            <span style={{ fontSize: 13, color: '#4a5568', fontWeight: 600 }}>储能</span>
            <span style={{ fontSize: 13, color: '#e6342a', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{data.battery} %</span>
            <StatusBadge label="" status="online" />
          </div>

          {/* Grid — bottom center-right */}
          <div style={{ gridColumn: '3', gridRow: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff', border: '2px solid #7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 4px 12px rgba(124,58,237,0.12)' }}>🏭</div>
            <span style={{ fontSize: 13, color: '#4a5568', fontWeight: 600 }}>电网</span>
            <span style={{ fontSize: 13, color: '#7c3aed', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{data.grid} kW</span>
            <StatusBadge label="" status="online" />
          </div>

          {/* EV — bottom right */}
          <div style={{ gridColumn: '4', gridRow: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff', border: '2px solid #ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 4px 12px rgba(234,88,12,0.12)' }}>🚗</div>
            <span style={{ fontSize: 13, color: '#4a5568', fontWeight: 600 }}>充电桩</span>
            <span style={{ fontSize: 13, color: '#ea580c', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{data.ev} kW</span>
            <StatusBadge label="" status="online" />
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
