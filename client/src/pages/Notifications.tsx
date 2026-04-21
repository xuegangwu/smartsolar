import { useState, useEffect } from 'react';
import {
  Card, List, Tag, Button, Space, Typography, Badge, Empty,
  Spin, Popconfirm, message,
} from 'antd';
import {
  BellOutlined, CheckCircleOutlined, WarningOutlined,
  InfoCircleOutlined, DeleteOutlined, EyeOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const TYPE_ICON: Record<string, React.ReactNode> = {
  alert: <WarningOutlined style={{ color: '#ef4444' }} />,
  workorder: <CheckCircleOutlined style={{ color: '#22c55e' }} />,
  system: <InfoCircleOutlined style={{ color: '#3b82f6' }} />,
  inspection: <BellOutlined style={{ color: '#f59e0b' }} />,
};

const TYPE_TEXT: Record<string, string> = {
  alert: '告警', workorder: '工单', system: '系统', inspection: '巡检',
};
const TYPE_COLOR: Record<string, string> = {
  alert: 'red', workorder: 'green', system: 'blue', inspection: 'orange',
};

interface Notification extends any {
  _id: string;
  type: string;
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export default function Notifications() {
  const [data, setData] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'all' | 'unread'>('all');

  useEffect(() => { loadData(); }, [tab]);

  async function loadData() {
    setLoading(true);
    const token = localStorage.getItem('smartsolar_token');
    const res = await fetch(`/api/notifications?${tab === 'unread' ? 'read=false' : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json());
    if (res.success) {
      setData(res.data.items);
    }
    setLoading(false);
  }

  async function markAllRead() {
    const token = localStorage.getItem('smartsolar_token');
    const res = await fetch('/api/notifications/read', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    }).then(r => r.json());
    if (res.success) { message.success('已全部标为已读'); loadData(); }
  }

  async function markRead(id: string) {
    const token = localStorage.getItem('smartsolar_token');
    await fetch(`/api/notifications/read`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids: [id] }),
    });
    setData(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
  }

  async function handleDelete(id: string) {
    const token = localStorage.getItem('smartsolar_token');
    const res = await fetch(`/api/notifications/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json());
    if (res.success) { message.success('已删除'); setData(prev => prev.filter(n => n._id !== id)); }
  }

  const unreadCount = data.filter(n => !n.read).length;
  const totalUnread = data.length; // approximation

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>🔔 通知中心</Title>
        <Space>
          <Badge count={data.filter(n => !n.read).length} style={{ backgroundColor: '#ef4444' }}>
            <Button size="small" onClick={() => setTab('unread')}>未读</Button>
          </Badge>
          <Button size="small" onClick={() => setTab('all')}>全部</Button>
          <Popconfirm title="确认将所有通知标为已读？" onConfirm={markAllRead}>
            <Button size="small" icon={<CheckCircleOutlined />}>全部已读</Button>
          </Popconfirm>
          <Button size="small" onClick={loadData}>刷新</Button>
        </Space>
      </div>

      <Card bodyStyle={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
        ) : data.length === 0 ? (
          <Empty description="暂无通知" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 60 }} />
        ) : (
          <List
            dataSource={data}
            renderItem={(item) => (
              <List.Item
                style={{
                  padding: '16px 24px',
                  background: item.read ? 'transparent' : 'rgba(59,130,246,0.04)',
                  borderBottom: '1px solid #f0f2f5',
                }}
                key={item._id}
              >
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Space>
                      {!item.read && <Badge status="processing" />}
                      {TYPE_ICON[item.type] || <BellOutlined />}
                      <Text strong style={{ fontSize: 14 }}>{item.title}</Text>
                    </Space>
                    <Space>
                      <Tag color={TYPE_COLOR[item.type]} style={{ fontSize: 11 }}>{TYPE_TEXT[item.type] || item.type}</Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(item.createdAt).toLocaleString('zh-CN')}
                      </Text>
                      {!item.read && (
                        <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => markRead(item._id)} style={{ fontSize: 12 }}>
                          标为已读
                        </Button>
                      )}
                      <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(item._id)} />
                    </Space>
                  </div>
                  {item.content && (
                    <Paragraph type="secondary" style={{ fontSize: 13, marginTop: 6, marginBottom: 0, marginLeft: 24 }}>
                      {item.content}
                    </Paragraph>
                  )}
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}
