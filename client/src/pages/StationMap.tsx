import { useEffect, useRef, useState } from 'react';
import { Card, Typography, Tag, Button, Badge, Empty, Space } from 'antd';
import { EnvironmentOutlined, GlobalOutlined, AppstoreOutlined } from '@ant-design/icons';
import { stationApi } from '../services/api';

const { Title, Text } = Typography;

interface StationLocation { address: string; lat: number; lng: number; }
interface Station {
  _id: string; name: string; type: string; location: StationLocation;
  capacity: number; installedCapacity: number; peakPower: number;
  status: string; owner: string; contact?: string; gridConnectionDate?: string; createdAt?: string;
}

const TYPE_COLOR: Record<string, string> = { solar: '#d97706', storage: '#e6342a', solar_storage: '#16a34a' };
const TYPE_TEXT: Record<string, string> = { solar: '光伏', storage: '储能', solar_storage: '光储一体' };
const STATUS_TEXT: Record<string, string> = { online: '在线', offline: '离线', maintenance: '维护中' };
const STATUS_COLOR: Record<string, string> = { online: '#16a34a', offline: '#b8c0cc', maintenance: '#d97706' };

type TileLayer = 'street' | 'satellite';
type FilterType = 'all' | 'solar' | 'storage' | 'solar_storage';
type FilterStatus = 'all' | 'online' | 'offline' | 'maintenance';

function formatCap(cap: number) {
  return cap >= 1000 ? `${(cap / 1000).toFixed(1)} MW` : `${cap} kW`;
}

