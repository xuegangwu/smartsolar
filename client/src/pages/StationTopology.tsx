import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Row, Col, Typography, Switch, Spin, Space, Tag, message } from 'antd';
import { useParams } from 'react-router-dom';
import { stationApi } from '../services/api';

const { Text, Title } = Typography;

// ─── Color Palette ─────────────────────────────────────────────────────────
const C = {
  solar: '#f59e0b',
  battery: '#2dd4bf',
  pcs: '#3b82f6',
  grid: '#8b5cf6',
  ev: '#f97316',
  bg: '#0c1220',
  text: '#94a3b8',
  textDim: '#334155',
};

// ─── Animated Canvas Topology ─────────────────────────────────────────────
function TopologyCanvas({ data, width = 680, height = 360 }: {
  data: { solarPower: number; batterySOC: number; pcsPower: number; gridPower: number; evPower: number; solarStatus: string; batteryStatus: string; pcsStatus: string; gridStatus: string; evStatus: string };
  width?: number; height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const phaseRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // ── Grid ──
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // ── Node positions ──
    const nodes: Array<{
      x: number; y: number; label: string; value: number; unit: string;
      color: string; status: string; icon: string; size: number;
    }> = [
      { x: width / 2, y: 60, label: '光伏', value: data.solarPower, unit: 'kW', color: C.solar, status: data.solarStatus, icon: '☀️', size: 52 },
      { x: width / 2 - 120, y: 210, label: 'PCS', value: data.pcsPower, unit: 'kW', color: C.pcs, status: data.pcsStatus, icon: '⚡', size: 48 },
      { x: width / 2 + 120, y: 210, label: '储能', value: data.batterySOC, unit: '%', color: C.battery, status: data.batteryStatus, icon: '🔋', size: 48 },
      { x: width / 2, y: 320, label: '电网', value: Math.abs(data.gridPower), unit: 'kW', color: C.grid, status: data.gridStatus, icon: '🏭', size: 52 },
      { x: width - 90, y: 120, label: '充电桩', value: data.evPower, unit: 'kW', color: C.ev, status: data.evStatus, icon: '🚗', size: 44 },
    ];

    // ── Draw flows ──
    const flows: Array<[number, number, number, number, string, number]> = [
      [width/2, 60+26, width/2-120, 210-24, C.solar, data.solarPower],
      [width/2, 60+26, width/2+120, 210-24, C.solar, data.solarPower],
      [width/2-120, 210+24, width/2, 320-26, C.pcs, data.pcsPower],
      [width/2+120, 210+24, width/2, 320+10, C.battery, data.batterySOC/20],
      [width/2-120, 210, width-90-24, 120, C.ev, data.evPower],
    ];

    phaseRef.current += 0.03;
    const phase = phaseRef.current;

    flows.forEach(([x1, y1, x2, y2, color, flow]) => {
      if (flow <= 0) return;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;

      // Flow dashes
      const speed = Math.min(flow / 200, 1);
      const dashLen = 8 + speed * 12;
      const gapLen = 6 + speed * 6;
      const offset = (phase * 20 * speed) % (dashLen + gapLen);

      ctx.save();
      ctx.setLineDash([dashLen, gapLen]);
      ctx.lineDashOffset = -offset;
      ctx.strokeStyle = color + '60';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();

      // Animated particles along line
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.sqrt(dx*dx + dy*dy);
      const nx = dx / len, ny = dy / len;
      for (let i = 0; i < 3; i++) {
        const t = ((phase * 0.5 + i * 0.33) % 1);
        const px = x1 + nx * t * len;
        const py = y1 + ny * t * len;
        const alpha = Math.sin(t * Math.PI);
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = color + Math.floor(alpha * 180).toString(16).padStart(2, '0');
        ctx.fill();
      }

      // Mid label
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(Math.round(flow) + (flow > 100 ? 'kW' : ''), mx + (ny < 0 ? 12 : -12), my);
    });

    // ── Draw nodes ──
    nodes.forEach(n => {
      const sc = n.status === 'online' ? n.color : n.status === 'warning' ? '#fbbf24' : C.textDim;
      const glow = n.status === 'offline' ? 0 : 8;

      // Outer glow
      if (glow > 0) {
        const grd = ctx.createRadialGradient(n.x, n.y, n.size, n.x, n.y, n.size + glow + 8);
        grd.addColorStop(0, sc + '40');
        grd.addColorStop(1, sc + '00');
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size + glow + 8, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      // Circle bg
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
      ctx.fillStyle = '#111827';
      ctx.fill();
      ctx.strokeStyle = sc;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Icon
      ctx.font = `${Math.round(n.size * 0.55)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.icon, n.x, n.y);

      // Label
      ctx.font = '500 11px Inter, sans-serif';
      ctx.fillStyle = C.text;
      ctx.textBaseline = 'top';
      ctx.fillText(n.label, n.x, n.y + n.size + 6);

      // Value
      ctx.font = `700 11px JetBrains Mono, monospace`;
      ctx.fillStyle = n.color;
      ctx.textBaseline = 'top';
      ctx.fillText(`${Math.round(n.value)}${n.unit}`, n.x, n.y + n.size + 20);
    });

    // ── Energy flow text ──
    ctx.font = '500 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillText('直流侧', width/2 - 30, 140);
    ctx.fillText('交流侧', width/2 - 30, 270);

    animRef.current = requestAnimationFrame(draw);
  }, [data, width, height]);

  useEffect(() => {
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', borderRadius: 12, background: C.bg }}
    />
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KPICard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <Card
      size="small"
      style={{
        background: 'rgba(17,24,39,0.6)',
        border: `1px solid ${color}25`,
        borderRadius: 12,
        textAlign: 'center',
      }}
      styles={{ body: { padding: '12px 8px' } }}
    >
      <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
        {value}
        <span style={{ fontSize: 12, marginLeft: 2, color: '#64748b' }}>{unit}</span>
      </div>
    </Card>
  );
}

// ─── Live Data (simulated) ─────────────────────────────────────────────────
function useLiveData(station: any) {
  const [data, setData] = useState({
    solarPower: 847, batterySOC: 75, pcsPower: 320,
    gridPower: -120, evPower: 45,
    solarStatus: 'online', batteryStatus: 'online',
    pcsStatus: 'online', gridStatus: 'online', evStatus: 'online',
  });

  useEffect(() => {
    const t = setInterval(() => {
      setData(d => ({
        ...d,
        solarPower: 847 + Math.random() * 50,
        batterySOC: Math.min(100, Math.max(20, d.batterySOC + (Math.random() - 0.5) * 2)),
        pcsPower: 320 + Math.random() * 30,
        gridPower: -120 + Math.random() * 40,
        evPower: 45 + Math.random() * 20,
        evStatus: Math.random() > 0.85 ? 'warning' : 'online',
      }));
    }, 5000);
    return () => clearInterval(t);
  }, []);

  return data;
}

// ─── Main ─────────────────────────────────────────────────────────────────
export default function StationTopology() {
  const { id } = useParams();
  const [station, setStation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showFlow, setShowFlow] = useState(true);

  useEffect(() => {
    if (!id) return;
    stationApi.getAll().then(r => {
      if (r.success) {
        const s = r.data.find((s: any) => s._id === id);
        setStation(s);
        setLoading(false);
      }
    });
  }, [id]);

  const liveData = useLiveData(station);

  if (loading) {
    return (
      <div style={{ padding: 80, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!station) {
    return (
      <Card style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }}>
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontFamily: 'Inter, sans-serif' }}>
          未找到该电站
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#f1f5f9', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
            ⚡ {station.name}
          </Title>
          <Text style={{ fontSize: 12, color: '#64748b', fontFamily: 'Inter, sans-serif' }}>
            {station.location} · 装机 {station.capacity || station.installedCapacity || 0}MW
          </Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Space>
            <Text style={{ fontSize: 12, color: '#64748b', fontFamily: 'Inter, sans-serif' }}>功率流向</Text>
            <Switch checked={showFlow} onChange={v => setShowFlow(v)} size="small" />
          </Space>
          <Tag style={{
            background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.25)',
            color: '#2dd4bf', fontFamily: 'Inter, sans-serif', fontSize: 11, borderRadius: 20,
          }}>
            ● {showFlow ? '实时数据' : '静态拓扑'}
          </Tag>
        </div>
      </div>

      {/* KPIs */}
      <Row gutter={[10, 10]}>
        {[
          { label: '光伏出力', value: Math.round(liveData.solarPower), unit: 'kW', color: C.solar },
          { label: '电池SOC', value: Math.round(liveData.batterySOC), unit: '%', color: C.battery },
          { label: 'PCS功率', value: Math.round(liveData.pcsPower), unit: 'kW', color: C.pcs },
          { label: '电网交互', value: Math.round(Math.abs(liveData.gridPower)), unit: 'kW', color: C.grid },
          { label: '充电桩', value: Math.round(liveData.evPower), unit: 'kW', color: C.ev },
        ].map(kpi => (
          <Col xs={12} sm={8} md={4} key={kpi.label}>
            <KPICard {...kpi} />
          </Col>
        ))}
      </Row>

      {/* Topology Canvas */}
      <Card
        style={{
          background: 'rgba(12,18,32,0.8)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16,
          backdropFilter: 'blur(8px)',
        }}
        styles={{ body: { padding: 16 } }}
      >
        <TopologyCanvas data={showFlow ? liveData : { ...liveData, solarPower: 1000, batterySOC: 80, pcsPower: 500, gridPower: -500, evPower: 120, evStatus: 'online' }} width={680} height={380} />
      </Card>

      {/* Status row */}
      <Card
        size="small"
        style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12 }}
        styles={{ body: { padding: '10px 16px' } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
          <Text style={{ color: '#64748b', fontSize: 11, fontWeight: 500, textTransform: 'uppercase' }}>设备状态</Text>
          {[
            { label: '光伏', status: liveData.solarStatus, color: C.solar },
            { label: '储能', status: liveData.batteryStatus, color: C.battery },
            { label: 'PCS', status: liveData.pcsStatus, color: C.pcs },
            { label: '电网', status: liveData.gridStatus, color: C.grid },
            { label: '充电桩', status: liveData.evStatus, color: C.ev },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.status === 'online' ? '#34d399' : s.status === 'warning' ? '#fbbf24' : '#334155', boxShadow: s.status !== 'offline' ? `0 0 6px ${s.status === 'online' ? '#34d399' : '#fbbf24'}` : 'none' }} />
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>{s.label}</Text>
              <Text style={{ color: s.status === 'online' ? '#34d399' : s.status === 'warning' ? '#fbbf24' : '#334155', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
                {s.status === 'online' ? '在线' : s.status === 'warning' ? '告警' : '离线'}
              </Text>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
