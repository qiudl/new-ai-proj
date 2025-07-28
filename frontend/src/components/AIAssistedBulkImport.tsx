import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Space,
  Input,
  Button,
  Alert,
  Typography,
  Spin,
  Tag,
  Row,
  Col,
  Select,
  Tooltip,
  Progress,
  Badge,
  Divider,
  message
} from 'antd';
import {
  RobotOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  DollarCircleOutlined
} from '@ant-design/icons';
import { AIProvider, AI_PROVIDER_INFO } from '../types/ai';
import {
  AITaskGenerationRequest,
  GeneratedSubTask,
  AIServiceStatus
} from '../types/aiTaskGenerator';
import aiTaskGeneratorService from '../services/aiTaskGeneratorService';
import { Task } from '../types/task';
import TaskSelector from './TaskSelector';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface AIAssistedBulkImportProps {
  projectId: number;
  onTasksGenerated?: (tasks: GeneratedSubTask[]) => void;
  onImport?: (tasks: GeneratedSubTask[], parentTaskId?: number) => void;
  className?: string;
}

interface GenerationResult {
  tasks: GeneratedSubTask[];
  quality: number;
  provider: AIProvider;
  model: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
  generationTime: number;
  reasoning?: string;
}

const AIAssistedBulkImport: React.FC<AIAssistedBulkImportProps> = ({
  projectId,
  onTasksGenerated,
  onImport,
  className = ''
}) => {
  // 状态管理
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>([]);
  const [serviceStatus, setServiceStatus] = useState<Map<AIProvider, AIServiceStatus>>(new Map());
  const [selectedParentTask, setSelectedParentTask] = useState<Task | null>(null);
  const [keywords, setKeywords] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | undefined>();
  const [complexity, setComplexity] = useState<'simple' | 'detailed'>('detailed');
  const [maxTasks, setMaxTasks] = useState(6);
  
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 初始化：检查可用的AI提供商
  useEffect(() => {
    const initializeAI = async () => {
      try {
        const providers = await aiTaskGeneratorService.getAvailableProviders();
        setAvailableProviders(providers);
        
        const status = aiTaskGeneratorService.getServiceStatus();
        setServiceStatus(status);
        
        if (providers.length > 0) {
          // 自动选择第一个可用的提供商
          setSelectedProvider(providers[0]);
        }
      } catch (error) {
        console.error('初始化AI服务失败:', error);
      }
    };

    initializeAI();
  }, []);

  // 刷新AI服务状态
  const refreshAIStatus = useCallback(async () => {
    try {
      await aiTaskGeneratorService.refreshProviderStatus();
      const providers = await aiTaskGeneratorService.getAvailableProviders();
      const status = aiTaskGeneratorService.getServiceStatus();
      
      setAvailableProviders(providers);
      setServiceStatus(status);
      
      message.success('AI服务状态已刷新');
    } catch (error) {
      message.error('刷新AI服务状态失败');
    }
  }, []);

  // AI生成子任务
  const handleAIGenerate = useCallback(async () => {
    if (!selectedParentTask) {
      message.warning('请先选择父任务');
      return;
    }

    if (!keywords.trim()) {
      message.warning('请输入关键词描述');
      return;
    }

    if (availableProviders.length === 0) {
      message.error('没有可用的AI提供商，请检查AI配置');
      return;
    }

    setGenerating(true);
    try {
      const request: AITaskGenerationRequest = {
        parentTaskId: selectedParentTask.id,
        parentTaskTitle: selectedParentTask.title,
        keywords: keywords.trim(),
        preferredProvider: selectedProvider,
        maxTasks,
        complexity,
        includeTimeEstimate: true,
        projectId
      };

      const response = await aiTaskGeneratorService.generateSubTasks(request);

      if (response.success && response.data) {
        const result: GenerationResult = {
          tasks: response.data.generatedTasks,
          quality: response.data.estimatedQuality,
          provider: response.data.usedProvider,
          model: response.data.usedModel,
          tokensUsed: response.data.tokensUsed,
          cost: response.data.estimatedCost || 0,
          generationTime: response.data.generationTime,
          reasoning: response.data.reasoning
        };

        setGenerationResult(result);
        
        if (onTasksGenerated) {
          onTasksGenerated(result.tasks);
        }

        message.success(`AI成功生成${result.tasks.length}个子任务 (质量评分: ${result.quality}分)`);
      } else {
        message.error(response.error?.message || 'AI生成失败');
      }
    } catch (error) {
      console.error('AI生成失败:', error);
      message.error('生成失败，请检查AI配置或网络连接');
    } finally {
      setGenerating(false);
    }
  }, [selectedParentTask, keywords, selectedProvider, maxTasks, complexity, projectId, availableProviders.length, onTasksGenerated]);

  // 导入生成的任务
  const handleImportTasks = useCallback(() => {
    if (!generationResult || !selectedParentTask) {
      message.warning('没有可导入的任务');
      return;
    }

    if (onImport) {
      onImport(generationResult.tasks, selectedParentTask.id);
      message.success(`已导入${generationResult.tasks.length}个子任务`);
      
      // 清理生成结果
      setGenerationResult(null);
      setKeywords('');
    }
  }, [generationResult, selectedParentTask, onImport]);

  // 重新生成
  const handleRegenerate = useCallback(() => {
    setGenerationResult(null);
    handleAIGenerate();
  }, [handleAIGenerate]);

  // 获取提供商状态颜色
  const getProviderStatusColor = (provider: AIProvider): string => {
    const status = serviceStatus.get(provider);
    if (!status) return 'default';
    return status.available ? 'green' : 'red';
  };

  // 获取质量评分颜色
  const getQualityColor = (score: number): string => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    return '#ff4d4f';
  };

  // 如果没有可用的AI提供商，显示配置提示
  if (availableProviders.length === 0) {
    return (
      <Card 
        title={
          <Space>
            <RobotOutlined style={{ color: '#1890ff' }} />
            AI辅助子任务生成
          </Space>
        }
        className={className}
      >
        <Alert
          message="AI功能不可用"
          description={
            <div>
              <p>当前没有可用的AI提供商配置。</p>
              <p>
                请前往 <a href="/ai-config" target="_blank">AI配置页面</a> 配置至少一个AI提供商（OpenAI、Claude或DeepSeek）。
              </p>
            </div>
          }
          type="warning"
          showIcon
          action={
            <Button size="small" onClick={refreshAIStatus}>
              刷新状态
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <RobotOutlined style={{ color: '#1890ff' }} />
          AI辅助子任务生成
          <Badge 
            count={availableProviders.length} 
            style={{ backgroundColor: '#52c41a' }} 
            title={`${availableProviders.length}个可用AI提供商`}
          />
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="刷新AI服务状态">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={refreshAIStatus}
              size="small"
            />
          </Tooltip>
          <Tooltip title="AI配置管理">
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => window.open('/ai-config', '_blank')}
              size="small"
            />
          </Tooltip>
        </Space>
      }
      className={className}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* AI提供商状态显示 */}
        <div>
          <Text strong style={{ marginRight: 8 }}>可用AI提供商：</Text>
          <Space wrap>
            {availableProviders.map(provider => (
              <Tag
                key={provider}
                color={getProviderStatusColor(provider)}
                icon={provider === selectedProvider ? <CheckCircleOutlined /> : undefined}
              >
                {AI_PROVIDER_INFO[provider].name}
              </Tag>
            ))}
          </Space>
        </div>

        {/* 输入区域 */}
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <div>
              <Text strong>1. 选择父任务：</Text>
              <div style={{ marginTop: 8 }}>
                <TaskSelector
                  projectId={projectId}
                  value={selectedParentTask}
                  onChange={(taskId, task) => {
                    setSelectedParentTask(task as Task | null);
                  }}
                  placeholder="选择要添加子任务的父任务"
                  style={{ width: '100%' }}
                  aiMode={true}
                  mode="select"
                  showProjectNames={true}
                  filterOptions={{
                    excludeCompleted: true, // 排除已完成的任务
                    statusFilter: ['todo', 'in_progress'] // 只显示待开始和进行中的任务
                  }}
                  allowClear
                />
              </div>
            </div>
          </Col>

          <Col span={24}>
            <div>
              <Text strong>2. 描述子任务需求：</Text>
              <div style={{ marginTop: 8 }}>
                <TextArea
                  value={keywords}
                  onChange={e => setKeywords(e.target.value)}
                  placeholder="描述您希望生成的子任务内容，例如：
