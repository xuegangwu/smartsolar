import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, Form, Input, InputNumber, Select, Button, Space, Tag, Typography, Divider, message, Row, Col, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, ThunderboltOutlined, SyncOutlined, ApiOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;
const GRID = 30;

// ─── Equipment Types ────────────────────────────────────────────────────────
type EquipType = 'pv' | 'battery' | 'pcs' | 'transformer' | 'grid' | 'ev' | 'meter';

interface EquipDef {
  type: EquipType;
  label: string;
  icon: string;
  color: string;
  defaultPower?: number;  // kW for pv/pcs/ev
  defaultCapacity?: number; // kWh for battery
  hasCapacity?: boolean;
  hasPower?: boolean;
  maxCount?: number;
}

const EQUIP_CATALOG: EquipDef[] = [
  { type: 'pv', label: '光伏组串', icon: '☀️', color: '#f59e0b', hasPower: true, defaultPower: 100, maxCount: 20 },
  { type: 'battery', label: '储能电池', icon: '🔋', color: '#00e5c0', hasCapacity: true, hasPower: true, defaultPower: 50, defaultCapacity: 200, maxCount: 10 },
  { type: 'pcs', label: 'PCS变流器', icon: '⚡', color: '#3b82f6', hasPower: true, defaultPower: 100, maxCount: 6 },
  { type: 'transformer', label: '变压器', icon: '🔌', color: '#8b5cf6', hasPower: true, defaultPower: 500, maxCount: 4 },
  { type: 'grid', label: '电网接入', icon: '🏭', color: '#6366f1', hasPower: true, defaultPower: 1000, maxCount: 1 },
  { type: 'ev', label: '充电桩', icon: '🚗', color: '#f97316', hasPower: true, defaultPower: 120, maxCount: 8 },
  { type: 'meter', label: '电能表', icon: '📊', color: '#10b981', maxCount: 4 },
];

const CONNECTIONS: Record<string, string[]> = {
  pv: ['pcs', 'meter'],
  battery: ['pcs'],
  pcs: ['transformer', 'ev', 'meter'],
  transformer: ['grid'],
  grid: [],
  ev: [],
  meter: [],
};

// ─── Equipment Block ────────────────────────────────────────────────────────
function EquipBlock({ equip, selected, onSelect, onDelete, count, maxCount }: {
  equip: EquipDef; selected: boolean; onSelect: () => void; onDelete: () => void; count: number; maxCount: number;
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
        border: `2px solid ${selected ? equip.color : '#2a3a52'}`,
        background: selected ? equip.color + '18' : '#141c2e',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        transition: 'all 0.15s', userSelect: 'none',
        boxShadow: selected ? `0 0 16px ${equip.color}40` : 'none',
        minWidth: 80, flexShrink: 0,
      }}
    >
      <div style={{ fontSize: 28 }}>{equip.icon}</div>
      <Text style={{ fontSize: 11, color: selected ? equip.color : '#8899aa', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }}>
        {equip.label}
      </Text>
      <Text style={{ fontSize: 9, color: '#3a4a5a', fontFamily: 'JetBrains Mono, monospace' }}>
        {count}/{maxCount}
      </Text>
    </div>
  );
}

// ─── Canvas Node ────────────────────────────────────────────────────────────
interface NodeData {
  id: string; type: EquipType; x: number; y: number;
  name: string; power?: number; capacity?: number; efficiency?: number;
}

