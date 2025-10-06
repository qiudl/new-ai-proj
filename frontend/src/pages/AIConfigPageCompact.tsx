import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Divider,
  Badge,
  Progress,
  Avatar
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
  EyeInvisibleOutlined,
  MessageOutlined,
  SendOutlined,
  UserOutlined,
  LoadingOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { AIProvider, AI_PROVIDER_INFO, AI_PROVIDER_DEFAULTS } from '../types/ai';
import aiConfigDatabaseService, { AIConfigRequest, AIConfigUpdateRequest, AIConfigResponse } from '../services/aiConfigDatabaseService';
import { TestHistoryDrawer } from '../components/AIConfig/TestHistoryDrawer';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

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

interface ChatMessage {
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

const AIConfigPageCompact: React.FC = React.memo(() => {
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

  // 对话测试状态
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [testingProvider, setTestingProvider] = useState<AIProvider | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');

  // 测试历史抽屉状态
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // 最近测试记录状态
  const [latestTests, setLatestTests] = useState<Record<AIProvider, { date: string; status: string } | null>>({
    openai: null,
    claude: null,
    deepseek: null
  });

  const loadingRef = useRef(false);

  const loadConfigs = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }
    loadingRef.current = true;
    setLoading(true);
    try {
      const response = await aiConfigDatabaseService.getConfigs();
      const configMap: Record<AIProvider, AIConfig | null> = {
        openai: null,
        claude: null,
        deepseek: null
      };
      
      // 处理API返回的嵌套数据结构
      let configsData: unknown = response.data || [];
      // 如果data是对象且包含data字段，则提取内层的data
      if (configsData && typeof configsData === 'object' && !Array.isArray(configsData) && (configsData as any).data) {
        configsData = (configsData as any).data;
      }
      
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
        } else {
          }
      }
      
