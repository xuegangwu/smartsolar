import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, Typography, Tag, Button, Badge, Empty, Space } from 'antd';
import { EnvironmentOutlined, AppstoreOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { stationApi } from '../services/api';

const { Title, Text } = Typography;

interface StationLocation { address: string; lat: number; lng: number; }
interface Station {
  _id: string; name: string; type: string; location: StationLocation;
  capacity: number; installedCapacity: number; peakPower: number;
  status: string; owner: string; gridConnectionDate?: string; createdAt?: string;
}

const TYPE_COLOR: Record<string, string> = { solar: '#d97706', storage: '#e6342a', solar_storage: '#16a34a' };
const TYPE_TEXT: Record<string, string> = { solar: '光伏', storage: '储能', solar_storage: '光储一体' };
const STATUS_TEXT: Record<string, string> = { online: '在线', offline: '离线', maintenance: '维护中' };
const STATUS_COLOR: Record<string, string> = { online: '#16a34a', offline: '#b8c0cc', maintenance: '#d97706' };

function formatCap(cap: number) {
  return cap >= 1000 ? `${(cap / 1000).toFixed(1)} MW` : `${cap} kW`;
}

// Equirectangular projection: lat/lng → canvas x/y
function project(lat: number, lng: number, w: number, h: number) {
  return {
    x: ((lng + 180) / 360) * w,
    y: ((90 - lat) / 180) * h,
  };
}

function WorldMapCanvas({
  stations,
  selected,
  onSelect,
  hovered,
  onHover,
}: {
  stations: Station[];
  selected: Station | null;
  onSelect: (s: Station) => void;
  hovered: string | null;
  onHover: (id: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 900, h: 450 });

  // Draw world map on canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h } = dims;

    ctx.clearRect(0, 0, w, h);

    // Background gradient (ocean)
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1a3a5c');
    grad.addColorStop(1, '#0d2137');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(100,150,200,0.15)';
    ctx.lineWidth = 0.5;
    // Latitude lines
    for (let lat = -60; lat <= 80; lat += 20) {
      const { y } = project(lat, 0, w, h);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // Longitude lines
    for (let lng = -180; lng <= 180; lng += 30) {
      const { x } = project(0, lng, w, h);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Equator and prime meridian (emphasized)
    ctx.strokeStyle = 'rgba(100,150,200,0.35)';
    ctx.lineWidth = 1;
    const eq = project(0, 0, w, h);
    const pm = project(0, 0, w, h);
    ctx.beginPath(); ctx.moveTo(0, eq.y); ctx.lineTo(w, eq.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pm.x, 0); ctx.lineTo(pm.x, h); ctx.stroke();

    // Simplified continent outlines (major landmasses as ellipses/rects for visual reference)
    // North America
    ctx.fillStyle = 'rgba(60,90,60,0.6)';
    ctx.strokeStyle = 'rgba(80,120,80,0.4)';
    ctx.lineWidth = 1;
    const drawEllipse = (cx: number, cy: number, rx: number, ry: number) => {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    };
    // Use lat/lng → canvas for continent approximations
    const na = { cx: project(45, -100, w, h), rx: 120, ry: 60 };
    drawEllipse(na.cx.x, na.cx.y, na.rx, na.ry);

    // South America
    const sa = { cx: project(-5, -60, w, h), rx: 50, ry: 90 };
    drawEllipse(sa.cx.x, sa.cx.y, sa.rx, sa.ry);

    // Europe
    const eu = { cx: project(50, 15, w, h), rx: 60, ry: 35 };
    drawEllipse(eu.cx.x, eu.cx.y, eu.rx, eu.ry);

    // Africa
    const af = { cx: project(5, 20, w, h), rx: 65, ry: 90 };
    drawEllipse(af.cx.x, af.cx.y, af.rx, af.ry);

    // Asia (large)
    const as_ = { cx: project(35, 90, w, h), rx: 200, ry: 70 };
    drawEllipse(as_.cx.x, as_.cx.y, as_.rx, as_.ry);

    // Southeast Asia / Indonesia
    const sea = { cx: project(0, 110, w, h), rx: 70, ry: 40 };
    drawEllipse(sea.cx.x, sea.cx.y, sea.rx, sea.ry);

    // Australia
    const au = { cx: project(-25, 135, w, h), rx: 50, ry: 35 };
    drawEllipse(au.cx.x, au.cx.y, au.rx, au.ry);

    // Greenland
    const gl = { cx: project(72, -42, w, h), rx: 28, ry: 35 };
    drawEllipse(gl.cx.x, gl.cx.y, gl.rx, gl.ry);

    // Japan/Korea
    const jk = { cx: project(38, 135, w, h), rx: 25, ry: 30 };
    drawEllipse(jk.cx.x, jk.cx.y, jk.rx, jk.ry);

    // UK
    const uk = { cx: project(54, -2, w, h), rx: 12, ry: 18 };
    drawEllipse(uk.cx.x, uk.cx.y, uk.rx, uk.ry);

    // Taiwan
    const tw = project(23.5, 121, w, h);
    ctx.fillStyle = 'rgba(60,90,60,0.6)';
    ctx.beginPath();
    ctx.ellipse(tw.x, tw.y, 5, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Latitude labels
    ctx.fillStyle = 'rgba(100,150,200,0.4)';
    ctx.font = '10px Inter, sans-serif';
    for (let lat = -60; lat <= 80; lat += 30) {
      const { y } = project(lat, -175, w, h);
      ctx.fillText(`${lat > 0 ? lat + '°N' : Math.abs(lat) + '°S'}`, 4, y + 3);
    }
    for (let lng = -150; lng <= 150; lng += 30) {
      const { x, y } = project(0, lng, w, h);
      ctx.fillText(`${lng > 0 ? lng + '°E' : Math.abs(lng) + '°W'}`, x - 12, h - 4);
    }

    // Station markers
    const geoStations = stations.filter(s => s.location?.lat && s.location?.lng && s.location.lat !== 0);
    geoStations.forEach(s => {
      const { x, y } = project(s.location.lat, s.location.lng, w, h);
      const color = TYPE_COLOR[s.type] || '#8896a6';
      const sc = STATUS_COLOR[s.status] || '#b8c0cc';
      const cap = s.capacity || s.installedCapacity || s.peakPower || 0;
      const r = cap >= 1000 ? 8 : cap >= 500 ? 6 : 5;
      const isSelected = selected?._id === s._id;
      const isHovered = hovered === s._id;
      const isOnline = s.status === 'online';

      // Glow for selected/hovered
      if (isSelected || isHovered) {
        const glowR = isSelected ? r * 3.5 : r * 2.5;
        const grd = ctx.createRadialGradient(x, y, r, x, y, glowR);
        grd.addColorStop(0, `${color}60`);
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(x, y, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pulse ring for online
      if (isOnline && !isSelected) {
        ctx.strokeStyle = `${color}50`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        // Just draw a static faint ring (animated pulse via CSS on a separate element)
        ctx.beginPath();
        ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Marker circle
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = color;
      ctx.lineWidth = isSelected || isHovered ? 3 : 2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner dot
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // Draw connector line to edge if near border
      if (x < r * 2 || x > w - r * 2 || y < r * 2 || y > h - r * 2) {
        const mx = Math.max(r, Math.min(w - r, x));
        const my = Math.max(r, Math.min(h - r, y));
        ctx.strokeStyle = `${color}40`;
        ctx.lineWidth = 0.8;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(mx, my);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  }, [stations, selected, hovered, dims]);

  // Redraw on changes
  useEffect(() => { draw(); }, [draw]);

  // Resize observer
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        const { width } = entry.contentRect;
        const h = Math.round(width / 2);
        setDims({ w: Math.round(width), h });
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Handle click
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = dims.w / rect.width;
    const scaleY = dims.h / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const geoStations = stations.filter(s => s.location?.lat && s.location?.lng && s.location.lat !== 0);
    for (const s of geoStations) {
      const { x, y } = project(s.location.lat, s.location.lng, dims.w, dims.h);
      const cap = s.capacity || s.installedCapacity || s.peakPower || 0;
      const r = cap >= 1000 ? 8 : cap >= 500 ? 6 : 5;
      const dist = Math.sqrt((mx - x) ** 2 + (my - y) ** 2);
      if (dist <= r * 2) {
        onSelect(s);
        return;
      }
    }
    onSelect(null);
  }, [stations, dims, onSelect]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', borderRadius: 12, overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        width={dims.w}
        height={dims.h}
        onClick={handleClick}
        onMouseMove={e => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const scaleX = dims.w / rect.width;
          const scaleY = dims.h / rect.height;
          const mx = (e.clientX - rect.left) * scaleX;
          const my = (e.clientY - rect.top) * scaleY;
          const geoStations = stations.filter(s => s.location?.lat && s.location?.lng && s.location.lat !== 0);
          for (const s of geoStations) {
            const { x, y } = project(s.location.lat, s.location.lng, dims.w, dims.h);
            const cap = s.capacity || s.installedCapacity || s.peakPower || 0;
            const r = cap >= 1000 ? 8 : cap >= 500 ? 6 : 5;
            const dist = Math.sqrt((mx - x) ** 2 + (my - y) ** 2);
            if (dist <= r * 2) { onHover(s._id); return; }
          }
          onHover(null);
        }}
        onMouseLeave={() => onHover(null)}
        style={{
          width: '100%', height: 'auto', display: 'block', cursor: 'crosshair',
          borderRadius: '12px',
        }}
      />

      {/* Hover tooltip */}
      {hovered && (() => {
        const s = stations.find(st => st._id === hovered);
        if (!s) return null;
        const { x, y } = project(s.location.lat, s.location.lng, dims.w, dims.h);
        const color = TYPE_COLOR[s.type] || '#8896a6';
        const cap = s.capacity || s.installedCapacity || s.peakPower || 0;
        return (
          <div style={{
            position: 'absolute',
            left: `${(x / dims.w) * 100}%`,
            top: `${(y / dims.h) * 100}%`,
            transform: 'translate(-50%, -110%)',
            background: '#fff', border: `1.5px solid ${color}50`,
            borderRadius: 10, padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            zIndex: 10, pointerEvents: 'none', minWidth: 160,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e', marginBottom: 3 }}>{s.name}</div>
            <div style={{ fontSize: 11, color: '#8896a6', marginBottom: 4 }}>{s.location?.address || '地址未知'}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <Tag style={{ fontSize: 10, padding: '0 5px', background: `${color}15`, color, borderColor: `${color}40` }}>{TYPE_TEXT[s.type]}</Tag>
              <Tag style={{ fontSize: 10, padding: '0 5px', background: `${STATUS_COLOR[s.status]}15`, color: STATUS_COLOR[s.status], borderColor: `${STATUS_COLOR[s.status]}40` }}>{STATUS_TEXT[s.status]}</Tag>
            </div>
            <div style={{ fontSize: 12, color: '#e6342a', fontWeight: 700, fontFamily: 'monospace', marginTop: 4 }}>{formatCap(cap)}</div>
          </div>
        );
      })()}

      {/* Map legend */}
      <div style={{
        position: 'absolute', bottom: 10, right: 10,
        background: 'rgba(13,33,55,0.88)', border: '1px solid rgba(100,150,200,0.2)',
        borderRadius: 10, padding: '8px 12px', backdropFilter: 'blur(8px)',
      }}>
        <div style={{ fontSize: 10, color: 'rgba(100,150,200,0.7)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>图例</div>
        {[{ type: 'solar', icon: '☀️' }, { type: 'solar_storage', icon: '⚡' }, { type: 'storage', icon: '🔋' }].map(t => (
          <div key={t.type} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fff', border: `2px solid ${TYPE_COLOR[t.type]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8 }}>{t.icon}</div>
            <span style={{ fontSize: 11, color: 'rgba(200,220,240,0.9)' }}>{TYPE_TEXT[t.type]}</span>
          </div>
        ))}
        <div style={{ marginTop: 6, borderTop: '1px solid rgba(100,150,200,0.2)', paddingTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', border: '1.5px dashed rgba(22,163,74,0.6)' }} />
            <span style={{ fontSize: 11, color: 'rgba(200,220,240,0.9)' }}>在线</span>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(100,150,200,0.6)', marginTop: 2 }}>底图: 深色海洋 + 大陆轮廓</div>
        </div>
      </div>
    </div>
  );
}

export default function StationMap() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Station | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [totalCapacity, setTotalCapacity] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    stationApi.getAll().then((r: any) => {
      if (r.success) {
        setStations(r.data);
        const geo = r.data.filter((s: Station) => s.location?.lat && s.location?.lng && s.location.lat !== 0);
        setTotalCapacity(geo.reduce((sum: number, s: Station) => sum + (s.capacity || s.installedCapacity || s.peakPower || 0), 0));
        setOnlineCount(geo.filter((s: Station) => s.status === 'online').length);
      }
      setLoading(false);
    });
  }, []);

  const filtered = stations.filter((s: Station) => {
    if (filterType !== 'all' && s.type !== filterType) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    return true;
  });

  const geoCount = stations.filter(s => s.location?.lat && s.location?.lng && s.location.lat !== 0).length;

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>🌍 电站全球分布
          <Tag style={{ marginLeft: 10, fontSize: 11, background: '#f5f6f8', color: '#8896a6', border: '1px solid #e8eaed', borderRadius: 20 }}>
            {filtered.length} / {stations.length} 座
          </Tag>
        </Title>
        <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
          {[{ label: '全部电站', v: stations.length, c: '#1a1a2e' }, { label: '已标注', v: geoCount, c: '#16a34a' }, { label: '在线', v: onlineCount, c: '#16a34a' }, { label: '总装机', v: formatCap(totalCapacity), c: '#e6342a' }].map(x => (
            <div key={x.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 12, color: '#8896a6' }}>{x.label}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: x.c, fontFamily: 'JetBrains Mono, monospace' }}>{x.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 12, border: '1px solid #e8eaed', borderRadius: 12 }} styles={{ body: { padding: '10px 14px' } }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: '#8896a6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>类型</Text>
            {(['all', 'solar', 'solar_storage', 'storage'] as const).map(t => (
              <Button key={t} size="small" onClick={() => setFilterType(t)}
                style={{ fontSize: 11, padding: '0 10px', height: 26, borderRadius: 13,
                  background: filterType === t ? (t === 'all' ? '#1a1a2e' : TYPE_COLOR[t] + '20') : 'transparent',
                  color: filterType === t ? (t === 'all' ? '#fff' : TYPE_COLOR[t]) : '#8896a6',
                  borderColor: filterType === t ? (t === 'all' ? '#1a1a2e' : TYPE_COLOR[t]) : '#e8eaed' }}>
                {t === 'all' ? `全部 ${stations.length}` : `${TYPE_TEXT[t]} ${stations.filter(s => s.type === t).length}`}
              </Button>
            ))}
          </div>
          <div style={{ width: 1, height: 20, background: '#e8eaed' }} />
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: '#8896a6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>状态</Text>
            {(['all', 'online', 'offline', 'maintenance'] as const).map(s => (
              <Button key={s} size="small" onClick={() => setFilterStatus(s)}
                style={{ fontSize: 11, padding: '0 10px', height: 26, borderRadius: 13,
                  background: filterStatus === s ? (s === 'all' ? '#1a1a2e' : STATUS_COLOR[s] + '20') : 'transparent',
                  color: filterStatus === s ? (s === 'all' ? '#fff' : STATUS_COLOR[s]) : '#8896a6',
                  borderColor: filterStatus === s ? (s === 'all' ? '#1a1a2e' : STATUS_COLOR[s]) : '#e8eaed' }}>
                {s === 'all' ? '全部' : STATUS_TEXT[s]}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Main: world map + detail panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
        {/* World Map */}
        <Card
          title={<span style={{ fontSize: 13 }}>🌍 全球电站分布</span>}
          style={{ border: '1px solid #e8eaed', borderRadius: 14 }}
          styles={{ body: { padding: 0 } }}
        >
          <div style={{ padding: 14 }}>
            <WorldMapCanvas
              stations={filtered}
              selected={selected}
              onSelect={setSelected}
              hovered={hovered}
              onHover={setHovered}
            />
          </div>
        </Card>

        {/* Detail panel */}
        <Card
          title={<span style={{ fontSize: 13 }}>📋 电站详情</span>}
          style={{ border: '1px solid #e8eaed', borderRadius: 14, position: 'sticky', top: 12 }}
          styles={{ body: { padding: 0 } }}
        >
          {selected ? (
            <>
              <div style={{
                padding: '16px 18px', borderBottom: '1px solid #e8eaed',
                background: `linear-gradient(135deg, ${TYPE_COLOR[selected.type]}08 0%, #fff 60%)`,
              }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <Tag style={{ fontSize: 11, padding: '0 8px', background: `${TYPE_COLOR[selected.type]}15`, color: TYPE_COLOR[selected.type], border: `1px solid ${TYPE_COLOR[selected.type]}40`, borderRadius: 12 }}>{TYPE_TEXT[selected.type]}</Tag>
                  <Tag style={{ fontSize: 11, padding: '0 8px', background: `${STATUS_COLOR[selected.status]}15`, color: STATUS_COLOR[selected.status], border: `1px solid ${STATUS_COLOR[selected.status]}40`, borderRadius: 12 }}>{STATUS_TEXT[selected.status]}</Tag>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.3 }}>{selected.name}</div>
                {selected.location?.address && <div style={{ fontSize: 11, color: '#8896a6', marginTop: 4 }}>📍 {selected.location.address}</div>}
              </div>
              <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: '装机容量', v: formatCap(selected.capacity || selected.installedCapacity || selected.peakPower || 0), c: '#e6342a' },
                  { label: '电站类型', v: TYPE_TEXT[selected.type] || selected.type, c: '#4a5568' },
                  { label: '业主单位', v: selected.owner || '—', c: '#4a5568' },
                  { label: '并网日期', v: selected.gridConnectionDate || '—', c: '#4a5568' },
                ].map(item => (
                  <div key={item.label} style={{ background: '#f8f9fa', borderRadius: 10, padding: '9px 12px' }}>
                    <div style={{ fontSize: 10, color: '#8896a6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: item.c, fontFamily: 'JetBrains Mono, monospace', marginTop: 2, wordBreak: 'break-all' }}>{item.v}</div>
                  </div>
                ))}
                {selected.location?.lat && selected.location?.lng && (
                  <div style={{ background: '#f0f4f8', borderRadius: 8, padding: '6px 10px', fontSize: 11, color: '#8896a6', fontFamily: 'monospace' }}>
                    📐 {selected.location.lat.toFixed(4)}, {selected.location.lng.toFixed(4)}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Button block size="small" icon={<EnvironmentOutlined />} href={`/stations/${selected._id}/topology`}
                    style={{ textAlign: 'left', borderRadius: 8, height: 34, background: '#fef2f2', color: '#e6342a', borderColor: '#fecaca' }}>查看拓扑图</Button>
                  <Button block size="small" icon={<AppstoreOutlined />} href={`/equipment?station=${selected._id}`}
                    style={{ textAlign: 'left', borderRadius: 8, height: 34, background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}>设备台账</Button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🌍</div>
              <Text style={{ fontSize: 13, color: '#8896a6' }}>点击地图上的圆点<br />查看电站详情</Text>
            </div>
          )}
        </Card>
      </div>

      {/* Station list */}
      <Card
        title={<span style={{ fontSize: 13 }}>📑 全部电站 <Badge count={filtered.length} style={{ backgroundColor: '#e6342a', fontSize: 10 }} /></span>}
        size="small" style={{ marginTop: 12, border: '1px solid #e8eaed', borderRadius: 14 }}
        styles={{ body: { padding: '10px 14px' } }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {filtered.map(s => {
            const cap = s.capacity || s.installedCapacity || s.peakPower || 0;
            const isGeo = !!(s.location?.lat && s.location?.lng && s.location.lat !== 0);
            return (
              <div key={s._id} onClick={() => setSelected(s)}
                style={{
                  padding: '12px 14px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
                  background: selected?._id === s._id ? '#fef2f2' : '#f8f9fa',
                  border: `1.5px solid ${selected?._id === s._id ? '#e6342a' : '#e8eaed'}`,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                    background: `${TYPE_COLOR[s.type]}18`, border: `2.5px solid ${TYPE_COLOR[s.type]}60`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    boxShadow: s.status === 'online' ? `0 0 0 3px ${TYPE_COLOR[s.type]}25` : 'none',
                  }}>
                    {s.type === 'solar_storage' ? '⚡' : s.type === 'solar' ? '☀️' : '🔋'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: '#8896a6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{s.location?.address || '地址未知'}</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                      <Tag style={{ fontSize: 10, padding: '0 5px', background: 'transparent', borderColor: TYPE_COLOR[s.type], color: TYPE_COLOR[s.type] }}>{TYPE_TEXT[s.type]}</Tag>
                      <Tag style={{ fontSize: 10, padding: '0 5px', background: `${STATUS_COLOR[s.status]}15`, borderColor: STATUS_COLOR[s.status], color: STATUS_COLOR[s.status] }}>● {STATUS_TEXT[s.status]}</Tag>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: TYPE_COLOR[s.type], fontFamily: 'JetBrains Mono, monospace' }}>{formatCap(cap)}</div>
                    <div style={{ fontSize: 10, color: isGeo ? '#16a34a' : '#d97706', marginTop: 2 }}>{isGeo ? '📍' : '⚠️'}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {!loading && stations.length === 0 && (
        <Card style={{ border: '1px solid #e8eaed', borderRadius: 14, textAlign: 'center', padding: 60 }}>
          <Empty description="暂无电站数据" />
        </Card>
      )}
    </div>
  );
}
