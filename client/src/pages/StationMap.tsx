import { useEffect, useState, useCallback } from 'react';
import { Card, Typography, Tag, Button, Badge, Empty } from 'antd';
import { EnvironmentOutlined, AppstoreOutlined } from '@ant-design/icons';
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

// Equirectangular: lat/lng → SVG viewBox coords (viewBox: 0 0 1000 500)
const VIEW_W = 1000, VIEW_H = 500;
function project(lat: number, lng: number) {
  return {
    x: ((lng + 180) / 360) * VIEW_W,
    y: ((90 - lat) / 180) * VIEW_H,
  };
}

// Simplified but recognizable continent paths (equirectangular, W=1000 H=500)
const CONTINENTS = [
  // North America
  { d: 'M 25,15 L 60,12 L 90,18 L 130,22 L 165,30 L 185,42 L 195,55 L 200,68 L 190,80 L 175,88 L 158,95 L 140,100 L 120,98 L 100,92 L 82,88 L 65,92 L 50,88 L 38,78 L 28,65 L 20,50 Z', label: '北美' },
  // Greenland
  { d: 'M 310,8 L 340,10 L 355,20 L 350,32 L 338,38 L 322,36 L 312,28 Z', label: '格陵兰' },
  // South America
  { d: 'M 180,130 L 210,125 L 235,130 L 250,145 L 258,165 L 262,190 L 258,220 L 248,250 L 235,275 L 218,290 L 200,295 L 185,288 L 172,272 L 165,250 L 160,225 L 162,195 L 168,168 L 175,148 Z', label: '南美' },
  // Europe
  { d: 'M 440,28 L 465,22 L 490,24 L 515,30 L 535,38 L 545,48 L 542,60 L 530,68 L 515,72 L 500,75 L 482,78 L 465,80 L 448,78 L 435,72 L 428,62 L 432,48 Z', label: '欧洲' },
  // UK
  { d: 'M 438,42 L 444,38 L 448,44 L 445,52 L 440,55 Z', label: '英国' },
  // Africa
  { d: 'M 448,95 L 480,88 L 515,85 L 545,88 L 568,95 L 580,110 L 588,130 L 590,155 L 585,180 L 578,205 L 565,230 L 548,255 L 530,272 L 510,282 L 490,285 L 470,280 L 452,268 L 440,248 L 432,225 L 428,200 L 430,175 L 435,150 L 438,125 Z', label: '非洲' },
  // Asia (main)
  { d: 'M 560,22 L 600,15 L 650,12 L 710,15 L 765,22 L 810,32 L 848,45 L 875,60 L 888,78 L 892,98 L 885,118 L 870,135 L 850,148 L 828,158 L 805,165 L 782,170 L 758,175 L 735,180 L 710,185 L 685,188 L 660,185 L 635,180 L 612,175 L 590,168 L 570,158 L 555,145 L 545,130 L 545,112 L 550,95 L 558,75 L 562,55 Z', label: '亚洲' },
  // Middle East / Arabian Peninsula
  { d: 'M 555,98 L 575,92 L 592,95 L 600,108 L 598,122 L 585,130 L 570,132 L 558,125 L 552,112 Z', label: '中东' },
  // India subcontinent
  { d: 'M 638,110 L 660,105 L 680,112 L 690,128 L 688,148 L 675,162 L 660,168 L 645,165 L 635,152 L 632,135 Z', label: '印度' },
  // Southeast Asia
  { d: 'M 748,115 L 768,108 L 788,115 L 798,128 L 792,142 L 778,148 L 762,145 L 750,135 Z', label: '东南亚' },
  // Japan / Korea
  { d: 'M 842,78 L 858,72 L 868,80 L 866,90 L 858,98 L 848,100 L 840,95 Z', label: '日韩' },
  // Taiwan
  { d: 'M 828,112 L 833,108 L 837,114 L 833,120 Z', label: '台湾' },
  // Australia
  { d: 'M 790,245 L 825,238 L 858,240 L 880,250 L 888,265 L 885,280 L 872,290 L 850,295 L 828,292 L 808,282 L 795,268 L 788,255 Z', label: '澳洲' },
  // New Zealand
  { d: 'M 915,305 L 925,300 L 930,308 L 926,318 L 918,318 Z', label: '新西兰' },
  // Bering Strait / Russia north coast hint
  { d: 'M 620,10 L 680,8 L 740,10', label: '' },
];

// Lat/lng grid lines
const LAT_LINES = [-60,-30,0,30,60];
const LNG_LINES = [-150,-120,-90,-60,-30,0,30,60,90,120,150];

