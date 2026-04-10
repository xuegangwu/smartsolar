import { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Space, Tag } from 'antd';
import { useParams } from 'react-router-dom';
import { stationApi } from '../services/api';

const { Text, Title } = Typography;

function StatusDot({ color }: { color: string }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: color, marginRight: 6,
      boxShadow: color !== '#b8c0cc' ? `0 0 6px ${color}` : 'none',
    }} />
  );
}

// Plain CSS-only topology — no Canvas, no SVG, no Three.js
export default function StationTopology() {
  const { id } = useParams();
  const [station, setStation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    stationApi.getAll().then(r => {
      if (r.success) {
        const s = r.data.find((s: any) => s._id === id);
        setStation(s);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <div style={{ padding: 80, textAlign: 'center', color: '#8896a6', fontFamily: 'Inter, sans-serif' }}>加载中...</div>;
  }

  if (!station) {
    return <Card style={{ background: '#ffffff', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 40, textAlign: 'center', color: '#8896a6' }}>未找到该电站</Card>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#1a1a2e', fontWeight: 700 }}>
            ⚡ {station.name}
          </Title>
          <Text style={{ fontSize: 12, color: '#8896a6' }}>
            {station.location} · 装机 {station.capacity || station.installedCapacity || 0}MW
          </Text>
        </div>
        <Tag style={{ background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.25)', color: '#e6342a', borderRadius: 20, fontSize: 11 }}>
          ● 实时拓扑
        </Tag>
      </div>

      {/* 5 KPI cards */}
      <Row gutter={[10, 10]}>
        {[
          { label: '光伏出力', value: '847', unit: 'kW', color: '#f59e0b' },
          { label: '电池SOC', value: '75', unit: '%', color: '#e6342a' },
          { label: 'PCS功率', value: '320', unit: 'kW', color: '#3b82f6' },
          { label: '电网交互', value: '120', unit: 'kW', color: '#8b5cf6' },
          { label: '充电桩', value: '45', unit: 'kW', color: '#f97316' },
        ].map(kpi => (
          <Col xs={12} sm={8} md={4} key={kpi.label}>
            <Card size="small" style={{ background: '#ffffff', border: `1px solid ${kpi.color}25`, borderRadius: 12, textAlign: 'center' }} styles={{ body: { padding: '12px 8px' } }}>
              <div style={{ fontSize: 10, color: '#8896a6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{kpi.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{kpi.value}<span style={{ fontSize: 12, color: '#8896a6', marginLeft: 2 }}>{kpi.unit}</span></div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Topology — pure CSS grid, no Canvas/SVG/Three.js */}
      <Card style={{ background: '#f5f6f8', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }} styles={{ body: { padding: 24 } }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: 'auto auto', gap: 16, maxWidth: 600, margin: '0 auto' }}>
          {/* Solar — top center */}
          <div style={{ gridColumn: '2', gridRow: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#ffffff', border: '2px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: '0 0 16px rgba(245,158,11,0.3)' }}>☀️</div>
            <div style={{ fontSize: 12, color: '#4a5568', fontWeight: 600 }}>光伏</div>
            <div style={{ fontSize: 11, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>847kW</div>
            <StatusDot color="#34d399" /><span style={{ fontSize: 10, color: '#8896a6' }}>在线</span>
          </div>

          {/* PCS — bottom left */}
          <div style={{ gridColumn: '1', gridRow: '2', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#ffffff', border: '2px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 0 16px rgba(59,130,246,0.3)' }}>⚡</div>
            <div style={{ fontSize: 12, color: '#4a5568', fontWeight: 600 }}>PCS</div>
            <div style={{ fontSize: 11, color: '#3b82f6', fontFamily: 'JetBrains Mono, monospace' }}>320kW</div>
            <StatusDot color="#34d399" /><span style={{ fontSize: 10, color: '#8896a6' }}>在线</span>
          </div>

          {/* Battery — bottom center */}
          <div style={{ gridColumn: '2', gridRow: '2', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#ffffff', border: '2px solid #e6342a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 0 16px rgba(45,212,191,0.3)' }}>🔋</div>
            <div style={{ fontSize: 12, color: '#4a5568', fontWeight: 600 }}>储能</div>
            <div style={{ fontSize: 11, color: '#e6342a', fontFamily: 'JetBrains Mono, monospace' }}>75%</div>
            <StatusDot color="#34d399" /><span style={{ fontSize: 10, color: '#8896a6' }}>在线</span>
          </div>

          {/* Grid — bottom right */}
          <div style={{ gridColumn: '3', gridRow: '2', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#ffffff', border: '2px solid #8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 0 16px rgba(139,92,246,0.3)' }}>🏭</div>
            <div style={{ fontSize: 12, color: '#4a5568', fontWeight: 600 }}>电网</div>
            <div style={{ fontSize: 11, color: '#8b5cf6', fontFamily: 'JetBrains Mono, monospace' }}>120kW</div>
            <StatusDot color="#34d399" /><span style={{ fontSize: 10, color: '#8896a6' }}>并网</span>
          </div>
        </div>
      </Card>

      {/* Status bar */}
      <Card size="small" style={{ background: '#ffffff', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12 }} styles={{ body: { padding: '10px 16px' } }}>
        <div style={{ display: 'flex', gap: 20, fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
          {[
            { label: '光伏', color: '#f59e0b', status: '在线' },
            { label: 'PCS', color: '#3b82f6', status: '在线' },
            { label: '储能', color: '#e6342a', status: '在线' },
            { label: '电网', color: '#8b5cf6', status: '并网' },
            { label: '充电桩', color: '#f97316', status: '在线' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <StatusDot color={s.status === '在线' ? '#34d399' : s.status === '并网' ? '#8b5cf6' : '#fbbf24'} />
              <Text style={{ fontSize: 12, color: '#4a5568' }}>{s.label}</Text>
              <Text style={{ fontSize: 11, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.status}</Text>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
