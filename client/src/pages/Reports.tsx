import { useState } from 'react';
import {
  Card, Button, Space, Typography, Row, Col, Table, Tag, DatePicker,
  Select, message, Tabs, Divider,
} from 'antd';
import {
  DownloadOutlined, FileExcelOutlined, FilePdfOutlined,
  TableOutlined, BarChartOutlined, HomeOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const REPORTS = [
  { key: 'workorders', label: '工单汇总', icon: <FileExcelOutlined />, desc: '导出所有工单，含状态、类型、负责人等' },
  { key: 'stations', label: '电站台账', icon: <HomeOutlined />, desc: '导出所有电站信息，含容量、位置、状态' },
  { key: 'partners', label: '渠道商积分', icon: <BarChartOutlined />, desc: '导出分销商/安装商积分、等级、安装量' },
  { key: 'projects', label: '项目建设', icon: <TableOutlined />, desc: '导出所有项目，含阶段、进度、预算' },
];

function downloadCSV(data: any[], filename: string, columns: { title: string; key: string }[]) {
  const header = columns.map(c => c.title).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      let val = row[c.key];
      if (val === null || val === undefined) return '';
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    }).join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [loading, setLoading] = useState('');

  async function handleExport(key: string) {
    setLoading(key);
    const token = localStorage.getItem('smartsolar_token') || '';
    const headers = { Authorization: `Bearer ${token}` };

    try {
      if (key === 'workorders') {
        const res = await fetch('/api/work-orders', { headers }).then(r => r.json());
        if (!res.success) throw new Error(res.message);
        const items = res.data || [];
        downloadCSV(items.map((w: any) => ({
          orderNo: w.orderNo, title: w.title, type: w.type, priority: w.priority,
          status: w.status, station: (w.stationId as any)?.name || '-',
          equipment: (w.equipmentId as any)?.name || '-',
          createdAt: new Date(w.createdAt).toLocaleDateString('zh-CN'),
          updatedAt: new Date(w.updatedAt).toLocaleDateString('zh-CN'),
        })), '工单汇总', [
          { title: '工单号', key: 'orderNo' }, { title: '标题', key: 'title' },
          { title: '类型', key: 'type' }, { title: '优先级', key: 'priority' },
          { title: '状态', key: 'status' }, { title: '电站', key: 'station' },
          { title: '设备', key: 'equipment' }, { title: '创建日期', key: 'createdAt' },
          { title: '更新日期', key: 'updatedAt' },
        ]);
        message.success(`已导出 ${items.length} 条工单数据`);
      }

      else if (key === 'stations') {
        const res = await fetch('/api/stations', { headers }).then(r => r.json());
        if (!res.success) throw new Error(res.message);
        const items = res.data || [];
        downloadCSV(items.map((s: any) => ({
          name: s.name, type: s.type, capacity: s.capacity,
          installedCapacity: s.installedCapacity,
          owner: s.owner, contact: s.contact,
          address: s.location?.address || s.address || '-',
          status: s.status,
          gridConnectionDate: s.gridConnectionDate || '-',
        })), '电站台账', [
          { title: '电站名称', key: 'name' }, { title: '类型', key: 'type' },
          { title: '容量(kW/kWh)', key: 'capacity' }, { title: '已安装容量', key: 'installedCapacity' },
          { title: '业主', key: 'owner' }, { title: '联系人', key: 'contact' },
          { title: '地址', key: 'address' }, { title: '状态', key: 'status' },
          { title: '并网日期', key: 'gridConnectionDate' },
        ]);
        message.success(`已导出 ${items.length} 条电站数据`);
      }

      else if (key === 'partners') {
        const res = await fetch('/api/partners', { headers }).then(r => r.json());
        if (!res.success) throw new Error(res.message);
        const items = res.data || [];
        downloadCSV(items.map((p: any) => ({
          name: p.name, type: p.type === 'distributor' ? '分销商' : '安装商',
          level: p.level, region: p.region || '-',
          totalInstallations: p.totalInstallations || 0,
          totalCapacity: p.totalCapacity ? `${(p.totalCapacity/1000).toFixed(1)}k kW` : '-',
          totalPoints: p.totalPoints || 0, availablePoints: p.availablePoints || 0,
          status: p.status === 'active' ? '正常' : '已禁用',
        })), '渠道商积分', [
          { title: '名称', key: 'name' }, { title: '类型', key: 'type' },
          { title: '等级', key: 'level' }, { title: '区域', key: 'region' },
          { title: '累计安装量', key: 'totalInstallations' }, { title: '累计容量', key: 'totalCapacity' },
          { title: '累计积分', key: 'totalPoints' }, { title: '可用积分', key: 'availablePoints' },
          { title: '状态', key: 'status' },
        ]);
        message.success(`已导出 ${items.length} 条渠道商数据`);
      }

      else if (key === 'projects') {
        const res = await fetch('/api/projects', { headers }).then(r => r.json());
        if (!res.success) throw new Error(res.message);
        const items = res.data || [];
        downloadCSV(items.map((p: any) => ({
          code: p.code, name: p.name, type: p.type === 'solar' ? '光伏' : p.type === 'storage' ? '储能' : '光储',
          phase: p.phase, progress: `${p.progress}%`,
          budget: p.budget ? `${p.budget}万元` : '-',
          actualCost: p.actualCost ? `${p.actualCost}万元` : '-',
          installer: (p.installerPartnerId as any)?.name || '-',
          planStart: p.planStartDate ? new Date(p.planStartDate).toLocaleDateString('zh-CN') : '-',
          planEnd: p.planEndDate ? new Date(p.planEndDate).toLocaleDateString('zh-CN') : '-',
          status: p.status === 'planning' ? '规划中' : p.status === 'in_progress' ? '进行中' : p.status === 'completed' ? '已完成' : '已暂停',
        })), '项目建设', [
          { title: '项目编号', key: 'code' }, { title: '名称', key: 'name' },
          { title: '类型', key: 'type' }, { title: '当前阶段', key: 'phase' },
          { title: '进度', key: 'progress' }, { title: '预算', key: 'budget' },
          { title: '实际成本', key: 'actualCost' }, { title: '安装商', key: 'installer' },
          { title: '计划开工', key: 'planStart' }, { title: '计划完工', key: 'planEnd' },
          { title: '状态', key: 'status' },
        ]);
        message.success(`已导出 ${items.length} 条项目数据`);
      }
    } catch (e: any) {
      message.error('导出失败：' + e.message);
    } finally {
      setLoading('');
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={4}>📊 报表中心</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        选择报表类型，一键导出为 CSV 文件，可用 Excel 打开编辑
      </Text>

      <Row gutter={[16, 16]}>
        {REPORTS.map(report => (
          <Col span={12} key={report.key}>
            <Card
              hoverable
              style={{ borderRadius: 12 }}
              bodyStyle={{ padding: 24 }}
              onClick={() => handleExport(report.key)}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22,
                  }}>
                    {report.icon}
                  </div>
                  <div>
                    <Title level={5} style={{ margin: 0 }}>{report.label}</Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>{report.desc}</Text>
                  </div>
                </div>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  loading={loading === report.key}
                  style={{ borderRadius: 8 }}
                  block
                >
                  导出 CSV
                </Button>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Divider />

      <Card title="📋 使用说明" size="small" bodyStyle={{ padding: 16 }}>
        <Space direction="vertical" size={4}>
          <Text style={{ fontSize: 13 }}>1. 点击「导出 CSV」按钮，数据将自动下载为 CSV 文件</Text>
          <Text style={{ fontSize: 13 }}>2. 导出的文件可用 Microsoft Excel / WPS 打开，支持筛选、排序、图表生成</Text>
          <Text style={{ fontSize: 13 }}>3. 如需 PDF 格式，可在 Excel 中另存为 PDF，或使用 WPS 的导出功能</Text>
          <Text style={{ fontSize: 13 }}>4. 数据范围：当前数据库中的全部记录，建议定期导出备份</Text>
        </Space>
      </Card>
    </div>
  );
}