      setConfigs(configMap);
    } catch (error) {
      console.error(`💥 [DEBUG] 加载AI配置失败:`, error);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  // 加载最近的测试记录
  const loadLatestTests = useCallback(async () => {
    const providers: AIProvider[] = ['openai', 'claude', 'deepseek'];
    const latestTestsMap: Record<AIProvider, { date: string; status: string } | null> = {
      openai: null,
      claude: null,
      deepseek: null
    };

    for (const provider of providers) {
      try {
        const { AIConfigTestService } = await import('../services/aiConfigTestService');
        const response = await AIConfigTestService.getTestHistory(provider, {
          status: 'all',
          testType: 'all',
          search: '',
          page: 1,
          limit: 1
        });

        if (response.data && response.data.length > 0) {
          const latest = response.data[0];
          latestTestsMap[provider] = {
            date: latest.createdAt,
            status: latest.testStatus
          };
        }
      } catch (error) {
        console.error(`Failed to load latest test for ${provider}:`, error);
      }
    }

    setLatestTests(latestTestsMap);
  }, []);

  useEffect(() => {
    loadConfigs();
    loadLatestTests();
  }, [loadConfigs, loadLatestTests]);

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
      // 首先尝试检查后端是否已有配置
      let hasExistingConfig = false;
      try {
        const existingConfigResponse = await aiConfigDatabaseService.getConfig(provider);
        hasExistingConfig = !!(existingConfigResponse.success && existingConfigResponse.data);
      } catch (error) {
        hasExistingConfig = false;
      }

      const updatedConfig = {
        ...config,
        [field]: tempValue
      };

      let response;
      // 优先基于后端实际状态来决定调用哪个API
      if (hasExistingConfig || (config && config.id)) {
        // 构建更新请求对象，不包含空的apiKey
        const updateRequest: Partial<AIConfigUpdateRequest> = {
          provider,
          model: updatedConfig.model || AI_PROVIDER_DEFAULTS[provider].model!,
          baseURL: updatedConfig.baseURL || AI_PROVIDER_DEFAULTS[provider].baseURL,
          temperature: updatedConfig.temperature ?? AI_PROVIDER_DEFAULTS[provider].temperature!,
          maxTokens: updatedConfig.maxTokens || AI_PROVIDER_DEFAULTS[provider].maxTokens!,
          enabled: updatedConfig.enabled !== false
        };

        // 只有在编辑apiKey字段时才包含apiKey
        if (field === 'apiKey' && tempValue) {
          updateRequest.apiKey = tempValue;
        }

        response = await aiConfigDatabaseService.updateConfig(provider, updateRequest);
      } else {
        // 创建请求必须包含apiKey
        if (field !== 'apiKey' || !tempValue) {
          message.error('创建新配置时必须先设置API密钥');
          return;
        }

        const createRequest: AIConfigRequest = {
          provider,
          apiKey: tempValue,
          model: updatedConfig.model || AI_PROVIDER_DEFAULTS[provider].model!,
          baseURL: updatedConfig.baseURL || AI_PROVIDER_DEFAULTS[provider].baseURL,
          temperature: updatedConfig.temperature ?? AI_PROVIDER_DEFAULTS[provider].temperature!,
          maxTokens: updatedConfig.maxTokens || AI_PROVIDER_DEFAULTS[provider].maxTokens!,
          enabled: updatedConfig.enabled !== false
        };

        try {
          response = await aiConfigDatabaseService.createConfig(createRequest);
        } catch (createError: unknown) {
          // 如果创建失败且是409冲突，说明配置已存在，改为更新
          if ((createError as any).response?.status === 409) {
            const updateRequest: Partial<AIConfigUpdateRequest> = {
              provider,
              apiKey: tempValue,
              model: createRequest.model,
              baseURL: createRequest.baseURL,
              temperature: createRequest.temperature,
              maxTokens: createRequest.maxTokens,
              enabled: createRequest.enabled
            };
            response = await aiConfigDatabaseService.updateConfig(provider, updateRequest);
          } else {
            throw createError;
          }
        }
      }

      if (response.success) {
        message.success('配置更新成功');
        
        await loadConfigs();
        
        cancelEditing();
      } else {
        console.error(`❌ [DEBUG] 配置保存失败:`, { provider, field, response });
        message.error(response.message || '保存失败');
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const openTestModal = (provider: AIProvider) => {
    const config = configs[provider];
    if (!config) {
      message.error('请先配置API密钥');
      return;
    }

    setTestingProvider(provider);
    setChatMessages([]);
    setInputMessage('');
    setTestModalVisible(true);
  };

  const sendTestMessage = async () => {
    if (!testingProvider || !inputMessage.trim()) return;

    const config = configs[testingProvider];
    if (!config) {
      message.error('配置不存在');
      return;
    }

    // 添加用户消息
    const userMessage: ChatMessage = {
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTesting(true);

    try {
      const testRequest = {
        provider: testingProvider,
        model: config.model,
        baseURL: config.baseURL,
        temperature: config.temperature,
        maxTokens: Math.min(config.maxTokens, 500), // 限制测试响应长度
        testText: userMessage.content
      };

      const response = await aiConfigDatabaseService.testConnection(testRequest);
      // 处理API返回的嵌套数据结构
      let testResult: any = response.data || {};
      // 如果data是对象且包含data字段，则提取内层的data
      if (testResult && typeof testResult === 'object' && !Array.isArray(testResult) && (testResult as any).data) {
        testResult = (testResult as any).data;
      }
      
      // 如果response.success为true但testResult没有success字段，则设置为true
      if (response.success && !(testResult as any).hasOwnProperty('success')) {
        (testResult as any).success = true;
        (testResult as any).message = (testResult as any).message || response.message || '测试成功';
      }
      
      if ((testResult as any).success && (testResult as any).conversation) {
        // 添加AI回复
        const assistantMessage: ChatMessage = {
          type: 'assistant',
          content: (testResult as any).conversation.answer,
          timestamp: new Date(),
          model: (testResult as any).conversation.model,
          tokens: (testResult as any).conversation.usage ? {
            prompt: (testResult as any).conversation.usage.prompt_tokens,
            completion: (testResult as any).conversation.usage.completion_tokens,
            total: (testResult as any).conversation.usage.total_tokens
          } : undefined
        };

        setChatMessages(prev => [...prev, assistantMessage]);
        } else if ((testResult as any).success) {
        // 成功但没有对话内容，可能是连接测试成功的消息
        const successMessage: ChatMessage = {
          type: 'assistant',
          content: `✅ 连接测试成功: ${(testResult as any).message || '与AI服务连接正常'}`,
          timestamp: new Date()
        };

        setChatMessages(prev => [...prev, successMessage]);
        } else {
        // 添加错误消息，显示具体的错误信息
        let errorContent = `❌ 连接失败`;
        if ((testResult as any).message) {
          // 针对常见错误提供用户友好的提示
          if ((testResult as any).message.includes('exceeded your current quota')) {
            errorContent = `❌ OpenAI配额不足：请检查账户余额和使用计划。详情请查看 https://platform.openai.com/account/billing`;
          } else if ((testResult as any).message.includes('Not Found')) {
            errorContent = `❌ API端点错误：请检查API密钥是否有效，或BaseURL配置是否正确`;
          } else if ((testResult as any).message.includes('API密钥格式错误')) {
            errorContent = `❌ ${(testResult as any).message}`;
          } else if ((testResult as any).message.includes('unauthorized') || (testResult as any).message.includes('Unauthorized')) {
            errorContent = `❌ 认证失败：请检查API密钥是否正确`;
          } else {
            errorContent = `❌ 连接失败: ${(testResult as any).message}`;
          }
        }
        
        const errorMessage: ChatMessage = {
          type: 'assistant',
          content: errorContent,
          timestamp: new Date()
        };

        setChatMessages(prev => [...prev, errorMessage]);
        }
    } catch (error) {
      console.error('测试连接失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      // 检查是否是被错误处理的成功响应
      if (errorMessage.includes('AI connection test completed')) {
        const successMessage: ChatMessage = {
          type: 'assistant',
          content: `✅ 连接测试成功: AI服务响应正常`,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, successMessage]);
      } else {
        // 网络或请求级别的错误
        let errorContent = `❌ 请求失败`;
        if (errorMessage.includes('timeout')) {
          errorContent = `❌ 请求超时：AI服务响应时间过长，请稍后重试`;
        } else if (errorMessage.includes('Network Error') || errorMessage.includes('网络错误')) {
          errorContent = `❌ 网络错误：请检查网络连接或服务是否可用`;
        } else if (errorMessage.includes('404')) {
          errorContent = `❌ 服务不可用：API端点可能不存在或已迁移`;
        } else {
          errorContent = `❌ 网络错误: ${errorMessage}`;
        }
        
        const failureMessage: ChatMessage = {
          type: 'assistant',
          content: errorContent,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, failureMessage]);
      }
    } finally {
      setIsTesting(false);
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

  const renderInlineField = (
    provider: AIProvider,
    field: string,
    label: string,
    value: any,
    type: 'text' | 'select' | 'number' | 'switch' | 'password' = 'text',
    options?: Array<{label: string, value: any}>,
    placeholder?: string,
    size: 'small' | 'default' = 'small'
  ) => {
    const isEditing = editingField?.provider === provider && editingField?.field === field;
    const isApiKey = field === 'apiKey';
    const hasValue = value !== null && value !== undefined && value !== '';
    
    return (
      <div 
        style={{ 
          marginBottom: size === 'small' ? '8px' : '12px',
          padding: '6px 8px',
          borderRadius: '4px',
          border: '1px solid transparent',
          transition: 'all 0.2s',
          cursor: isEditing ? 'default' : 'pointer',
          backgroundColor: isEditing ? '#f0f9ff' : 'transparent',
          minHeight: size === 'small' ? '32px' : '40px'
        }}
        className="inline-field"
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              fontSize: '11px', 
              color: '#8c8c8c', 
              marginBottom: '2px',
              fontWeight: 500
            }}>
              {label}
            </div>
            
            {isEditing ? (
              <div>
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
                    {...(field === 'maxTokens' && { min: 100, max: 32000 })}
                  />
                )}
                {type === 'switch' && (
                  <Switch
                    checked={tempValue}
                    onChange={setTempValue}
                    
                    autoFocus
                  />
                )}
                
                <div style={{ marginTop: '4px' }}>
                  <Space size={4}>
                    <Button 
                      type="primary" 
                       
                      onClick={saveField}
                      loading={saving}
                      icon={<SaveOutlined />}
                      style={{ fontSize: '11px', height: '22px' }}
                    >
                      保存
                    </Button>
                    <Button 
                       
                      onClick={cancelEditing}
                      icon={<CloseOutlined />}
                      style={{ fontSize: '11px', height: '22px' }}
                    >
                      取消
                    </Button>
                  </Space>
                </div>
              </div>
            ) : (
              <div style={{ 
                fontSize: '12px',
                color: '#262626',
                fontWeight: 400,
                wordBreak: 'break-all',
                lineHeight: '1.4'
              }}>
                {isApiKey ? (
                  hasValue ? (
                    <Space size={4}>
                      <Text code style={{ letterSpacing: '0.5px', fontSize: '11px' }}>••••••••••••</Text>
                      <Tag color="green" style={{ fontSize: '10px', lineHeight: '16px', padding: '0 4px' }}>已配置</Tag>
                    </Space>
                  ) : (
                    <Text type="secondary" style={{ fontSize: '11px' }}>点击设置</Text>
                  )
                ) : type === 'switch' ? (
                  <Switch checked={value} disabled  />
                ) : (
                  <Text style={{ fontSize: '12px' }}>
                    {hasValue ? String(value) : <span style={{ color: '#bfbfbf' }}>未设置</span>}
                  </Text>
                )}
              </div>
            )}
          </div>
          
          {!isEditing && (
            <EditOutlined style={{ 
              color: '#bfbfbf', 
              fontSize: '10px',
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
        
        style={{ 
          height: '480px',
          display: 'flex',
          flexDirection: 'column'
        }}
        styles={{ 
          body: {
            padding: '16px', 
            flex: 1,
            display: 'flex',
            flexDirection: 'column'
          }
        }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space size={4}>
              <RobotOutlined style={{ color: '#1890ff', fontSize: '14px' }} />
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{info.name}</span>
              {hasConfig ? (
                config.enabled ? (
                  <Tag color="green" style={{ fontSize: '10px', margin: 0 }}>启用</Tag>
                ) : (
                  <Tag color="orange" style={{ fontSize: '10px', margin: 0 }}>禁用</Tag>
                )
              ) : (
                <Tag color="default" style={{ fontSize: '10px', margin: 0 }}>未配置</Tag>
              )}
            </Space>
            
            <Space size={4}>
              <Tag color="blue" style={{ fontSize: '9px', padding: '0 4px', margin: 0 }}>
                <DollarOutlined style={{ fontSize: '8px' }} /> {info.pricing}
              </Tag>
              <Tag color="cyan" style={{ fontSize: '9px', padding: '0 4px', margin: 0 }}>
                <ThunderboltOutlined style={{ fontSize: '8px' }} /> {info.speed}
              </Tag>
            </Space>
          </div>
        }
      >
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* 提供商描述 */}
          <div style={{ marginBottom: '12px' }}>
            <Text type="secondary" style={{ fontSize: '11px', lineHeight: '1.4' }}>
              {info.description}
            </Text>
          </div>

          {/* 配置字段 */}
          <div style={{ flex: 1 }}>
            {renderInlineField(
              provider,
              'enabled',
              '启用状态',
              config?.enabled ?? true,
              'switch'
            )}
            
            {renderInlineField(
              provider,
              'apiKey',
              'API 密钥',
              config?.apiKey,
              'password',
              undefined,
              hasConfig ? '输入新密钥以更新' : `请输入${info.name} API密钥`
            )}
            
            {renderInlineField(
              provider,
              'model',
              '模型',
              config?.model || AI_PROVIDER_DEFAULTS[provider].model,
              'select',
              info.models.map(m => ({ label: m.label, value: m.value })).slice(0, 3), // 只显示前3个模型
              '选择模型'
            )}
            
            {renderInlineField(
              provider,
              'baseURL',
              'API地址',
              config?.baseURL || AI_PROVIDER_DEFAULTS[provider].baseURL,
              'text',
              undefined,
              '默认官方地址'
            )}
            
            {renderInlineField(
              provider,
              'temperature',
              'Temperature',
              config?.temperature ?? AI_PROVIDER_DEFAULTS[provider].temperature,
              'number',
              undefined,
              '0.0-1.0'
            )}
            
            {renderInlineField(
              provider,
              'maxTokens',
              '最大Token',
              config?.maxTokens || AI_PROVIDER_DEFAULTS[provider].maxTokens,
              'number',
              undefined,
              '100-8000'
            )}
          </div>

          {/* 操作按钮 */}
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <Button
                type="primary"

                icon={<MessageOutlined />}
                onClick={() => openTestModal(provider)}
                disabled={!hasConfig}
                block
                style={{ fontSize: '12px' }}
              >
                对话测试
              </Button>

              <Button
                icon={<HistoryOutlined />}
                onClick={() => {
                  setSelectedProvider(provider);
                  setHistoryDrawerVisible(true);
                }}
                block
                style={{ fontSize: '11px', padding: '4px 8px', height: 'auto', lineHeight: '1.4' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
                  <span>查看历史</span>
                  {latestTests[provider] && (
                    <span style={{ fontSize: '10px', color: '#8c8c8c', marginTop: '2px' }}>
                      (最近: {new Date(latestTests[provider]!.date).toLocaleDateString('zh-CN', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}, {latestTests[provider]!.status === 'success' ? '✓ 成功' : '✗ 失败'})
                    </span>
                  )}
                </div>
              </Button>

              {hasConfig && (
                <Button
                  danger

                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(provider)}
                  block
                  style={{ fontSize: '12px' }}
                >
                  删除配置
                </Button>
              )}
            </Space>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <style>
        {`
          .inline-field:hover .edit-icon {
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
          点击字段直接编辑，使用对话测试验证配置。API密钥加密存储，显示为遮罩格式保障安全。
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
        <Row gutter={[16, 16]}>
          {(['openai', 'claude', 'deepseek'] as AIProvider[]).map(provider => (
            <Col span={8} key={provider}>
              {renderProviderCard(provider)}
            </Col>
          ))}
        </Row>
      </Spin>

      {/* 对话测试模态框 */}
      <Modal
        title={
          <Space>
            <MessageOutlined style={{ color: '#1890ff' }} />
            {testingProvider && `${AI_PROVIDER_INFO[testingProvider].name} 对话测试`}
          </Space>
        }
        open={testModalVisible}
        onCancel={() => setTestModalVisible(false)}
        footer={null}
        width={600}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
          {/* 聊天消息区域 */}
          <div 
            style={{ 
              flex: 1, 
              padding: '16px', 
              overflowY: 'auto',
              backgroundColor: '#fafafa',
              borderBottom: '1px solid #f0f0f0'
            }}
          >
            {chatMessages.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#8c8c8c', 
                padding: '40px 20px',
                fontSize: '14px'
              }}>
                <MessageOutlined style={{ fontSize: '32px', marginBottom: '12px', color: '#d9d9d9' }} />
                <div>发送消息开始对话测试</div>
                <div style={{ fontSize: '12px', marginTop: '8px' }}>
                  建议输入简单问题，如："你好，请介绍一下你自己"
                </div>
              </div>
            ) : (
              <div>
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: '16px',
                      display: 'flex',
                      justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{ maxWidth: '80%', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      {msg.type === 'assistant' && (
                        <Avatar 
                          icon={<RobotOutlined />} 
                           
                          style={{ backgroundColor: '#1890ff', flexShrink: 0 }}
                        />
                      )}
                      
                      <div>
                        <div
                          style={{
                            padding: '8px 12px',
                            borderRadius: '12px',
                            backgroundColor: msg.type === 'user' ? '#1890ff' : '#ffffff',
                            color: msg.type === 'user' ? '#ffffff' : '#262626',
                            fontSize: '13px',
                            lineHeight: '1.5',
                            wordBreak: 'break-word',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                          }}
                        >
                          {msg.content}
                        </div>
                        
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#8c8c8c', 
                          marginTop: '4px',
                          textAlign: msg.type === 'user' ? 'right' : 'left'
                        }}>
                          {msg.timestamp.toLocaleTimeString()}
                          {msg.model && (
                            <>
                              {' • '}
                              <Tag color="blue" style={{ fontSize: '9px', margin: 0 }}>
                                {msg.model}
                              </Tag>
                            </>
                          )}
                          {msg.tokens && (
                            <>
                              {' • '}
                              <span>Token: {msg.tokens.total}</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {msg.type === 'user' && (
                        <Avatar 
                          icon={<UserOutlined />} 
                           
                          style={{ backgroundColor: '#52c41a', flexShrink: 0 }}
                        />
                      )}
                    </div>
                  </div>
                ))}
                
                {isTesting && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Avatar 
                        icon={<LoadingOutlined />} 
                         
                        style={{ backgroundColor: '#1890ff' }}
                      />
                      <div style={{
                        padding: '8px 12px',
                        backgroundColor: '#f0f0f0',
                        borderRadius: '12px',
                        fontSize: '13px',
                        color: '#8c8c8c'
                      }}>
                        AI正在思考中...
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 输入区域 */}
          <div style={{ padding: '16px', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <TextArea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="输入你的问题..."
                autoSize={{ minRows: 1, maxRows: 3 }}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    sendTestMessage();
                  }
                }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={sendTestMessage}
                loading={isTesting}
                disabled={!inputMessage.trim()}
              >
                发送
              </Button>
            </div>
            <div style={{
              fontSize: '11px',
              color: '#8c8c8c',
              marginTop: '8px',
              textAlign: 'center'
            }}>
              按 Enter 发送，Shift + Enter 换行
            </div>
          </div>
        </div>
      </Modal>

      {/* 测试历史抽屉 */}
      <TestHistoryDrawer
        provider={selectedProvider || 'openai'}
        visible={historyDrawerVisible}
        onClose={() => setHistoryDrawerVisible(false)}
      />
    </div>
  );
});

export default AIConfigPageCompact;