import { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Typography, Switch, Spin, Space, message } from 'antd';
import { useParams } from 'react-router-dom';
import { stationApi } from '../services/api';

const { Text, Title } = Typography;

// ─── Color Palette ──────────────────────────────────────────────────────────
const C = {
  solar: '#f59e0b',
  battery: '#2dd4bf',
  pcs: '#3b82f6',
  grid: '#8b5cf6',
  ev: '#f97316',
  bg: '#111827',
  border: 'rgba(255,255,255,0.06)',
  text: '#94a3b8',
  textBright: '#f1f5f9',
};

// ─── 2D SVG Topology ───────────────────────────────────────────────────────
function Topology2D({ data, width = 600, height = 300 }: {
  data: { solarPower: number; batterySOC: number; pcsPower: number; gridPower: number; evPower: number; solarStatus: string; batteryStatus: string; pcsStatus: string; gridStatus: string; evStatus: string };
  width?: number; height?: number;
}) {
  const cx = width / 2;
  const cy = height / 2;

  const nodes = [
    { id: 'solar', x: cx, y: 46, label: '光伏', value: data.solarPower.toFixed(0), unit: 'kW', color: C.solar, status: data.solarStatus },
    { id: 'pcs', x: cx - 90, y: cy + 40, label: 'PCS', value: data.pcsPower.toFixed(0), unit: 'kW', color: C.pcs, status: data.pcsStatus },
    { id: 'battery', x: cx + 90, y: cy + 40, label: '储能', value: data.batterySOC.toFixed(0), unit: '%', color: C.battery, status: data.batteryStatus },
    { id: 'grid', x: cx, y: cy + 115, label: '电网', value: Math.abs(data.gridPower).toFixed(0), unit: 'kW', color: C.grid, status: data.gridStatus },
    { id: 'ev', x: cx + 200, y: cy - 10, label: '充电桩', value: data.evPower.toFixed(0), unit: 'kW', color: C.ev, status: data.evStatus },
  ];

  const lines: [number, number, number, number][] = [
    [cx, 46 + 28, cx - 90, cy + 40 - 28],   // solar → pcs
    [cx, 46 + 28, cx + 90, cy + 40 - 28],    // solar → battery
    [cx - 90, cy + 40 + 28, cx, cy + 115 - 20], // pcs → grid
    [cx + 90, cy + 40 + 28, cx, cy + 115 + 5], // battery → grid
    [cx - 90, cy + 40, cx + 200 - 28, cy - 10], // pcs → ev
  ];

  const statusColor = (s: string) => s === 'online' ? '#34d399' : s === 'warning' ? '#fbbf24' : '#334155';

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', background: 'transparent', overflow: 'visible' }}
    >
      {/* Grid bg */}
      <defs>
        <pattern id="topo-grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
        </pattern>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width={width} height={height} fill="url(#topo-grid)" rx="8" />

      {/* Connection lines */}
      {lines.map(([x1, y1, x2, y2], i) => (
        <g key={i}>
          <line x1={y1} y1={x1} x2={y2} y2={x2}
            stroke="rgba(255,255,255,0.08)" strokeWidth={2}
            strokeDasharray="6 4"
          />
          {/* Arrow */}
          <circle cx={(x1+x2)/2} cy={(y1+y2)/2} r={3} fill="rgba(255,255,255,0.15)" />
        </g>
      ))}

      {/* Nodes */}
      {nodes.map(n => {
        const sc = statusColor(n.status);
        const r = n.id === 'ev' ? 22 : 26;
        return (
          <g key={n.id} transform={`translate(${n.x},${n.y})`}>
            {/* Outer glow */}
            {n.status !== 'offline' && (
              <circle r={r + 5} fill="none" stroke={n.color} strokeWidth={1} opacity={0.2}
                style={{ filter: 'blur(4px)' }} />
            )}
            {/* Main circle */}
            <circle r={r} fill={C.bg} stroke={sc} strokeWidth={2}
              style={{ filter: `drop-shadow(0 0 6px ${sc}60)` }} />
            {/* Inner dot */}
            <circle r={6} fill={sc} />
            {/* Label */}
            <text y={r + 14} textAnchor="middle"
              style={{ fontSize: 11, fill: C.text, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
              {n.label}
            </text>
            {/* Value */}
            <text y={r + 26} textAnchor="middle"
              style={{ fontSize: 10, fill: n.color, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
              {n.value}{n.unit}
            </text>
          </g>
        );
      })}

      {/* Direction labels */}
      <text x={cx - 30} y={cy + 10} style={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)', fontFamily: 'Inter, sans-serif' }}>DC</text>
      <text x={cx - 20} y={cy + 75} style={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)', fontFamily: 'Inter, sans-serif' }}>AC</text>
    </svg>
  );
}

// ─── 3D Digital Twin (lazy) ─────────────────────────────────────────────────
function Topology3D({ data }: { data: any }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let renderer: any;

    async function init() {
      setLoading(true);
      try {
        const THREE = await import('three');
        if (cancelled || !containerRef.current) return;

        const el = containerRef.current;
        const w = el.clientWidth || 600;
        const h = 280;

        // Check WebGL support
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
          setError(true);
          setLoading(false);
          return;
        }

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#070b14');
        scene.fog = new THREE.Fog('#070b14', 20, 50);

        const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
        camera.position.set(10, 7, 10);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        el.appendChild(renderer.domElement);

        // Lights
        scene.add(new THREE.AmbientLight('#ffffff', 0.5));
        const sun = new THREE.DirectionalLight('#ffe4a0', 1.0);
        sun.position.set(10, 15, 10);
        sun.castShadow = true;
        scene.add(sun);
        const fill = new THREE.PointLight('#2dd4bf', 0.4, 20);
        fill.position.set(-5, 3, 5);
        scene.add(fill);

        // Ground
        const groundMat = new THREE.MeshStandardMaterial({ color: '#0c1220', roughness: 0.9 });
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        const grid = new THREE.GridHelper(16, 16, '#1a2438', '#1a2438');
        scene.add(grid);

        // Solar panels
        const panelMat = new THREE.MeshStandardMaterial({ color: '#1a3a6e', metalness: 0.6, roughness: 0.3 });
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 4; col++) {
            const panel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.9), panelMat);
            panel.position.set(-3 + col * 1.8, 0.5 + row * 0.12, -3 + row * 1.2);
            panel.rotation.x = -0.4;
            panel.castShadow = true;
            scene.add(panel);
          }
        }

        // Battery
        const batMat = new THREE.MeshStandardMaterial({ color: '#2dd4bf', metalness: 0.5, roughness: 0.4, emissive: '#2dd4bf', emissiveIntensity: 0.1 });
        const battery = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 0.8), batMat);
        battery.position.set(3, 0.6, -2);
        battery.castShadow = true;
        scene.add(battery);

        // PCS
        const pcsMat = new THREE.MeshStandardMaterial({ color: '#3b82f6', metalness: 0.5, roughness: 0.4, emissive: '#3b82f6', emissiveIntensity: 0.1 });
        const pcs = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 0.6), pcsMat);
        pcs.position.set(3, 0.6, 0);
        pcs.castShadow = true;
        scene.add(pcs);

        // EV
        const evMat = new THREE.MeshStandardMaterial({ color: '#f97316', metalness: 0.4, roughness: 0.5 });
        const ev = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 0.4), evMat);
        ev.position.set(3, 0.5, 2);
        ev.castShadow = true;
        scene.add(ev);

        let frameId: number;
        function animate() {
          frameId = requestAnimationFrame(animate);
          scene.rotation.y += 0.004;
          renderer.render(scene, camera);
        }
        animate();

        const ro = new ResizeObserver(() => {
          if (!containerRef.current || !renderer) return;
          const w2 = containerRef.current.clientWidth;
          renderer.setSize(w2, 280);
          camera.aspect = w2 / 280;
          camera.updateProjectionMatrix();
        });
        ro.observe(el);

        setLoading(false);
      } catch (err) {
        console.error('3D init error:', err);
        setError(true);
        setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
      if (renderer) renderer.dispose();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  if (error) {
    return (
      <div style={{
        height: 280, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8,
        background: '#0c1220', borderRadius: 8,
        color: '#64748b', fontFamily: 'Inter, sans-serif',
      }}>
        <span style={{ fontSize: 32 }}>🖼️</span>
        <Text style={{ color: '#64748b', fontSize: 13 }}>3D 数字孪生在此设备上不可用</Text>
        <Text style={{ color: '#334155', fontSize: 11 }}>请使用支持 WebGL 的浏览器</Text>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#070b14', borderRadius: 8, zIndex: 10 }}>
          <Spin size="large" />
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: 280, borderRadius: 8, overflow: 'hidden' }} />
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KPICard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <Card
      size="small"
      style={{
        background: 'rgba(17,24,39,0.6)',
        border: `1px solid ${color}30`,
        borderRadius: 12,
        textAlign: 'center',
        backdropFilter: 'blur(8px)',
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

// ─── Main ─────────────────────────────────────────────────────────────────
export default function StationTopology() {
  const { id } = useParams();
  const [station, setStation] = useState<any>(null);
  const [liveData, setLiveData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [show3D, setShow3D] = useState(false);

  useEffect(() => {
    if (!id) return;
    stationApi.getAll().then(r => {
      if (r.success) {
        const s = r.data.find((s: any) => s._id === id);
        setStation(s);
        setLiveData({
          solarPower: s ? 847 + Math.random() * 50 : 0,
          batterySOC: s ? 75 + Math.random() * 10 : 0,
          pcsPower: s ? 320 + Math.random() * 30 : 0,
          gridPower: s ? -120 + Math.random() * 40 : 0,
          evPower: s ? 45 + Math.random() * 20 : 0,
          solarStatus: 'online',
          batteryStatus: 'online',
          pcsStatus: 'online',
          gridStatus: 'online',
          evStatus: Math.random() > 0.7 ? 'warning' : 'online',
        });
        setLoading(false);
      }
    });
  }, [id]);

  // Fake data refresh every 5s
  useEffect(() => {
    if (!station) return;
    const t = setInterval(() => {
      setLiveData(d => d ? {
        ...d,
        solarPower: 847 + Math.random() * 50,
        batterySOC: Math.min(100, Math.max(20, d.batterySOC + (Math.random() - 0.5) * 2)),
        pcsPower: 320 + Math.random() * 30,
        gridPower: -120 + Math.random() * 40,
        evPower: 45 + Math.random() * 20,
        evStatus: Math.random() > 0.85 ? 'warning' : 'online',
      } : d);
    }, 5000);
    return () => clearInterval(t);
  }, [station]);

  if (loading) {
    return (
      <div style={{ padding: 80, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!station) {
    return (
      <Card style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontFamily: 'Inter, sans-serif' }}>
          未找到该电站
        </div>
      </Card>
    );
  }

  const defaultData = {
    solarPower: 0, batterySOC: 0, pcsPower: 0, gridPower: 0, evPower: 0,
    solarStatus: 'offline', batteryStatus: 'offline', pcsStatus: 'offline',
    gridStatus: 'offline', evStatus: 'offline',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#f1f5f9', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
            ⚡ {station.name}
          </Title>
          <Text style={{ fontSize: 12, color: '#64748b', fontFamily: 'Inter, sans-serif' }}>
            {station.location} · 装机 {station.capacity || station.installedCapacity}MW
          </Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Space>
            <Text style={{ fontSize: 12, color: '#64748b', fontFamily: 'Inter, sans-serif' }}>2D</Text>
            <Switch
              checked={show3D}
              onChange={v => setShow3D(v)}
              size="small"
              style={{ background: show3D ? '#2dd4bf' : '#334155' }}
            />
            <Text style={{ fontSize: 12, color: '#64748b', fontFamily: 'Inter, sans-serif' }}>3D孪生</Text>
          </Space>
          <Tag style={{
            background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.25)',
            color: '#2dd4bf', fontFamily: 'Inter, sans-serif', fontSize: 11, borderRadius: 20,
          }}>
            ● 实时数据
          </Tag>
        </div>
      </div>

      {/* Live KPIs */}
      {liveData && (
        <Row gutter={[10, 10]}>
          {[
            { label: '光伏出力', value: liveData.solarPower.toFixed(0), unit: 'kW', color: C.solar },
            { label: '电池SOC', value: liveData.batterySOC.toFixed(0), unit: '%', color: C.battery },
            { label: 'PCS功率', value: liveData.pcsPower.toFixed(0), unit: 'kW', color: C.pcs },
            { label: '电网交互', value: Math.abs(liveData.gridPower).toFixed(0), unit: 'kW', color: C.grid },
            { label: '充电桩', value: liveData.evPower.toFixed(0), unit: 'kW', color: C.ev },
          ].map(kpi => (
            <Col xs={12} sm={8} md={4} key={kpi.label}>
              <KPICard {...kpi} />
            </Col>
          ))}
        </Row>
      )}

      {/* Topology / 3D */}
      <Card
        style={{
          background: 'rgba(17,24,39,0.5)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16,
          backdropFilter: 'blur(8px)',
        }}
        styles={{ body: { padding: 16 } }}
      >
        {show3D ? (
          <Topology3D data={liveData} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <Topology2D
              data={liveData || defaultData}
              width={Math.min(620, typeof window !== 'undefined' ? window.innerWidth - 100 : 600)}
              height={300}
            />
          </div>
        )}
      </Card>

      {/* Energy flow summary */}
      {liveData && (
        <Card
          size="small"
          style={{
            background: 'rgba(17,24,39,0.5)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12, backdropFilter: 'blur(8px)',
          }}
          styles={{ body: { padding: '10px 16px' } }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
            <Text style={{ color: '#64748b', fontSize: 11, fontWeight: 500 }}>能量流向</Text>
            <Text style={{ color: C.solar }}>☀️ {liveData.solarPower.toFixed(0)}kW</Text>
            <Text style={{ color: '#64748b' }}>→</Text>
            <Text style={{ color: C.pcs }}>⚡PCS {liveData.pcsPower.toFixed(0)}kW</Text>
            <Text style={{ color: '#64748b' }}>→</Text>
            <Text style={{ color: liveData.gridPower > 0 ? '#34d399' : C.grid }}>
              {liveData.gridPower > 0 ? '⚡馈电' : '🔌取电'} {Math.abs(liveData.gridPower).toFixed(0)}kW
            </Text>
            <Text style={{ color: '#64748b' }}>|</Text>
            <Text style={{ color: C.battery }}>🔋{liveData.batterySOC.toFixed(0)}%</Text>
            <Text style={{ color: '#64748b' }}>|</Text>
            <Text style={{ color: C.ev }}>🚗{liveData.evPower.toFixed(0)}kW</Text>
          </div>
        </Card>
      )}
    </div>
  );
}
