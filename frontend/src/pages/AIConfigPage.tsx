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
import { AIProvider, AI_PROVIDER_INFO, AI_PROVIDER_DEFAULTS } from '../types/ai';
import aiConfigDatabaseService, { AIConfigRequest, AIConfigResponse, AITestRequest } from '../services/aiConfigDatabaseService';
import AIConfigDatabaseService from '../services/aiConfigDatabaseService';
// import realAITestService, { RealAITestResponse } from '../services/realAITestService';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

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
  result?: any;
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
  // 简化：只跟踪表单变化状态
  const [formValues, setFormValues] = useState<Record<AIProvider, any>>({
    openai: {},
    claude: {},
    deepseek: {}
  });
  // 自定义测试问题状态
  const [testQuestions, setTestQuestions] = useState<Record<AIProvider, string>>({
    openai: '',
    claude: '',
    deepseek: ''
  });

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
      const configMap: Record<AIProvider, AIConfig | null> = {
        openai: null,
        claude: null,
        deepseek: null
      };
      
      // 获取配置数据数组
      const configsData = response.data || [];
      if (response.success && configsData && Array.isArray(configsData) && configsData.length > 0) {
        // 将响应数据转换为配置映射
        configsData.forEach((config: AIConfigResponse) => {
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
      } else {
        // 临时：为了测试UI，添加一个模拟的已保存配置
        const savedDeepSeekConfig = localStorage.getItem('test-deepseek-config');
        if (savedDeepSeekConfig) {
          const testConfig = JSON.parse(savedDeepSeekConfig);
          const provider = testConfig.provider as AIProvider;
          if (provider && (provider === 'openai' || provider === 'claude' || provider === 'deepseek')) {
            configMap[provider] = testConfig;
            }
        }
      }
      
      setConfigs(configMap);
      
      // 设置表单默认值
      Object.entries(configMap).forEach(([provider, config]) => {
        const form = forms[provider as AIProvider];
        if (!form) return;
        
        const providerKey = provider as AIProvider;
        const defaults = AI_PROVIDER_DEFAULTS[providerKey];
        
        if (config) {
          // 已有配置：显示配置信息，API密钥保留脱敏版本用于状态判断
          const formData = {
            ...defaults,
            ...config,
            // 在表单中API密钥为空，但在状态中保留脱敏版本用于状态判断
          };
          form.setFieldsValue({
            ...formData,
            apiKey: '' // 表单中API密钥为空，需要用户重新输入
          });
          setFormValues(prev => ({ ...prev, [providerKey]: formData })); // 状态中保留脱敏密钥
        } else {
          // 新配置：使用默认值
          const formData = {
            ...defaults,
            apiKey: '',
            enabled: true
          };
          form.setFieldsValue(formData);
          setFormValues(prev => ({ ...prev, [providerKey]: formData }));
        }
      });
      
      if (!response.success || !response.data || response.data.length === 0) {
        console.warn('未找到AI配置，使用默认设置');
      }
    } catch (error) {
      console.warn('加载AI配置失败，使用默认配置:', error);
      // 不显示错误消息，因为API可能未实现
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (provider: AIProvider) => {
    try {
      setSaving(true);
      const form = forms[provider];
      const values = await form.validateFields();
      
      // 检查API密钥是否为脱敏格式
      const isMaskedApiKey = values.apiKey && values.apiKey.includes('•');
      
      // 验证API密钥：新建时必须提供，更新时如果是脱敏格式则可以跳过
      const existingConfig = configs[provider];
      if (!existingConfig && (!values.apiKey || values.apiKey.trim() === '')) {
        message.error('创建新配置时API密钥不能为空');
        return;
      }
      
      if (values.apiKey && values.apiKey.trim() !== '' && isMaskedApiKey && !existingConfig) {
        message.error('请输入有效的API密钥');
        return;
      }
      
      const configRequest: AIConfigRequest = {
        provider,
        apiKey: isMaskedApiKey ? '' : values.apiKey, // 脱敏时发送空字符串，后端会保留原密钥
        model: values.model,
        baseURL: values.baseURL,
        temperature: values.temperature || 0.3,
        maxTokens: values.maxTokens || 2000,
        enabled: values.enabled || false
      };
      
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
        
        // 临时：保存到localStorage用于测试UI
        const testConfig = {
          id: Date.now(),
          provider: provider,
          apiKey: '••••••••••••••••', // 脱敏显示
          model: configRequest.model,
          baseURL: configRequest.baseURL,
          temperature: configRequest.temperature,
          maxTokens: configRequest.maxTokens,
          enabled: configRequest.enabled,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        localStorage.setItem('test-deepseek-config', JSON.stringify(testConfig));
        // 重新加载配置
        await loadConfigs();
        
        // 清空API密钥字段但不影响状态判断
        form.setFieldValue('apiKey', '');
        
        // 使用setTimeout确保状态更新后再检查
        setTimeout(() => {
          }, 500);
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
      const values = await form.validateFields(['model', 'baseURL']); // 移除apiKey验证，因为可能使用现有密钥
      
      // 获取API密钥：优先使用表单输入，如果没有输入且有保存的配置则使用已保存的密钥
      const apiKey = values.apiKey ? values.apiKey.trim() : '';
      const existingConfig = configs[provider];
      
      if (!apiKey && existingConfig) {
        // 如果没有输入新密钥但有现有配置，使用已保存的密钥进行测试
        // 不需要设置apiKey，后端会自动使用已保存的密钥
      } else if (!apiKey) {
        message.error('请先填写API密钥或保存配置');
        setTestResults(prev => ({
          ...prev,
          [provider]: { testing: false }
        }));
        return;
      }
      
      // 使用真实的API测试服务
      const testRequest: unknown = {
        provider,
        model: values.model || existingConfig?.model || AI_PROVIDER_DEFAULTS[provider].model!,
        baseURL: values.baseURL || existingConfig?.baseURL || AI_PROVIDER_DEFAULTS[provider].baseURL,
        temperature: values.temperature || existingConfig?.temperature || AI_PROVIDER_DEFAULTS[provider].temperature,
        maxTokens: Math.min(values.maxTokens || existingConfig?.maxTokens || 150, 150) // 限制测试用token
      };

      // 只有在提供了新的API密钥时才添加到请求中
      if (apiKey) {
        (testRequest as any).apiKey = apiKey;
      }

      // 添加自定义测试问题
      const customQuestion = testQuestions[provider];
      if (customQuestion && customQuestion.trim()) {
        (testRequest as any).testText = customQuestion.trim();
      }
      
      // 使用已有的aiConfigDatabaseService进行测试
      const response = await aiConfigDatabaseService.testConnection(testRequest as any);
      
      // 处理API响应格式
      const testResult = response.success ? response.data : {
        success: false,
        message: response.message || '测试失败',
        responseTime: 0
      };

      setTestResults(prev => ({
        ...prev,
        [provider]: { 
          testing: false, 
          result: testResult
        }
      }));

      if (testResult?.success) {
        message.success(`${AI_PROVIDER_INFO[provider].name} 连接测试成功！`);
        } else {
        message.error(`${AI_PROVIDER_INFO[provider].name} 测试失败：${testResult?.message || '未知错误'}`);
        console.error(`测试错误:`, testResult);
      }
    } catch (error) {
      console.error('测试连接失败:', error);
      const errorMessage = error instanceof Error ? error.message : '网络连接失败';
      setTestResults(prev => ({
        ...prev,
        [provider]: { 
          testing: false, 
          result: {
            success: false,
            message: `测试失败: ${errorMessage}`,
            responseTime: 0,
            error: errorMessage
          }
        }
      }));
      message.error(`连接测试失败: ${errorMessage}`);
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

  // 监听表单变化
  const handleFormChange = (provider: AIProvider, changedValues: unknown, allValues: unknown) => {
    setFormValues(prev => ({ ...prev, [provider]: allValues }));
  };
  
  // 检查API密钥是否已填写（从表单获取用户输入）
  const hasApiKey = (provider: AIProvider) => {
    try {
      const form = forms[provider];
      const apiKey = form?.getFieldValue('apiKey');
      // 检查用户是否输入了新的API密钥
      const hasNewApiKey = apiKey && apiKey.trim() !== '';
      // 如果有现有配置且用户没有输入新密钥，也允许测试（使用保存的密钥）
      const hasExistingKey = configs[provider] && configs[provider]?.apiKey;
      return hasNewApiKey || !!hasExistingKey;
    } catch {
      return false;
    }
  };
  
  // 检查配置是否完整（从表单获取用户输入）
  const isConfigComplete = (provider: AIProvider) => {
    try {
      const form = forms[provider];
      const values = form?.getFieldsValue();
      return values && values.apiKey && values.apiKey.trim() !== '' && values.model;
    } catch {
      return false;
    }
  };
  
  // 检查是否已有保存的配置
  const hasExistingConfig = (provider: AIProvider) => {
    return !!configs[provider];
  };

  // 获取默认测试问题
  const getDefaultTestQuestion = (provider: AIProvider) => {
    const defaultQuestions = {
      openai: '你好，请简单介绍一下你自己。',
      claude: 'Hello, please briefly introduce yourself.',
      deepseek: '你好，请用一句话介绍DeepSeek的特点。'
    };
    return defaultQuestions[provider] || '你好，这是一个连接测试。';
  };

  const renderProviderForm = (provider: AIProvider) => {
    const form = forms[provider];
    const info = AI_PROVIDER_INFO[provider];
    const testResult = testResults[provider];
    const config = configs[provider];
    const isExistingConfig = hasExistingConfig(provider);
    const hasApiKeyInput = hasApiKey(provider);
    const isComplete = isConfigComplete(provider);
    
    // 确保 form 存在后再渲染
    if (!form) {
      return <div>加载中...</div>;
    }
    
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
                {!config && (
                  <Tag color="gray" style={{ marginLeft: 8 }}>未配置</Tag>
                )}
                
                {hasApiKeyInput && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>可测试</Tag>
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
          onValuesChange={(changedValues, allValues) => handleFormChange(provider, changedValues, allValues)}
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
                    {config && (
                      <Text type="secondary">(已配置，重新输入以更新)</Text>
                    )}
                  </Space>
                }
                rules={[
                  { required: false, message: '请输入API密钥' },
                  { min: 10, message: 'API密钥长度至少10位' }
                ]}
              >
                <Input.Password 
                  placeholder={config ? `输入新密钥以更新现有配置` : `请输入${info.name} API密钥`}
                  suffix={
                    <Tooltip title="API密钥将加密存储在数据库中，安全可靠">
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
                <Input placeholder={`默认: ${AI_PROVIDER_DEFAULTS[provider].baseURL || '官方API地址'}`} />
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
            {/* 自定义测试问题 */}
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                <ExperimentOutlined style={{ marginRight: 4, color: '#1890ff' }} />
                测试连接
              </Text>
              <Input.TextArea
                placeholder={`输入自定义测试问题（可选）\n默认问题: ${getDefaultTestQuestion(provider)}`}
                value={testQuestions[provider]}
                onChange={(e) => setTestQuestions(prev => ({ ...prev, [provider]: e.target.value }))}
                rows={3}
                style={{ marginBottom: 8 }}
              />
            </div>

            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={() => handleSave(provider)}
                loading={saving}
                disabled={!isComplete}
              >
                {config ? '更新配置' : '保存配置'}
              </Button>
              
              <Button
                icon={<ExperimentOutlined />}
                onClick={() => handleTest(provider)}
                loading={testResult.testing}
                disabled={!hasApiKeyInput}
              >
                {testResult.testing ? '测试中...' : '测试连接'}
              </Button>
              
              {config && (
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
              <div style={{ marginTop: 12 }}>
                <Alert
                  message={testResult.result.success ? '连接测试成功' : '连接测试失败'}
                  description={
                    <div>
                      <div>{testResult.result.message}</div>
                      {testResult.result.responseTime > 0 && (
                        <div style={{ marginTop: 4, fontSize: '12px', color: '#8c8c8c' }}>
                          响应时间: {testResult.result.responseTime}ms
                        </div>
                      )}
                    </div>
                  }
                  type={testResult.result.success ? 'success' : 'error'}
                  showIcon
                  icon={testResult.result.success ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                />
                
                {/* 显示测试对话 */}
                {testResult.result.success && testResult.result.conversation && (
                  <Card 
                    size="small" 
                    title={
                      <Space>
                        <RobotOutlined style={{ color: '#1890ff' }} />
                        测试对话
                        <Tag color="blue">{testResult.result.conversation.model}</Tag>
                      </Space>
                    }
                    style={{ 
                      marginTop: 8,
                      border: '1px solid #d9f7be'
                    }}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <Text strong style={{ color: '#1890ff' }}>问题：</Text>
                      <div style={{ 
                        background: '#f0f9ff', 
                        padding: '8px 12px', 
                        borderRadius: '6px',
                        marginTop: 4,
                        border: '1px solid #e1f5fe'
                      }}>
                        {testResult.result.conversation.question}
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: 8 }}>
                      <Text strong style={{ color: '#52c41a' }}>回答：</Text>
                      <div style={{ 
                        background: '#f6ffed', 
                        padding: '8px 12px', 
                        borderRadius: '6px',
                        marginTop: 4,
                        border: '1px solid #d9f7be',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {testResult.result.conversation.answer}
                      </div>
                    </div>
                    
                    {testResult.result.conversation.usage && (
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#8c8c8c',
                        borderTop: '1px solid #f0f0f0',
                        paddingTop: 8,
                        marginTop: 8
                      }}>
                        <Space split={<span>|</span>}>
                          <span>输入Token: {testResult.result.conversation.usage.promptTokens}</span>
                          <span>输出Token: {testResult.result.conversation.usage.completionTokens}</span>
                          <span>总计: {testResult.result.conversation.usage.totalTokens}</span>
                        </Space>
                      </div>
                    )}
                  </Card>
                )}
              </div>
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
            items={Object.entries(AI_PROVIDER_INFO).filter(([provider]) => {
              // 只显示有对应form的provider
              return forms[provider as AIProvider];
            }).map(([provider, info]) => {
              const hasConfig = !!configs[provider as AIProvider];
              const testResult = testResults[provider as AIProvider].result;
              
              return {
                key: provider,
                label: (
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
                    {!hasConfig && (
                      <Tag color="gray">未配置</Tag>
                    )}
                  </Space>
                ),
                children: renderProviderForm(provider as AIProvider)
              };
            })}
          />

          
        </Spin>
      </Card>
    </div>
  );
};

export default AIConfigPage;