import { useState, useEffect } from 'react';
import { Card, Row, Col, Progress, Tag, Typography, Spin, Empty, List, Badge, Space, Button, Statistic } from 'antd';
import { ThunderboltOutlined, ExperimentOutlined, AlertOutlined, RiseOutlined, ReloadOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { healthApi } from '../services/api';

const { Title, Text } = Typography;

// 等级颜色
const GRADE_COLOR: Record<string, string> = { A: '#16a34a', B: '#2563eb', C: '#d97706', D: '#dc2626' };
const GRADE_BG: Record<string, string> = { A: '#f0fdf4', B: '#eff6ff', C: '#fffbeb', D: '#fef2f2' };
const GRADE_LABEL: Record<string, string> = { A: '优秀', B: '良好', C: '一般', D: '较差' };

// 问题严重度图标
const SEVERITY_ICON = { critical: '🔴', major: '🟠', warning: '🟡', info: 'ℹ️' };
const SEVERITY_COLOR = { critical: '#dc2626', major: '#ea580c', warning: '#d97706', info: '#6b7280' };

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 12, color: '#6b7280' }}>{label}</Text>
        <Text style={{ fontSize: 12, fontWeight: 600, color }}>{score}分</Text>
      </div>
      <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 3, transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

function EquipCard({ item, onClick }: { item: any; onClick: () => void }) {
  const gradeColor = GRADE_COLOR[item.grade] || '#6b7280';
  const gradeBg = GRADE_BG[item.grade] || '#f9fafb';

  return (
    <Card
      size="small"
      hoverable
      onClick={onClick}
      style={{ borderRadius: 12, border: `1px solid ${gradeColor}30`, cursor: 'pointer' }}
      bodyStyle={{ padding: 14 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Tag style={{ background: gradeBg, color: gradeColor, border: 'none', fontWeight: 700, fontSize: 13, borderRadius: 6, padding: '0 8px' }}>
          {item.grade}
        </Tag>
        <Text strong style={{ fontSize: 13, color: '#1a1a2e', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.equipmentId?.name || '未知设备'}
        </Text>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Progress
          type="circle"
          percent={item.score}
          size={52}
          strokeColor={gradeColor}
          format={p => <span style={{ fontSize: 12, fontWeight: 700 }}>{p}</span>}
        />
        <div style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, color: '#9ca3af' }}>
            {item.stationId?.name || '未知电站'}
          </Text>
          <div style={{ marginTop: 2 }}>
            {item.trend === 'rising' && <Text style={{ fontSize: 10, color: '#16a34a' }}>↑ 上升</Text>}
            {item.trend === 'declining' && <Text style={{ fontSize: 10, color: '#dc2626' }}>↓ 下降</Text>}
            {item.trend === 'stable' && <Text style={{ fontSize: 10, color: '#6b7280' }}>→ 稳定</Text>}
          </div>
        </div>
      </div>

      {item.issues?.length > 0 && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
          <Text style={{ fontSize: 10, color: SEVERITY_COLOR[item.issues[0].severity] }}>
            {SEVERITY_ICON[item.issues[0].severity]} {item.issues[0].description.slice(0, 30)}...
          </Text>
        </div>
      )}
    </Card>
  );
}