function WorldMapSVG({
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
  const geoStations = stations.filter(s => s.location?.lat && s.location?.lng && s.location.lat !== 0);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        style={{
          width: '100%', display: 'block',
          borderRadius: 12, background: '#0f1923',
        }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const svgW = VIEW_W, svgH = VIEW_H;
          const mx = (e.clientX - rect.left) / rect.width * svgW;
          const my = (e.clientY - rect.top) / rect.height * svgH;
          for (const s of geoStations) {
            const { x, y } = project(s.location.lat, s.location.lng);
            const cap = s.capacity || s.installedCapacity || s.peakPower || 0;
            const r = cap >= 1000 ? 14 : cap >= 500 ? 11 : 8;
            const dist = Math.sqrt((mx - x) ** 2 + (my - y) ** 2);
            if (dist <= r * 2.5) { onSelect(s); return; }
          }
          onSelect(null);
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const svgW = VIEW_W, svgH = VIEW_H;
          const mx = (e.clientX - rect.left) / rect.width * svgW;
          const my = (e.clientY - rect.top) / rect.height * svgH;
          for (const s of geoStations) {
            const { x, y } = project(s.location.lat, s.location.lng);
            const cap = s.capacity || s.installedCapacity || s.peakPower || 0;
            const r = cap >= 1000 ? 14 : cap >= 500 ? 11 : 8;
            const dist = Math.sqrt((mx - x) ** 2 + (my - y) ** 2);
            if (dist <= r * 2.5) { onHover(s._id); return; }
          }
          onHover(null);
        }}
        onMouseLeave={() => onHover(null)}
      >
        <defs>
          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-strong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {/* Ocean gradient */}
          <linearGradient id="ocean" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d2233"/>
            <stop offset="100%" stopColor="#162a42"/>
          </linearGradient>
        </defs>

        {/* Ocean background */}
        <rect width={VIEW_W} height={VIEW_H} fill="url(#ocean)" />

        {/* Grid lines */}
        {LAT_LINES.map(lat => {
          const { y } = project(lat, 0);
          return (
            <g key={`lat-${lat}`}>
              <line x1={0} y1={y} x2={VIEW_W} y2={y}
                stroke={lat === 0 ? '#2a4a6a' : '#1e3550'} strokeWidth={lat === 0 ? 1.2 : 0.5} />
              {lat !== 0 && (
                <text x={VIEW_W - 5} y={y - 3}
                  fill="#2a4a6a" fontSize="9" textAnchor="end"
                  fontFamily="JetBrains Mono, monospace">
                  {lat > 0 ? `${lat}°N` : `${Math.abs(lat)}°S`}
                </text>
              )}
            </g>
          );
        })}
        {LNG_LINES.map(lng => {
          const { x } = project(0, lng);
          return (
            <line key={`lng-${lng}`} x1={x} y1={0} x2={x} y2={VIEW_H}
              stroke="#1e3550" strokeWidth={0.5} />
          );
        })}

        {/* Equator line */}
        <line x1={0} y1={project(0, 0).y} x2={VIEW_W} y2={project(0, 0).y}
          stroke="#2a5a8a" strokeWidth={1} strokeDasharray="6 4" opacity={0.6} />

        {/* Tropic of Cancer / Capricorn */}
        <line x1={0} y1={project(23.5, 0).y} x2={VIEW_W} y2={project(23.5, 0).y}
          stroke="#1e4060" strokeWidth={0.5} strokeDasharray="3 5" />
        <line x1={0} y1={project(-23.5, 0).y} x2={VIEW_W} y2={project(-23.5, 0).y}
          stroke="#1e4060" strokeWidth={0.5} strokeDasharray="3 5" />

        {/* Continent fills */}
        {CONTINENTS.map((c, i) => (
          <path key={i} d={c.d}
            fill="#1e3a52" stroke="#2a5278" strokeWidth={1}
            opacity={0.85}
          />
        ))}

        {/* Station markers */}
        {geoStations.map(s => {
          const { x, y } = project(s.location.lat, s.location.lng);
          const color = TYPE_COLOR[s.type] || '#8896a6';
          const sc = STATUS_COLOR[s.status] || '#b8c0cc';
          const cap = s.capacity || s.installedCapacity || s.peakPower || 0;
          const r = cap >= 1000 ? 8 : cap >= 500 ? 6 : 5;
          const isSelected = selected?._id === s._id;
          const isHovered = hovered === s._id;
          const isOnline = s.status === 'online';
          const glowR = isSelected ? r * 4 : isHovered ? r * 3 : r * 2.5;

          return (
            <g key={s._id} style={{ cursor: 'pointer' }}>
              {/* Glow halo */}
              {(isSelected || isHovered || isOnline) && (
                <circle cx={x} cy={y} r={glowR}
                  fill={color} opacity={isSelected ? 0.25 : isHovered ? 0.18 : 0.1}
                  filter={isSelected ? 'url(#glow-strong)' : 'url(#glow)'}
                />
              )}

              {/* Pulse ring (online only) */}
              {isOnline && !isSelected && !isHovered && (
                <circle cx={x} cy={y} r={r * 2.2}
                  fill="none" stroke={color} strokeWidth={1.2} opacity={0.4}
                  strokeDasharray="3 3"
                >
                  <animate attributeName="r" values={`${r*1.5};${r*3.5}`} dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.5;0" dur="2s" repeatCount="indefinite"/>
                </circle>
              )}

              {/* Main circle */}
              <circle cx={x} cy={y} r={isSelected || isHovered ? r * 1.3 : r}
                fill={isSelected || isHovered ? color : '#ffffff'}
                stroke={color} strokeWidth={isSelected ? 2.5 : 2}
              />

              {/* Inner dot */}
              <circle cx={x} cy={y} r={r * 0.45} fill={isSelected || isHovered ? '#ffffff' : color} />

              {/* Label on hover */}
              {(isHovered || isSelected) && (
                <text x={x} y={y - r - 5}
                  textAnchor="middle" fill={color}
                  fontSize={9} fontWeight="700"
                  fontFamily="Inter, sans-serif"
                >
                  {s.name.length > 12 ? s.name.slice(0, 12) + '…' : s.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip (HTML overlay) */}
      {hovered && (() => {
        const s = stations.find(st => st._id === hovered);
        if (!s) return null;
        const { x, y } = project(s.location.lat, s.location.lng);
        const color = TYPE_COLOR[s.type] || '#8896a6';
        const cap = s.capacity || s.installedCapacity || s.peakPower || 0;
        return (
          <div style={{
            position: 'absolute',
            left: `${(x / VIEW_W) * 100}%`,
            top: `${(y / VIEW_H) * 100}%`,
            transform: 'translate(-50%, -120%)',
            background: '#fff', border: `1.5px solid ${color}50`,
            borderRadius: 12, padding: '10px 14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            zIndex: 20, pointerEvents: 'none', minWidth: 180,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>{s.name}</div>
            <div style={{ fontSize: 11, color: '#8896a6', marginBottom: 6 }}>📍 {s.location?.address || '地址未知'}</div>
            <div style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
              <Tag style={{ fontSize: 10, padding: '0 6px', background: `${color}18`, color, border: `1px solid ${color}40`, borderRadius: 10 }}>{TYPE_TEXT[s.type]}</Tag>
              <Tag style={{ fontSize: 10, padding: '0 6px', background: `${STATUS_COLOR[s.status]}18`, color: STATUS_COLOR[s.status], border: `1px solid ${STATUS_COLOR[s.status]}40`, borderRadius: 10 }}>{STATUS_TEXT[s.status]}</Tag>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#e6342a', fontFamily: 'JetBrains Mono, monospace' }}>{formatCap(cap)}</div>
          </div>
        );
      })()}

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 12, right: 14,
        background: 'rgba(13,33,51,0.88)', border: '1px solid #1e3550',
        borderRadius: 10, padding: '10px 14px',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ fontSize: 10, color: '#4a7a9a', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>图例</div>
        {[
          { type: 'solar', icon: '☀️', label: '光伏' },
          { type: 'solar_storage', icon: '⚡', label: '光储一体' },
          { type: 'storage', icon: '🔋', label: '储能' },
        ].map(t => (
          <div key={t.type} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
            <div style={{
              width: 13, height: 13, borderRadius: '50%', background: '#fff',
              border: `2px solid ${TYPE_COLOR[t.type]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8,
            }}>{t.icon}</div>
            <span style={{ fontSize: 11, color: '#c0d8e8' }}>{t.label}</span>
          </div>
        ))}
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #1e3550' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 13, height: 13, borderRadius: '50%', border: '1.5px dashed #16a34a', opacity: 0.6 }} />
            <span style={{ fontSize: 11, color: '#c0d8e8' }}>在线</span>
          </div>
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
          {[
            { label: '全部电站', v: stations.length, c: '#1a1a2e' },
            { label: '已标注', v: geoCount, c: '#16a34a' },
            { label: '在线', v: onlineCount, c: '#16a34a' },
            { label: '总装机', v: formatCap(totalCapacity), c: '#e6342a' },
          ].map(x => (
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

      {/* Main: map + detail panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: 12, alignItems: 'start' }}>
        {/* World Map */}
        <Card
          title={<span style={{ fontSize: 13 }}>🌍 全球电站分布</span>}
          style={{ border: '1px solid #e8eaed', borderRadius: 14 }}
          styles={{ body: { padding: '16px' } }}
        >
          <WorldMapSVG
            stations={filtered}
            selected={selected}
            onSelect={setSelected}
            hovered={hovered}
            onHover={setHovered}
          />
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
                {selected.location?.lat && selected.location?.lng && (
                  <div style={{ fontSize: 11, color: '#b8c0cc', marginTop: 3, fontFamily: 'monospace' }}>
                    📐 {selected.location.lat.toFixed(4)}, {selected.location.lng.toFixed(4)}
                  </div>
                )}
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
              <Text style={{ fontSize: 13, color: '#8896a6' }}>点击地图上的电站圆点<br />查看详细信息</Text>
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