• 前端界面开发、API接口设计、数据库建模
• 用户注册登录、权限管理、数据验证
• 测试用例编写、部署配置、文档整理
  
AI将根据您的描述智能生成具体的子任务列表。"
                  rows={4}
                  maxLength={500}
                  showCount
                />
              </div>
            </div>
          </Col>
        </Row>

        {/* 高级选项 */}
        <div>
          <Button
            type="link"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{ padding: 0 }}
          >
            {showAdvanced ? '收起' : '展开'}高级选项
            <QuestionCircleOutlined style={{ marginLeft: 4 }} />
          </Button>
          
          {showAdvanced && (
            <div style={{ marginTop: 12, padding: 12, background: '#fafafa', borderRadius: 6 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <div>
                    <Text strong>AI提供商：</Text>
                    <Select
                      style={{ width: '100%', marginTop: 4 }}
                      value={selectedProvider}
                      onChange={setSelectedProvider}
                      placeholder="自动选择"
                    >
                      <Option value={undefined}>
                        <Text type="secondary">自动选择最佳</Text>
                      </Option>
                      {availableProviders.map(provider => (
                        <Option key={provider} value={provider}>
                          {AI_PROVIDER_INFO[provider].name}
                        </Option>
                      ))}
                    </Select>
                  </div>
                </Col>
                
                <Col span={8}>
                  <div>
                    <Text strong>生成复杂度：</Text>
                    <Select
                      style={{ width: '100%', marginTop: 4 }}
                      value={complexity}
                      onChange={setComplexity}
                    >
                      <Option value="simple">简单模式（3-5个任务）</Option>
                      <Option value="detailed">详细模式（5-8个任务）</Option>
                    </Select>
                  </div>
                </Col>
                
                <Col span={8}>
                  <div>
                    <Text strong>最大任务数：</Text>
                    <Select
                      style={{ width: '100%', marginTop: 4 }}
                      value={maxTasks}
                      onChange={setMaxTasks}
                    >
                      <Option value={3}>3个任务</Option>
                      <Option value={5}>5个任务</Option>
                      <Option value={6}>6个任务（推荐）</Option>
                      <Option value={8}>8个任务</Option>
                      <Option value={10}>10个任务</Option>
                    </Select>
                  </div>
                </Col>
              </Row>
            </div>
          )}
        </div>

        {/* 生成按钮 */}
        <div style={{ textAlign: 'center' }}>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={handleAIGenerate}
            loading={generating}
            disabled={!selectedParentTask || !keywords.trim()}
            size="large"
          >
            {generating ? 'AI生成中...' : 'AI智能生成子任务'}
          </Button>
        </div>

        {/* 生成结果展示 */}
        {generating && (
          <div style={{ textAlign: 'center' }}>
            <Spin size="large" />
            <div style={{ marginTop: 12 }}>
              <Text type="secondary">AI正在分析任务需求并生成子任务...</Text>
            </div>
          </div>
        )}

        {generationResult && (
          <Card size="small" title="AI生成结果">
            <Space direction="vertical" style={{ width: '100%' }}>
              {/* 生成统计 */}
              <Row gutter={16}>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div><Text strong>{generationResult.tasks.length}</Text></div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>生成任务数</Text>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div>
                      <Text 
                        strong 
                        style={{ color: getQualityColor(generationResult.quality) }}
                      >
                        {generationResult.quality}分
                      </Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>质量评分</Text>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div><Text strong>{generationResult.tokensUsed.total}</Text></div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>Token使用</Text>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div><Text strong>¥{generationResult.cost.toFixed(4)}</Text></div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>预估成本</Text>
                  </div>
                </Col>
              </Row>

              <Divider style={{ margin: '12px 0' }} />

              {/* 任务列表预览 */}
              <div>
                <Text strong style={{ marginBottom: 8, display: 'block' }}>
                  生成的子任务列表：
                </Text>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {generationResult.tasks.map((task, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #f0f0f0',
                        borderRadius: '4px',
                        marginBottom: '8px',
                        background: '#fafafa'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <Text strong>{task.title}</Text>
                          {task.description && (
                            <div style={{ marginTop: 4 }}>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {task.description}
                              </Text>
                            </div>
                          )}
                        </div>
                        <Space>
                          <Tag color={task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'orange' : 'green'}>
                            {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                          </Tag>
                          <Tag icon={<ClockCircleOutlined />}>
                            {task.estimatedHours}h
                          </Tag>
                        </Space>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI分析说明 */}
              {generationResult.reasoning && (
                <div>
                  <Text strong>AI分析说明：</Text>
                  <div style={{ marginTop: 4, padding: 8, background: '#f6ffed', border: '1px solid #d9f7be', borderRadius: 4 }}>
                    <Text style={{ fontSize: '12px' }}>{generationResult.reasoning}</Text>
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div style={{ textAlign: 'center' }}>
                <Space>
                  <Button
                    type="primary"
                    onClick={handleImportTasks}
                    icon={<CheckCircleOutlined />}
                  >
                    导入这些任务
                  </Button>
                  <Button
                    onClick={handleRegenerate}
                    icon={<ReloadOutlined />}
                  >
                    重新生成
                  </Button>
                  <Button
                    onClick={() => setGenerationResult(null)}
                  >
                    取消
                  </Button>
                </Space>
              </div>
            </Space>
          </Card>
        )}

        {/* 使用提示 */}
        <Alert
          message="使用提示"
          description={
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li>AI会根据父任务和关键词描述，智能生成3-8个具体可执行的子任务</li>
              <li>生成的任务包含标题、描述、优先级和预估工时</li>
              <li>您可以在导入前预览和调整生成的任务内容</li>
              <li>支持多次生成，直到获得满意的任务分解结果</li>
            </ul>
          }
          type="info"
          showIcon
        />
      </Space>
    </Card>
  );
};

export default AIAssistedBulkImport;