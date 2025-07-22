import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Form,
  Input,
  Select,
  Button,
  Space,
  Alert,
  Typography,
  Row,
  Col,
  Divider,
  Tag,
  message,
  Spin,
  Tooltip,
  Collapse,
  InputNumber,
  Switch,
  Modal
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
  ReloadOutlined,
  EyeInvisibleOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { AIProvider, AI_PROVIDER_INFO } from '../types/ai';
import aiConfigDatabaseService, { AIConfigRequest, AIConfigResponse, AITestRequest } from '../services/aiConfigDatabaseService';
import AIConfigDatabaseService from '../services/aiConfigDatabaseService';

const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

interface AIConfig {
  id?: number;
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseURL?: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

interface TestResult {
  testing: boolean;
  result?: { success: boolean; message: string };
}

const AIConfigPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AIProvider>('openai');
  const [configs, setConfigs] = useState<Record<AIProvider, AIConfig | null>>({
    openai: null,
    claude: null,
    deepseek: null
  });
  const [testResults, setTestResults] = useState<Record<AIProvider, TestResult>>({
    openai: { testing: false },
    claude: { testing: false },
    deepseek: { testing: false }
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [openaiForm] = Form.useForm();
  const [claudeForm] = Form.useForm();
  const [deepseekForm] = Form.useForm();

  const forms = {
    openai: openaiForm,
    claude: claudeForm,
    deepseek: deepseekForm
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const response = await aiConfigDatabaseService.getConfigs();
      
      if (response.success && response.data) {
        const configMap: Record<AIProvider, AIConfig | null> = {
          openai: null,
          claude: null,
          deepseek: null
        };
        
        // 将响应数据转换为配置映射
        response.data.forEach((config: AIConfigResponse) => {
          configMap[config.provider] = {
            id: config.id,
            provider: config.provider,
            apiKey: config.apiKeyMasked, // 已脱敏的API密钥
            model: config.model,
            baseURL: config.baseURL,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            enabled: config.enabled,
            created_at: config.createdAt,
            updated_at: config.updatedAt
          };
        });
        
        setConfigs(configMap);
        
        // 设置表单默认值
        Object.entries(configMap).forEach(([provider, config]) => {
          if (config) {
            forms[provider as AIProvider].setFieldsValue({
              ...config,
              apiKey: '' // 不预填API密钥，保持安全性
            });
          } else {
            // 为没有配置的提供商设置默认值
            const defaultConfig = {
              baseURL: provider === 'openai' ? 'https://api.openai.com/v1' : '',
              model: provider === 'openai' ? 'gpt-3.5-turbo' : provider === 'claude' ? 'claude-3-haiku-20240307' : 'deepseek-chat',
              temperature: 0.7,
              maxTokens: 2000,
              apiKey: ''
            };
            forms[provider as AIProvider].setFieldsValue(defaultConfig);
          }
        });
      }
    } catch (error) {
      console.error('加载AI配置失败:', error);
      message.error('加载AI配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (provider: AIProvider) => {
    try {
      setSaving(true);
      const form = forms[provider];
      const values = await form.validateFields();
      
      // 简单验证API密钥不为空
      if (!values.apiKey || values.apiKey.trim() === '') {
        message.error('API密钥不能为空');
        return;
      }
      
      const configRequest: AIConfigRequest = {
        provider,
        apiKey: values.apiKey,
        model: values.model,
        baseURL: values.baseURL,
        temperature: values.temperature || 0.3,
        maxTokens: values.maxTokens || 2000,
        enabled: values.enabled || false
      };
      
      const existingConfig = configs[provider];
      let response;
      
      if (existingConfig) {
        // 更新现有配置
        response = await aiConfigDatabaseService.updateConfig(provider, configRequest);
      } else {
        // 创建新配置
        response = await aiConfigDatabaseService.createConfig(configRequest);
      }
      
      if (response.success) {
        message.success(`${AI_PROVIDER_INFO[provider].name} 配置保存成功！`);
        
        // 重新加载配置
        await loadConfigs();
      } else {
        message.error(response.message || '保存配置失败');
      }
      
    } catch (error) {
      console.error('保存配置失败:', error);
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
      
      const testRequest: AITestRequest = {
        provider,
        apiKey: values.apiKey, // 如果提供了新的API密钥则使用，否则后端使用已保存的
        model: values.model,
        baseURL: values.baseURL
      };
      
      const response = await aiConfigDatabaseService.testConnection(testRequest);
      
      setTestResults(prev => ({
        ...prev,
        [provider]: { 
          testing: false, 
          result: { 
            success: response.success, 
            message: response.success ? 
              `连接成功${response.data?.responseTime ? ` (${response.data.responseTime}ms)` : ''}` : 
              response.message || '连接测试失败'
          }
        }
      }));

      if (response.success) {
        message.success(`${AI_PROVIDER_INFO[provider].name} 连接测试成功！`);
      } else {
        message.error(`${AI_PROVIDER_INFO[provider].name} 连接测试失败：${response.message}`);
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [provider]: { testing: false, result: { success: false, message: '测试失败' } }
      }));
      message.error('连接测试失败');
    }
  };

  const handleDelete = (provider: AIProvider) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除 ${AI_PROVIDER_INFO[provider].name} 的配置吗？此操作不可恢复。`,
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await aiConfigDatabaseService.deleteConfig(provider);
          
          if (response.success) {
            setConfigs(prev => ({
              ...prev,
              [provider]: null
            }));
            
            forms[provider].resetFields();
            message.success('配置已删除');
          } else {
            message.error(response.message || '删除配置失败');
          }
        } catch (error) {
          console.error('删除配置失败:', error);
          message.error('删除配置失败');
        }
      }
    });
  };

  const renderProviderForm = (provider: AIProvider) => {
    const form = forms[provider];
    const info = AI_PROVIDER_INFO[provider];
    const testResult = testResults[provider];
    const config = configs[provider];
    const isExistingConfig = !!config;
    
    return (
      <div style={{ padding: '0 16px' }}>
        {/* 提供商信息 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={16}>
              <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
                <RobotOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                {info.name}
                {config?.enabled && (
                  <Tag color="green" style={{ marginLeft: 8 }}>已启用</Tag>
                )}
                {config && !config.enabled && (
                  <Tag color="default" style={{ marginLeft: 8 }}>已禁用</Tag>
                )}
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
          initialValues={{
            enabled: true,
            temperature: 0.3,
            maxTokens: 2000,
            ...info.models[0] && { model: info.models[0].value }
          }}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="enabled"
                label="启用此AI提供商"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="apiKey"
                label={
                  <Space>
                    <KeyOutlined />
                    API 密钥
                    {isExistingConfig && (
                      <Text type="secondary">(已加密存储)</Text>
                    )}
                  </Space>
                }
                rules={[
                  { required: true, message: '请输入API密钥' }
                ]}
              >
                <Input.Password 
                  placeholder={isExistingConfig ? "输入新密钥以更新" : `请输入${info.name} API密钥`}
                  suffix={
                    <Tooltip title={isExistingConfig ? "API密钥已加密存储，只能修改不能查看" : "API密钥将加密存储在数据库中"}>
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

        {/* 操作按钮 */}
        <Divider />
        <div style={{ textAlign: 'center' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={() => handleSave(provider)}
                loading={saving}
              >
                {isExistingConfig ? '更新配置' : '保存配置'}
              </Button>
              
              <Button
                icon={<ExperimentOutlined />}
                onClick={() => handleTest(provider)}
                loading={testResult.testing}
                disabled={!form.getFieldValue('apiKey')}
              >
                {testResult.testing ? '测试中...' : '测试连接'}
              </Button>
              
              {isExistingConfig && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(provider)}
                >
                  删除配置
                </Button>
              )}
            </Space>
            
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
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Title level={3}>
            <Space>
              <SettingOutlined style={{ color: '#1890ff' }} />
              AI配置管理
            </Space>
          </Title>
          <Paragraph type="secondary">
            配置AI API密钥以启用智能企业信息填充功能。API密钥将加密存储在数据库中，保存后只能修改不能查看。
          </Paragraph>
        </div>

        <Spin spinning={loading}>
          {/* 配置说明 */}
          <Alert
            message="安全提示"
            description="所有API密钥都将加密存储在数据库中，只有系统管理员可以配置。配置完成后，用户将可以在企业信息编辑页面使用AI智能填充功能。"
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
                  onClick={loadConfigs}
                />
              </Tooltip>
            }
          >
            {Object.entries(AI_PROVIDER_INFO).map(([provider, info]) => {
              const hasConfig = !!configs[provider as AIProvider];
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
                <Text strong>安全特性：</Text>
                <ul style={{ fontSize: '12px', marginTop: 4 }}>
                  <li>API密钥加密存储在数据库</li>
                  <li>保存后只能修改不能查看</li>
                  <li>只有管理员可以配置</li>
                  <li>支持启用/禁用功能</li>
                </ul>
              </Col>
            </Row>
          </Card>
        </Spin>
      </Card>
    </div>
  );
};

export default AIConfigPage;