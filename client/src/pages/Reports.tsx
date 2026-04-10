import { useState } from 'react';
import { Card, Button, Space, Tag, Typography, Select, DatePicker, message } from 'antd';
import { DownloadOutlined, FileTextOutlined, AlertOutlined, CalendarOutlined, InboxOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const MODULES = [
  {
    key: 'work-orders',
    label: '工单',
    icon: <FileTextOutlined />,
    color: '#00e5c0',
    fields: ['工单号', '标题', '类型', '优先级', '状态', '创建时间', '处理人', '电站'],
    api: '/api/work-orders',
  },
  {
    key: 'alerts',
    label: '告警',
    icon: <AlertOutlined />,
    color: '#ff5252',
    fields: ['告警ID', '告警类型', '级别', '消息', '时间', '电站', '是否确认'],
    api: '/api/alerts',
  },
  {
    key: 'inspection',
    label: '巡检记录',
    icon: <CalendarOutlined />,
    color: '#ffab40',
    fields: ['计划名称', '执行人', '执行时间', '结果', '备注'],
    api: '/api/inspection/records',
  },
  {
    key: 'spare-parts',
    label: '备件库存',
    icon: <InboxOutlined />,
    color: '#00b8d4',
    fields: ['备件名称', '规格型号', '分类', '当前库存', '单位', '低库存阈值', '状态'],
    api: '/api/spare-parts',
  },
];

function toCSV(headers: string[], rows: any[][], name: string) {
  const sep = ',';
  const lines = [
    headers.join(sep),
    ...rows.map(r => r.map((v: any) => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(sep)),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [module, setModule] = useState<string>('work-orders');
  const [loading, setLoading] = useState(false);

  const current = MODULES.find(m => m.key === module)!;

  async function handleExport() {
    setLoading(true);
    try {
      const r = await fetch(current.api);
      const d = await r.json();
      const data = d.data || d;
      if (!Array.isArray(data) || data.length === 0) {
        message.warning('暂无数据可导出');
        setLoading(false);
        return;
      }
      const rows = data.map((item: any) => {
        switch (module) {
          case 'work-orders':
            return [
              item.orderNo, item.title, item.type, item.priority,
              item.status, new Date(item.createdAt).toLocaleString('zh-CN'),
              item.assignee?.name || item.assignee || '-',
              item.stationId?.name || item.stationId || '-',
            ];
          case 'alerts':
            return [
              item.sourceAlertId || item._id, item.code, item.level,
              item.message, new Date(item.createdAt).toLocaleString('zh-CN'),
              item.stationId?.name || item.stationId || '-',
              item.acknowledged ? '已确认' : '未确认',
            ];
          case 'inspection':
            return [
              item.planId?.name || item.planId || '-',
              item.executor?.name || item.executor || '-',
              item.executedAt ? new Date(item.executedAt).toLocaleString('zh-CN') : '-',
              item.result || '-', item.notes || '-',
            ];
          case 'spare-parts':
            return [
              item.name, item.spec || '-', item.category || '-',
              item.stock, item.unit || '-', item.lowStockThreshold || '-',
              item.stock <= (item.lowStockThreshold || 0) ? '⚠️低库存' : '正常',
            ];
          default:
            return [];
        }
      });
      toCSV(current.fields, rows, `smartsolar_${module}`);
      message.success(`✅ 导出成功：${data.length} 条记录`);
    } catch (err: any) {
      message.error(`导出失败: ${err.message}`);
    }
    setLoading(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <DownloadOutlined style={{ fontSize: 22, color: '#00e5c0' }} />
        <Text strong style={{ fontSize: 18, color: '#f0f4f8', fontFamily: 'JetBrains Mono, monospace' }}>
          数据导出
        </Text>
        <Tag style={{ background: 'rgba(0,229,192,0.1)', border: '1px solid rgba(0,229,192,0.3)', color: '#00e5c0', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
          CSV UTF-8
        </Tag>
      </div>

      {/* Select */}
      <Card style={{ background: '#141c2e', border: '1px solid #2a3a52', borderRadius: 10 }} bodyStyle={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          {MODULES.map(m => (
            <div
              key={m.key}
              onClick={() => setModule(m.key)}
              style={{
                padding: '10px 16px', borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${module === m.key ? m.color : '#2a3a52'}`,
                background: module === m.key ? m.color + '12' : '#1a2438',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
            >
              <span style={{ color: m.color, fontSize: 16 }}>{m.icon}</span>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
                color: module === m.key ? m.color : '#8899aa', fontWeight: module === m.key ? 600 : 400,
              }}>
                {m.label}
              </span>
            </div>
          ))}
        </div>

        {/* Fields preview */}
        <div style={{ background: '#0f1623', border: '1px solid #2a3a52', borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
          <Text style={{ fontSize: 10, color: '#5a6a7a', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
            导出字段
          </Text>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {current.fields.map(f => (
              <Tag key={f} style={{ background: '#1a2438', border: '1px solid #2a3a52', color: '#8899aa', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, borderRadius: 4 }}>
                {f}
              </Tag>
            ))}
          </div>
        </div>

        <Button
          type="primary"
          icon={<DownloadOutlined />}
          loading={loading}
          onClick={handleExport}
          size="large"
          style={{
            height: 48, borderRadius: 8,
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 14,
            background: current.color, border: 'none',
            boxShadow: `0 0 20px ${current.color}40`,
          }}
        >
          [ 导出 {current.label} CSV ]
        </Button>
      </Card>

      {/* Info */}
      <Card style={{ background: '#141c2e', border: '1px solid #2a3a52', borderRadius: 10 }} bodyStyle={{ padding: '16px 20px' }}>
        <Text style={{ fontSize: 12, color: '#5a6a7a', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.8 }}>
          · 导出格式：CSV（UTF-8 with BOM，兼容 Excel 直接打开）{"\n"}
          · 数据来源：当前数据库实时查询{"\n"}
          · 巡检记录默认导出全部，执行时间排序{"\n"}
          · 备件库存：低库存行自动标注 ⚠️
        </Text>
      </Card>
    </div>
  );
}
