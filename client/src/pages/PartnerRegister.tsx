import { useState } from 'react';
import { Card, Form, Input, Button, Select, Typography, message, Row, Col, Divider, Space, Checkbox } from 'antd';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const SERVICE_REGIONS = ['上海市', '北京市', '广东省', '江苏省', '浙江省', '安徽省', '山东省', '四川省', '湖北省', '湖南省', '河南省', '河北省', '福建省', '江西省', '陕西省'];
const SPECIALIZED_TYPES = [
  { label: '家用光伏', value: 'residential' },
  { label: '商用光伏', value: 'commercial' },
  { label: '工业光伏', value: 'industrial' },
];

export default function PartnerRegister() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit() {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const res = await fetch('/api/partners/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      }).then(r => r.json());
      if (res.success) {
        message.success('申请已提交，请等待分销商审核！');
        navigate('/partner-login');
      } else {
        message.error(res.message || '提交失败');
      }
    } catch {
      message.error('请检查必填项');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: '40px 16px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Card style={{ borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Title level={2} style={{ marginBottom: 4 }}>🏗️ 安装商入驻申请</Title>
            <Text type="secondary">填写以下信息，提交后由分销商审核开通账号</Text>
          </div>

          <Form form={form} layout="vertical" size="large">
            <Divider>公司基本信息</Divider>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="companyName" label="公司名称" rules={[{ required: true, message: '请输入公司名称' }]}>
                  <Input placeholder="请输入公司全称" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="businessLicense" label="统一社会信用代码">
                  <Input placeholder="18位统一社会信用代码" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="contactPerson" label="联系人" rules={[{ required: true, message: '请输入联系人' }]}>
                  <Input placeholder="请输入联系人姓名" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="phone" label="联系电话" rules={[{ required: true, message: '请输入电话' }]}>
                  <Input placeholder="用于接收审核结果和账号通知" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="email" label="邮箱">
                  <Input type="email" placeholder="选填" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="address" label="公司地址">
                  <Input placeholder="请输入公司详细地址" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="staffCount" label="员工数量">
                  <Input type="number" placeholder="约有多少名员工" />
                </Form.Item>
              </Col>
            </Row>

            <Divider>业务信息</Divider>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="serviceRegions" label="服务区域">
                  <Select mode="multiple" placeholder="可多选服务覆盖区域" options={SERVICE_REGIONS.map(r => ({ value: r, label: r }))} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="specializedTypes" label="擅长领域">
                  <Checkbox.Group options={SPECIALIZED_TYPES} />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item name="description" label="公司简介">
                  <Input.TextArea rows={3} placeholder="简要介绍公司业务、技术实力、已完成项目等" />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">账号信息</Divider>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="username" label="希望的用户名" rules={[{ required: true, message: '请输入希望的用户名' }]}>
                  <Input placeholder="用于登录系统" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label=" " style={{ marginBottom: 0 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    实际账号由系统生成，审核通过后将以短信/电话通知
                  </Text>
                </Form.Item>
              </Col>
            </Row>

            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <Space size="large">
                <Button size="large" onClick={() => navigate('/partner-login')}>返回登录</Button>
                <Button type="primary" size="large" loading={loading} onClick={handleSubmit} style={{ minWidth: 160 }}>
                  提交申请
                </Button>
              </Space>
              <div style={{ marginTop: 16 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  提交申请即表示同意《渠道商合作协议》
                </Text>
              </div>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
}
