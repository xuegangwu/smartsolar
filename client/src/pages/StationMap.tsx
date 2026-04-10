import { useEffect, useState } from 'react';
import { Card, Typography, Tag, Button, Badge, Empty, Space, Row, Col, Progress } from 'antd';
import { EnvironmentOutlined, ThunderboltOutlined, AppstoreOutlined, GlobalOutlined } from '@ant-design/icons';
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

// Simple China SVG map with station dots positioned by approximate lat/lng
function ChinaMap({ stations }: { stations: Station[] }) {
  // Approximate pixel positions for stations on a China outline SVG
  // Map bounds: lat 18-54, lng 73-135 → normalized to 0-100 %
  function toXY(lat: number, lng: number) {
    const x = ((lng - 73) / (135 - 73)) * 100;
    const y = ((54 - lat) / (54 - 18)) * 100;
    return { x, y };
  }

  const geoStations = stations.filter(s => s.location?.lat && s.location?.lng && s.location.lat !== 0);

  return (
    <div style={{ position: 'relative', background: '#f8f9fa', borderRadius: 12, overflow: 'hidden', minHeight: 320 }}>
      {/* Simple China outline SVG */}
      <svg viewBox="0 0 600 460" style={{ width: '100%', display: 'block', opacity: 0.25 }}>
        <path
          d="M100,60 L140,45 L200,35 L280,30 L340,35 L400,40 L450,55 L480,80 L500,110 L510,140 L490,170 L460,195 L440,220 L450,250 L460,280 L440,310 L400,330 L350,350 L310,370 L280,390 L240,410 L200,420 L160,415 L130,395 L110,365 L95,335 L85,300 L80,265 L75,230 L70,195 L65,160 L70,125 L80,95 Z"
          fill="#d4e4d4" stroke="#b8c8b8" strokeWidth="1.5"
        />
        {/* Major region lines */}
        <path d="M100,60 L130,130 L110,200 L130,260 L100,330" fill="none" stroke="#a8b8a8" strokeWidth="0.5" strokeDasharray="3 2" />
        <path d="M200,35 L230,100 L210,180 L230,260 L200,350" fill="none" stroke="#a8b8a8" strokeWidth="0.5" strokeDasharray="3 2" />
        <path d="M350,35 L340,110 L360,190 L340,270 L350,350" fill="none" stroke="#a8b8a8" strokeWidth="0.5" strokeDasharray="3 2" />
        <path d="M480,80 L470,150 L490,220 L470,290 L460,350" fill="none" stroke="#a8b8a8" strokeWidth="0.5" strokeDasharray="3 2" />
      </svg>

      {/* Station dots on map */}
      {geoStations.map(s => {
        const { x, y } = toXY(s.location.lat, s.location.lng);
        const color = TYPE_COLOR[s.type] || '#8896a6';
        const cap = s.capacity || s.installedCapacity || s.peakPower || 0;
        const r = cap >= 1000 ? 10 : cap >= 500 ? 8 : 6;
        return (
          <div
            key={s._id}
            title={`${s.name} (${s.location.address || ''})`}
            style={{
              position: 'absolute',
              left: `${x}%`, top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
            }}
          >
            {/* Glow ring for online */}
            {s.status === 'online' && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                width: r * 3.5, height: r * 3.5,
                borderRadius: '50%',
                border: `2px solid ${color}`,
                opacity: 0.35,
                animation: 'mapPulse 2s ease-out infinite',
              }} />
            )}
            {/* Station dot */}
            <div style={{
              width: r * 2, height: r * 2,
              borderRadius: '50%',
              background: '#fff',
              border: `${r * 0.4}px solid ${color}`,
              boxShadow: `0 0 0 2px #fff, 0 2px 8px ${color}60`,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: r * 0.9,
              transition: 'transform 0.15s',
            }}>
              {s.type === 'solar_storage' ? '⚡' : s.type === 'solar' ? '☀️' : '🔋'}
            </div>
          </div>
        );
      })}

      {/* Map legend */}
      <div style={{
        position: 'absolute', bottom: 12, right: 12,
        background: 'rgba(255,255,255,0.92)', border: '1px solid #e8eaed',
        borderRadius: 10, padding: '8px 12px',
        fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff', border: '2px solid #d97706' }} />
          <span style={{ color: '#4a5568' }}>光伏</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff', border: '2px solid #16a34a' }} />
          <span style={{ color: '#4a5568' }}>光储一体</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff', border: '2px solid #e6342a' }} />
          <span style={{ color: '#4a5568' }}>储能</span>
        </div>
        <div style={{ marginTop: 4, borderTop: '1px solid #e8eaed', paddingTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'transparent', border: '2px solid #16a34a', opacity: 0.4 }} />
          <span style={{ color: '#4a5568' }}>在线</span>
        </div>
      </div>
    </div>
  );
}

