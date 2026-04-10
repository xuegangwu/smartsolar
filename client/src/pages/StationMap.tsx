import { useEffect, useState, useRef } from 'react';
import { Card, Typography, Tag, Button, Badge, Empty, Space, Spin, Segmented } from 'antd';
import { EnvironmentOutlined, AppstoreOutlined, GlobalOutlined } from '@ant-design/icons';
import { stationApi } from '../services/api';

const { Title, Text } = Typography;

// Declare Leaflet global
declare const L: any;

const STATUS_TEXT: Record<string, string> = { online: '在线', offline: '离线', maintenance: '维护中' };
const STATUS_COLOR: Record<string, string> = { online: '#16a34a', offline: '#b8c0cc', maintenance: '#d97706' };
const TYPE_TEXT: Record<string, string> = { solar: '光伏', storage: '储能', ev_charger: '充电桩', solar_storage: '光储充', default: '混合' };
const TYPE_COLOR: Record<string, string> = {
  solar: '#f59e0b', storage: '#3b82f6', ev_charger: '#10b981',
  solar_storage: '#8b5cf6', default: '#6b7280',
};

interface Station {
  _id: string; name: string; type: string; status: string;
  location?: { lat: number; lng: number; address?: string };
  installedCapacity?: number; peakPower?: number;
}

