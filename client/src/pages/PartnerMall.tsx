import { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Typography, Modal, Form, Input, message, Spin, Badge } from 'antd';
import { ArrowLeftOutlined, ShopOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const MALL_ITEMS = [
  { id: 'p1', name: '小米充电宝 10000mAh', desc: '便携移动电源，适合外出巡检', points: 500, stock: 20, img: '🔋' },
  { id: 'p2', name: '公牛防浪涌插排 6位', desc: '保护设备用电安全', points: 300, stock: 50, img: '🔌' },
  { id: 'p3', name: '得伟（DeWalt）工具套装', desc: '光伏安装维护工具套装', points: 2000, stock: 10, img: '🛠️' },
  { id: 'p5', name: '大疆无人机 Mavic 3', desc: '巡检航拍神器（企业版）', points: 50000, stock: 3, img: '🚁' },
  { id: 'p6', name: '华为 MatePad 平板', desc: '10.4寸，适合现场数据记录', points: 15000, stock: 5, img: '📱' },
  { id: 'p7', name: '小米米家空气净化器', desc: '改善电站值班室空气质量', points: 3000, stock: 8, img: '💨' },
  { id: 'p8', name: '大疆 Osmo 云台相机', desc: '手持云台，巡检记录', points: 8000, stock: 6, img: '📷' },
];

export default function PartnerMall() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [redeemModal, setRedeemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('partner_token');
    const userStr = localStorage.getItem('partner_user');
    if (!token) { navigate('/partner-login'); return; }
    if (userStr) setUser(JSON.parse(userStr));
  }, []);

  async function handleRedeem(values: any) {
    if (!selectedItem) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('partner_token');
      const res = await fetch('/api/partners/redemptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemName: selectedItem.name, pointsCost: selectedItem.points, ...values }),
      });
      const data = await res.json();
      if (data.success) {
        message.success('兑换申请已提交，请等待审核！');
        setRedeemModal(false);
        form.resetFields();
        // 更新本地积分
        if (user) {
          const updated = { ...user, partner: { ...user.partner, availablePoints: user.partner.availablePoints - selectedItem.points } };
          setUser(updated);
          localStorage.setItem('partner_user', JSON.stringify(updated));
        }
      } else {
        message.error(data.message || '兑换失败');
      }
    } catch { message.error('网络错误'); }
    setLoading(false);
  }

  if (!user) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin /></div>;

  return (
    <div style={{ padding: 24, background: '#f5f6f8', minHeight: '100vh' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/partner-dashboard')} style={{ marginBottom: 16 }}>
        返回工作台
      </Button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>🎁 积分商城</Title>
          <Text type="secondary">可用积分：<span style={{ color: '#f59e0b', fontWeight: 700 }}>{user.partner.availablePoints.toLocaleString()}</span> 分</Text>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        {MALL_ITEMS.map(item => (
          <Col span={8} key={item.id}>
            <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 20 }}>
              <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>{item.img}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#1a1a2e' }}>{item.name}</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>{item.desc}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>{item.points.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>库存 {item.stock}</div>
                </div>
                <Button
                  type="primary"
                  size="small"
                  disabled={user.partner.availablePoints < item.points}
                  onClick={() => { setSelectedItem(item); setRedeemModal(true); }}
                >
                  兑换
                </Button>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal
        title={`兑换：${selectedItem?.name}`}
        open={redeemModal}
        onCancel={() => { setRedeemModal(false); form.resetFields(); }}
        footer={null}
      >
        <div style={{ background: '#f5f6f8', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 13 }}>消耗积分：<strong style={{ color: '#f59e0b' }}>{selectedItem?.points.toLocaleString()}</strong> 分</div>
          <div style={{ fontSize: 13 }}>当前可用：<strong>{user?.partner.availablePoints.toLocaleString()}</strong> 分</div>
        </div>
        <Form form={form} layout="vertical" onFinish={handleRedeem}>
          <Form.Item name="shippingAddress" label="收货地址" rules={[{ required: true, message: '请填写收货地址' }]}>
            <Input.TextArea rows={2} placeholder="省/市/区+详细地址" />
          </Form.Item>
          <Form.Item name="contactPhone" label="联系电话" rules={[{ required: true, message: '请填写电话' }]}>
            <Input placeholder="手机号码" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input placeholder="备注信息（选填）" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            确认兑换
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