function EquipDetailDrawer({ equipmentId, onClose }: { equipmentId: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!equipmentId) return;
    Promise.all([
      healthApi.getByEquipment(equipmentId),
      healthApi.getHistory(equipmentId, 14),
    ]).then(([detail, hist]) => {
      setData(detail.data);
      setHistory(hist.data || []);
    }).finally(() => setLoading(false));
  }, [equipmentId]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>;

  const score = data?.score || 0;
  const gradeColor = GRADE_COLOR[data?.grade] || '#6b7280';
  const factors = data?.factors || {};

  return (
    <div style={{ padding: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Progress
          type="circle"
          percent={score}
          size={100}
          strokeColor={gradeColor}
          format={p => (
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: gradeColor }}>{p}</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{data?.grade}级</div>
            </div>
          )}
        />
        <div style={{ marginTop: 12 }}>
          <Tag style={{ background: GRADE_BG[data?.grade], color: gradeColor, border: 'none', fontWeight: 700, borderRadius: 20, padding: '2px 12px' }}>
            {GRADE_LABEL[data?.grade] || '未知'}
          </Tag>
        </div>
        <Text style={{ display: 'block', marginTop: 6, fontSize: 13, color: '#6b7280' }}>
          {data?.stationId?.name} / {data?.equipmentId?.name}
        </Text>
      </div>

      {/* 分项得分 */}
      <Card size="small" title="分项评分" style={{ marginBottom: 16 }} styles={{ header: { fontSize: 13 } }}>
        <ScoreBar label="功率得分" score={factors.powerScore || 0} color="#d97706" />
        <ScoreBar label="效率得分" score={factors.efficiencyScore || 0} color="#2563eb" />
        <ScoreBar label="温度得分" score={factors.tempScore || 0} color="#16a34a" />
        <ScoreBar label="稳定性得分" score={factors.stabilityScore || 0} color="#7c3aed" />
      </Card>

      {/* 问题列表 */}
      {data?.issues?.length > 0 && (
        <Card size="small" title="⚠️ 当前问题" style={{ marginBottom: 16 }} styles={{ header: { fontSize: 13 } }}>
          {data.issues.map((issue: any, i: number) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: i < data.issues.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <Space>
                <span>{SEVERITY_ICON[issue.severity]}</span>
                <Text strong style={{ fontSize: 12, color: SEVERITY_COLOR[issue.severity] }}>{issue.code}</Text>
              </Space>
              <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>{issue.description}</div>
              <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2 }}>💡 {issue.suggestion}</div>
            </div>
          ))}
        </Card>
      )}

      {/* 趋势 */}
      {history.length > 0 && (
        <Card size="small" title="📈 14日趋势" style={{ marginBottom: 16 }} styles={{ header: { fontSize: 13 } }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 60, overflow: 'hidden' }}>
            {history.map((h: any, i: number) => {
              const hColor = GRADE_COLOR[h.grade] || '#6b7280';
              const barH = Math.max(4, (h.score / 100) * 60);
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <div style={{ width: '100%', height: barH, background: hColor, borderRadius: '2px 2px 0 0', minWidth: 4 }} title={`${h.score}分`} />
                  <Text style={{ fontSize: 8, color: '#9ca3af', marginTop: 2 }}>
                    {new Date(h.calculatedAt).getDate()}日
                  </Text>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* AI 建议 */}
      {data?.issues?.length > 0 && (
        <Card size="small" title="🤖 AI 建议" styles={{ header: { fontSize: 13 } }} bodyStyle={{ background: '#fafafa' }}>
          <Text style={{ fontSize: 12, color: '#374151', lineHeight: 1.7 }}>
            基于历史数据分析，{data.equipmentId?.name} 当前存在{data.issues.length}项问题需要关注。
            {data.issues[0]?.suggestion}
          </Text>
        </Card>
      )}
    </div>
  );
}

export default function HealthDashboard() {
  const [scores, setScores] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [selectedEquip, setSelectedEquip] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const res = await healthApi.getAll(filter ? { grade: filter } : {});
      if (res.success) {
        setScores(res.data || []);
        setStats(res.stats || {});
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [filter]);

  async function handleRecalculate() {
    setLoading(true);
    await healthApi.calculateAll();
    await loadData();
  }

  function handleCardClick(equipmentId: string) {
    setSelectedEquip(equipmentId);
    setDrawerOpen(true);
  }

  if (loading && scores.length === 0) {
    return <div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ padding: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>🏥 设备健康分</Title>
          <Text style={{ fontSize: 12, color: '#9ca3af' }}>实时监测全场站设备健康状态</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData} size="small">刷新</Button>
          <Button icon={<ExperimentOutlined />} onClick={handleRecalculate} size="small" type="primary" style={{ background: '#e6342a' }}>
            重新计算
          </Button>
        </Space>
      </div>

      {/* 统计概览 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 12, textAlign: 'center' }}>
            <Statistic
              title={<Text style={{ fontSize: 11, color: '#9ca3af' }}>全场综合分</Text>}
              value={stats.avgScore || 0}
              suffix="分"
              valueStyle={{ color: '#1a1a2e', fontSize: 28, fontWeight: 800 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 12, textAlign: 'center' }}>
            <Statistic
              title={<Text style={{ fontSize: 11, color: '#9ca3af' }}>A级（优秀）</Text>}
              value={stats.gradeA || 0}
              valueStyle={{ color: '#16a34a', fontSize: 28, fontWeight: 800 }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 12, textAlign: 'center' }}>
            <Statistic
              title={<Text style={{ fontSize: 11, color: '#9ca3af' }}>C/D级（需关注）</Text>}
              value={(stats.gradeC || 0) + (stats.gradeD || 0)}
              valueStyle={{ color: '#d97706', fontSize: 28, fontWeight: 800 }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 12, textAlign: 'center' }}>
            <Statistic
              title={<Text style={{ fontSize: 11, color: '#9ca3af' }}>下降趋势</Text>}
              value={stats.declining || 0}
              valueStyle={{ color: '#dc2626', fontSize: 28, fontWeight: 800 }}
              prefix={<AlertOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 等级筛选 */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        {['', 'A', 'B', 'C', 'D'].map(g => (
          <Tag
            key={g}
            onClick={() => setFilter(g)}
            style={{
              cursor: 'pointer', borderRadius: 20, padding: '2px 12px',
              background: filter === g ? (g ? GRADE_COLOR[g] : '#e5e7eb') : 'transparent',
              color: filter === g ? '#fff' : '#6b7280',
              border: `1px solid ${filter === g ? (g ? GRADE_COLOR[g] : '#e5e7eb') : '#e5e7eb'}`,
            }}
          >
            {g === '' ? '全部' : `${g}级`}
            {g === 'A' && ` (${stats.gradeA || 0})`}
            {g === 'B' && ` (${stats.gradeB || 0})`}
            {g === 'C' && ` (${stats.gradeC || 0})`}
            {g === 'D' && ` (${stats.gradeD || 0})`}
          </Tag>
        ))}
      </div>

      {/* 设备列表 */}
      {scores.length === 0 ? (
        <Empty description="暂无健康分数据，请先接入设备遥测数据" style={{ marginTop: 60 }} />
      ) : (
        <Row gutter={[12, 12]}>
          {scores.map((item: any) => (
            <Col key={item._id} xs={24} sm={12} md={8} lg={6}>
              <EquipCard item={item} onClick={() => handleCardClick(item.equipmentId._id)} />
            </Col>
          ))}
        </Row>
      )}

      {/* 设备详情抽屉 */}
      {drawerOpen && selectedEquip && (
        <div
          style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 400,
            background: '#fff', zIndex: 1000,
            boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
            overflow: 'auto',
          }}
        >
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e8eaed', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff' }}>
            <Text strong style={{ fontSize: 14 }}>设备健康详情</Text>
            <Button size="small" onClick={() => setDrawerOpen(false)}>关闭</Button>
          </div>
          <EquipDetailDrawer equipmentId={selectedEquip} onClose={() => setDrawerOpen(false)} />
        </div>
      )}
    </div>
  );
}