export default function StationMap() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Station | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [tileLayer, setTileLayer] = useState<'road' | 'satellite'>('road');
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    stationApi.getAll().then((r: any) => {
      if (r.success) setStations(r.data);
      setLoading(false);
    });
  }, []);

  // Initialize Leaflet map
  useEffect(() => {
    if (mapRef.current || typeof L === 'undefined') return;

    const map = L.map('station-map', {
      center: [35, 105],
      zoom: 4,
      zoomControl: true,
      attributionControl: false,
    });

    // Default: 高德 road map
    const gaodeRoad = L.tileLayer(
      'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}',
      { subdomains: '1234', maxZoom: 18 }
    );
    gaodeRoad.addTo(map);

    // ESRI satellite
    const esriSat = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18 }
    );

    // Store layers for switching
    (map as any)._gaodeRoad = gaodeRoad;
    (map as any)._esriSat = esriSat;

    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Switch tile layer
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;
    if (tileLayer === 'road') {
      if (map._gaodeRoad) map.addLayer(map._gaodeRoad);
      if (map._esriSat) map.removeLayer(map._esriSat);
    } else {
      if (map._esriSat) map.addLayer(map._esriSat);
      if (map._gaodeRoad) map.removeLayer(map._gaodeRoad);
    }
  }, [tileLayer, mapReady]);

  // Update markers when stations or filters change
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;

    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    const filtered = stations.filter((s: Station) => {
      if (filterStatus !== 'all' && s.status !== filterStatus) return false;
      if (filterType !== 'all' && s.type !== filterType) return false;
      const lat = s.location?.lat;
      const lng = s.location?.lng;
      if (!lat || !lng || lat === 0 || lng === 0) return false;
      return true;
    });

    filtered.forEach(s => {
      const lat = s.location!.lat!;
      const lng = s.location!.lng!;
      const sc = STATUS_COLOR[s.status] || '#b8c0cc';
      const tc = TYPE_COLOR[s.type] || TYPE_COLOR.default;
      const isSelected = selected?._id === s._id;
      const isHovered = hovered === s._id;

      // Pulse ring for online stations
      const radius = isSelected ? 12 : isHovered ? 10 : 7;
      const marker = L.circleMarker([lat, lng], {
        radius,
        color: sc,
        weight: isSelected ? 3 : isHovered ? 2 : 1,
        opacity: 1,
        fillColor: sc,
        fillOpacity: isSelected ? 0.9 : 0.7,
      });

      // Popup
      marker.bindPopup(() => {
        const el = document.createElement('div');
        el.style.cssText = 'min-width:160px;font-family:Inter,sans-serif';
        el.innerHTML = `
          <div style="font-weight:600;font-size:14px;margin-bottom:6px;color:#1a1a2e">${s.name}</div>
          <div style="font-size:12px;color:#666;margin-bottom:4px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${sc};margin-right:4px"></span>
            ${STATUS_TEXT[s.status] || s.status}
            · ${TYPE_TEXT[s.type] || TYPE_TEXT.default}
          </div>
          <div style="font-size:12px;color:#888">装机: ${s.installedCapacity || s.peakPower || '-'} kW</div>
        `;
        return el;
      }, { maxWidth: 200 });

      marker.on('click', () => setSelected(s));
      marker.on('mouseover', () => setHovered(s._id));
      marker.on('mouseout', () => setHovered(null));

      // Online pulse animation
      if (s.status === 'online') {
        const pulse = L.circleMarker([lat, lng], {
          radius: radius + 8,
          color: sc,
          weight: 1,
          opacity: 0.4,
          fillColor: sc,
          fillOpacity: 0,
          className: 'leaflet-pulse',
        });
        pulse.addTo(map);
        markersRef.current.push(pulse);
      }

      marker.addTo(map);
      markersRef.current.push(marker);
    });

    // Fit bounds if we have stations
    if (filtered.length > 0) {
      const latlngs = filtered.map((s: Station) => [s.location!.lat!, s.location!.lng!] as [number, number]);
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds.pad(0.3));
    }
  }, [stations, filterStatus, filterType, selected, hovered, mapReady]);

  const onlineCount = stations.filter(s => s.status === 'online').length;
  const filteredStations = stations.filter((s: Station) => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterType !== 'all' && s.type !== filterType) return false;
    return true;
  });

  const hasCoords = (s: Station) => s.location?.lat && s.location?.lng && s.location.lat !== 0;
  const geoStations = filteredStations.filter(hasCoords);
  const noCoordStations = filteredStations.filter((s: Station) => !hasCoords(s));

  return (
    <div style={{ display: 'flex', height: '100%', background: '#f5f6f8' }}>
      {/* Left sidebar */}
      <div style={{ width: 300, background: '#fff', borderRight: '1px solid #e8eaed', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <Title level={5} style={{ margin: 0 }}>🌍 电站分布</Title>
        </div>

        {/* Stats */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, background: '#f6f8fa', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e' }}>{stations.length}</div>
              <div style={{ fontSize: 11, color: '#8896a6' }}>全部电站</div>
            </div>
            <div style={{ flex: 1, background: '#f0fdf4', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>{onlineCount}</div>
              <div style={{ fontSize: 11, color: '#16a34a' }}>在线</div>
            </div>
            <div style={{ flex: 1, background: '#fef2f2', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444' }}>{stations.length - onlineCount}</div>
              <div style={{ fontSize: 11, color: '#ef4444' }}>离线</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ marginBottom: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>地图瓦片</Text>
            <Segmented
              value={tileLayer}
              onChange={(v) => setTileLayer(v as 'road' | 'satellite')}
              options={[
                { label: '🗺 道路', value: 'road' },
                { label: '🛰 卫星', value: 'satellite' },
              ]}
              style={{ marginTop: 4, width: '100%' }}
              block
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ flex: 1, height: 28, borderRadius: 6, border: '1px solid #e8eaed', fontSize: 12, padding: '0 6px', color: '#555' }}>
              <option value="all">全部状态</option>
              <option value="online">🟢 在线</option>
              <option value="offline">⚫ 离线</option>
              <option value="maintenance">🟡 维护中</option>
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              style={{ flex: 1, height: 28, borderRadius: 6, border: '1px solid #e8eaed', fontSize: 12, padding: '0 6px', color: '#555' }}>
              <option value="all">全部类型</option>
              <option value="solar">☀️ 光伏</option>
              <option value="storage">🔋 储能</option>
              <option value="ev_charger">🚗 充电桩</option>
              <option value="solar_storage">⚡ 光储充</option>
            </select>
          </div>
        </div>

        {/* Station list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
          ) : filteredStations.length === 0 ? (
            <Empty description="无匹配电站" style={{ marginTop: 40 }} />
          ) : (
            filteredStations.map(s => (
              <div
                key={s._id}
                onClick={() => { setSelected(s); if (hasCoords(s)) { const m = mapRef.current; if (m) m.setView([s.location!.lat!, s.location!.lng!], 12); } }}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  borderLeft: selected?._id === s._id ? '3px solid #e6342a' : '3px solid transparent',
                  background: selected?._id === s._id ? '#fef2f2' : hovered === s._id ? '#f9fafb' : 'transparent',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={() => setHovered(s._id)}
                onMouseLeave={() => setHovered(null)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: STATUS_COLOR[s.status], fontWeight: 600 }}>
                    {STATUS_TEXT[s.status] === '在线' ? '🟢' : STATUS_TEXT[s.status] === '离线' ? '⚫' : '🟡'}
                  </span>
                  <b style={{ fontSize: 13, color: '#1a1a2e', flex: 1 }}>{s.name}</b>
                  {!hasCoords(s) && <span title="无坐标" style={{ fontSize: 11, color: '#ccc' }}>📍—</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 2, paddingLeft: 18 }}>
                  <Tag style={{ fontSize: 10, padding: '0 4px', margin: 0, lineHeight: '16px' }}
                    color={TYPE_COLOR[s.type] || '#6b7280'}>{TYPE_TEXT[s.type] || s.type}</Tag>
                  <span style={{ fontSize: 11, color: '#8896a6' }}>{s.installedCapacity || s.peakPower || '-'} kW</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Legend */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>图例</Text>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(STATUS_TEXT).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[k], display: 'inline-block', flexShrink: 0 }}></span>
                <span style={{ fontSize: 10, color: '#666' }}>{v}</span>
              </div>
            ))}
          </div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6, marginBottom: 4 }}>类型</Text>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(TYPE_TEXT).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: TYPE_COLOR[k] || '#6b7280', display: 'inline-block' }}></span>
                <span style={{ fontSize: 10, color: '#666' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Map container */}
        <div id="station-map" style={{ width: '100%', height: '100%' }} />

        {/* Selected station info card */}
        {selected && (
          <div style={{
            position: 'absolute', top: 16, right: 16,
            background: '#fff', borderRadius: 12, padding: 16,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            minWidth: 240, maxWidth: 300, zIndex: 1000,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <b style={{ fontSize: 15, color: '#1a1a2e', display: 'block', marginBottom: 4 }}>{selected.name}</b>
                <Space size={4}>
                  <Tag style={{ fontSize: 11, padding: '0 6px' }}
                    color={STATUS_COLOR[selected.status]}>{STATUS_TEXT[selected.status]}</Tag>
                  <Tag style={{ fontSize: 11, padding: '0 6px' }}
                    color={TYPE_COLOR[selected.type]}>{TYPE_TEXT[selected.type]}</Tag>
                </Space>
              </div>
              <Button size="small" onClick={() => setSelected(null)}>✕</Button>
            </div>
            <div style={{ marginTop: 10, borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
              {selected.location?.address && (
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                  📍 {selected.location.address}
                </div>
              )}
              {selected.location?.lat && selected.location?.lng && (
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                  {selected.location.lat.toFixed(4)}, {selected.location.lng.toFixed(4)}
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#999' }}>装机容量</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>
                    {selected.installedCapacity || selected.peakPower || '-'} <span style={{ fontSize: 11, color: '#999', fontWeight: 400 }}>kW</span>
                  </div>
                </div>
              </div>
              <Button
                type="primary"
                size="small"
                style={{ marginTop: 10, width: '100%', background: '#e6342a', borderColor: '#e6342a' }}
                onClick={() => window.location.hash = `#/topology/${selected._id}`}
              >
                查看拓扑图 →
              </Button>
            </div>
          </div>
        )}

        {/* Map loading overlay */}
        {!mapReady && (
          <div style={{ position: 'absolute', inset: 0, background: '#f5f6f8', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
            <Spin tip="地图加载中..." />
          </div>
        )}

        {/* No geo stations notice */}
        {mapReady && noCoordStations.length > 0 && (
          <div style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)', color: '#fff', borderRadius: 8,
            padding: '6px 14px', fontSize: 12, zIndex: 900,
          }}>
            ⚠️ {noCoordStations.length} 个电站无坐标，未显示在地图上
          </div>
        )}
      </div>
    </div>
  );
}
