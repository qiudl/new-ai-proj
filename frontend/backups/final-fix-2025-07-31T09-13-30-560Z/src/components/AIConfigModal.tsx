// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  Tabs,
  Form,
  Input,
  Select,
  Button,
  Space,
  Alert,
  Card,
  Typography,
  Row,
  Col,
  Divider,
  Tag,
  message,
  Tooltip,
  Collapse,
  InputNumber
} from 'antd';
import {
  SettingOutlined,
  KeyOutlined,
  ExperimentOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  DollarOutlined,
  GlobalOutlined,
  SaveOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { AIProvider, AIProviderConfig, AI_PROVIDER_INFO } from '../types/ai';
import aiConfigService from '../services/aiConfigService';

const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

interface AIConfigModalProps {
  visible: boolean;
  onCancel: () => void;
  onSave?: () => void;
}

const AIConfigModal: React.FC<AIConfigModalProps> = ({
  visible,
  onCancel,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<AIProvider>('openai');
  const [config, setConfig] = useState<Partial<AIProviderConfig>>({});
  const [testResults, setTestResults] = useState<Record<AIProvider, { testing: boolean; result?: { success: boolean; message: string } }>>({
    openai: { testing: false },
    claude: { testing: false },
    deepseek: { testing: false }
  });
  const [saving, setSaving] = useState(false);

  const [openaiForm] = Form.useForm();
  const [claudeForm] = Form.useForm();
  const [deepseekForm] = Form.useForm();

  const forms = useMemo(() => ({
    openai: openaiForm,
    claude: claudeForm,
    deepseek: deepseekForm
  }), [openaiForm, claudeForm, deepseekForm]);

  const loadConfig = useCallback(() => {
    const currentConfig = aiConfigService.getConfig();
    setConfig(currentConfig);
    
    // 设置表单值
    Object.keys(forms).forEach(provider => {
      const providerConfig = currentConfig[provider as AIProvider];
      if (providerConfig) {
        forms[provider as AIProvider].setFieldsValue(providerConfig);
      }
    });
  }, [forms]);

  useEffect(() => {
    if (visible) {
      loadConfig();
    }
  }, [visible, loadConfig]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // 验证所有表单
      const allValues: Partial<AIProviderConfig> = {};
      
      for (const [provider, form] of Object.entries(forms)) {
        try {
          const values = await form.validateFields();
          allValues[provider as AIProvider] = values;
        } catch (error) {
          // 如果某个提供商的表单验证失败，使用现有配置
          allValues[provider as AIProvider] = config[provider as AIProvider];
        }
      }
      
      aiConfigService.saveConfig(allValues);
      message.success('AI配置保存成功！');
      
      if (onSave) {
        onSave();
      }
      
      onCancel();
    } catch (error) {
      message.error('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (provider: AIProvider) => {
    try {
      setTestResults(prev => ({
        ...prev,
        [provider]: { testing: true }
      }));

      const form = forms[provider];
      const values = await form.validateFields();
      
      const result = await aiConfigService.testConnection(provider, values);
      
      setTestResults(prev => ({
        ...prev,
        [provider]: { testing: false, result }
      }));

      if (result.success) {
        message.success(`${AI_PROVIDER_INFO[provider].name} 连接测试成功！`);
      } else {
        message.error(`${AI_PROVIDER_INFO[provider].name} 连接测试失败：${result.message}`);
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [provider]: { testing: false, result: { success: false, message: '测试失败' } }
      }));
      message.error('连接测试失败');
    }
  };

  const handleReset = () => {
    Modal.confirm({
      title: '确认重置',
      content: '确定要重置所有AI配置吗？此操作不可恢复。',
      okText: '确定重置',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        aiConfigService.resetConfig();
        loadConfig();
        message.success('配置已重置');
      }
    });
  };

  const renderProviderForm = (provider: AIProvider) => {
    const form = forms[provider];
    const info = AI_PROVIDER_INFO[provider];
    const testResult = testResults[provider];
    
    return (
      <div style={{ padding: '0 16px' }}>
        {/* 提供商信息 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={16}>
              <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
                <RobotOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                {info.name}
              </Title>
              <Paragraph style={{ margin: 0, fontSize: '13px' }}>
                {info.description}
              </Paragraph>
            </Col>
            <Col span={8}>
              <div style={{ textAlign: 'right' }}>
                <Space direction="vertical" size="small">
                  <Tag color="blue">
                    <DollarOutlined /> {info.pricing}
                  </Tag>
                  <Tag color="green">
                    <ThunderboltOutlined /> {info.speed}
                  </Tag>
                </Space>
              </div>
            </Col>
          </Row>
        </Card>

        {/* 配置表单 */}
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(changedValues, allValues) => {
            setConfig(prev => ({
              ...prev,
              [provider]: allValues
            }));
          }}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="apiKey"
                label={
                  <Space>
                    <KeyOutlined />
                    API 密钥
                  </Space>
                }
                rules={[
                  { required: true, message: '请输入API密钥' },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      const validation = aiConfigService.validateApiKey(provider, value);
                      if (validation.valid) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error(validation.message));
                    }
                  }
                ]}
              >
                <Input.Password 
                  placeholder={`请输入${info.name} API密钥`}
                  suffix={
                    <Tooltip title="API密钥将安全保存在本地存储中">
                      <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                    </Tooltip>
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="model"
                label="模型"
                rules={[{ required: true, message: '请选择模型' }]}
              >
                <Select placeholder="选择模型">
                  {info.models.map(model => (
                    <Option key={model.value} value={model.value}>
                      <div>
                        <div>{model.label}</div>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {model.description}
                        </Text>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="baseURL"
                label={
                  <Space>
                    <GlobalOutlined />
                    API地址
                  </Space>
                }
              >
                <Input placeholder="默认官方API地址" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="temperature"
                label="Temperature"
                tooltip="控制输出的随机性，0-1之间，越小越确定"
              >
                <InputNumber
                  min={0}
                  max={1}
                  step={0.1}
                  style={{ width: '100%' }}
                  placeholder="0.3"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="maxTokens"
                label="最大Token数"
                tooltip="限制AI响应的最大长度"
              >
                <InputNumber
                  min={100}
                  max={8000}
                  style={{ width: '100%' }}
                  placeholder="2000"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        {/* 测试按钮和结果 */}
        <Divider />
        <div style={{ textAlign: 'center' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              type="primary"
              icon={<ExperimentOutlined />}
              onClick={() => handleTest(provider)}
              loading={testResult.testing}
              disabled={!form.getFieldValue('apiKey')}
            >
              {testResult.testing ? '测试连接中...' : '测试连接'}
            </Button>
            
            {testResult.result && (
              <Alert
                message={testResult.result.success ? '连接成功' : '连接失败'}
                description={testResult.result.message}
                type={testResult.result.success ? 'success' : 'error'}
                showIcon
                icon={testResult.result.success ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              />
            )}
          </Space>
        </div>
      </div>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined style={{ color: '#1890ff' }} />
          AI配置管理
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={800}
      style={{ top: 20 }}
      footer={[
        <Button key="reset" onClick={handleReset}>
          重置配置
        </Button>,
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button 
          key="save" 
          type="primary" 
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={saving}
        >
          保存配置
        </Button>
      ]}
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* 配置说明 */}
        <Alert
          message="AI配置说明"
          description="配置AI API后，可以使用智能企业信息填充功能。建议至少配置一个AI提供商。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* 提供商比较 */}
        <Collapse ghost style={{ marginBottom: 16 }}>
          <Panel 
            header={
              <Space>
                <InfoCircleOutlined style={{ color: '#1890ff' }} />
                AI提供商对比
              </Space>
            }
            key="comparison"
          >
            <Row gutter={[16, 16]}>
              {Object.entries(AI_PROVIDER_INFO).map(([key, info]) => (
                <Col span={8} key={key}>
                  <Card size="small" title={info.name}>
                    <div style={{ fontSize: '12px' }}>
                      <div style={{ marginBottom: 4 }}>
                        <Text type="secondary">价格:</Text> {info.pricing}
                      </div>
                      <div style={{ marginBottom: 4 }}>
                        <Text type="secondary">速度:</Text> {info.speed}
                      </div>
                      <div>
                        <Text type="secondary">特点:</Text> {info.description}
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Panel>
        </Collapse>

        {/* 配置标签页 */}
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as AIProvider)}
          type="card"
          tabBarExtraContent={
            <Tooltip title="刷新配置">
              <Button 
                type="text" 
                icon={<ReloadOutlined />} 
                size="small"
                onClick={loadConfig}
              />
            </Tooltip>
          }
        >
          {Object.entries(AI_PROVIDER_INFO).map(([provider, info]) => {
            const hasConfig = config[provider as AIProvider]?.apiKey;
            const testResult = testResults[provider as AIProvider].result;
            
            return (
              <TabPane 
                tab={
                  <Space>
                    <span>{info.name}</span>
                    {hasConfig && (
                      testResult ? (
                        testResult.success ? (
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        ) : (
                          <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                        )
                      ) : (
                        <Tag color="blue">已配置</Tag>
                      )
                    )}
                  </Space>
                }
                key={provider}
              >
                {renderProviderForm(provider as AIProvider)}
              </TabPane>
            );
          })}
        </Tabs>

        {/* 帮助信息 */}
        <Card size="small" style={{ marginTop: 16, backgroundColor: '#fafafa' }}>
          <Title level={5}>
            <InfoCircleOutlined style={{ color: '#1890ff' }} /> 帮助信息
          </Title>
          <Row gutter={16}>
            <Col span={12}>
              <Text strong>API密钥获取：</Text>
              <ul style={{ fontSize: '12px', marginTop: 4 }}>
                <li>OpenAI: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">获取密钥</a></li>
                <li>Claude: <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">获取密钥</a></li>
                <li>DeepSeek: <a href="https://platform.deepseek.com/" target="_blank" rel="noopener noreferrer">获取密钥</a></li>
              </ul>
            </Col>
            <Col span={12}>
              <Text strong>注意事项：</Text>
              <ul style={{ fontSize: '12px', marginTop: 4 }}>
                <li>API密钥仅存储在本地</li>
                <li>建议定期更换API密钥</li>
                <li>注意API使用限制和计费</li>
              </ul>
            </Col>
          </Row>
        </Card>
      </div>
    </Modal>
  );
};

export default AIConfigModal;