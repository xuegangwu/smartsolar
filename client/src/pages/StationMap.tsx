import { useEffect, useRef, useState } from 'react';
import { Card, Typography, Tag, Space, Spin, Empty, Button, Row, Col, Badge } from 'antd';
import { EnvironmentOutlined, ThunderboltOutlined, GlobalOutlined, AppstoreOutlined } from '@ant-design/icons';
import { stationApi } from '../services/api';

const { Title, Text } = Typography;

interface StationLocation {
  address: string;
  lat: number;
  lng: number;
}
interface Station {
  _id: string;
  name: string;
  type: string;
  location: StationLocation;
  capacity: number;
  installedCapacity: number;
  peakPower: number;
  status: string;
  owner: string;
  contact?: string;
  gridConnectionDate?: string;
  createdAt?: string;
}

const TYPE_COLOR: Record<string, string> = {
  solar: '#d97706',
  storage: '#e6342a',
  solar_storage: '#16a34a',
};
const TYPE_TEXT: Record<string, string> = {
  solar: '光伏', storage: '储能', solar_storage: '光储一体',
};
const STATUS_TEXT: Record<string, string> = {
  online: '在线', offline: '离线', maintenance: '维护中',
};
const STATUS_COLOR: Record<string, string> = {
  online: '#16a34a', offline: '#b8c0cc', maintenance: '#d97706',
};

type TileLayer = 'street' | 'satellite';
type FilterType = 'all' | 'solar' | 'storage' | 'solar_storage';
type FilterStatus = 'all' | 'online' | 'offline' | 'maintenance';

