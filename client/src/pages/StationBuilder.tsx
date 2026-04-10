import { useState, useRef, useEffect } from 'react';
import { Card, Form, Input, InputNumber, Button, Space, Tag, Typography, Divider, message, Row, Col, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { SaveOutlined, ThunderboltOutlined, BatteryOutlined, ApiOutlined, CarOutlined, NodeIndexOutlined, CheckCircleOutlined, EnvironmentOutlined, AimOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

// ─── Equipment catalog ────────────────────────────────────────────────────────
interface EquipItem {
  type: string; label: string; icon: any; color: string; unit: string;
  powerLabel: string; capacityLabel?: string;
}

const EQUIP_LIST: EquipItem[] = [
  { type: 'pv', label: '光伏组串', icon: '☀️', color: '#d97706', unit: 'kW', powerLabel: '单串功率', capacityLabel: '' },
  { type: 'battery', label: '储能电池', icon: '🔋', color: '#e6342a', unit: 'kWh', powerLabel: '放电功率', capacityLabel: '储能容量' },
  { type: 'pcs', label: 'PCS变流器', icon: '⚡', color: '#2563eb', unit: 'kW', powerLabel: '额定功率' },
  { type: 'transformer', label: '变压器', icon: '🔌', color: '#7c3aed', unit: 'kVA', powerLabel: '额定容量' },
  { type: 'grid', label: '电网接入', icon: '🏭', color: '#4f46e5', unit: 'kW', powerLabel: '并网容量' },
  { type: 'ev', label: '充电桩', icon: '🚗', color: '#ea580c', unit: 'kW', powerLabel: '充电功率' },
];

interface ConfiguredEquip {
  type: string; label: string; icon: any; color: string;
  count: number; power: number; capacity?: number;
}

// ─── Step 1: Choose station type ──────────────────────────────────────────────
function StepStationInfo({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [mapKey, setMapKey] = useState(0);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapInstRef = useRef<any>(null);

  // Show mini map when we have coordinates
  useEffect(() => {
    const lat = data.lat || 0;
    const lng = data.lng || 0;
    if (!lat || !lng || lat === 0) return;
    if (!mapDivRef.current) return;

    import('leaflet').then(L => {
      if (mapInstRef.current) {
        mapInstRef.current.remove();
        mapInstRef.current = null;
      }
      const map = L.map(mapDivRef.current, {
        center: [lat, lng],
        zoom: 13,
        zoomControl: true,
        dragging: true,
        scrollWheelZoom: false,
      });
      mapInstRef.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '', maxZoom: 18,
      }).addTo(map);
      // Draggable marker
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on('dragend', (e: any) => {
        const { lat: l, lng: g } = e.target.getLatLng();
        onChange({ ...data, lat: l, lng: g });
      });
      // Click to set marker
      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng);
        onChange({ ...data, lat: e.latlng.lat, lng: e.latlng.lng });
      });
    });
    return () => {
      if (mapInstRef.current) {
        mapInstRef.current.remove();
        mapInstRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.lat, data.lng, mapKey]);

  // Geocode address → lat/lng using Nominatim
  async function handleGeoCode() {
    const addr = data.location || data.address || '';
    if (!addr.trim()) {
      message.warning('请先填写地址');
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    try {
      // Try China-focused search first, then general
      const queries = [
        `${addr} 中国`,
        addr,
      ];
      for (const q of queries) {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
          { headers: { 'Accept-Language': 'zh-CN' } }
        );
        const results = await res.json();
        if (results && results.length > 0) {
          const r = results[0];
          const lat = parseFloat(r.lat);
          const lng = parseFloat(r.lon);
          onChange({ ...data, lat, lng });
          setMapKey(k => k + 1);
          message.success(`坐标已定位：${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          setGeoLoading(false);
          return;
        }
      }
      setGeoError('未找到该地址，请尝试更详细的地址或手动输入坐标');
    } catch (e: any) {
      setGeoError('地理编码失败，请检查网络或手动输入坐标');
    } finally {
      setGeoLoading(false);
    }
  }

  // Use browser geolocation
  function handleGeoLocate() {
    if (!navigator.geolocation) {
      message.warning('浏览器不支持定位功能');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        onChange({ ...data, lat, lng });
        setMapKey(k => k + 1);
        message.success(`已获取当前位置：${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      },
      () => message.error('获取定位失败，请检查定位权限'),
      { timeout: 10000 }
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <Text style={{ fontSize: 12, color: '#4a5568', fontFamily: 'Inter, sans-serif', display: 'block', marginBottom: 8 }}>电站名称</Text>
        <Input
          value={data.name || ''}
          onChange={e => onChange({ ...data, name: e.target.value })}
          placeholder="例如：苏州工业园光储示范站"
          size="large"
          style={{ background: '#f5f6f8', border: '1px solid rgba(255,255,255,0.07)', color: '#1a1a2e', fontFamily: 'Inter, sans-serif', borderRadius: 10 }}
        />
      </div>

      {/* Address + geocode */}
      <div>
        <Text style={{ fontSize: 12, color: '#4a5568', fontFamily: 'Inter, sans-serif', display: 'block', marginBottom: 8 }}>
          地址（用于地图标注）
        </Text>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={data.location || ''}
            onChange={e => onChange({ ...data, location: e.target.value })}
            placeholder="输入完整地址，如：江苏省苏州市工业园区星湖街328号"
            style={{ background: '#f5f6f8', border: '1px solid rgba(255,255,255,0.07)', color: '#1a1a2e', fontFamily: 'Inter, sans-serif', borderRadius: '10px 0 0 10px', flex: 1 }}
          />
          <Button
            icon={<AimOutlined />}
            onClick={handleGeoLocate}
            style={{ borderRadius: 0, background: '#f5f6f8' }}
            title="获取当前位置"
          />
          <Button
            icon={<EnvironmentOutlined />}
            onClick={handleGeoCode}
            loading={geoLoading}
            style={{ borderRadius: '0 10px 10px 0', background: '#e6342a', color: '#fff', borderColor: '#e6342a' }}
          >
            定位
          </Button>
        </Space.Compact>
        {geoError && <div style={{ fontSize: 11, color: '#e6342a', marginTop: 4 }}>{geoError}</div>}
      </div>

      {/* Coordinates */}
      <Row gutter={12}>
        <Col span={12}>
          <Text style={{ fontSize: 12, color: '#4a5568', fontFamily: 'Inter, sans-serif', display: 'block', marginBottom: 8 }}>纬度 (lat)</Text>
          <InputNumber
            value={data.lat || 0}
            onChange={v => { onChange({ ...data, lat: v || 0 }); setMapKey(k => k + 1); }}
            placeholder="如：31.2989"
            step={0.0001}
            style={{ width: '100%', background: '#f5f6f8', border: '1px solid rgba(255,255,255,0.07)', color: '#1a1a2e', fontFamily: 'Inter, sans-serif', borderRadius: 10 }}
          />
        </Col>
        <Col span={12}>
          <Text style={{ fontSize: 12, color: '#4a5568', fontFamily: 'Inter, sans-serif', display: 'block', marginBottom: 8 }}>经度 (lng)</Text>
          <InputNumber
            value={data.lng || 0}
            onChange={v => { onChange({ ...data, lng: v || 0 }); setMapKey(k => k + 1); }}
            placeholder="如：120.6853"
            step={0.0001}
            style={{ width: '100%', background: '#f5f6f8', border: '1px solid rgba(255,255,255,0.07)', color: '#1a1a2e', fontFamily: 'Inter, sans-serif', borderRadius: 10 }}
          />
        </Col>
      </Row>

      {/* Mini map preview */}
      {data.lat && data.lng && data.lat !== 0 && (
        <div>
          <Text style={{ fontSize: 12, color: '#4a5568', fontFamily: 'Inter, sans-serif', display: 'block', marginBottom: 6 }}>
            地图预览 {data.location && `— ${data.location}`}
          </Text>
          <div
            ref={mapDivRef}
            key={mapKey}
            style={{ height: 200, borderRadius: 10, overflow: 'hidden', border: '1px solid #e8eaed' }}
          />
          <div style={{ fontSize: 11, color: '#8896a6', marginTop: 4 }}>
            💡 点击地图可调整位置，或拖动标记精确定位
          </div>
        </div>
      )}

      <div>
        <Text style={{ fontSize: 12, color: '#4a5568', fontFamily: 'Inter, sans-serif', display: 'block', marginBottom: 8 }}>电站规模</Text>
        <Row gutter={12}>
          <Col span={12}>
            <InputNumber
              value={data.capacity}
              onChange={v => onChange({ ...data, capacity: v || 0 })}
              placeholder="装机容量"
              suffix="kW"
              min={0}
              size="large"
              style={{ width: '100%', background: '#f5f6f8', border: '1px solid rgba(255,255,255,0.07)', color: '#1a1a2e', fontFamily: 'Inter, sans-serif', borderRadius: 10 }}
            />
          </Col>
          <Col span={12}>
            <Input
              value={data.owner || ''}
              onChange={e => onChange({ ...data, owner: e.target.value })}
              placeholder="业主单位"
              size="large"
              style={{ background: '#f5f6f8', border: '1px solid rgba(255,255,255,0.07)', color: '#1a1a2e', fontFamily: 'Inter, sans-serif', borderRadius: 10 }}
            />
          </Col>
        </Row>
      </div>
    </div>
  );
}

// ─── Step 2: Configure equipment ──────────────────────────────────────────────
function StepEquipConfig({ equips, onChange }: { equips: ConfiguredEquip[]; onChange: (e: ConfiguredEquip[]) => void }) {
  function update(index: number, field: string, value: number) {
    const next = [...equips];
    (next[index] as any)[field] = value;
    onChange(next);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {EQUIP_LIST.map(eq => {
        const configured = equips.find(e => e.type === eq.type);
        const count = configured?.count || 0;
        return (
          <div key={eq.type} style={{
            padding: '14px 16px',
            background: count > 0 ? `${eq.color}0a` : '#f5f6f8',
            border: `1px solid ${count > 0 ? eq.color + '40' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ fontSize: 28, flexShrink: 0 }}>{eq.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Text style={{ fontSize: 14, color: '#1a1a2e', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>{eq.label}</Text>
                {count > 0 && <Tag style={{ background: eq.color + '20', border: 'none', color: eq.color, fontSize: 10, borderRadius: 20 }}>{count}台</Tag>}
              </div>
              {count > 0 && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <InputNumber
                    min={0} max={999} value={count}
                    onChange={v => {
                      const arr = [...equips.filter(e => e.type !== eq.type)];
                      if (v && v > 0) arr.push({ type: eq.type, label: eq.label, icon: eq.icon, color: eq.color, count: v, power: configured?.power || 100, capacity: eq.type === 'battery' ? (configured?.capacity || 1000) : undefined });
                      onChange(arr);
                    }}
                    style={{ width: 64, background: '#f5f6f8', border: '1px solid ' + eq.color + '40', color: '#1a1a2e', fontFamily: 'JetBrains Mono, monospace', borderRadius: 6, height: 34 }}
                  />
                  <div style={{ position: 'relative', flex: 1 }}>
                    <InputNumber
                      min={0} value={configured?.power || 0}
                      onChange={v => update(equips.findIndex(e => e.type === eq.type), 'power', v || 0)}
                      style={{ width: '100%', background: '#f5f6f8', border: '1px solid rgba(255,255,255,0.07)', color: '#1a1a2e', fontFamily: 'JetBrains Mono, monospace', borderRadius: 6, height: 34 }}
                    />
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#8896a6', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', pointerEvents: 'none' }}>{eq.unit}</span>
                  </div>
                  {eq.type === 'battery' && (
                    <>
                      <span style={{ color: '#8896a6', fontSize: 12, flexShrink: 0 }}>×</span>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <InputNumber
                          min={0} value={configured?.capacity || 0}
                          onChange={v => update(equips.findIndex(e => e.type === eq.type), 'capacity', v || 0)}
                          style={{ width: '100%', background: '#f5f6f8', border: '1px solid rgba(255,255,255,0.07)', color: '#1a1a2e', fontFamily: 'JetBrains Mono, monospace', borderRadius: 6, height: 34 }}
                        />
                        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#8896a6', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', pointerEvents: 'none' }}>kWh</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            {count === 0 && (
              <Button size="small"
                onClick={() => onChange([...equips, { type: eq.type, label: eq.label, icon: eq.icon, color: eq.color, count: 1, power: 100, capacity: eq.type === 'battery' ? 1000 : undefined }])}
                style={{ borderColor: eq.color + '60', color: eq.color, fontSize: 12, borderRadius: 6, background: 'transparent' }}>
                + 添加
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 3: Summary & save ──────────────────────────────────────────────────
function StepSummary({ data, stationData, onSave, saving }: { data: any; stationData: any; onSave: () => void; saving: boolean }) {
  const totalPV = (data.find((e: any) => e.type === 'pv')?.power || 0) * (data.find((e: any) => e.type === 'pv')?.count || 0);
  const totalBattery = (data.find((e: any) => e.type === 'battery')?.power || 0) * (data.find((e: any) => e.type === 'battery')?.count || 0);
  const totalPCS = (data.find((e: any) => e.type === 'pcs')?.power || 0) * (data.find((e: any) => e.type === 'pcs')?.count || 0);
  const totalEV = (data.find((e: any) => e.type === 'ev')?.power || 0) * (data.find((e: any) => e.type === 'ev')?.count || 0);
  const investEst = totalPV * 4000 + totalBattery * 1500 + totalPCS * 800 + totalEV * 300;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Info */}
      <div style={{ background: '#f5f6f8', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '16px' }}>
        <Row gutter={[16, 12]}>
          <Col span={12}><Text style={{ fontSize: 11, color: '#8896a6' }}>电站名称</Text><div style={{ fontSize: 14, color: '#1a1a2e', fontWeight: 600, marginTop: 2 }}>{stationData.name || '-'}</div></Col>
          <Col span={12}><Text style={{ fontSize: 11, color: '#8896a6' }}>建设地点</Text><div style={{ fontSize: 14, color: '#1a1a2e', marginTop: 2 }}>{stationData.location || '-'}</div></Col>
          <Col span={12}><Text style={{ fontSize: 11, color: '#8896a6' }}>装机容量</Text><div style={{ fontSize: 14, color: '#e6342a', fontWeight: 600, marginTop: 2 }}>{stationData.capacity || 0} kW</div></Col>
          <Col span={12}><Text style={{ fontSize: 11, color: '#8896a6' }}>估算投资</Text><div style={{ fontSize: 14, color: '#d97706', fontWeight: 600, marginTop: 2 }}>{(investEst / 10000).toFixed(0)}万元</div></Col>
        </Row>
      </div>

      {/* Equipment list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Text style={{ fontSize: 12, color: '#8896a6', fontFamily: 'Inter, sans-serif', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>设备清单</Text>
        {data.filter((e: any) => e.count > 0).map((eq: any) => (
          <div key={eq.type} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f5f6f8', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
            <span style={{ fontSize: 20 }}>{eq.icon}</span>
            <div style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: '#1a1a2e', fontFamily: 'Inter, sans-serif' }}>{eq.label}</Text>
            </div>
            <Text style={{ fontSize: 12, color: eq.color, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
              {eq.count}台 × {eq.power}{eq.type === 'battery' ? 'kWh' : 'kW'}
            </Text>
          </div>
        ))}
        {data.filter((e: any) => e.count > 0).length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: '#b8c0cc', fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
            暂未配置设备
          </div>
        )}
      </div>

      <Button
        type="primary"
        icon={<SaveOutlined />}
        loading={saving}
        onClick={onSave}
        block
        size="large"
        style={{
          height: 50, borderRadius: 10,
          fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 15,
          background: 'linear-gradient(135deg, #e6342a, #e6342a)',
          border: 'none', boxShadow: '0 4px 16px rgba(45,212,191,0.25)',
        }}
      >
        创建电站
      </Button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────
const STEPS = ['基本信息', '设备配置', '确认保存'];

export default function StationBuilder() {
  const [step, setStep] = useState(0);
  const [stationData, setStationData] = useState({ name: '苏州工业园光储示范站', location: '江苏省苏州市工业园区', lat: 0, lng: 0, capacity: 1000, owner: 'Risen' });
  const [equips, setEquips] = useState<ConfiguredEquip[]>([
    { type: 'pv', label: '光伏组串', icon: '☀️', color: '#d97706', count: 10, power: 100 },
    { type: 'battery', label: '储能电池', icon: '🔋', color: '#e6342a', count: 2, power: 500, capacity: 2000 },
    { type: 'pcs', label: 'PCS变流器', icon: '⚡', color: '#2563eb', count: 2, power: 500 },
  ]);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  async function handleSave() {
    if (!stationData.name.trim()) { message.warning('请填写电站名称'); return; }
    setSaving(true);
    const totalPV = (equips.find(e => e.type === 'pv')?.power || 0) * (equips.find(e => e.type === 'pv')?.count || 0);
    const payload = {
      name: stationData.name,
      location: { address: stationData.location || '', lat: stationData.lat || 0, lng: stationData.lng || 0 },
      capacity: totalPV / 1000,
      installedCapacity: totalPV,
      peakPower: totalPV,
      type: 'solar_storage',
      status: 'offline',
      owner: stationData.owner,
      contact: 'admin@risen.com',
      gridConnectionDate: new Date().toISOString().slice(0, 10),
      equipment: equips.filter(e => e.count > 0).map(e => ({ type: e.type, name: e.label, count: e.count, power: e.power, capacity: e.capacity })),
    };
    try {
      const r = await fetch('/api/stations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (r.ok && d.success) {
        message.success(`✅ 电站"${stationData.name}"已创建！`);
        setTimeout(() => navigate('/stations'), 1200);
      } else {
        throw new Error(d.error || '创建失败');
      }
    } catch (err: any) {
      message.error(`创建失败: ${err.message}`);
    }
    setSaving(false);
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Title level={3} style={{ margin: 0, color: '#1a1a2e', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
          🏗️ 可视化建站
        </Title>
        <Text style={{ fontSize: 13, color: '#8896a6', fontFamily: 'Inter, sans-serif', marginTop: 4, display: 'block' }}>
          一步一步配置你的光储电站
        </Text>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28, background: '#ffffff', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 20px' }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: i <= step ? '#e6342a' : '#f5f6f8',
              color: i <= step ? '#000' : '#8896a6',
              fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700, flexShrink: 0,
              border: i < step ? '2px solid #e6342a' : 'none',
              boxShadow: i <= step ? '0 0 12px rgba(45,212,191,0.3)' : 'none',
            }}>
              {i < step ? <CheckCircleOutlined style={{ fontSize: 14 }} /> : i + 1}
            </div>
            <Text style={{ fontSize: 13, color: i <= step ? '#1a1a2e' : '#8896a6', fontFamily: 'Inter, sans-serif', fontWeight: i === step ? 600 : 400 }}>
              {s}
            </Text>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < step ? '#e6342a' : '#f5f6f8', borderRadius: 1, margin: '0 8px', minWidth: 20 }} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card
        style={{ background: '#ffffff', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }}
        bodyStyle={{ padding: '28px 24px' }}
      >
        {step === 0 && <StepStationInfo data={stationData} onChange={setStationData} />}
        {step === 1 && <StepEquipConfig equips={equips} onChange={setEquips} />}
        {step === 2 && <StepSummary data={equips} stationData={stationData} onSave={handleSave} saving={saving} />}

        <Divider style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '24px 0' }} />

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            style={{ background: '#f5f6f8', border: '1px solid rgba(255,255,255,0.07)', color: '#4a5568', fontFamily: 'Inter, sans-serif', borderRadius: 8, height: 40, padding: '0 20px' }}
          >
            上一步
          </Button>
          {step < 2 ? (
            <Button
              type="primary"
              onClick={() => setStep(s => Math.min(2, s + 1))}
              style={{ background: '#e6342a', border: 'none', color: '#000', fontFamily: 'Inter, sans-serif', fontWeight: 600, borderRadius: 8, height: 40, padding: '0 28px', boxShadow: '0 2px 8px rgba(45,212,191,0.3)' }}
            >
              下一步 →
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
              style={{ background: 'linear-gradient(135deg, #e6342a, #e6342a)', border: 'none', color: '#000', fontFamily: 'Inter, sans-serif', fontWeight: 700, borderRadius: 8, height: 40, boxShadow: '0 2px 8px rgba(45,212,191,0.3)' }}
            >
              保存电站
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
