import { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Statistic, Tag, Space, Typography, Select, Switch, Spin } from 'antd';
import { useParams } from 'react-router-dom';
import { stationApi } from '../services/api';

const { Text, Title } = Typography;

// ─── Power Flow Constants ──────────────────────────────────────────────────
const SOLAR_COLOR = '#f59e0b';
const BATTERY_COLOR = '#00e5c0';
const PCS_COLOR = '#3b82f6';
const GRID_COLOR = '#8b5cf6';
const EV_COLOR = '#f97316';

function PowerNode({ x, y, label, value, unit, color, status, size = 52 }: {
  x: number; y: number; label: string; value: string | number; unit: string;
  color: string; status: 'online' | 'warning' | 'offline'; size?: number;
}) {
  const r = size / 2;
  const glow = status === 'online' ? `0 0 12px ${color}80` : status === 'warning' ? '0 0 12px #ffab4080' : 'none';
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Glow ring */}
      {status !== 'offline' && (
        <circle r={r + 6} fill="none" stroke={color} strokeWidth={1} opacity={0.3}
          style={{ filter: `blur(4px)` }} />
      )}
      {/* Main circle */}
      <circle r={r} fill="#141c2e" stroke={color} strokeWidth={2}
        style={{ filter: `drop-shadow(0 0 6px ${color}60)` }} />
      {/* Inner dot */}
      <circle r={8} fill={color} opacity={status === 'online' ? 1 : 0.3} />
      {/* Label */}
      <text y={r + 16} textAnchor="middle"
        style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fill: '#8899aa', fontWeight: 500 }}>
        {label}
      </text>
      {/* Value */}
      <text y={r + 28} textAnchor="middle"
        style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fill: color, fontWeight: 700 }}>
        {value}{unit}
      </text>
    </g>
  );
}

function FlowLine({ x1, y1, x2, y2, color, flow, animated }: {
  x1: number; y1: number; x2: number; y2: number;
  color: string; flow: number; animated?: boolean;
}) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color} strokeWidth={2} opacity={0.6}
        strokeDasharray={animated && flow > 0 ? '6 4' : 'none'}
        style={animated && flow > 0 ? { animation: 'flowDash 1s linear infinite' } : {}} />
      {/* Arrow */}
      <polygon
        points={`0,-4} ${8,0} ${0,4}`}
        fill={color} opacity={0.8}
        transform={`translate(${mx},${my}) rotate(${angle})`}
      />
    </g>
  );
}

// ─── Mini 2D Topology ───────────────────────────────────────────────────────
function MiniTopology({ data, width = 600, height = 320 }: {
  data: {
    solarPower: number; batterySOC: number; pcsPower: number;
    gridPower: number; evPower: number;
    solarStatus: string; batteryStatus: string; pcsStatus: string;
    gridStatus: string; evStatus: string;
  }; width?: number; height?: number;
}) {
  const cx = width / 2;
  const cy = height / 2;
  // Node positions
  const solar = { x: cx, y: 50 };
  const pcs = { x: cx - 100, y: cy + 30 };
  const battery = { x: cx + 100, y: cy + 30 };
  const grid = { x: cx, y: cy + 110 };
  const ev = { x: cx + 200, y: cy - 20 };

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
      style={{ background: 'transparent', overflow: 'visible' }}>
      <style>{`
        @keyframes flowDash {
          to { stroke-dashoffset: -20; }
        }
      `}</style>
      {/* Grid bg */}
      <defs>
        <pattern id="topo-grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e2d42" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="url(#topo-grid)" rx="8" />

      {/* Flow lines */}
      <FlowLine x1={solar.x} y1={solar.y + 26} x2={pcs.x} y2={pcs.y - 26}
        color={SOLAR_COLOR} flow={data.solarPower} animated />
      <FlowLine x1={solar.x} y1={solar.y + 26} x2={battery.x} y2={battery.y - 26}
        color={SOLAR_COLOR} flow={data.solarPower} animated />
      <FlowLine x1={pcs.x} y1={pcs.y + 26} x2={grid.x} y2={grid.y - 26}
        color={GRID_COLOR} flow={data.gridPower} animated />
      <FlowLine x1={battery.x} y1={battery.y + 26} x2={grid.x} y2={grid.y + 10}
        color={BATTERY_COLOR} flow={data.batterySOC} animated />
      <FlowLine x1={pcs.x} y1={pcs.y + 10} x2={ev.x - 26} y2={ev.y}
        color={EV_COLOR} flow={data.evPower} animated />

      {/* Nodes */}
      <PowerNode x={solar.x} y={solar.y} label="光伏" value={data.solarPower.toFixed(0)}
        unit="kW" color={SOLAR_COLOR} status={data.solarStatus as any} />
      <PowerNode x={pcs.x} y={pcs.y} label="PCS" value={data.pcsPower.toFixed(0)}
        unit="kW" color={PCS_COLOR} status={data.pcsStatus as any} />
      <PowerNode x={battery.x} y={battery.y} label="储能"
        value={data.batterySOC.toFixed(0)} unit="%"
        color={BATTERY_COLOR} status={data.batteryStatus as any} />
      <PowerNode x={grid.x} y={grid.y} label="电网"
        value={Math.abs(data.gridPower).toFixed(0)} unit="kW"
        color={GRID_COLOR} status={data.gridStatus as any} />
      <PowerNode x={ev.x} y={ev.y} label="充电桩" value={data.evPower.toFixed(0)}
        unit="kW" color={EV_COLOR} status={data.evStatus as any} size={44} />

      {/* Labels */}
      <text x={solar.x + 50} y={solar.y - 5} style={{ fontSize: 9, fill: '#3a4a5a', fontFamily: 'JetBrains Mono, monospace' }}>直流</text>
      <text x={battery.x + 55} y={battery.y} style={{ fontSize: 9, fill: '#3a4a5a', fontFamily: 'JetBrains Mono, monospace' }}>储能</text>
    </svg>
  );
}

