import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Alert,
  Typography,
  Tag,
  message,
  Spin,
  Tooltip,
  Switch,
  Select,
  InputNumber,
  Input,
  Modal,
  Divider
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
  EditOutlined,
  DeleteOutlined,
  CloseOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import { AIProvider, AI_PROVIDER_INFO, AI_PROVIDER_DEFAULTS } from '../types/ai';
import aiConfigDatabaseService, { AIConfigRequest, AIConfigResponse } from '../services/aiConfigDatabaseService';

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

interface EditingField {
  provider: AIProvider;
  field: string;
  value: React.FormEvent | React.ChangeEvent<HTMLInputElement>;
}

interface TestResult {
  testing: boolean;
  result?: any;
}

const AIConfigPageInlineEdit: React.FC = () => {
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
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [tempValue, setTempValue] = useState<any>(null);
  const [saving, setSaving] = useState(false);

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
      
      const configsData = response.data || [];
      
      if (response.success && configsData && Array.isArray(configsData) && configsData.length > 0) {
        configsData.forEach((config: AIConfigResponse) => {
          configMap[config.provider] = {
            id: config.id,
            provider: config.provider,
            apiKey: config.apiKeyMasked,
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
        // 临时：从localStorage加载测试配置
        const savedConfig = localStorage.getItem('test-deepseek-config');
        if (savedConfig) {
          const testConfig = JSON.parse(savedConfig);
          const provider = testConfig.provider as AIProvider;
          if (provider && ['openai', 'claude', 'deepseek'].includes(provider)) {
            configMap[provider] = testConfig;
          }
        }
      }
      
      setConfigs(configMap);
    } catch (error) {
      console.warn('加载AI配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (provider: AIProvider, field: string, currentValue: React.FormEvent | React.ChangeEvent<HTMLInputElement>) => {
    setEditingField({ provider, field, value: currentValue });
    setTempValue(currentValue);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setTempValue(null);
  };

  const saveField = async () => {
    if (!editingField) return;
    
    const { provider, field } = editingField;
    const config = configs[provider];
    
    if (!config && field !== 'apiKey') {
      message.error('请先配置API密钥');
      return;
    }

    setSaving(true);
    try {
      const updatedConfig = {
        ...config,
        [field]: tempValue
      };

      const configRequest: AIConfigRequest = {
        provider,
        apiKey: field === 'apiKey' ? tempValue : '',
        model: updatedConfig.model || AI_PROVIDER_DEFAULTS[provider].model!,
        baseURL: updatedConfig.baseURL || AI_PROVIDER_DEFAULTS[provider].baseURL,
        temperature: updatedConfig.temperature ?? AI_PROVIDER_DEFAULTS[provider].temperature!,
        maxTokens: updatedConfig.maxTokens || AI_PROVIDER_DEFAULTS[provider].maxTokens!,
        enabled: updatedConfig.enabled !== false
      };

      let response;
      if (config) {
        response = await aiConfigDatabaseService.updateConfig(provider, configRequest);
      } else {
        response = await aiConfigDatabaseService.createConfig(configRequest);
      }

      if (response.success) {
        message.success('配置更新成功');
        await loadConfigs();
        cancelEditing();
      } else {
        message.error(response.message || '保存失败');
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (provider: AIProvider) => {
    const config = configs[provider];
    if (!config) {
      message.error('请先配置API密钥');
      return;
    }

    setTestResults(prev => ({
      ...prev,
      [provider]: { testing: true }
    }));

    try {
      const testRequest = {
        provider,
        model: config.model,
        baseURL: config.baseURL,
        temperature: config.temperature,
        maxTokens: Math.min(config.maxTokens, 150)
      };

      const response = await aiConfigDatabaseService.testConnection(testRequest);
      const testResult = (response.success && response.data) ? response.data : {
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
        message.error(`测试失败：${testResult?.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('测试连接失败:', error);
      setTestResults(prev => ({
        ...prev,
        [provider]: { 
          testing: false, 
          result: {
            success: false,
            message: '网络连接失败',
            responseTime: 0
          }
        }
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

  const renderEditableField = (
    provider: AIProvider, 
    field: string, 
    label: string, 
    value: any, 
    type: 'text' | 'select' | 'number' | 'switch' | 'password' = 'text',
    options?: Array<{label: string, value: any}>,
    placeholder?: string
  ) => {
    const isEditing = editingField?.provider === provider && editingField?.field === field;
    const isApiKey = field === 'apiKey';
    const hasValue = value !== null && value !== undefined && value !== '';
    
    return (
      <div style={{ 
        padding: '8px 12px', 
        borderRadius: '6px',
        border: '1px solid transparent',
        transition: 'all 0.2s',
        cursor: isEditing ? 'default' : 'pointer',
        backgroundColor: isEditing ? '#f0f9ff' : 'transparent'
      }}
      className="editable-field"
      onMouseEnter={(e) => {
        if (!isEditing) {
          e.currentTarget.style.backgroundColor = '#fafafa';
          e.currentTarget.style.border = '1px solid #d9d9d9';
        }
      }}
      onMouseLeave={(e) => {
        if (!isEditing) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.border = '1px solid transparent';
        }
      }}
      onClick={() => !isEditing && startEditing(provider, field, value)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
              {label}
            </Text>
            
            {isEditing ? (
              <div style={{ marginTop: '4px' }}>
                {type === 'text' && (
                  <Input
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    placeholder={placeholder}
                    autoFocus
                    onPressEnter={saveField}
                  />
                )}
                {type === 'password' && (
                  <Input.Password
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    placeholder={placeholder}
                    autoFocus
                    onPressEnter={saveField}
                  />
                )}
                {type === 'select' && (
                  <Select
                    value={tempValue}
                    onChange={setTempValue}
                    style={{ width: '100%' }}
                    placeholder={placeholder}
                    autoFocus
                  >
                    {options?.map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                )}
                {type === 'number' && (
                  <InputNumber
                    value={tempValue}
                    onChange={setTempValue}
                    style={{ width: '100%' }}
                    placeholder={placeholder}
                    autoFocus
                    onPressEnter={saveField}
                    {...(field === 'temperature' && { min: 0, max: 1, step: 0.1 })}
                    {...(field === 'maxTokens' && { min: 100, max: 8000 })}
                  />
                )}
                {type === 'switch' && (
                  <Switch
                    checked={tempValue}
                    onChange={setTempValue}
                    autoFocus
                  />
                )}
                
                <div style={{ marginTop: '8px' }}>
                  <Space>
                    <Button 
                      type="primary" 
                       
                      onClick={saveField}
                      loading={saving}
                      icon={<SaveOutlined />}
                    >
                      保存
                    </Button>
                    <Button 
                       
                      onClick={cancelEditing}
                      icon={<CloseOutlined />}
                    >
                      取消
                    </Button>
                  </Space>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '2px', minHeight: '22px', display: 'flex', alignItems: 'center' }}>
                {isApiKey ? (
                  hasValue ? (
                    <Space>
                      <Text code style={{ letterSpacing: '1px' }}>••••••••••••••••</Text>
                      <Tag color="green">已配置</Tag>
                    </Space>
                  ) : (
                    <Text type="secondary">点击设置API密钥</Text>
                  )
                ) : type === 'switch' ? (
                  <Switch checked={value} disabled />
                ) : (
                  <Text>{hasValue ? String(value) : <span style={{ color: '#bfbfbf' }}>未设置</span>}</Text>
                )}
              </div>
            )}
          </div>
          
          {!isEditing && (
            <EditOutlined style={{ 
              color: '#8c8c8c', 
              fontSize: '12px',
              opacity: 0,
              transition: 'opacity 0.2s'
            }} 
            className="edit-icon"
            />
          )}
        </div>
      </div>
    );
  };

  const renderProviderCard = (provider: AIProvider) => {
    const info = AI_PROVIDER_INFO[provider];
    const config = configs[provider];
    const testResult = testResults[provider];
    const hasConfig = !!config;
    
    return (
      <Card
        key={provider}
        style={{ marginBottom: '16px' }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <RobotOutlined style={{ color: '#1890ff' }} />
              {info.name}
              {hasConfig ? (
                config.enabled ? (
                  <Tag color="green">已启用</Tag>
                ) : (
                  <Tag color="orange">已禁用</Tag>
                )
              ) : (
                <Tag color="default">未配置</Tag>
              )}
              {testResult.result && (
                testResult.result.success ? (
                  <Tag color="green" icon={<CheckCircleOutlined />}>测试通过</Tag>
                ) : (
                  <Tag color="red" icon={<CloseCircleOutlined />}>测试失败</Tag>
                )
              )}
            </Space>
            
            <Space>
              <Tag color="blue">
                <DollarOutlined /> {info.pricing}
              </Tag>
              <Tag color="cyan">
                <ThunderboltOutlined /> {info.speed}
              </Tag>
            </Space>
          </div>
        }
        extra={
          hasConfig && (
            <Space>
              <Button
                type="primary"
                ghost
                
                icon={<ExperimentOutlined />}
                onClick={() => handleTest(provider)}
                loading={testResult.testing}
              >
                {testResult.testing ? '测试中...' : '测试连接'}
              </Button>
              <Button
                danger
                
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(provider)}
              >
                删除
              </Button>
            </Space>
          )
        }
      >
        <div style={{ marginBottom: '16px' }}>
          <Text type="secondary">{info.description}</Text>
        </div>

        <Row gutter={[16, 16]}>
          <Col span={24}>
            {renderEditableField(
              provider,
              'enabled',
              '启用状态',
              config?.enabled ?? true,
              'switch'
            )}
          </Col>
          
          <Col span={24}>
            {renderEditableField(
              provider,
              'apiKey',
              'API 密钥',
              config?.apiKey,
              'password',
              undefined,
              hasConfig ? '输入新密钥以更新' : `请输入${info.name} API密钥`
            )}
          </Col>
          
          <Col span={12}>
            {renderEditableField(
              provider,
              'model',
              '模型',
              config?.model || AI_PROVIDER_DEFAULTS[provider].model,
              'select',
              info.models.map(m => ({ label: m.label, value: m.value })),
              '选择模型'
            )}
          </Col>
          
          <Col span={12}>
            {renderEditableField(
              provider,
              'baseURL',
              'API地址',
              config?.baseURL || AI_PROVIDER_DEFAULTS[provider].baseURL,
              'text',
              undefined,
              `默认: ${AI_PROVIDER_DEFAULTS[provider].baseURL}`
            )}
          </Col>
          
          <Col span={12}>
            {renderEditableField(
              provider,
              'temperature',
              'Temperature',
              config?.temperature ?? AI_PROVIDER_DEFAULTS[provider].temperature,
              'number',
              undefined,
              '0.0 - 1.0'
            )}
          </Col>
          
          <Col span={12}>
            {renderEditableField(
              provider,
              'maxTokens',
              '最大Token数',
              config?.maxTokens || AI_PROVIDER_DEFAULTS[provider].maxTokens,
              'number',
              undefined,
              '100 - 8000'
            )}
          </Col>
        </Row>

        {testResult.result && !testResult.result.success && (
          <Alert
            style={{ marginTop: '16px' }}
            message="连接测试失败"
            description={testResult.result.message}
            type="error"
            showIcon
          />
        )}

        {testResult.result && testResult.result.success && testResult.result.conversation && (
          <Card
            
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <Text style={{ color: '#52c41a' }}>测试成功</Text>
                <Tag color="green">{testResult.result.conversation.model}</Tag>
                {testResult.result.responseTime > 0 && (
                  <Tag color="blue">{testResult.result.responseTime}ms</Tag>
                )}
              </Space>
            }
            style={{ 
              marginTop: '16px',
              border: '1px solid #d9f7be',
              backgroundColor: '#f6ffed'
            }}
          >
            <div style={{ marginBottom: '8px' }}>
              <Text strong style={{ color: '#1890ff' }}>问题：</Text>
              <div style={{ 
                background: '#f0f9ff', 
                padding: '8px 12px', 
                borderRadius: '6px',
                marginTop: '4px',
                border: '1px solid #e1f5fe'
              }}>
                {testResult.result.conversation.question}
              </div>
            </div>
            
            <div>
              <Text strong style={{ color: '#52c41a' }}>回答：</Text>
              <div style={{ 
                background: '#f6ffed', 
                padding: '8px 12px', 
                borderRadius: '6px',
                marginTop: '4px',
                border: '1px solid #d9f7be',
                whiteSpace: 'pre-wrap'
              }}>
                {testResult.result.conversation.answer}
              </div>
            </div>
          </Card>
        )}
      </Card>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <style>
        {`
          .editable-field:hover .edit-icon {
            opacity: 1 !important;
          }
        `}
      </style>

      <div style={{ marginBottom: '24px' }}>
        <Title level={3}>
          <Space>
            <SettingOutlined style={{ color: '#1890ff' }} />
            AI配置管理
          </Space>
        </Title>
        <Paragraph type="secondary">
          点击字段即可编辑配置。API密钥将加密存储，保存后以遮罩形式显示。
        </Paragraph>
        
        <div style={{ textAlign: 'right', marginBottom: '16px' }}>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={loadConfigs}
            loading={loading}
          >
            刷新配置
          </Button>
        </div>
      </div>

      <Spin spinning={loading}>
        <Row gutter={[24, 0]}>
          <Col span={24}>
            {(['openai', 'claude', 'deepseek'] as AIProvider[]).map(provider => 
              renderProviderCard(provider)
            )}
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default AIConfigPageInlineEdit;