function CanvasNode({ node, catalog, onMove, onSelect, selected }: {
  node: NodeData; catalog: EquipDef[]; onMove: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void; selected: boolean;
}) {
  const def = catalog.find(c => c.type === node.type)!;
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  function onMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('.delete-btn')) return;
    dragging.current = true;
    offset.current = { x: e.clientX - node.x, y: e.clientY - node.y };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    onSelect(node.id);
    e.stopPropagation();
  }

  function onMouseMove(e: MouseEvent) {
    if (!dragging.current) return;
    const nx = Math.round((e.clientX - offset.current.x) / GRID) * GRID;
    const ny = Math.round((e.clientY - offset.current.y) / GRID) * GRID;
    onMove(node.id, nx, ny);
  }

  function onMouseUp() {
    dragging.current = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  const w = 100, h = 70;
  return (
    <div
      ref={ref}
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute', left: node.x - w / 2, top: node.y - h / 2,
        width: w, height: h,
        background: '#141c2e',
        border: `2px solid ${selected ? def.color : '#2a3a52'}`,
        borderRadius: 8,
        cursor: dragging.current ? 'grabbing' : 'grab',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
        boxShadow: selected ? `0 0 20px ${def.color}50` : `0 4px 12px rgba(0,0,0,0.4)`,
        transition: dragging.current ? 'none' : 'box-shadow 0.15s',
        zIndex: selected ? 10 : 1,
      }}
    >
      {/* Delete */}
      <button
        className="delete-btn"
        onClick={e => { e.stopPropagation(); onDelete(); }}
        style={{
          position: 'absolute', top: -8, right: -8,
          width: 18, height: 18, borderRadius: '50%',
          background: '#ff5252', border: 'none', cursor: 'pointer',
          color: '#fff', fontSize: 10, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 11,
        }}
      >
        ✕
      </button>

      <div style={{ fontSize: 22 }}>{def.icon}</div>
      <Text style={{ fontSize: 9, color: def.color, fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', fontWeight: 600 }}>
        {node.name}
      </Text>
      <div style={{ fontSize: 9, color: '#5a6a7a', fontFamily: 'JetBrains Mono, monospace' }}>
        {node.power ? `${node.power}kW` : ''}
        {node.capacity ? ` ${node.capacity}kWh` : ''}
      </div>
    </div>
  );
}

// ─── Connection Lines ────────────────────────────────────────────────────────
function ConnectionLines({ nodes, catalog }: { nodes: NodeData[]; catalog: EquipDef[] }) {
  const lines: JSX.Element[] = [];
  nodes.forEach(n => {
    const def = n;
    const conns = CONNECTIONS[n.type] || [];
    nodes.forEach(m => {
      if (n.id === m.id) return;
      if (conns.includes(m.type)) {
        lines.push(
          <line
            key={`${n.id}-${m.id}`}
            x1={n.x} y1={n.y} x2={m.x} y2={m.y}
            stroke="#2a3a52" strokeWidth={2}
            strokeDasharray="6 3"
            opacity={0.6}
          />
        );
      }
    });
  });
  return <>{lines}</>;
}

