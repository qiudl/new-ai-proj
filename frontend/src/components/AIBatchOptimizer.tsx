import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Form,
  Select,
  Switch,
  InputNumber,
  Alert,
  Typography,
  Row,
  Col,
  Divider,
  Progress,
  Statistic,
  Table,
  Tag,
  Badge,
  message,
  Collapse,
  Tooltip,
  Empty,
  Input
} from 'antd';
import {
  ToolOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  BulbOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  SettingOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { AIProvider } from '../types/ai';
import { GeneratedSubTask } from '../types/aiTaskGenerator';
import aiTaskGeneratorService from '../services/aiTaskGeneratorService';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

interface TaskGroup {
  id: string;
  groupName: string;
  tasks: GeneratedSubTask[];
  groupOptions: OptimizationOptions;
  projectContext?: any;
}

interface OptimizationOptions {
  deduplicateTasks: boolean;
  optimizeDependencies: boolean;
  balancePriorities: boolean;
  refineEstimates: boolean;
  enhanceTags: boolean;
}

interface BatchOptimizationOptions {
  crossGroupOptimization: boolean;
  mergeSimilarTasks: boolean;
  optimizeWorkflow: boolean;
  balanceWorkload: boolean;
  minimizeHandoffs: boolean;
  maxProcessingTimeSeconds: number;
  parallelProcessing: boolean;
}

interface OptimizedTaskGroup {
  groupName: string;
  originalTaskCount: number;
  optimizedTasks: GeneratedSubTask[];
  groupSuggestions: string[];
  optimizationApplied: string[];
  estimatedSavings: number;
}


/**
 * AI批量优化器组件
 * 提供多组任务的批量优化功能
 */
const AIBatchOptimizer: React.FC = () => {
  const [form] = Form.useForm();
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const [batchOptions, setBatchOptions] = useState<BatchOptimizationOptions>({
    crossGroupOptimization: true,
    mergeSimilarTasks: true,
    optimizeWorkflow: true,
    balanceWorkload: true,
    minimizeHandoffs: true,
    maxProcessingTimeSeconds: 120,
    parallelProcessing: true
  });

  const aiProviders = [
    { value: 'openai', label: 'OpenAI GPT', icon: '🤖' },
    { value: 'claude', label: 'Claude', icon: '🧠' },
    { value: 'deepseek', label: 'DeepSeek', icon: '🔍' }
  ];

  const optimizationModes = [
    { value: 'balanced', label: '平衡模式', description: '在性能、质量和成本之间找到平衡' },
    { value: 'performance', label: '性能优先', description: '优化执行效率和速度' },
    { value: 'quality', label: '质量优先', description: '确保任务质量和完整性' },
    { value: 'cost', label: '成本优先', description: '最小化资源消耗和成本' }
  ];

  // 添加任务组
  const addTaskGroup = () => {
    const newGroup: TaskGroup = {
      id: `group_${Date.now()}`,
      groupName: `任务组 ${taskGroups.length + 1}`,
      tasks: [],
      groupOptions: {
        deduplicateTasks: true,
        optimizeDependencies: true,
        balancePriorities: true,
        refineEstimates: true,
        enhanceTags: false
      }
    };
    setTaskGroups([...taskGroups, newGroup]);
  };

  // 删除任务组
  const removeTaskGroup = (groupId: string) => {
    setTaskGroups(taskGroups.filter(group => group.id !== groupId));
  };

  // 更新任务组
  const updateTaskGroup = (groupId: string, updates: Partial<TaskGroup>) => {
    setTaskGroups(taskGroups.map(group => 
      group.id === groupId ? { ...group, ...updates } : group
    ));
  };

  // 执行批量优化
  const handleBatchOptimization = async (values: any) => {
    if (taskGroups.length === 0) {
      message.warning('请先添加任务组');
      return;
    }

    const emptyGroups = taskGroups.filter(group => group.tasks.length === 0);
    if (emptyGroups.length > 0) {
      message.warning('所有任务组都必须包含任务');
      return;
    }

    try {
      setOptimizing(true);
      setResults(null);

      const request = {
        provider: values.provider as AIProvider,
        taskGroups: taskGroups.map(group => ({
          groupName: group.groupName,
          tasks: group.tasks,
          groupOptions: group.groupOptions,
          projectContext: group.projectContext
        })),
        globalOptions: batchOptions,
        optimizationMode: values.optimizationMode
      };

      const response = await aiTaskGeneratorService.batchOptimizeTasks(request);
      
      if (response.success) {
        setResults(response.data);
        message.success('批量优化完成');
      } else {
        message.error('批量优化失败');
      }
    } catch (error: any) {
      message.error('批量优化失败: ' + (error.message || '未知错误'));
      console.error('Batch optimization failed:', error);
    } finally {
      setOptimizing(false);
    }
  };

  // 导入示例任务组
  const importSampleTaskGroups = () => {
    const sampleGroups: TaskGroup[] = [
      {
        id: 'frontend_group',
        groupName: '前端开发组',
        tasks: [
          {
            title: '设计用户登录界面',
            description: '创建响应式登录页面',
            priority: 'high',
            estimatedHours: 8,
            status: 'todo',
            custom_fields: {
              tags: ['frontend', 'ui', 'authentication'],
              ai_generated: true,
              confidence_score: 90
            }
          },
          {
            title: '实现用户注册功能',
            description: '开发用户注册表单和验证',
            priority: 'high',
            estimatedHours: 6,
            status: 'todo',
            custom_fields: {
              tags: ['frontend', 'form', 'validation'],
              ai_generated: true,
              confidence_score: 85
            }
          },
          {
            title: '优化页面加载性能',
            description: '实现懒加载和代码分割',
            priority: 'medium',
            estimatedHours: 12,
            status: 'todo',
            custom_fields: {
              tags: ['frontend', 'performance', 'optimization'],
              ai_generated: true,
              confidence_score: 80
            }
          }
        ],
        groupOptions: {
          deduplicateTasks: true,
          optimizeDependencies: true,
          balancePriorities: true,
          refineEstimates: true,
          enhanceTags: true
        }
      },
      {
        id: 'backend_group',
        groupName: '后端开发组',
        tasks: [
          {
            title: '设计用户认证API',
            description: '实现JWT基于的认证系统',
            priority: 'high',
            estimatedHours: 10,
            status: 'todo',
            custom_fields: {
              tags: ['backend', 'api', 'authentication'],
              ai_generated: true,
              confidence_score: 95
            }
          },
          {
            title: '创建数据库模型',
            description: '设计用户和权限相关的数据库表',
            priority: 'high',
            estimatedHours: 8,
            status: 'todo',
            custom_fields: {
              tags: ['backend', 'database', 'modeling'],
              ai_generated: true,
              confidence_score: 90
            }
          }
        ],
        groupOptions: {
          deduplicateTasks: true,
          optimizeDependencies: true,
          balancePriorities: false,
          refineEstimates: true,
          enhanceTags: false
        }
      }
    ];
    setTaskGroups(sampleGroups);
    message.success('已导入示例任务组');
  };

  const taskGroupColumns: ColumnsType<GeneratedSubTask> = [
    {
      title: '任务名称',
      dataIndex: 'title',
      key: 'title',
      width: 200
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => {
        const colors = { high: 'red', medium: 'orange', low: 'green' };
        return <Tag color={colors[priority as keyof typeof colors]}>{priority}</Tag>;
      }
    },
    {
      title: '预估工时',
      dataIndex: 'estimatedHours',
      key: 'estimatedHours',
      width: 100,
      render: (hours: number) => `${hours}h`
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (_, record: GeneratedSubTask) => (
        <Space wrap>
          {record.custom_fields?.tags?.map(tag => <Tag key={tag}>{tag}</Tag>) || []}
        </Space>
      )
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 100,
      render: (_, record: GeneratedSubTask) => (
        <Progress
          percent={record.custom_fields?.confidence_score || 0}
          size="small"
          format={(percent) => `${percent?.toFixed(0)}%`}
        />
      )
    }
  ];

  return (
    <div>
      <Row gutter={[24, 24]}>
        {/* 左侧：批量优化配置 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ToolOutlined />
                批量优化配置
              </Space>
            }
            extra={
              <Button
                type="link"
                icon={<SettingOutlined />}
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              >
                {showAdvancedOptions ? '隐藏' : '显示'}高级选项
              </Button>
            }
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleBatchOptimization}
              initialValues={{
                provider: 'openai',
                optimizationMode: 'balanced'
              }}
            >
              {/* AI服务提供商选择 */}
              <Form.Item
                name="provider"
                label="AI服务提供商"
                rules={[{ required: true, message: '请选择AI服务提供商' }]}
              >
                <Select placeholder="选择AI服务">
                  {aiProviders.map(provider => (
                    <Option key={provider.value} value={provider.value}>
                      <Space>
                        <span>{provider.icon}</span>
                        {provider.label}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {/* 优化模式 */}
              <Form.Item
                name="optimizationMode"
                label="优化模式"
                rules={[{ required: true, message: '请选择优化模式' }]}
              >
                <Select>
                  {optimizationModes.map(mode => (
                    <Option key={mode.value} value={mode.value}>
                      <div>
                        <div>{mode.label}</div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {mode.description}
                        </Text>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {/* 高级选项 */}
              {showAdvancedOptions && (
                <Card size="small" title="全局优化选项" style={{ marginBottom: '16px' }}>
                  <Row gutter={[16, 8]}>
                    <Col span={12}>
                      <Space>
                        <Switch
                          checked={batchOptions.crossGroupOptimization}
                          onChange={(checked) => setBatchOptions(prev => ({
                            ...prev,
                            crossGroupOptimization: checked
                          }))}
                        />
                        <Text>跨组优化</Text>
                        <Tooltip title="分析不同任务组之间的依赖关系和协作机会">
                          <InfoCircleOutlined />
                        </Tooltip>
                      </Space>
                    </Col>
                    <Col span={12}>
                      <Space>
                        <Switch
                          checked={batchOptions.mergeSimilarTasks}
                          onChange={(checked) => setBatchOptions(prev => ({
                            ...prev,
                            mergeSimilarTasks: checked
                          }))}
                        />
                        <Text>合并相似任务</Text>
                      </Space>
                    </Col>
                    <Col span={12}>
                      <Space>
                        <Switch
                          checked={batchOptions.optimizeWorkflow}
                          onChange={(checked) => setBatchOptions(prev => ({
                            ...prev,
                            optimizeWorkflow: checked
                          }))}
                        />
                        <Text>优化工作流</Text>
                      </Space>
                    </Col>
                    <Col span={12}>
                      <Space>
                        <Switch
                          checked={batchOptions.balanceWorkload}
                          onChange={(checked) => setBatchOptions(prev => ({
                            ...prev,
                            balanceWorkload: checked
                          }))}
                        />
                        <Text>平衡工作量</Text>
                      </Space>
                    </Col>
                    <Col span={12}>
                      <Space>
                        <Switch
                          checked={batchOptions.minimizeHandoffs}
                          onChange={(checked) => setBatchOptions(prev => ({
                            ...prev,
                            minimizeHandoffs: checked
                          }))}
                        />
                        <Text>减少交接</Text>
                      </Space>
                    </Col>
                    <Col span={12}>
                      <Space>
                        <Switch
                          checked={batchOptions.parallelProcessing}
                          onChange={(checked) => setBatchOptions(prev => ({
                            ...prev,
                            parallelProcessing: checked
                          }))}
                        />
                        <Text>并行处理</Text>
                      </Space>
                    </Col>
                    <Col span={24}>
                      <div>
                        <Text>最大处理时间（秒）：</Text>
                        <InputNumber
                          min={30}
                          max={300}
                          value={batchOptions.maxProcessingTimeSeconds}
                          onChange={(value) => setBatchOptions(prev => ({
                            ...prev,
                            maxProcessingTimeSeconds: value || 120
                          }))}
                          style={{ marginLeft: '8px', width: '100px' }}
                        />
                      </div>
                    </Col>
                  </Row>
                </Card>
              )}

              {/* 操作按钮 */}
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<PlayCircleOutlined />}
                  loading={optimizing}
                  disabled={taskGroups.length === 0}
                >
                  {optimizing ? '正在优化...' : '开始批量优化'}
                </Button>
                <Button
                  icon={<ThunderboltOutlined />}
                  onClick={importSampleTaskGroups}
                  disabled={optimizing}
                >
                  导入示例
                </Button>
              </Space>
            </Form>
          </Card>
        </Col>

        {/* 右侧：优化结果 */}
        <Col xs={24} lg={12}>
          {results ? (
            <div>
              {/* 优化统计 */}
              <Card
                title={
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    优化完成
                  </Space>
                }
                size="small"
                style={{ marginBottom: '16px' }}
              >
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Statistic
                      title="处理任务"
                      value={results.optimizationStats.totalTasksProcessed}
                      prefix={<BarChartOutlined />}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="优化任务"
                      value={results.optimizationStats.totalTasksOptimized}
                      prefix={<ToolOutlined />}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="处理时间"
                      value={results.processingTime}
                      suffix="ms"
                      prefix={<ClockCircleOutlined />}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="合并任务"
                      value={results.optimizationStats.tasksMerged}
                      prefix={<BulbOutlined />}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="重排任务"
                      value={results.optimizationStats.tasksReordered}
                      prefix={<ToolOutlined />}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="节省时间"
                      value={results.optimizationStats.estimatedTimeSaved}
                      suffix="h"
                      precision={1}
                      prefix={<ClockCircleOutlined />}
                    />
                  </Col>
                </Row>

                <Divider />

                {/* 质量指标 */}
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <Text strong>质量指标：</Text>
                  </Col>
                  <Col span={12}>
                    <div>
                      <Text>整体评分：</Text>
                      <Progress
                        percent={results.qualityMetrics.overallScore * 100}
                        size="small"
                        format={(percent) => `${percent?.toFixed(1)}%`}
                      />
                    </div>
                  </Col>
                  <Col span={12}>
                    <div>
                      <Text>一致性：</Text>
                      <Progress
                        percent={results.qualityMetrics.consistencyScore * 100}
                        size="small"
                        format={(percent) => `${percent?.toFixed(1)}%`}
                      />
                    </div>
                  </Col>
                  <Col span={12}>
                    <div>
                      <Text>工作流效率：</Text>
                      <Progress
                        percent={results.qualityMetrics.workflowEfficiency * 100}
                        size="small"
                        format={(percent) => `${percent?.toFixed(1)}%`}
                      />
                    </div>
                  </Col>
                  <Col span={12}>
                    <div>
                      <Text>资源优化：</Text>
                      <Progress
                        percent={results.qualityMetrics.resourceOptimization * 100}
                        size="small"
                        format={(percent) => `${percent?.toFixed(1)}%`}
                      />
                    </div>
                  </Col>
                </Row>
              </Card>

              {/* 全局建议 */}
              {results.globalSuggestions && results.globalSuggestions.length > 0 && (
                <Alert
                  type="info"
                  message="全局建议"
                  description={
                    <ul>
                      {results.globalSuggestions.map((suggestion: string, index: number) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  }
                  style={{ marginBottom: '16px' }}
                />
              )}

              {/* 组优化结果 */}
              <Card title="组优化结果">
                <Collapse>
                  {results.optimizedGroups.map((group: OptimizedTaskGroup, index: number) => (
                    <Panel
                      header={
                        <Space>
                          <Badge count={group.optimizedTasks.length} />
                          <Text strong>{group.groupName}</Text>
                          <Text type="secondary">
                            ({group.originalTaskCount} → {group.optimizedTasks.length})
                          </Text>
                          {group.estimatedSavings > 0 && (
                            <Tag color="green">节省 {group.estimatedSavings}h</Tag>
                          )}
                        </Space>
                      }
                      key={index}
                    >
                      {group.optimizationApplied.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <Text strong>应用的优化：</Text>
                          <Space wrap style={{ marginTop: '4px' }}>
                            {group.optimizationApplied.map(opt => (
                              <Tag key={opt} color="blue">{opt}</Tag>
                            ))}
                          </Space>
                        </div>
                      )}

                      {group.groupSuggestions.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <Text strong>建议：</Text>
                          <ul>
                            {group.groupSuggestions.map((suggestion, idx) => (
                              <li key={idx}>{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <Table
                        columns={taskGroupColumns as any}
                        dataSource={group.optimizedTasks}
                        rowKey={(record, index) => `${record.title}-${index}`}
                        pagination={false}
                        size="small"
                      />
                    </Panel>
                  ))}
                </Collapse>
              </Card>
            </div>
          ) : (
            <Card>
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <ToolOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />
                <Title level={4} type="secondary">
                  等待优化结果
                </Title>
                <Paragraph type="secondary">
                  配置任务组并启动批量优化后，结果将在这里显示
                </Paragraph>
              </div>
            </Card>
          )}
        </Col>
      </Row>

      {/* 任务组管理 */}
      <Card
        title={
          <Space>
            <BulbOutlined />
            任务组管理 ({taskGroups.length})
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={addTaskGroup}
          >
            添加任务组
          </Button>
        }
        style={{ marginTop: '24px' }}
      >
        {taskGroups.length === 0 ? (
          <Empty
            description="暂无任务组"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={addTaskGroup}>
              创建第一个任务组
            </Button>
          </Empty>
        ) : (
          <Collapse>
            {taskGroups.map((group, _index) => (
              <Panel
                header={
                  <Space>
                    <Badge count={group.tasks.length} />
                    <Text strong>{group.groupName}</Text>
                    <Text type="secondary">
                      {group.tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0)}小时
                    </Text>
                  </Space>
                }
                key={group.id}
                extra={
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTaskGroup(group.id);
                    }}
                  />
                }
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={8}>
                    <Input
                      value={group.groupName}
                      onChange={(e) => updateTaskGroup(group.id, { groupName: e.target.value })}
                      placeholder="任务组名称"
                    />
                  </Col>
                  <Col xs={24} md={16}>
                    <Space wrap>
                      <Text>组选项：</Text>
                      <Switch
                        size="small"
                        checked={group.groupOptions.deduplicateTasks}
                        onChange={(checked) => updateTaskGroup(group.id, {
                          groupOptions: { ...group.groupOptions, deduplicateTasks: checked }
                        })}
                      />
                      <Text>去重</Text>
                      
                      <Switch
                        size="small"
                        checked={group.groupOptions.optimizeDependencies}
                        onChange={(checked) => updateTaskGroup(group.id, {
                          groupOptions: { ...group.groupOptions, optimizeDependencies: checked }
                        })}
                      />
                      <Text>依赖优化</Text>
                      
                      <Switch
                        size="small"
                        checked={group.groupOptions.balancePriorities}
                        onChange={(checked) => updateTaskGroup(group.id, {
                          groupOptions: { ...group.groupOptions, balancePriorities: checked }
                        })}
                      />
                      <Text>平衡优先级</Text>
                    </Space>
                  </Col>
                </Row>

                <Divider />

                <Table
                  columns={taskGroupColumns as any}
                  dataSource={group.tasks}
                  rowKey={(record, index) => `${record.title}-${index}`}
                  pagination={false}
                  size="small"
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="暂无任务"
                      >
                        <Button size="small">添加任务</Button>
                      </Empty>
                    )
                  }}
                />
              </Panel>
            ))}
          </Collapse>
        )}
      </Card>
    </div>
  );
};

export default AIBatchOptimizer;