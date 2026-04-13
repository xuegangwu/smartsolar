import { useState, useEffect } from 'react';
import { Card, Row, Col, Select, DatePicker, Typography, Button, Spin, Tag, Divider, Space } from 'antd';
import { FileTextOutlined, DownloadOutlined, ExperimentOutlined, SafetyCertificateOutlined, ThunderboltOutlined, CheckCircleOutlined, AlertOutlined } from '@ant-design/icons';
import { stationApi, healthApi, alertApi, workOrderApi } from '../services/api';

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ─── 报告模板 ───────────────────────────────────────────────────────────────
async function generateReport(params: {
  stationId?: string;
  dateRange: [string, string];
}): Promise<string> {
  const { stationId, dateRange } = params;
  const [start, end] = dateRange;

  // 收集数据
  const [stations, allHealth, alertRes, orderRes] = await Promise.all([
    stationApi.getAll(),
    healthApi.getAll(),
    alertApi.getStats(stationId ? { stationId } : {}),
    workOrderApi.getAll(stationId ? { stationId } : {}),
  ]);

  const healthStats = allHealth.stats || {};
  const stations_data = stationId
    ? (stations.data || []).filter((s: any) => s._id === stationId)
    : stations.data || [];

  const avgScore = healthStats.avgScore || 'N/A';
  const gradeA = healthStats.gradeA || 0;
  const gradeD = (healthStats.gradeC || 0) + (healthStats.gradeD || 0);

  const alertData = alertRes.data || {};
  const orders = (orderRes.data || []).filter((o: any) => o.status !== 'closed');

  // 设备健康分布
  const healthGrades = `A:${healthStats.gradeA || 0} / B:${healthStats.gradeB || 0} / C:${healthStats.gradeC || 0} / D:${healthStats.gradeD || 0}`;

  const reportLines: string[] = [];
  reportLines.push(`╔══════════════════════════════════════════════════════════════╗`);
  reportLines.push(`║          SmartSolar 运维日报 / 周报                            ║`);
  reportLines.push(`╠══════════════════════════════════════════════════════════════╣`);
  reportLines.push(`║  报告周期：${start} ~ ${end}`);
  reportLines.push(`║  生成时间：${new Date().toLocaleString('zh-CN')}`);
  reportLines.push(`╠══════════════════════════════════════════════════════════════╣`);
  reportLines.push(`║  📊 场站概况                                                ║`);
  reportLines.push(`║     接入电站：${String(stations_data.length).padStart(3)} 个`);
  reportLines.push(`║     接入设备：${String(healthStats.total || 0).padStart(3)} 台`);
  reportLines.push(`╠══════════════════════════════════════════════════════════════╣`);
  reportLines.push(`║  🏥 设备健康                                                ║`);
  reportLines.push(`║     综合健康分：${String(avgScore).padStart(3)} / 100  ${avgScore >= 80 ? '✅ 良好' : avgScore >= 60 ? '⚠️ 一般' : '🔴 较差'}`);
  reportLines.push(`║     等级分布：${healthGrades}`);
  reportLines.push(`║     A级(优秀)：${String(gradeA).padStart(3)} 台  D级(需关注)：${String(gradeD).padStart(3)} 台`);
  reportLines.push(`╠══════════════════════════════════════════════════════════════╣`);
  reportLines.push(`║  ⚠️  告警统计                                                ║`);
  reportLines.push(`║     严重告警：${String(alertData.critical || 0).padStart(3)} 次  重要告警：${String(alertData.major || 0).padStart(3)} 次  一般告警：${String(alertData.minor || 0).padStart(3)} 次`);
  reportLines.push(`║     未确认告警：${String(alertData.unacknowledged || 0).padStart(3)} 次`);
  reportLines.push(`╠══════════════════════════════════════════════════════════════╣`);
  reportLines.push(`║  📋  工单情况                                                ║`);
  reportLines.push(`║     待处理工单：${String(orders.length).padStart(3)} 个`);
  reportLines.push(`║     紧急工单：${String(orders.filter((o: any) => o.priority === 'urgent').length).padStart(3)} 个`);
  reportLines.push(`╠══════════════════════════════════════════════════════════════╣`);
  reportLines.push(`║  🤖  AI 建议                                                  ║`);
  reportLines.push(`║     ${gradeD > 0 ? `⚠️  当前有 ${gradeD} 台设备健康等级为 C/D，建议优先巡检` : '✅ 各设备健康状况良好，继续保持'}`.slice(0, 62) + '║');
  reportLines.push(`║     ${alertData.critical > 0 ? `🔴  有 ${alertData.critical} 个严重告警待处理，请尽快处理` : '✅ 无严重告警，系统运行正常'}`.slice(0, 62) + '║');
  reportLines.push(`╚══════════════════════════════════════════════════════════════╝`);

  return reportLines.join('\n');
}