export default function StationMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Station | null>(null);
  const [tileLayer, setTileLayer] = useState<TileLayer>('street');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    stationApi.getAll().then((r: any) => {
      if (r.success) setStations(r.data);
      setLoading(false);
    });
  }, []);

  // Filtered stations
  const filtered = stations.filter((s: Station) => {
    if (filterType !== 'all' && s.type !== filterType) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    return true;
  });

  // Init map
  useEffect(() => {
    if (!mapRef.current || loading) return;

    import('leaflet').then(L => {
      if (mapInstRef.current) {
        mapInstRef.current.remove();
        mapInstRef.current = null;
      }

      const map = L.map(mapRef.current!, {
        center: [35, 105],
        zoom: 4,
        zoomControl: true,
        attributionControl: false,
      });
      mapInstRef.current = map;

      // Add attribution manually
      L.control.attribution({ position: 'bottomright', prefix: '' }).addTo(map);
      map.attributionControl.addAttribution('© ESRI | © OpenStreetMap');

      // Tile layers
      const streetLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      );
      const satelliteLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      );

      if (tileLayer === 'street') streetLayer.addTo(map);
      else satelliteLayer.addTo(map);

      // Store layers for toggling
      (map as any)._streetLayer = streetLayer;
      (map as any)._satelliteLayer = satelliteLayer;

      // Fit bounds if we have stations with geo
      const geoStations = stations.filter((s: Station) => s.location?.lat && s.location?.lng && s.location.lat !== 0);
      if (geoStations.length > 0) {
        const bounds = L.latLngBounds(geoStations.map((s: Station) => [s.location.lat, s.location.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [50, 50] });
      }

      // Watch for tile layer changes
      (map as any)._updateTiles = () => {};
    });

    return () => {
      if (mapInstRef.current) {
        mapInstRef.current.remove();
        mapInstRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Update tile layer
  useEffect(() => {
    const map = mapInstRef.current;
    if (!map) return;
    const { _streetLayer, _satelliteLayer } = map as any;
    if (!_streetLayer || !_satelliteLayer) return;

    if (tileLayer === 'street') {
      map.removeLayer(_satelliteLayer);
      _streetLayer.addTo(map);
    } else {
      map.removeLayer(_streetLayer);
      _satelliteLayer.addTo(map);
    }
  }, [tileLayer]);

  // Render markers
  useEffect(() => {
    const map = mapInstRef.current;
    if (!map || loading) return;

    import('leaflet').then(L => {
      // Clear old markers
      Object.values(markersRef.current).forEach((m: any) => map.removeLayer(m));
      markersRef.current = {};

      filtered.forEach((s: Station) => {
        if (!s.location?.lat || !s.location?.lng || s.location.lat === 0) return;

        const color = TYPE_COLOR[s.type] || '#8896a6';
        const size = 36;

        const icon = L.divIcon({
          html: `
            <div style="
              width:${size}px;height:${size}px;border-radius:50%;
              background:#fff;border:3px solid ${color};
              box-shadow:0 2px 10px ${color}50;
              display:flex;align-items:center;justify-content:center;
              font-size:17px;line-height:${size}px;text-align:center;
              cursor:pointer;transition:transform 0.15s;
            "
            onmouseover="this.style.transform='scale(1.2)'"
            onmouseout="this.style.transform='scale(1)'">
              ${s.type === 'solar_storage' ? '⚡' : s.type === 'solar' ? '☀️' : '🔋'}
            </div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          className: '',
          popupAnchor: [0, -size / 2],
        });

        const marker = L.marker([s.location.lat, s.location.lng], { icon }).addTo(map);
        marker.on('click', () => {
          setSelected(s);
          setPanelOpen(true);
        });
        markersRef.current[s._id] = marker;
      });
    });
  }, [filtered, loading]);

  // Highlight selected marker
  useEffect(() => {
    if (!selected) return;
    const map = mapInstRef.current;
    if (!map) return;
    const marker = markersRef.current[selected._id];
    if (marker) {
      map.flyTo([selected.location.lat, selected.location.lng], Math.max(map.getZoom(), 10), { duration: 0.8 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?._id]);

  const geoCount = stations.filter(s => s.location?.lat && s.location?.lng && s.location.lat !== 0).length;

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>
          📍 电站地理分布
          <Tag style={{ marginLeft: 10, fontSize: 11, fontWeight: 400, background: '#f5f6f8', color: '#8896a6', border: '1px solid #e8eaed' }}>
            {filtered.length} / {stations.length} 座
          </Tag>
        </Title>
        <Text style={{ fontSize: 12, color: '#8896a6' }}>
          {geoCount === stations.length
            ? `共 ${stations.length} 座电站，已全部标注`
            : `${geoCount}/${stations.length} 座已标注坐标`}
        </Text>
      </div>

      {/* Controls: filters + tile toggle */}
      <Card
        size="small"
        style={{ marginBottom: 12, border: '1px solid #e8eaed', borderRadius: 12 }}
        styles={{ body: { padding: '10px 14px' } }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          {/* Type filter */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: '#8896a6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>类型</Text>
            {(['all', 'solar', 'solar_storage', 'storage'] as const).map(t => (
              <Button
                key={t}
                size="small"
                onClick={() => setFilterType(t)}
                style={{
                  fontSize: 11, padding: '0 10px', height: 26,
                  background: filterType === t ? (t === 'all' ? '#1a1a2e' : TYPE_COLOR[t] + '20') : 'transparent',
                  color: filterType === t ? (t === 'all' ? '#fff' : TYPE_COLOR[t]) : '#8896a6',
                  borderColor: filterType === t ? (t === 'all' ? '#1a1a2e' : TYPE_COLOR[t]) : '#e8eaed',
                  borderRadius: 13,
                }}
              >
                {t === 'all' ? '全部' : TYPE_TEXT[t]}
              </Button>
            ))}
          </div>

          <div style={{ width: 1, height: 20, background: '#e8eaed' }} />

          {/* Status filter */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: '#8896a6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>状态</Text>
            {(['all', 'online', 'offline', 'maintenance'] as const).map(s => (
              <Button
                key={s}
                size="small"
                onClick={() => setFilterStatus(s)}
                style={{
                  fontSize: 11, padding: '0 10px', height: 26,
                  background: filterStatus === s
                    ? (s === 'all' ? '#1a1a2e' : STATUS_COLOR[s] + '20')
                    : 'transparent',
                  color: filterStatus === s
                    ? (s === 'all' ? '#fff' : STATUS_COLOR[s])
                    : '#8896a6',
                  borderColor: filterStatus === s ? (s === 'all' ? '#1a1a2e' : STATUS_COLOR[s]) : '#e8eaed',
                  borderRadius: 13,
                }}
              >
                {s === 'all' ? '全部' : STATUS_TEXT[s]}
              </Button>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {/* Tile toggle */}
          <Space size={4}>
            <Button.Group size="small">
              <Button
                icon={<GlobalOutlined />}
                onClick={() => setTileLayer('street')}
                style={{
                  fontSize: 11, height: 26,
                  background: tileLayer === 'street' ? '#1a1a2e' : 'transparent',
                  color: tileLayer === 'street' ? '#fff' : '#8896a6',
                  borderColor: tileLayer === 'street' ? '#1a1a2e' : '#e8eaed',
                }}
              >
                街道
              </Button>
              <Button
                icon={<AppstoreOutlined />}
                onClick={() => setTileLayer('satellite')}
                style={{
                  fontSize: 11, height: 26,
                  background: tileLayer === 'satellite' ? '#1a1a2e' : 'transparent',
                  color: tileLayer === 'satellite' ? '#fff' : '#8896a6',
                  borderColor: tileLayer === 'satellite' ? '#1a1a2e' : '#e8eaed',
                }}
              >
                卫星
              </Button>
            </Button.Group>
          </Space>
        </div>
      </Card>

      {/* Main: map + slide panel */}
      <div style={{ position: 'relative' }}>
        {/* Map */}
        <Card
          style={{
            border: '1px solid #e8eaed', borderRadius: 14, overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            transition: 'margin-right 0.3s ease',
            marginRight: panelOpen ? 340 : 0,
          }}
          styles={{ body: { padding: 0 } }}
        >
          <div ref={mapRef} style={{ height: 540, width: '100%' }} />
        </Card>

        {/* Slide-in detail panel */}
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 330,
          background: '#fff',
          border: '1px solid #e8eaed',
          borderRadius: 14,
          boxShadow: '-4px 0 20px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          transform: panelOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
          display: 'flex', flexDirection: 'column',
          zIndex: 10,
        }}>
          {selected ? (
            <>
              {/* Panel header */}
              <div style={{
                padding: '16px 18px', borderBottom: '1px solid #e8eaed',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                background: '#fafafa',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Tag style={{
                      fontSize: 11, padding: '0 8px',
                      background: `${TYPE_COLOR[selected.type]}15`,
                      color: TYPE_COLOR[selected.type],
                      border: `1px solid ${TYPE_COLOR[selected.type]}40`,
                      borderRadius: 12,
                    }}>
                      {TYPE_TEXT[selected.type] || selected.type}
                    </Tag>
                    <Tag style={{
                      fontSize: 11, padding: '0 8px',
                      background: `${STATUS_COLOR[selected.status]}15`,
                      color: STATUS_COLOR[selected.status],
                      border: `1px solid ${STATUS_COLOR[selected.status]}40`,
                      borderRadius: 12,
                    }}>
                      {STATUS_TEXT[selected.status] || selected.status}
                    </Tag>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.3 }}>
                    {selected.name}
                  </div>
                </div>
                <Button
                  type="text" size="small" icon={<span style={{ fontSize: 16 }}>✕</span>}
                  onClick={() => { setPanelOpen(false); setSelected(null); }}
                  style={{ color: '#8896a6', flexShrink: 0, marginTop: 2 }}
                />
              </div>

              {/* Panel content */}
              <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Location */}
                <div>
                  <Text style={{ fontSize: 10, color: '#8896a6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                    📍 地址
                  </Text>
                  <Text style={{ fontSize: 13, color: '#1a1a2e' }}>
                    {selected.location?.address || '未知'}
                  </Text>
                  {selected.location?.lat && selected.location?.lng && (
                    <Text style={{ fontSize: 11, color: '#b8c0cc', display: 'block', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                      {selected.location.lat.toFixed(5)}, {selected.location.lng.toFixed(5)}
                    </Text>
                  )}
                </div>

                <div style={{ height: 1, background: '#f0f0f0' }} />

                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: '装机容量', value: `${(selected.capacity || selected.installedCapacity || selected.peakPower || 0).toFixed(1)}`, unit: 'kW', color: '#e6342a' },
                    { label: '电站类型', value: TYPE_TEXT[selected.type] || selected.type, unit: '', color: '#4a5568' },
                    { label: '业主单位', value: selected.owner || '—', unit: '', color: '#4a5568' },
                    { label: '并网日期', value: selected.gridConnectionDate || '—', unit: '', color: '#4a5568' },
                  ].map(item => (
                    <div key={item.label} style={{ background: '#f8f9fa', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: '#8896a6', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: item.color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.2 }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ height: 1, background: '#f0f0f0' }} />

                {/* Quick actions */}
                <div>
                  <Text style={{ fontSize: 10, color: '#8896a6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
                    ⚡ 快速操作
                  </Text>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Button
                      block size="small"
                      icon={<EnvironmentOutlined />}
                      href={`/stations/${selected._id}/topology`}
                      style={{ textAlign: 'left', borderRadius: 8, height: 34, background: '#fef2f2', color: '#e6342a', borderColor: '#fecaca' }}
                    >
                      查看拓扑图
                    </Button>
                    <Button
                      block size="small"
                      icon={<AppstoreOutlined />}
                      href={`/equipment?station=${selected._id}`}
                      style={{ textAlign: 'left', borderRadius: 8, height: 34, background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}
                    >
                      设备台账
                    </Button>
                    <Button
                      block size="small"
                      icon={<ThunderboltOutlined />}
                      href={`/alerts?station=${selected._id}`}
                      style={{ textAlign: 'left', borderRadius: 8, height: 34, background: '#fffbeb', color: '#d97706', borderColor: '#fde68a' }}
                    >
                      告警记录
                    </Button>
                  </div>
                </div>

                {/* Created */}
                {selected.createdAt && (
                  <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                    <Text style={{ fontSize: 10, color: '#b8c0cc' }}>
                      创建于 {new Date(selected.createdAt).toLocaleDateString('zh-CN')}
                    </Text>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
              <div style={{ fontSize: 36 }}>📍</div>
              <Text style={{ fontSize: 13, color: '#8896a6', textAlign: 'center', padding: '0 24px' }}>
                点击地图上的电站标记<br />查看详细信息
              </Text>
              <Text style={{ fontSize: 11, color: '#b8c0cc' }}>
                {stations.length} 座电站 · {geoCount} 座已标注
              </Text>
            </div>
          )}
        </div>
      </div>

      {/* Station list below map */}
      {filtered.length > 0 && (
        <Card
          title={<span style={{ fontSize: 13 }}>所有电站 <Badge count={filtered.length} style={{ backgroundColor: '#e6342a', fontSize: 10 }} /></span>}
          size="small"
          style={{ marginTop: 12, border: '1px solid #e8eaed', borderRadius: 14 }}
          styles={{ body: { padding: '8px 12px' } }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
            {filtered.map(s => {
              const isGeo = s.location?.lat && s.location?.lng && s.location.lat !== 0;
              return (
                <div
                  key={s._id}
                  onClick={() => { setSelected(s); setPanelOpen(true); }}
                  style={{
                    padding: '10px 12px', borderRadius: 10,
                    background: selected?._id === s._id ? '#fef2f2' : '#f8f9fa',
                    border: `1.5px solid ${selected?._id === s._id ? '#e6342a' : '#e8eaed'}`,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: `${TYPE_COLOR[s.type] || '#8896a6'}18`,
                    border: `2px solid ${TYPE_COLOR[s.type] || '#8896a6'}50`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  }}>
                    {s.type === 'solar_storage' ? '⚡' : s.type === 'solar' ? '☀️' : '🔋'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#8896a6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.location?.address || '无地址'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[s.status] || '#b8c0cc' }} />
                    <span style={{ fontSize: 10, color: '#b8c0cc' }}>{isGeo ? '📍' : '⚠️'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {!loading && stations.length === 0 && (
        <Card style={{ border: '1px solid #e8eaed', borderRadius: 14, textAlign: 'center', padding: 60 }}>
          <Empty description="暂无电站数据" />
        </Card>
      )}
    </div>
  );
}
