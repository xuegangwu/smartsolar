import { useState, useRef, useEffect } from 'react';
import { Card, Avatar, Input, Button, Typography, Spin, List, Tag } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, ThunderboltOutlined, AlertOutlined, DatabaseOutlined, ExperimentOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  time?: string;
}

// Quick action chips
const QUICK_ACTIONS = [
  { label: '📊 数据概览', prompt: '有多少电站和设备？' },
  { label: '⚠️ 预测告警', prompt: '有哪些活跃的预测预警？' },
  { label: '🏥 健康分', prompt: '健康分最低的设备有哪些？' },
  { label: '📋 待处理工单', prompt: '待处理的工单有哪些？' },
];

const SUGGESTIONS = [
  '苏州站本周发电量多少？',
  '哪些设备需要巡检？',
  '帮我生成运维周报',
  '过去一周告警统计',
];

export default function AICopilot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `🤖 **SmartSolar AI 运维助手** 已上线！

我可以帮你：
• 📊 查询电站、设备、工单数据
• ⚠️ 查看预测性告警和设备健康分
• 📋 生成运维报告

试试快捷问题或直接输入你的问题 👇`,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Rotate suggestions
  useEffect(() => {
    const t = setInterval(() => setSuggestionIdx(i => (i + 1) % SUGGESTIONS.length), 5000);
    return () => clearInterval(t);
  }, []);

  async function sendMessage(text?: string) {
    const query = (text || input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: query,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('smartsolar_token')}`,
        },
        body: JSON.stringify({ message: query }),
      });
      const data = await res.json();
      const reply = data.data?.reply || '抱歉，AI 服务暂时不可用。';

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: reply,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ 网络错误，请检查连接后重试。',
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>
          🤖 AI 运维助手
        </Title>
        <Text style={{ fontSize: 12, color: '#9ca3af' }}>
          基于 SmartSolar 数据，智能分析设备状态、预测故障、生成报告
        </Text>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {QUICK_ACTIONS.map(action => (
          <Tag
            key={action.prompt}
            onClick={() => sendMessage(action.prompt)}
            style={{ cursor: 'pointer', borderRadius: 20, padding: '4px 12px', fontSize: 12, background: '#f5f6f8', border: '1px solid #e8eaed', color: '#4b5563' }}
          >
            {action.label}
          </Tag>
        ))}
      </div>

      {/* Chat messages */}
      <Card
        bodyStyle={{
          padding: 0,
          maxHeight: 'calc(100vh - 380px)',
          overflowY: 'auto',
          background: '#f9fafb',
        }}
        style={{ borderRadius: 16, border: '1px solid #e8eaed', marginBottom: 16 }}
      >
        <div style={{ padding: '20px 24px' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 20, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              <Avatar
                size={36}
                icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                style={{
                  background: msg.role === 'user' ? '#e6342a' : '#1a1a2e',
                  flexShrink: 0,
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              />
              <div style={{
                maxWidth: '75%',
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                display: 'flex',
              }}>
                <div style={{
                  background: msg.role === 'user' ? '#e6342a' : '#ffffff',
                  color: msg.role === 'user' ? '#fff' : '#1a1a2e',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '10px 16px',
                  fontSize: 13,
                  lineHeight: 1.7,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  whiteSpace: 'pre-wrap',
                  border: msg.role === 'user' ? 'none' : '1px solid #e8eaed',
                }}>
                  {msg.content}
                </div>
                <Text style={{ fontSize: 10, color: '#d1d5db', marginTop: 4 }}>
                  {msg.time}
                </Text>
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <Avatar size={36} icon={<RobotOutlined />} style={{ background: '#1a1a2e', flexShrink: 0 }} />
              <div style={{
                background: '#fff',
                borderRadius: 16,
                padding: '10px 16px',
                border: '1px solid #e8eaed',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <Spin size="small" />
                <Text style={{ fontSize: 12, color: '#9ca3af' }}>AI 思考中...</Text>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </Card>

      {/* Input area */}
      <Card
        bodyStyle={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-end' }}
        style={{ borderRadius: 16, border: '1px solid #e8eaed' }}
      >
        <div style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: '#d1d5db', display: 'block', marginBottom: 4 }}>
            💡 试试：「{SUGGESTIONS[suggestionIdx]}」
          </Text>
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onPressEnter={() => sendMessage()}
            placeholder="输入你的运维问题..."
            style={{
              borderRadius: 10,
              background: '#f5f6f8',
              border: '1px solid transparent',
              fontSize: 13,
            }}
            size="large"
          />
        </div>
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={() => sendMessage()}
          loading={loading}
          style={{
            height: 48,
            width: 48,
            borderRadius: 10,
            background: '#e6342a',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
      </Card>
    </div>
  );
}