export default function Reports() {
  const [stations, setStations] = useState<any[]>([]);
  const [stationId, setStationId] = useState<string>('');
  const [reportType, setReportType] = useState<'daily' | 'weekly'>('daily');
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  useEffect(() => {
    stationApi.getAll().then(r => { if (r.success) setStations(r.data || []); });
  }, []);

  async function handleGenerate() {
    const now = new Date();
    let start: string, end: string;
    if (reportType === 'daily') {
      end = start = now.toISOString().slice(0, 10);
    } else {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      start = weekAgo.toISOString().slice(0, 10);
      end = now.toISOString().slice(0, 10);
    }

    setGenerating(true);
    try {
      const text = await generateReport({ stationId: stationId || undefined, dateRange: [start, end] });
      setReport(text);
    } finally {
      setGenerating(false);
    }
  }

  function handleDownload() {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartSolar运维报告_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ fontSize: 16, color: '#1a1a2e' }}>📋 运维报告生成</Text>
        <br />
        <Text style={{ fontSize: 12, color: '#9ca3af' }}>基于真实运行数据，自动生成日报 / 周报</Text>
      </div>

      {/* 配置 */}
      <Card style={{ borderRadius: 12, marginBottom: 16 }} bodyStyle={{ padding: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>报告类型</Text>
            <Select
              value={reportType}
              onChange={v => setReportType(v)}
              options={[
                { value: 'daily', label: '日报' },
                { value: 'weekly', label: '周报' },
              ]}
              style={{ width: 120 }}
            />
          </div>
          <div>
            <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>电站（可选）</Text>
            <Select
              value={stationId}
              onChange={setStationId}
              allowClear
              placeholder="全部电站"
              options={stations.map((s: any) => ({ value: s._id, label: s.name }))}
              style={{ width: 200 }}
            />
          </div>
          <Button
            type="primary"
            icon={<FileTextOutlined />}
            loading={generating}
            onClick={handleGenerate}
            style={{ background: '#e6342a', border: 'none', height: 36 }}
          >
            生成报告
          </Button>
        </div>
      </Card>

      {/* 报告预览 */}
      {generating && (
        <Card style={{ borderRadius: 12, textAlign: 'center', padding: 60 }} bodyStyle={{ padding: 60 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: '#9ca3af' }}>正在生成报告...</div>
        </Card>
      )}

      {report && !generating && (
        <Card
          style={{ borderRadius: 12 }}
          title={<Space><FileTextOutlined /><Text strong>报告预览</Text></Space>}
          extra={<Button icon={<DownloadOutlined />} onClick={handleDownload}>下载报告</Button>}
          bodyStyle={{ padding: 0 }}
        >
          <pre style={{
            background: '#1a1a2e',
            color: '#4ade80',
            padding: '24px',
            borderRadius: '0 0 12px 12px',
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace',
            lineHeight: 1.8,
            overflow: 'auto',
            maxHeight: 500,
            margin: 0,
          }}>
            {report}
          </pre>
        </Card>
      )}

      {/* 说明 */}
      <Card style={{ borderRadius: 12, marginTop: 16 }} bodyStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 12, color: '#9ca3af' }}>
          💡 报告基于当天/本周的设备健康分、告警统计、工单数据自动汇总。
          如需更详细的分析报告，请使用 <a onClick={() => window.location.href = '/ai'}>AI 助手</a> 进行专项查询。
        </Text>
      </Card>
    </div>
  );
}