// ─── Main Builder ────────────────────────────────────────────────────────────
export default function StationBuilder() {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [equipCounts, setEquipCounts] = useState<Record<string, number>>({});
  const [form] = Form.useForm();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 500 });
  const [stationName, setStationName] = useState('苏州光储示范站');
  const [stationLocation, setStationLocation] = useState('江苏省苏州市工业园区');
  const [saving, setSaving] = useState(false);

  const selectedNode = nodes.find(n => n.id === selected);

  useEffect(() => {
    function update() {
      if (canvasRef.current) {
        const r = canvasRef.current.getBoundingClientRect();
        setCanvasSize({ w: r.width, h: r.height });
      }
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  function addEquip(def: EquipDef) {
    const count = equipCounts[def.type] || 0;
    if (def.maxCount && count >= def.maxCount) {
      message.warning(`${def.label} 最多配置 ${def.maxCount} 个`);
      return;
    }
    const id = `${def.type}_${Date.now()}`;
    const cx = canvasSize.w / 2;
    const cy = canvasSize.h / 2;
    // Spread in a grid
    const sameCount = nodes.filter(n => n.type === def.type).length;
    const angle = (sameCount / (def.maxCount || 8)) * 2 * Math.PI;
    const radius = Math.min(canvasSize.w, canvasSize.h) * 0.28;
    const nx = cx + Math.cos(angle) * radius;
    const ny = cy + Math.sin(angle) * radius;
    const newNode: NodeData = {
      id, type: def.type,
      x: Math.round(nx / GRID) * GRID,
      y: Math.round(ny / GRID) * GRID,
      name: `${def.label}${sameCount + 1}`,
      power: def.defaultPower,
      capacity: def.defaultCapacity,
      efficiency: 98,
    };
    setNodes(n => [...n, newNode]);
    setEquipCounts(c => ({ ...c, [def.type]: count + 1 }));
    setSelected(id);
    message.success(`已添加 ${def.label}`);
  }

  function deleteNode(id: string) {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    setNodes(n => n.filter(x => x.id !== id));
    setEquipCounts(c => ({ ...c, [node.type]: Math.max(0, (c[node.type] || 1) - 1) }));
    if (selected === id) setSelected(null);
  }

  function moveNode(id: string, x: number, y: number) {
    const pad = 60;
    const nx = Math.max(pad, Math.min(canvasSize.w - pad, x));
    const ny = Math.max(pad, Math.min(canvasSize.h - pad, y));
    setNodes(n => n.map(no => no.id === id ? { ...no, x: nx, y: ny } : no));
  }

  function updateSelectedNode(updates: Partial<NodeData>) {
    if (!selected) return;
    setNodes(n => n.map(no => no.id === selected ? { ...no, ...updates } : no));
  }

  // Summary stats
  const totalPV = nodes.filter(n => n.type === 'pv').reduce((s, n) => s + (n.power || 0), 0);
  const totalBattery = nodes.filter(n => n.type === 'battery').reduce((s, n) => s + (n.capacity || 0), 0);
  const totalPCS = nodes.filter(n => n.type === 'pcs').reduce((s, n) => s + (n.power || 0), 0);
  const totalEV = nodes.filter(n => n.type === 'ev').reduce((s, n) => s + (n.power || 0), 0);
  const gridPower = nodes.filter(n => n.type === 'grid').reduce((s, n) => s + (n.power || 0), 0);
  const investEst = (totalPV * 4000 + totalBattery * 1500 + totalPCS * 800 + totalEV * 300 + gridPower * 2000) / 10000;

  async function handleSave() {
    if (!stationName.trim()) { message.warning('请输入电站名称'); return; }
    if (nodes.length === 0) { message.warning('请至少添加一个设备'); return; }
    setSaving(true);
    const stationData = {
      name: stationName,
      location: stationLocation,
      capacity: totalPV,
      installedCapacity: totalPV,
      peakPower: totalPV,
      type: 'solar_storage',
      status: 'planning',
      equipment: nodes.map(n => ({ type: n.type, name: n.name, power: n.power, capacity: n.capacity })),
      gridConnectionDate: new Date().toISOString().slice(0, 10),
      owner: 'Risen',
      contact: 'admin@risen.com',
    };
    try {
      const r = await fetch('/api/stations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stationData),
      });
      const d = await r.json();
      if (r.ok && d.success) {
        message.success(`✅ 电站"${stationName}"已创建！可前往电站管理页面查看`);
      } else {
        throw new Error(d.error || '保存失败');
      }
    } catch (err: any) {
      message.error(`保存失败: ${err.message}`);
    }
    setSaving(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: 'calc(100vh - 140px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SyncOutlined style={{ fontSize: 20, color: '#00e5c0' }} />
          <Title level={4} style={{ margin: 0, color: '#f0f4f8', fontFamily: 'JetBrains Mono, monospace' }}>
            可视化建站
          </Title>
        </div>
        <Tag style={{ background: 'rgba(0,229,192,0.1)', border: '1px solid rgba(0,229,192,0.3)', color: '#00e5c0', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
          规划中
        </Tag>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <Button
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSave}
            style={{ background: '#00e5c0', border: 'none', color: '#000', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, borderRadius: 6, height: 36 }}
          >
            保存电站
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, flex: 1, overflow: 'hidden' }}>
        {/* Left: Equipment Palette */}
        <Card
          title={
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#8899aa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              设备库
            </span>
          }
          style={{ width: 160, background: '#141c2e', border: '1px solid #2a3a52', borderRadius: 10, flexShrink: 0 }}
          bodyStyle={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}
        >
          {EQUIP_CATALOG.map(def => {
            const count = equipCounts[def.type] || 0;
            return (
              <EquipBlock
                key={def.type}
                equip={def}
                selected={false}
                count={count}
                maxCount={def.maxCount || 99}
                onSelect={() => addEquip(def)}
                onDelete={() => {}}
              />
            );
          })}

          <Divider style={{ borderColor: '#2a3a52', margin: '4px 0' }} />

          <Text style={{ fontSize: 10, color: '#3a4a5a', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }}>
            点击添加设备到画布
          </Text>
        </Card>

        {/* Center: Canvas */}
        <Card
          style={{ flex: 1, background: '#0f1623', border: '1px solid #2a3a52', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          bodyStyle={{ flex: 1, padding: 0, position: 'relative', overflow: 'hidden' }}
        >
          {/* Station info bar */}
          <div style={{
            padding: '8px 16px', background: '#141c2e',
            borderBottom: '1px solid #2a3a52', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <Input
              value={stationName}
              onChange={e => setStationName(e.target.value)}
              placeholder="电站名称"
              size="small"
              style={{ width: 160, fontFamily: 'JetBrains Mono, monospace', background: '#1e2a3d', border: '1px solid #2a3a52', color: '#f0f4f8' }}
            />
            <Input
              value={stationLocation}
              onChange={e => setStationLocation(e.target.value)}
              placeholder="建设地点"
              size="small"
              style={{ width: 200, fontFamily: 'JetBrains Mono, monospace', background: '#1e2a3d', border: '1px solid #2a3a52', color: '#f0f4f8' }}
            />
            <Text style={{ fontSize: 11, color: '#3a4a5a', marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace' }}>
              共 {nodes.length} 个设备 · {canvasSize.w}×{canvasSize.h}
            </Text>
          </div>

          {/* Grid Canvas */}
          <div
            ref={canvasRef}
            onClick={() => setSelected(null)}
            style={{
              flex: 1, position: 'relative', overflow: 'hidden', cursor: 'crosshair',
              backgroundImage: `
                linear-gradient(rgba(42,58,82,0.4) 1px, transparent 1px),
                linear-gradient(90deg, rgba(42,58,82,0.4) 1px, transparent 1px)
              `,
              backgroundSize: `${GRID}px ${GRID}px`,
              backgroundPosition: '0 0',
            }}
          >
            {/* Connection lines (SVG layer) */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
              <ConnectionLines nodes={nodes} catalog={EQUIP_CATALOG} />
            </svg>

            {/* Nodes */}
            {nodes.map(node => (
              <CanvasNode
                key={node.id}
                node={node}
                catalog={EQUIP_CATALOG}
                onMove={moveNode}
                onSelect={setSelected}
                selected={selected === node.id}
                onDelete={() => deleteNode(node.id)}
              />
            ))}

            {/* Empty state */}
            {nodes.length === 0 && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 12, pointerEvents: 'none',
              }}>
                <div style={{ fontSize: 48, opacity: 0.3 }}>⚙️</div>
                <Text style={{ color: '#3a4a5a', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
                  从左侧设备库点击添加组件
                </Text>
                <Text style={{ color: '#2a3a52', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                  拖拽设备可调整位置
                </Text>
              </div>
            )}
          </div>
        </Card>

        {/* Right: Properties */}
        <Card
          title={
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#8899aa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              属性配置
            </span>
          }
          style={{ width: 240, background: '#141c2e', border: '1px solid #2a3a52', borderRadius: 10, flexShrink: 0 }}
          bodyStyle={{ padding: 14, overflowY: 'auto' }}
        >
          {selectedNode ? (() => {
            const def = EQUIP_CATALOG.find(c => c.type === selectedNode.type)!;
            return (
              <Form
                form={form}
                layout="vertical"
                initialValues={selectedNode}
                onValuesChange={(_, v) => updateSelectedNode(v)}
              >
                <div style={{ textAlign: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 40 }}>{def.icon}</div>
                  <div style={{ fontSize: 13, color: def.color, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, marginTop: 4 }}>
                    {def.label}
                  </div>
                </div>

                <Divider style={{ borderColor: '#2a3a52' }} />

                <Form.Item name="name" label={
                  <span style={{ color: '#8899aa', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>名称</span>
                }>
                  <Input style={{ background: '#1e2a3d', border: '1px solid #2a3a52', color: '#f0f4f8', fontFamily: 'JetBrains Mono, monospace', borderRadius: 6 }} />
                </Form.Item>

                {def.hasPower && (
                  <Form.Item name="power" label={
                    <span style={{ color: '#8899aa', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>功率 (kW)</span>
                  }>
                    <InputNumber min={1} max={10000} step={10}
                      style={{ width: '100%', background: '#1e2a3d', border: '1px solid #2a3a52', color: '#f0f4f8', fontFamily: 'JetBrains Mono, monospace', borderRadius: 6 }} />
                  </Form.Item>
                )}

                {def.hasCapacity && (
                  <Form.Item name="capacity" label={
                    <span style={{ color: '#8899aa', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>容量 (kWh)</span>
                  }>
                    <InputNumber min={1} max={100000} step={50}
                      style={{ width: '100%', background: '#1e2a3d', border: '1px solid #2a3a52', color: '#f0f4f8', fontFamily: 'JetBrains Mono, monospace', borderRadius: 6 }} />
                  </Form.Item>
                )}

                <Form.Item name="efficiency" label={
                  <span style={{ color: '#8899aa', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>效率 (%)</span>
                }>
                  <InputNumber min={60} max={100} step={0.5}
                    style={{ width: '100%', background: '#1e2a3d', border: '1px solid #2a3a52', color: '#f0f4f8', fontFamily: 'JetBrains Mono, monospace', borderRadius: 6 }} />
                </Form.Item>

                <Button danger block icon={<DeleteOutlined />}
                  onClick={() => deleteNode(selectedNode.id)}
                  style={{ marginTop: 8, borderRadius: 6, fontFamily: 'JetBrains Mono, monospace' }}>
                  移除设备
                </Button>
              </Form>
            );
          })() : (
            <div style={{ padding: 20, textAlign: 'center', color: '#3a4a5a', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
              选择画布上的设备以编辑属性
            </div>
          )}
        </Card>
      </div>

      {/* Bottom: Summary Bar */}
      <Card
        style={{ background: '#0f1623', border: '1px solid #2a3a52', borderRadius: 10 }}
        bodyStyle={{ padding: '10px 20px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', fontFamily: 'JetBrains Mono, monospace' }}>
          <Text style={{ fontSize: 11, color: '#5a6a7a', textTransform: 'uppercase' }}>装机概览</Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14, color: '#f59e0b' }}>☀️</span>
            <Text style={{ fontSize: 13, color: '#f59e0b', fontWeight: 600 }}>{totalPV}kW</Text>
            <Text style={{ fontSize: 11, color: '#3a4a5a' }}>光伏</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14, color: '#00e5c0' }}>🔋</span>
            <Text style={{ fontSize: 13, color: '#00e5c0', fontWeight: 600 }}>{totalBattery}kWh</Text>
            <Text style={{ fontSize: 11, color: '#3a4a5a' }}>储能</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14, color: '#3b82f6' }}>⚡</span>
            <Text style={{ fontSize: 13, color: '#3b82f6', fontWeight: 600 }}>{totalPCS}kW</Text>
            <Text style={{ fontSize: 11, color: '#3a4a5a' }}>PCS</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14, color: '#f97316' }}>🚗</span>
            <Text style={{ fontSize: 13, color: '#f97316', fontWeight: 600 }}>{totalEV}kW</Text>
            <Text style={{ fontSize: 11, color: '#3a4a5a' }}>充电桩</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14, color: '#6366f1' }}>🏭</span>
            <Text style={{ fontSize: 13, color: '#6366f1', fontWeight: 600 }}>{gridPower}kW</Text>
            <Text style={{ fontSize: 11, color: '#3a4a5a' }}>电网</Text>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 11, color: '#5a6a7a', textTransform: 'uppercase' }}>估算投资</Text>
            <Text style={{ fontSize: 18, fontWeight: 700, color: '#00e5c0' }}>
              {investEst >= 1 ? `~${investEst.toFixed(0)}万` : `~${(investEst * 10000).toFixed(0)}元`}
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
}