// ─── 3D Digital Twin Preview ─────────────────────────────────────────────────
function DigitalTwin3D({ data, show3D }: { data: any; show3D: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show3D || !containerRef.current) return;
    let cancelled = false;

    async function init3D() {
      const THREE = await import('three');
      if (cancelled || !containerRef.current) return;
      const el = containerRef.current;
      el.innerHTML = '';

      const w = el.clientWidth || 600;
      const h = 280;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#080c14');
      scene.fog = new THREE.Fog('#080c14', 20, 50);

      const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
      camera.position.set(8, 6, 8);
      camera.lookAt(0, 0, 0);

      // Lights
      const ambient = new THREE.AmbientLight('#ffffff', 0.4);
      scene.add(ambient);
      const sun = new THREE.DirectionalLight('#ffe4a0', 1.2);
      sun.position.set(10, 15, 10);
      sun.castShadow = true;
      scene.add(sun);
      const fill = new THREE.PointLight('#00e5c0', 0.5, 20);
      fill.position.set(-5, 3, 5);
      scene.add(fill);

      // Ground grid
      const grid = new THREE.GridHelper(16, 16, '#1a2438', '#1a2438');
      scene.add(grid);

      // Materials
      const groundMat = new THREE.MeshStandardMaterial({ color: '#0f1623', roughness: 0.9 });
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      // Solar panels (multiple)
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

      // Battery container
      const batMat = new THREE.MeshStandardMaterial({ color: '#00e5c0', metalness: 0.5, roughness: 0.4, emissive: '#00e5c0', emissiveIntensity: 0.1 });
      const battery = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 0.8), batMat);
      battery.position.set(3, 0.6, -2);
      battery.castShadow = true;
      scene.add(battery);

      // PCS box
      const pcsMat = new THREE.MeshStandardMaterial({ color: '#3b82f6', metalness: 0.5, roughness: 0.4, emissive: '#3b82f6', emissiveIntensity: 0.1 });
      const pcs = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 0.6), pcsMat);
      pcs.position.set(3, 0.6, 0);
      pcs.castShadow = true;
      scene.add(pcs);

      // EV charger
      const evMat = new THREE.MeshStandardMaterial({ color: '#f97316', metalness: 0.4, roughness: 0.5 });
      const ev = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 0.4), evMat);
      ev.position.set(3, 0.5, 2);
      ev.castShadow = true;
      scene.add(ev);

      // Transform controls label
      const labelMat = new THREE.MeshBasicMaterial({ color: '#00e5c0', transparent: true, opacity: 0.8 });
      const arrowHelper = new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1, 0x00e5c0, 0.3, 0.15
      );
      scene.add(arrowHelper);

      // Animate
      let frameId: number;
      function animate() {
        frameId = requestAnimationFrame(animate);
        scene.rotation.y += 0.003;
        renderer.render(scene, camera);
      }
      animate();

      // Resize
      const ro = new ResizeObserver(() => {
        if (!containerRef.current) return;
        const w2 = containerRef.current.clientWidth;
        renderer.setSize(w2, 280);
        camera.aspect = w2 / 280;
        camera.updateProjectionMatrix();
      });
      ro.observe(el);

      return () => {
        ro.disconnect();
        cancelAnimationFrame(frameId);
        renderer.dispose();
        if (containerRef.current) el.innerHTML = '';
      };
    }

    let cleanup: (() => void) | undefined;
    init3D().then(c => { cleanup = c; });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [show3D]);

  return <div ref={containerRef} style={{ width: '100%', height: 280, borderRadius: 8, overflow: 'hidden' }} />;
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
        // Simulated live data (replace with real API /ems-data/live later)
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

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#5a6a7a' }}><Spin size="large" /></div>;
  if (!station) return <div style={{ padding: 40, textAlign: 'center', color: '#5a6a7a', fontFamily: 'JetBrains Mono, monospace' }}>未找到电站</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#f0f4f8', fontFamily: 'JetBrains Mono, monospace' }}>
            ⚡ {station.name}
          </Title>
          <Text style={{ fontSize: 12, color: '#5a6a7a', fontFamily: 'JetBrains Mono, monospace' }}>
            {station.location} · 装机 {station.capacity}MW
          </Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Space>
            <Text style={{ fontSize: 12, color: '#5a6a7a', fontFamily: 'JetBrains Mono, monospace' }}>2D拓扑</Text>
            <Switch checked={show3D} onChange={v => setShow3D(v)} size="small" />
            <Text style={{ fontSize: 12, color: '#5a6a7a', fontFamily: 'JetBrains Mono, monospace' }}>3D孪生</Text>
          </Space>
          <Tag style={{ background: 'rgba(0,229,192,0.1)', border: '1px solid rgba(0,229,192,0.3)', color: '#00e5c0', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
            ● {liveData?.solarStatus === 'online' ? '实时数据' : '模拟数据'}
          </Tag>
        </div>
      </div>

      {/* Live KPIs */}
      {liveData && (
        <Row gutter={[10, 10]}>
          {[
            { label: '光伏出力', value: liveData.solarPower.toFixed(0), unit: 'kW', color: '#f59e0b' },
            { label: '电池SOC', value: liveData.batterySOC.toFixed(0), unit: '%', color: '#00e5c0' },
            { label: 'PCS功率', value: liveData.pcsPower.toFixed(0), unit: 'kW', color: '#3b82f6' },
            { label: '电网交互', value: Math.abs(liveData.gridPower).toFixed(0), unit: 'kW', color: '#8b5cf6' },
            { label: '充电桩', value: liveData.evPower.toFixed(0), unit: 'kW', color: '#f97316' },
          ].map(kpi => (
            <Col xs={12} sm={8} md={4} key={kpi.label}>
              <Card size="small" style={{
                background: '#141c2e', border: `1px solid ${kpi.color}30`,
                borderRadius: 8, textAlign: 'center',
              }} styles={{ body: { padding: '10px 8px' } }}>
                <div style={{ fontSize: 10, color: '#5a6a7a', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', marginBottom: 4 }}>
                  {kpi.label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
                  {kpi.value}
                  <span style={{ fontSize: 12, marginLeft: 2, color: '#5a6a7a' }}>{kpi.unit}</span>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Topology / 3D Twin */}
      <Card
        style={{ background: '#141c2e', border: '1px solid #2a3a52', borderRadius: 10 }}
        styles={{ body: { padding: 16 } }}
      >
        {!show3D ? (
          // 2D Topology
          <div style={{ overflowX: 'auto' }}>
            <MiniTopology data={liveData || {
              solarPower: 0, batterySOC: 0, pcsPower: 0, gridPower: 0, evPower: 0,
              solarStatus: 'offline', batteryStatus: 'offline', pcsStatus: 'offline',
              gridStatus: 'offline', evStatus: 'offline',
            }} width={Math.min(620, window.innerWidth - 80)} height={300} />
          </div>
        ) : (
          // 3D Digital Twin
          <DigitalTwin3D data={liveData} show3D={show3D} />
        )}
      </Card>

      {/* Energy Flow Summary */}
      {liveData && (
        <Card size="small" style={{ background: '#141c2e', border: '1px solid #2a3a52', borderRadius: 10 }} styles={{ body: { padding: '12px 16px' } }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
            <Text style={{ color: '#5a6a7a', fontSize: 11, textTransform: 'uppercase' }}>今日能量流向</Text>
            <Text style={{ color: '#f59e0b' }}>☀️ 光伏 {liveData.solarPower.toFixed(0)}kW</Text>
            <Text style={{ color: '#5a6a7a' }}>→</Text>
            <Text style={{ color: '#3b82f6' }}>PCS {liveData.pcsPower.toFixed(0)}kW</Text>
            <Text style={{ color: '#5a6a7a' }}>→</Text>
            <Text style={{ color: liveData.gridPower > 0 ? '#00e676' : '#8b5cf6' }}>
              {liveData.gridPower > 0 ? '⚡馈电' : '🔌取电'} {Math.abs(liveData.gridPower).toFixed(0)}kW
            </Text>
            <Text style={{ color: '#5a6a7a' }}>|</Text>
            <Text style={{ color: '#00e5c0' }}>🔋储能 {liveData.batterySOC.toFixed(0)}%</Text>
            <Text style={{ color: '#5a6a7a' }}>|</Text>
            <Text style={{ color: '#f97316' }}>🚗充电 {liveData.evPower.toFixed(0)}kW</Text>
          </div>
        </Card>
      )}
    </div>
  );
}