export default function StationMap() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Station | null>(null);
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
      <style>{`
        @keyframes mapPulse {
          0% { opacity: 0.4; transform: translate(-50%,-50%) scale(1); }
          70% { opacity: 0; transform: translate(-50%,-50%) scale(2); }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(2); }
        }
      `}</style>

      {/* Header + stats */}
      <div style={{ marginBottom: 14 }}>
        <Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>📍 电站地理分布
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

      {/* Main: China map + station list */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
        {/* Left: Map */}
        <Card
          title={<span style={{ fontSize: 13 }}>🏠 电站分布图</span>}
          style={{ border: '1px solid #e8eaed', borderRadius: 14 }}
          styles={{ body: { padding: '16px' } }}
        >
          <ChinaMap stations={filtered} />
          <div style={{ marginTop: 12, fontSize: 11, color: '#8896a6', textAlign: 'center' }}>
            ⚠️ 底图为示意，精确位置请见右侧详情
          </div>
        </Card>

        {/* Right: Selected station detail */}
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
                {selected.location?.address && (
                  <div style={{ fontSize: 11, color: '#8896a6', marginTop: 4 }}>📍 {selected.location.address}</div>
                )}
              </div>
              <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Row gutter={[8, 8]}>
                  {[
                    { label: '装机容量', v: formatCap(selected.capacity || selected.installedCapacity || selected.peakPower || 0), c: '#e6342a' },
                    { label: '类型', v: TYPE_TEXT[selected.type] || selected.type, c: '#4a5568' },
                    { label: '业主', v: selected.owner || '—', c: '#4a5568' },
                    { label: '并网日期', v: selected.gridConnectionDate || '—', c: '#4a5568' },
                  ].map(item => (
                    <Col span={12} key={item.label}>
                      <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '8px 10px' }}>
                        <div style={{ fontSize: 10, color: '#8896a6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: item.c, fontFamily: 'JetBrains Mono, monospace', marginTop: 2, wordBreak: 'break-all' }}>{item.v}</div>
                      </div>
                    </Col>
                  ))}
                </Row>
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
              <div style={{ fontSize: 36, marginBottom: 12 }}>🏭</div>
              <Text style={{ fontSize: 13, color: '#8896a6' }}>点击左侧列表选择电站<br />查看详细信息</Text>
            </div>
          )}
        </Card>
      </div>

      {/* Station list */}
      <Card
        title={<span style={{ fontSize: 13 }}>📑 电站列表 <Badge count={filtered.length} style={{ backgroundColor: '#e6342a', fontSize: 10 }} /></span>}
        size="small" style={{ marginTop: 12, border: '1px solid #e8eaed', borderRadius: 14 }}
        styles={{ body: { padding: '8px 12px' } }}
      >
        <Row gutter={[10, 10]}>
          {filtered.map(s => {
            const isGeo = !!(s.location?.lat && s.location?.lng && s.location.lat !== 0);
            const cap = s.capacity || s.installedCapacity || s.peakPower || 0;
            return (
              <Col xs={24} sm={12} lg={8} key={s._id}>
                <div onClick={() => setSelected(s)}
                  style={{
                    padding: '12px 14px', borderRadius: 12,
                    background: selected?._id === s._id ? '#fef2f2' : '#f8f9fa',
                    border: `1.5px solid ${selected?._id === s._id ? '#e6342a' : '#e8eaed'}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                      background: `${TYPE_COLOR[s.type]}18`,
                      border: `2.5px solid ${TYPE_COLOR[s.type]}60`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                      boxShadow: s.status === 'online' ? `0 0 0 3px ${TYPE_COLOR[s.type]}25` : 'none',
                    }}>
                      {s.type === 'solar_storage' ? '⚡' : s.type === 'solar' ? '☀️' : '🔋'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: '#8896a6', marginTop: 2 }}>
                        {s.location?.address || '地址未知'}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        <Tag style={{ fontSize: 10, padding: '0 5px', background: 'transparent', borderColor: TYPE_COLOR[s.type], color: TYPE_COLOR[s.type] }}>{TYPE_TEXT[s.type]}</Tag>
                        <Tag style={{ fontSize: 10, padding: '0 5px', background: `${STATUS_COLOR[s.status]}15`, borderColor: STATUS_COLOR[s.status], color: STATUS_COLOR[s.status] }}>● {STATUS_TEXT[s.status]}</Tag>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: TYPE_COLOR[s.type], fontFamily: 'JetBrains Mono, monospace' }}>{formatCap(cap)}</div>
                      <div style={{ fontSize: 10, color: isGeo ? '#16a34a' : '#d97706', marginTop: 2 }}>{isGeo ? '📍 已定位' : '⚠️ 待完善'}</div>
                    </div>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      </Card>

      {!loading && stations.length === 0 && (
        <Card style={{ border: '1px solid #e8eaed', borderRadius: 14, textAlign: 'center', padding: 60 }}>
          <Empty description="暂无电站数据" />
        </Card>
      )}
    </div>
  );
}
