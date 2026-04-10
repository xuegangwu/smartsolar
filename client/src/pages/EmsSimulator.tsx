import { useState, useEffect } from 'react';
import { Card, Form, Select, Input, Button, Tag, Space, message, Typography, Divider } from 'antd';
import { ThunderboltOutlined, SendOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { stationApi } from '../services/api';

const { Text, Title } = Typography;

const ALERT_CODES = [
  { code: 'PV_001', label: '光伏组串短路', level: 'critical' },
  { code: 'PV_002', label: '组串功率骤降', level: 'major' },
  { code: 'PV_003', label: '组件温度过高', level: 'critical' },
  { code: 'BAT_001', label: '电池SOC过低', level: 'major' },
  { code: 'BAT_002', label: '电池过温告警', level: 'critical' },
  { code: 'BAT_003', label: 'BMS通信中断', level: 'major' },
  { code: 'PCS_001', label: 'PCS停机故障', level: 'critical' },
  { code: 'PCS_002', label: 'PCS过载', level: 'major' },
  { code: 'GRID_001', label: '电网欠压', level: 'major' },
  { code: 'GRID_002', label: '电网频率异常', level: 'critical' },
  { code: 'EV_001', label: '充电桩通信故障', level: 'minor' },
  { code: 'EV_002', label: '充电桩过流', level: 'major' },
];

const LEVEL_COLORS: Record<string, string> = {
  critical: '#dc2626',
  major: '#d97706',
  minor: '#8896a6',
};
const LEVEL_LABELS: Record<string, string> = {
  critical: '严重',
  major: '重要',
  minor: '一般',
};

interface HistoryItem {
  id: string;
  code: string;
  label: string;
  level: string;
  stationId: string;
  stationName: string;
  status: 'success' | 'error';
  time: string;
}

export default function EmsSimulator() {
  const [form] = Form.useForm();
  const [stations, setStations] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [batchCount, setBatchCount] = useState(1);

  useEffect(() => {
    stationApi.getAll().then(r => { if (r.success) setStations(r.data); });
  }, []);

  async function sendAlert() {
    const v = form.getFieldsValue();
    if (!v.stationId || !v.code) { message.warning('请选择电站和告警类型'); return; }
    setSending(true);
    const codeInfo = ALERT_CODES.find(c => c.code === v.code);
    const station = stations.find(s => s._id === v.stationId);
    const alert = {
      sourceAlertId: `SIM_${Date.now()}`,
      stationId: v.stationId,
      level: codeInfo?.level || 'minor',
      code: v.code,
      message: v.message || codeInfo?.label || v.code,
    };
    try {
      const r = await fetch('/api/ems-sync/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      });
      const d = await r.json();
      if (r.ok) {
        setHistory(h => [{
          id: alert.sourceAlertId,
          code: alert.code,
          label: alert.message,
          level: alert.level,
          stationId: alert.stationId,
          stationName: station?.name || alert.stationId,
          status: 'success',
          time: new Date().toLocaleTimeString('zh-CN'),
        }, ...h.slice(0, 19)]);
        message.success(`✅ 告警已推送: ${alert.message}`);
      } else {
        throw new Error(d.error || '发送失败');
      }
    } catch (err: any) {
      message.error(`❌ 发送失败: ${err.message}`);
      setHistory(h => [{
        id: alert.sourceAlertId,
        code: alert.code,
        label: alert.message,
        level: alert.level,
        stationId: alert.stationId,
        stationName: station?.name || alert.stationId,
        status: 'error',
        time: new Date().toLocaleTimeString('zh-CN'),
      }, ...h.slice(0, 19)]);
    }
    setSending(false);
  }

  async function sendBatch() {
    const v = form.getFieldsValue();
    if (!v.stationId) { message.warning('请先选择电站'); return; }
    const station = stations.find(s => s._id === v.stationId);
    setSending(true);
    let success = 0, fail = 0;
    for (let i = 0; i < batchCount; i++) {
      const code = ALERT_CODES[Math.floor(Math.random() * ALERT_CODES.length)];
      const alert = {
        sourceAlertId: `SIM_${Date.now()}_${i}`,
        stationId: v.stationId,
        level: code.level,
        code: code.code,
        message: `${code.label} #${i + 1}`,
      };
      try {
        await fetch('/api/ems-sync/alerts', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert),
        });
        success++;
      } catch { fail++; }
    }
    message.success(`批量发送完成: ${success} 成功, ${fail} 失败`);
    setSending(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ThunderboltOutlined style={{ fontSize: 22, color: '#d97706' }} />
        <Title level={4} style={{ margin: 0, color: '#1a1a2e', fontFamily: 'JetBrains Mono, monospace' }}>
          EMS 模拟器
        </Title>
        <Tag style={{ background: 'rgba(255,171,64,0.1)', border: '1px solid rgba(255,171,64,0.3)', color: '#d97706', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
          内部测试工具
        </Tag>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 16 }}>
        {/* Send Card */}
        <Card
          style={{ background: '#ffffff', border: '1px solid #e8eaed', borderRadius: 10 }}
          title={
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              发送告警
            </span>
          }
        >
          <Form form={form} layout="vertical">
            <Form.Item name="stationId" label={
              <span style={{ color: '#4a5568', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>目标电站</span>
            }>
              <Select
                placeholder="选择电站"
                style={{ width: '100%' }}
                options={stations.map(s => ({ value: s._id, label: s.name }))}
                size="large"
              />
            </Form.Item>

            <Form.Item name="code" label={
              <span style={{ color: '#4a5568', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>告警类型</span>
            }>
              <Select placeholder="选择告警类型" size="large">
                {ALERT_CODES.map(c => (
                  <Select.Option key={c.code} value={c.code}>
                    <Space>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: LEVEL_COLORS[c.level], boxShadow: `0 0 6px ${LEVEL_COLORS[c.level]}` }} />
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{c.code}</span>
                      <span style={{ color: '#4a5568', fontSize: 12 }}>{c.label}</span>
                      <Tag style={{ background: LEVEL_COLORS[c.level] + '15', border: '1px solid ' + LEVEL_COLORS[c.level] + '50', color: LEVEL_COLORS[c.level], fontSize: 10, padding: '0 4px' }}>
                        {LEVEL_LABELS[c.level]}
                      </Tag>
                    </Space>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="message" label={
              <span style={{ color: '#4a5568', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>告警消息（可选）</span>
            }>
              <Input.TextArea
                placeholder="留空则使用默认消息"
                rows={2}
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}
              />
            </Form.Item>

            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={sending}
              onClick={sendAlert}
              block
              size="large"
              style={{
                height: 48, borderRadius: 8, fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700, fontSize: 14, letterSpacing: '0.06em',
                background: '#e6342a', border: 'none',
                boxShadow: '0 0 24px rgba(0,229,192,0.3)',
              }}
            >
              [ 发送告警 ]
            </Button>
          </Form>

          <Divider style={{ borderColor: '#e8eaed', margin: '20px 0' }} />

          {/* Batch Send */}
          <div style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 12, color: '#4a5568', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>
              批量模拟
            </Text>
            <Space>
              <Input
                type="number"
                min={1} max={50}
                value={batchCount}
                onChange={e => setBatchCount(parseInt(e.target.value) || 1)}
                style={{ width: 80, fontFamily: 'JetBrains Mono, monospace', background: '#fafbfc', border: '1px solid #e8eaed', color: '#1a1a2e', borderRadius: 6 }}
              />
              <span style={{ color: '#8896a6', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>条</span>
              <Button
                onClick={sendBatch}
                loading={sending}
                style={{ background: '#f5f6f8', border: '1px solid #e8eaed', color: '#d97706', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, borderRadius: 6, height: 34 }}
              >
                随机批量发送
              </Button>
            </Space>
          </div>

          {/* Code Example */}
          <div style={{
            background: '#fafbfc', border: '1px solid #e8eaed', borderRadius: 8,
            padding: '12px 14px', marginTop: 12,
          }}>
            <Text style={{ fontSize: 10, color: '#8896a6', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              EMS API 调用示例
            </Text>
            <pre style={{ color: '#e6342a', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, margin: 0, lineHeight: 1.7 }}>
{`POST /api/ems-sync/alerts
{
  "sourceAlertId": "EMS_001",
  "stationId": "${stations[0]?._id || '<stationId>'}",
  "level": "critical",
  "code": "PV_001",
  "message": "光伏组串短路"
}`}
            </pre>
          </div>
        </Card>

        {/* History */}
        <Card
          style={{ background: '#ffffff', border: '1px solid #e8eaed', borderRadius: 10 }}
          title={
            <Space>
              <ClockCircleOutlined style={{ color: '#8896a6' }} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                发送记录
              </span>
            </Space>
          }
          styles={{ body: { padding: '8px', maxHeight: 520, overflowY: 'auto' } }}
        >
          {history.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#8896a6', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
              暂无发送记录
            </div>
          ) : history.map(item => (
            <div key={item.id} style={{
              padding: '8px 10px', borderBottom: '1px solid #f0f2f5',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              {item.status === 'success'
                ? <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 12, marginTop: 2, flexShrink: 0 }} />
                : <span style={{ color: '#dc2626', fontSize: 12, marginTop: 2, flexShrink: 0 }}>✗</span>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: LEVEL_COLORS[item.level], fontWeight: 600 }}>{item.code}</span>
                  <span style={{ fontSize: 10, color: '#8896a6' }}>·</span>
                  <span style={{ fontSize: 11, color: '#4a5568', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                </div>
                <div style={{ fontSize: 10, color: '#8896a6', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                  {item.stationName} · {item.time}
                </div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