export default function StationMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstRef = useRef<any>(null);
  const clusterGroupRef = useRef<any>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Station | null>(null);
  const [tileLayer, setTileLayer] = useState<TileLayer>('satellite');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [panelOpen, setPanelOpen] = useState(false);
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

  // Init map
  useEffect(() => {
    if (!mapRef.current || loading) return;
    Promise.all([import('leaflet'), import('leaflet.markercluster')]).then(([L]) => {
      if (mapInstRef.current) { mapInstRef.current.remove(); mapInstRef.current = null; }

      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({ iconRetinaUrl: '', iconUrl: '', shadowUrl: '' });

      const map = L.map(mapRef.current!, { center: [30, 120], zoom: 6, zoomControl: true, attributionControl: false });
      mapInstRef.current = map;
      L.control.attribution({ position: 'bottomright', prefix: '' }).addTo(map);
      map.attributionControl.addAttribution('© OpenStreetMap | © CARTO');

      // Use OSM tiles directly - most reliable globally
      const streetLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      });
      // Dark satellite style via CartoDB
      const satelliteLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
        maxZoom: 19, subdomains: 'abcd',
      });
      (map as any)._streetLayer = streetLayer;
      (map as any)._satelliteLayer = satelliteLayer;
      if (tileLayer === 'street') streetLayer.addTo(map); else satelliteLayer.addTo(map);

      const mcg = L.markerClusterGroup({
        showCoverageOnHover: false, maxClusterRadius: 60, spiderfyOnMaxZoom: true, disableClusteringAtZoom: 15,
        iconCreateFunction: (cluster: any) => {
          const markers = cluster.getAllChildMarkers();
          const count = markers.length;
          const sts = markers.map((m: any) => m.station as Station);
          const types = [...new Set(sts.map((s: Station) => s.type))];
          const color = types.length > 1 ? '#7c3aed' : TYPE_COLOR[types[0]] || '#8896a6';
          const online = sts.filter((s: Station) => s.status === 'online').length;
          const size = count <= 1 ? 48 : count <= 3 ? 56 : count <= 10 ? 64 : 72;
          return L.divIcon({
            html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#fff;border:3px solid ${color};box-shadow:0 3px 12px ${color}40;display:flex;align-items:center;justify-content:center;flex-direction:column;line-height:1.2;cursor:pointer;">
              ${count === 1 ? (sts[0].type === 'solar_storage' ? '⚡' : sts[0].type === 'solar' ? '☀️' : '🔋')
              : `<span style="font-size:${count > 9 ? 13 : 15}px;font-weight:800;color:${color};font-family:monospace">${count}</span>`}
            </div>${count > 1 ? `<div style="margin-top:2px;font-size:9px;color:${STATUS_COLOR[online === count ? 'online' : 'maintenance']};font-weight:700;text-align:center">${online}/${count}</div>` : ''}`,
            className: '', iconSize: [size, count > 1 ? size + 16 : size], iconAnchor: [size / 2, size / 2],
          });
        },
      });
      clusterGroupRef.current = mcg;
      map.addLayer(mcg);

      const geoStations = stations.filter((s: Station) => s.location?.lat && s.location?.lng && s.location.lat !== 0);
      if (geoStations.length > 0) {
        const bounds = L.latLngBounds(geoStations.map((s: Station) => [s.location.lat, s.location.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [50, 50] });
      }

      mcg.on('clusterclick', (e: any) => { if (map.getZoom() < 12) e.layer.spiderfy(); });
    });

    return () => { if (mapInstRef.current) { mapInstRef.current.remove(); mapInstRef.current = null; } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Tile toggle
  useEffect(() => {
    const map = mapInstRef.current;
    if (!map) return;
    const { _streetLayer, _satelliteLayer } = map as any;
    if (!_streetLayer || !_satelliteLayer) return;
    if (tileLayer === 'street') { map.removeLayer(_satelliteLayer); _streetLayer.addTo(map); }
    else { map.removeLayer(_streetLayer); _satelliteLayer.addTo(map); }
  }, [tileLayer]);

  // Render markers
  useEffect(() => {
    const mcg = clusterGroupRef.current;
    const map = mapInstRef.current;
    if (!mcg || !map || loading) return;
    import('leaflet').then(L => {
      mcg.clearLayers();
      filtered.forEach((s: Station) => {
        if (!s.location?.lat || !s.location?.lng || s.location.lat === 0) return;
        const color = TYPE_COLOR[s.type] || '#8896a6';
        const sc = STATUS_COLOR[s.status] || '#b8c0cc';
        const cap = s.capacity || s.installedCapacity || s.peakPower || 0;
        const size = cap >= 1000 ? 52 : cap >= 500 ? 46 : 40;

        // Build icon HTML with pulse ring for online stations
        const pulseRing = sc === '#16a34a'
          ? `<div style="position:absolute;width:${size + 16}px;height:${size + 16}px;top:${-8}px;left:${-8}px;border-radius:50%;border:2px solid ${color};opacity:0;animation:pulseStation 2s ease-out infinite;pointer-events:none"></div>`
          : '';
        const innerIcon = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#fff;border:4px solid ${color};box-shadow:0 4px 16px ${color}60,0 0 0 ${sc === '#16a34a' ? '4px' : '0'} ${sc}40;display:flex;align-items:center;justify-content:center;font-size:${size * 0.45}px;cursor:pointer;position:relative;z-index:2;transition:transform 0.15s"
          onmouseover="this.style.transform='scale(1.15)'"
          onmouseout="this.style.transform='scale(1)'"
        >${s.type === 'solar_storage' ? '⚡' : s.type === 'solar' ? '☀️' : '🔋'}</div>`;

        const icon = L.divIcon({
          html: `<div style="position:relative;width:${size}px;height:${size}px">${pulseRing}${innerIcon}</div>`,
          iconSize: [size, size], iconAnchor: [size / 2, size / 2], className: '',
        });

        const marker = L.marker([s.location.lat, s.location.lng], { icon });
        (marker as any).station = s;

        // Hover tooltip via bindTooltip
        const tooltipContent = `<div style="font-family:Inter,sans-serif;min-width:130px;padding:10px 12px">
          <div style="font-size:13px;font-weight:700;color:#1a1a2e;margin-bottom:4px">${s.name}</div>
          <div style="font-size:11px;color:#8896a6;margin-bottom:6px">${s.location?.address || '地址未知'}</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px">
            <span style="background:${TYPE_COLOR[s.type]}18;color:${TYPE_COLOR[s.type]};border:1px solid ${TYPE_COLOR[s.type]}40;border-radius:10px;padding:1px 7px;font-size:10px">${TYPE_TEXT[s.type]}</span>
            <span style="background:${STATUS_COLOR[s.status]}18;color:${STATUS_COLOR[s.status]};border:1px solid ${STATUS_COLOR[s.status]}40;border-radius:10px;padding:1px 7px;font-size:10px">${STATUS_TEXT[s.status]}</span>
          </div>
          <div style="font-size:12px;color:#4a5568"><b style="color:#e6342a;font-family:monospace">${formatCap(cap)}</b></div>
        </div>`;

        marker.bindTooltip(tooltipContent, {
          direction: 'top', offset: [0, -size / 2 - 6],
          className: 'leaflet-tooltip-custom',
          opacity: 1, permanent: false, sticky: true,
        });

        marker.on('click', () => {
          setSelected(s); setPanelOpen(true);
          map.flyTo([s.location.lat, s.location.lng], Math.max(map.getZoom(), 11), { duration: 0.8 });
        });
        mcg.addLayer(marker);
      });
      mcg.on('clusterclick', (e: any) => { if (map.getZoom() < 12) e.layer.spiderfy(); });
    });
  }, [filtered, loading]);

  const geoCount = stations.filter(s => s.location?.lat && s.location?.lng && s.location.lat !== 0).length;

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header + stats */}
      <div style={{ marginBottom: 14 }}>
        <Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>📍 电站地理分布
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

      {/* Controls */}
      <Card size="small" style={{ marginBottom: 12, border: '1px solid #e8eaed', borderRadius: 12 }} styles={{ body: { padding: '10px 14px' } }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: '#8896a6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>类型</Text>
            {(['all', 'solar', 'solar_storage', 'storage'] as FilterType[]).map(t => (
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
            {(['all', 'online', 'offline', 'maintenance'] as FilterStatus[]).map(s => (
              <Button key={s} size="small" onClick={() => setFilterStatus(s)}
                style={{ fontSize: 11, padding: '0 10px', height: 26, borderRadius: 13,
                  background: filterStatus === s ? (s === 'all' ? '#1a1a2e' : STATUS_COLOR[s] + '20') : 'transparent',
                  color: filterStatus === s ? (s === 'all' ? '#fff' : STATUS_COLOR[s]) : '#8896a6',
                  borderColor: filterStatus === s ? (s === 'all' ? '#1a1a2e' : STATUS_COLOR[s]) : '#e8eaed' }}>
                {s === 'all' ? '全部' : STATUS_TEXT[s]}
              </Button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <Button.Group size="small">
            <Button icon={<GlobalOutlined />} onClick={() => setTileLayer('street')}
              style={{ fontSize: 11, height: 26,
                background: tileLayer === 'street' ? '#1a1a2e' : 'transparent',
                color: tileLayer === 'street' ? '#fff' : '#8896a6',
                borderColor: tileLayer === 'street' ? '#1a1a2e' : '#e8eaed' }}>
              街道
            </Button>
            <Button icon={<AppstoreOutlined />} onClick={() => setTileLayer('satellite')}
              style={{ fontSize: 11, height: 26,
                background: tileLayer === 'satellite' ? '#1a1a2e' : 'transparent',
                color: tileLayer === 'satellite' ? '#fff' : '#8896a6',
                borderColor: tileLayer === 'satellite' ? '#1a1a2e' : '#e8eaed' }}>
              卫星
            </Button>
          </Button.Group>
        </div>
      </Card>

      {/* Map + slide panel */}
      <div style={{ position: 'relative' }}>
        <Card style={{
          border: '1px solid #e8eaed', borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          marginRight: panelOpen ? 340 : 0,
          transition: 'margin-right 0.3s ease',
        }} styles={{ body: { padding: 0 } }}>
          <div ref={mapRef} style={{ height: 540 }} />
        </Card>

        {/* Slide panel */}
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 330,
          background: '#fff', border: '1px solid #e8eaed', borderRadius: 14,
          boxShadow: '-4px 0 20px rgba(0,0,0,0.08)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          transform: panelOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease', zIndex: 10,
        }}>
          {selected ? (
            <>
              <div style={{
                padding: '16px 18px', borderBottom: '1px solid #e8eaed',
                background: `linear-gradient(135deg, ${TYPE_COLOR[selected.type]}08 0%, #fff 60%)`,
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <Tag style={{ fontSize: 11, padding: '0 8px', background: `${TYPE_COLOR[selected.type]}15`, color: TYPE_COLOR[selected.type], border: `1px solid ${TYPE_COLOR[selected.type]}40`, borderRadius: 12 }}>{TYPE_TEXT[selected.type]}</Tag>
                    <Tag style={{ fontSize: 11, padding: '0 8px', background: `${STATUS_COLOR[selected.status]}15`, color: STATUS_COLOR[selected.status], border: `1px solid ${STATUS_COLOR[selected.status]}40`, borderRadius: 12 }}>{STATUS_TEXT[selected.status]}</Tag>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.3, maxWidth: 240 }}>{selected.name}</div>
                </div>
                <Button type="text" size="small" onClick={() => { setPanelOpen(false); setSelected(null); }} style={{ color: '#8896a6', marginTop: 2 }}>✕</Button>
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <Text style={{ fontSize: 10, color: '#8896a6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>📍 地址</Text>
                  <Text style={{ fontSize: 13, color: '#1a1a2e' }}>{selected.location?.address || '未知'}</Text>
                  {selected.location?.lat && selected.location?.lng && (
                    <Text style={{ fontSize: 11, color: '#b8c0cc', display: 'block', marginTop: 2, fontFamily: 'monospace' }}>
                      {selected.location.lat.toFixed(5)}, {selected.location.lng.toFixed(5)}
                    </Text>
                  )}
                </div>
                <div style={{ height: 1, background: '#f0f0f0' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: '装机容量', value: formatCap(selected.capacity || selected.installedCapacity || selected.peakPower || 0), color: '#e6342a' },
                    { label: '电站类型', value: TYPE_TEXT[selected.type] || selected.type, color: '#4a5568' },
                    { label: '业主单位', value: selected.owner || '—', color: '#4a5568' },
                    { label: '并网日期', value: selected.gridConnectionDate || '—', color: '#4a5568' },
                  ].map(item => (
                    <div key={item.label} style={{ background: '#f8f9fa', borderRadius: 10, padding: '9px 11px' }}>
                      <div style={{ fontSize: 10, color: '#8896a6', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: item.color, fontFamily: 'monospace', lineHeight: 1.2, wordBreak: 'break-all' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ height: 1, background: '#f0f0f0' }} />
                <div>
                  <Text style={{ fontSize: 10, color: '#8896a6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>⚡ 快速操作</Text>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Button block size="small" icon={<EnvironmentOutlined />} href={`/stations/${selected._id}/topology`}
                      style={{ textAlign: 'left', borderRadius: 8, height: 34, background: '#fef2f2', color: '#e6342a', borderColor: '#fecaca' }}>查看拓扑图</Button>
                    <Button block size="small" icon={<AppstoreOutlined />} href={`/equipment?station=${selected._id}`}
                      style={{ textAlign: 'left', borderRadius: 8, height: 34, background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}>设备台账</Button>
                    <Button block size="small" icon={<Badge count={0} />} href={`/alerts?station=${selected._id}`}
                      style={{ textAlign: 'left', borderRadius: 8, height: 34, background: '#fffbeb', color: '#d97706', borderColor: '#fde68a' }}>告警记录</Button>
                  </div>
                </div>
                {selected.createdAt && <Text style={{ fontSize: 10, color: '#b8c0cc', marginTop: 'auto', paddingTop: 8 }}>创建于 {new Date(selected.createdAt).toLocaleDateString('zh-CN')}</Text>}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
              <div style={{ fontSize: 36 }}>📍</div>
              <Text style={{ fontSize: 13, color: '#8896a6', textAlign: 'center', padding: '0 24px' }}>点击地图标记<br />查看详情</Text>
              <div style={{ fontSize: 11, color: '#b8c0cc', textAlign: 'center' }}>
                <div>{stations.length} 座电站 · {geoCount} 座已标注</div>
                <div style={{ marginTop: 4 }}>总装机 {formatCap(totalCapacity)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Station list */}
      {filtered.length > 0 && (
        <Card title={<span style={{ fontSize: 13 }}>电站列表 <Badge count={filtered.length} style={{ backgroundColor: '#e6342a', fontSize: 10 }} /></span>}
          size="small" style={{ marginTop: 12, border: '1px solid #e8eaed', borderRadius: 14 }}
          styles={{ body: { padding: '8px 12px' } }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 8 }}>
            {filtered.map(s => {
              const isGeo = !!(s.location?.lat && s.location?.lng && s.location.lat !== 0);
              return (
                <div key={s._id}
                  onClick={() => { setSelected(s); setPanelOpen(true); if (isGeo && mapInstRef.current) mapInstRef.current.flyTo([s.location.lat, s.location.lng], 12, { duration: 0.8 }); }}
                  style={{
                    padding: '10px 12px', borderRadius: 10,
                    background: selected?._id === s._id ? '#fef2f2' : '#f8f9fa',
                    border: `1.5px solid ${selected?._id === s._id ? '#e6342a' : '#e8eaed'}`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s',
                  }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: `${TYPE_COLOR[s.type] || '#8896a6'}18`, border: `2px solid ${TYPE_COLOR[s.type] || '#8896a6'}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                    {s.type === 'solar_storage' ? '⚡' : s.type === 'solar' ? '☀️' : '🔋'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: '#8896a6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.location?.address || '无地址'}</div>
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
