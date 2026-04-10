import { useEffect, useRef, useState } from 'react';
import { Card, Typography, Tag, Space, Spin, Empty } from 'antd';
import { stationApi } from '../services/api';

const { Title, Text } = Typography;

// Station type matching API response
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
}

const TYPE_COLOR: Record<string, string> = {
  solar: '#d97706',
  storage: '#e6342a',
  solar_storage: '#16a34a',
};

const TYPE_TEXT: Record<string, string> = {
  solar: '光伏',
  storage: '储能',
  solar_storage: '光储一体',
};

export default function StationMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasGeo, setHasGeo] = useState<number>(0);

  useEffect(() => {
    stationApi.getAll().then((r: any) => {
      if (r.success) {
        setStations(r.data);
        const geo = r.data.filter((s: Station) => s.location?.lat !== 0 && s.location?.lng !== 0).length;
        setHasGeo(geo);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!mapRef.current || loading || mapInstanceRef.current) return;

    // Dynamically import leaflet to avoid SSR issues
    import('leaflet').then (L => {
      if (!mapRef.current || mapInstanceRef.current) return;

      // China center: lat=35, lng=105, zoom=4
      const map = L.map(mapRef.current).setView([35, 105], 4);
      mapInstanceRef.current = map;

      // OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      // Custom solar icon
      const solarIcon = L.divIcon({
        html: `<div style="
          width:36px;height:36px;border-radius:50%;
          background:#fff;border:3px solid #d97706;
          box-shadow:0 2px 8px rgba(217,119,6,0.4);
          display:flex;align-items:center;justify-content:center;
          font-size:18px;line-height:36px;text-align:center;
        ">☀️</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
        className: '',
      });

      const storageIcon = L.divIcon({
        html: `<div style="
          width:36px;height:36px;border-radius:50%;
          background:#fff;border:3px solid #e6342a;
          box-shadow:0 2px 8px rgba(230,52,42,0.4);
          display:flex;align-items:center;justify-content:center;
          font-size:18px;line-height:36px;text-align:center;
        ">🔋</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
        className: '',
      });

      const hybridIcon = L.divIcon({
        html: `<div style="
          width:36px;height:36px;border-radius:50%;
          background:#fff;border:3px solid #16a34a;
          box-shadow:0 2px 8px rgba(22,163,74,0.4);
          display:flex;align-items:center;justify-content:center;
          font-size:18px;line-height:36px;text-align:center;
        ">⚡</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
        className: '',
      });

      const unknownIcon = L.divIcon({
        html: `<div style="
          width:36px;height:36px;border-radius:50%;
          background:#fff;border:3px solid #8896a6;
          box-shadow:0 2px 8px rgba(136,150,166,0.3);
          display:flex;align-items:center;justify-content:center;
          font-size:18px;line-height:36px;text-align:center;
        ">📍</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
        className: '',
      });

      const getIcon = (type: string) => {
        if (type === 'solar_storage') return hybridIcon;
        if (type === 'solar') return solarIcon;
        if (type === 'storage') return storageIcon;
        return unknownIcon;
      };

      // Add markers
      let validCount = 0;
      stations.forEach((s: Station) => {
        const lat = s.location?.lat;
        const lng = s.location?.lng;
        if (!lat || !lng || lat === 0 || lng === 0) return;

        validCount++;
        const marker = L.marker([lat, lng], { icon: getIcon(s.type) }).addTo(map);

        const capacity = s.capacity || s.installedCapacity || s.peakPower || 0;
        const statusColor = s.status === 'online' ? '#16a34a' : s.status === 'offline' ? '#b8c0cc' : '#d97706';
        const statusText = s.status === 'online' ? '在线' : s.status === 'offline' ? '离线' : '维护中';

        marker.bindPopup(`
          <div style="min-width:180px;font-family:Inter,sans-serif">
            <div style="font-size:14px;font-weight:700;color:#1a1a2e;margin-bottom:4px">${s.name}</div>
            <div style="font-size:11px;color:#8896a6;margin-bottom:8px">${s.location.address || '地址未知'}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <span style="background:#fef2f2;color:#e6342a;border:1px solid #fecaca;border-radius:12px;padding:1px 8px;font-size:10px">${TYPE_TEXT[s.type] || s.type}</span>
              <span style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:12px;padding:1px 8px;font-size:10px">● ${statusText}</span>
            </div>
            <div style="margin-top:8px;font-size:12px;color:#4a5568">
              <div>装机容量: <b style="color:#1a1a2e;font-family:JetBrains Mono,monospace">${capacity} ${capacity < 10 ? 'MW' : 'kW'}</b></div>
              ${s.owner ? `<div style="margin-top:2px">业主: ${s.owner}</div>` : ''}
            </div>
            <a href="/stations/${s._id}/topology" style="display:inline-block;margin-top:8px;font-size:11px;color:#2563eb;text-decoration:none">查看拓扑 →</a>
          </div>
        `);
      });

      // Fit bounds if we have markers
      if (validCount > 0) {
        const bounds = L.latLngBounds(stations
          .filter((s: Station) => s.location?.lat !== 0 && s.location?.lng !== 0)
          .map((s: Station) => [s.location.lat, s.location.lng] as [number, number])
        );
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    });
  }, [loading, stations]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin tip="加载地图..." />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>📍 电站地理分布</Title>
        <Text style={{ fontSize: 13, color: '#8896a6' }}>
          共 {stations.length} 座电站，其中 {hasGeo} 座已标注坐标
          {hasGeo < stations.length && <Tag style={{ marginLeft: 8, background: '#fffbeb', color: '#d97706', borderColor: '#fde68a' }}>⚠️ 部分电站缺少坐标</Tag>}
        </Text>
      </div>

      {stations.length === 0 ? (
        <Card style={{ border: '1px solid #e8eaed', borderRadius: 14 }}>
          <Empty description="暂无电站数据" />
        </Card>
      ) : (
        <>
          {/* Map */}
          <Card
            style={{ border: '1px solid #e8eaed', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
            styles={{ body: { padding: 0 } }}
          >
            <div ref={mapRef} style={{ height: 520, width: '100%' }} />
          </Card>

          {/* Station list below map */}
          <Card title="所有电站" size="small" style={{ marginTop: 12, border: '1px solid #e8eaed', borderRadius: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {stations.map(s => {
                const hasGeoData = s.location?.lat !== 0 && s.location?.lng !== 0;
                return (
                  <div key={s._id} style={{
                    padding: '10px 12px', borderRadius: 10,
                    background: '#f8f9fa', border: '1px solid #e8eaed',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: `${TYPE_COLOR[s.type] || '#8896a6'}18`,
                      border: `2px solid ${TYPE_COLOR[s.type] || '#8896a6'}50`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                    }}>
                      {s.type === 'solar_storage' ? '⚡' : s.type === 'solar' ? '☀️' : '🔋'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#8896a6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.location?.address || '无地址'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      <Tag style={{ fontSize: 10, padding: '0 6px', background: 'transparent', borderColor: TYPE_COLOR[s.type] || '#e8eaed', color: TYPE_COLOR[s.type] || '#8896a6' }}>
                        {TYPE_TEXT[s.type] || s.type}
                      </Tag>
                      {hasGeoData ? (
                        <span style={{ fontSize: 10, color: '#16a34a' }}>📍 已标注</span>
                      ) : (
                        <span style={{ fontSize: 10, color: '#d97706' }}>📍 待完善</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
