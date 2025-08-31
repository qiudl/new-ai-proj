import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Button,
  Space,
  Alert,
  Divider,
  Tabs,
  Typography,
  Tag,
  Statistic,
  Timeline,
  Table,
  message,
  Modal,
  Form,
  Switch,
  InputNumber,
  Progress,
  List,
  Badge,
  Tooltip
} from 'antd';
import {
  ProjectOutlined,
  BugOutlined,
  SafetyCertificateOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  ReloadOutlined,
  SyncOutlined,
  BulbOutlined,
  FireOutlined
} from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import { Task } from '../types/task';

interface Project {
  id: number;
  name: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
}
import { TaskDependency, DependencyType, DependencyStrength } from '../types/dependency';
import { TaskService } from '../services/taskService';
import DependencyService from '../services/dependencyService';
import ConflictDetectionService, {
  ConflictDetectionResult,
  DependencyConflict,
  DependencyWarning,
  ConflictResolution,
  ConflictDetectionConfig,
  ConflictType,
  WarningType,
  ResolutionType
} from '../services/conflictDetectionService';
import AutoSchedulingManager from '../components/scheduling/AutoSchedulingManager';
import DependencyGraphVisualization from '../components/dependency/DependencyGraphVisualization';

const { Option } = Select;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'running';
  duration?: number;
  details?: string;
  error?: string;
}

const ConflictDetectionTestPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [conflictResult, setConflictResult] = useState<ConflictDetectionResult | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('detection');
  const [detectionConfig, setDetectionConfig] = useState<Partial<ConflictDetectionConfig>>({
    enableCircularDetection: true,
    enableTemporalValidation: true,
    enableResourceValidation: false,
    enableLogicalValidation: true,
    maxDependencyChainLength: 10,
    maxLagDays: 30,
    criticalPathThreshold: 0.8
  });
  const [configModalVisible, setConfigModalVisible] = useState(false);

  const conflictDetectionService = ConflictDetectionService.getInstance();

  // 加载项目列表
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const projectList = [
          { id: 1, name: '项目A', owner_id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: 2, name: '项目B', owner_id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ];
        setProjects(projectList);
        if (projectList.length > 0) {
          setSelectedProject(projectList[0]);
        }
      } catch (error) {
        message.error('加载项目列表失败');
      }
    };

    loadProjects();
  }, []);

  // 加载项目数据
  useEffect(() => {
    if (selectedProject) {
      loadProjectData();
    }
  }, [selectedProject]);

  const loadProjectData = async () => {
    if (!selectedProject) return;

    setLoading(true);
    try {
      const [projectTasksResponse, projectDependencies] = await Promise.all([
        TaskService.getRootTasks(selectedProject.id),
        DependencyService.getDependencies(selectedProject.id)
      ]);

      const projectTasks = Array.isArray(projectTasksResponse) ? projectTasksResponse : (projectTasksResponse as any).data || [];
      setTasks(projectTasks);
      setDependencies(projectDependencies);
    } catch (error) {
      message.error('加载项目数据失败');
      console.error('加载项目数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 执行冲突检测
  const runConflictDetection = useCallback(async () => {
    if (!selectedProject || tasks.length === 0) {
      message.warning('请先选择项目并确保有任务数据');
      return;
    }

    setLoading(true);
    try {
      const result = await conflictDetectionService.detectConflicts(
        selectedProject.id,
        tasks,
        dependencies,
        detectionConfig
      );
      
      setConflictResult(result);
      
      if (result.hasConflicts) {
        message.warning(`检测到 ${result.conflicts.length} 个冲突和 ${result.warnings.length} 个警告`);
      } else {
        message.success('未发现任何冲突或问题');
      }
    } catch (error) {
      message.error('冲突检测失败: ' + (error instanceof Error ? error.message : '未知错误'));
      console.error('冲突检测失败:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProject, tasks, dependencies, detectionConfig, conflictDetectionService]);

  // 应用解决方案
  const applyResolution = async (resolution: ConflictResolution) => {
    if (!selectedProject) return;

    Modal.confirm({
      title: '应用解决方案',
      content: (
        <div>
          <p><strong>解决方案:</strong> {resolution.title}</p>
          <p><strong>描述:</strong> {resolution.description}</p>
          <p><strong>预估工作量:</strong> {resolution.estimatedEffort} 小时</p>
          <p>是否继续应用此解决方案？</p>
        </div>
      ),
      onOk: async () => {
        try {
          const result = await conflictDetectionService.applyResolution(selectedProject.id, resolution);
          if (result.success) {
            message.success(result.message);
            // 重新加载数据和检测冲突
            await loadProjectData();
            await runConflictDetection();
          } else {
            message.error(result.message);
          }
        } catch (error) {
          message.error('应用解决方案失败');
        }
      }
    });
  };

  // 运行自动化测试
  const runAutomatedTests = async () => {
    setTestResults([]);
    
    const tests: Array<{
      name: string;
      test: () => Promise<void>;
    }> = [
      {
        name: '循环依赖检测测试',
        test: async () => {
          if (tasks.length >= 3) {
            // 创建模拟循环依赖
            const mockDependencies: TaskDependency[] = [
              {
                id: 9999,
                predecessor_id: tasks[0].id,
                successor_id: tasks[1].id,
                type: DependencyType.FINISH_TO_START,
                strength: DependencyStrength.MANDATORY,
                lag_days: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                created_by: 1
              },
              {
                id: 9998,
                predecessor_id: tasks[1].id,
                successor_id: tasks[2].id,
                type: DependencyType.FINISH_TO_START,
                strength: DependencyStrength.MANDATORY,
                lag_days: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                created_by: 1
              },
              {
                id: 9997,
                predecessor_id: tasks[2].id,
                successor_id: tasks[0].id,
                type: DependencyType.FINISH_TO_START,
                strength: DependencyStrength.MANDATORY,
                lag_days: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                created_by: 1
              }
            ];
            
            const result = await conflictDetectionService.detectConflicts(
              selectedProject!.id,
              tasks,
              mockDependencies,
              { enableCircularDetection: true }
            );
            
            if (!result.hasConflicts || !result.conflicts.some(c => c.type === ConflictType.CIRCULAR_DEPENDENCY)) {
              throw new Error('循环依赖检测失败');
            }
          }
        }
      },
      {
        name: '时间冲突检测测试',
        test: async () => {
          if (tasks.length >= 2) {
            const mockTasks = tasks.slice(0, 2).map((task, index) => ({
              ...task,
              start_date: index === 0 ? '2024-01-10T00:00:00Z' : '2024-01-05T00:00:00Z',
              due_date: index === 0 ? '2024-01-15T00:00:00Z' : '2024-01-08T00:00:00Z'
            }));
            
            const mockDependencies: TaskDependency[] = [{
              id: 9996,
              predecessor_id: mockTasks[0].id,
              successor_id: mockTasks[1].id,
              type: DependencyType.FINISH_TO_START,
              strength: DependencyStrength.MANDATORY,
              lag_days: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              created_by: 1
            }];
            
            const result = await conflictDetectionService.detectConflicts(
              selectedProject!.id,
              mockTasks,
              mockDependencies,
              { enableTemporalValidation: true }
            );
            
            if (!result.hasConflicts || !result.conflicts.some(c => c.type === ConflictType.TEMPORAL_CONFLICT)) {
              throw new Error('时间冲突检测失败');
            }
          }
        }
      },
      {
        name: '解决方案生成测试',
        test: async () => {
          const result = await conflictDetectionService.detectConflicts(
            selectedProject!.id,
            tasks,
            dependencies,
            detectionConfig
          );
          
          if (result.hasConflicts && result.suggestions.length === 0) {
            throw new Error('冲突存在但未生成解决方案');
          }
        }
      },
      {
        name: '配置参数影响测试',
        test: async () => {
          // 测试禁用所有检测
          const disabledResult = await conflictDetectionService.detectConflicts(
            selectedProject!.id,
            tasks,
            dependencies,
            {
              enableCircularDetection: false,
              enableTemporalValidation: false,
              enableLogicalValidation: false
            }
          );
          
          // 测试启用所有检测
          const enabledResult = await conflictDetectionService.detectConflicts(
            selectedProject!.id,
            tasks,
            dependencies,
            {
              enableCircularDetection: true,
              enableTemporalValidation: true,
              enableLogicalValidation: true
            }
          );
          
          // 配置应该影响检测结果
          if (disabledResult.conflicts.length === enabledResult.conflicts.length &&
              tasks.length > 0 && dependencies.length > 0) {
            throw new Error('配置参数未正确影响检测结果');
          }
        }
      }
    ];

    for (const test of tests) {
      setTestResults(prev => [...prev, {
        name: test.name,
        status: 'running'
      }]);

      const startTime = Date.now();
      try {
        await test.test();
        const duration = Date.now() - startTime;
        
        setTestResults(prev => prev.map(result => 
          result.name === test.name 
            ? { ...result, status: 'passed' as const, duration, details: `测试通过 (${duration}ms)` }
            : result
        ));
      } catch (error) {
        const duration = Date.now() - startTime;
        
        setTestResults(prev => prev.map(result => 
          result.name === test.name 
            ? { 
                ...result, 
                status: 'failed' as const, 
                duration, 
                error: error instanceof Error ? error.message : '未知错误'
              }
            : result
        ));
      }
    }
  };

  // 冲突表格列配置
  const conflictColumns: ColumnsType<DependencyConflict> = [
    {
      title: '冲突类型',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (type: ConflictType) => {
        const typeConfig = {
          [ConflictType.CIRCULAR_DEPENDENCY]: { color: 'red', text: '循环依赖', icon: <SyncOutlined /> },
          [ConflictType.TEMPORAL_CONFLICT]: { color: 'orange', text: '时间冲突', icon: <ExclamationCircleOutlined /> },
          [ConflictType.LOGICAL_INCONSISTENCY]: { color: 'purple', text: '逻辑不一致', icon: <BugOutlined /> },
          [ConflictType.CONSTRAINT_VIOLATION]: { color: 'volcano', text: '约束违反', icon: <WarningOutlined /> },
          [ConflictType.REDUNDANT_DEPENDENCY]: { color: 'blue', text: '冗余依赖', icon: <ReloadOutlined /> },
          [ConflictType.RESOURCE_CONFLICT]: { color: 'green', text: '资源冲突', icon: <FireOutlined /> },
          [ConflictType.IMPOSSIBLE_SCHEDULE]: { color: 'magenta', text: '无法调度', icon: <ExclamationCircleOutlined /> }
        };
        const config = typeConfig[type] || { color: 'default', text: type, icon: <BugOutlined /> };
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      }
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => {
        const colors = { 
          CRITICAL: 'red', 
          HIGH: 'orange', 
          MEDIUM: 'yellow', 
          LOW: 'green' 
        };
        return <Tag color={colors[severity as keyof typeof colors]}>{severity}</Tag>;
      },
      sorter: (a, b) => {
        const order = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
        return order[a.severity as keyof typeof order] - order[b.severity as keyof typeof order];
      }
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: '影响任务',
      dataIndex: 'affectedTasks',
      key: 'affectedTasks',
      width: 120,
      render: (taskIds: number[]) => (
        <Tag>{taskIds.length} 个任务</Tag>
      )
    },
    {
      title: '检测时间',
      dataIndex: 'detectedAt',
      key: 'detectedAt',
      width: 150,
      render: (date: Date) => new Date(date).toLocaleString()
    }
  ];

  // 解决方案表格列配置
  const resolutionColumns: ColumnsType<ConflictResolution> = [
    {
      title: '解决方案',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: ResolutionType) => {
        const typeConfig = {
          [ResolutionType.REMOVE_DEPENDENCY]: { color: 'red', text: '删除依赖' },
          [ResolutionType.MODIFY_DEPENDENCY]: { color: 'blue', text: '修改依赖' },
          [ResolutionType.RESCHEDULE_TASKS]: { color: 'green', text: '重新调度' },
          [ResolutionType.SPLIT_TASK]: { color: 'purple', text: '拆分任务' },
          [ResolutionType.MERGE_TASKS]: { color: 'orange', text: '合并任务' },
          [ResolutionType.ADJUST_RESOURCES]: { color: 'cyan', text: '调整资源' }
        };
        const config = typeConfig[type] || { color: 'default', text: type };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '预估工作量',
      dataIndex: 'estimatedEffort',
      key: 'estimatedEffort',
      width: 120,
      render: (effort: number) => `${effort} 小时`,
      sorter: (a, b) => a.estimatedEffort - b.estimatedEffort
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => {
        const colors = { HIGH: 'red', MEDIUM: 'orange', LOW: 'green' };
        return <Tag color={colors[priority as keyof typeof colors]}>{priority}</Tag>;
      }
    },
    {
      title: '自动应用',
      dataIndex: 'autoApplicable',
      key: 'autoApplicable',
      width: 100,
      render: (auto: boolean) => auto ? 
        <Tag color="green">可自动</Tag> : 
        <Tag color="orange">需手动</Tag>
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record: ConflictResolution) => (
        <Button
          type="primary"
          size="small"
          onClick={() => applyResolution(record)}
          disabled={loading}
        >
          应用
        </Button>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0 }}>依赖冲突检测与解决</h1>
            <p style={{ margin: '8px 0 0 0', color: '#666' }}>智能检测任务依赖关系中的冲突并提供解决方案</p>
          </div>
          <Space>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setConfigModalVisible(true)}
            >
              检测配置
            </Button>
            <Button
              icon={<PlayCircleOutlined />}
              onClick={runAutomatedTests}
              disabled={!selectedProject}
            >
              自动化测试
            </Button>
            <Button
              type="primary"
              icon={<SafetyCertificateOutlined />}
              onClick={runConflictDetection}
              loading={loading}
              disabled={!selectedProject}
            >
              开始检测
            </Button>
          </Space>
        </div>
      </Card>

      {/* 项目选择和概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card title="项目选择" size="small">
            <Select
              value={selectedProject?.id}
              onChange={(id) => {
                const project = projects.find(p => p.id === id);
                setSelectedProject(project || null);
              }}
              placeholder="选择测试项目"
              style={{ width: '100%' }}
              loading={loading}
            >
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  <Space>
                    <ProjectOutlined />
                    {project.name}
                  </Space>
                </Option>
              ))}
            </Select>
          </Card>
        </Col>

        <Col span={16}>
          <Card title="项目概览" size="small">
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="任务总数"
                  value={tasks.length}
                  prefix={<ProjectOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="依赖关系"
                  value={dependencies.length}
                  prefix={<ThunderboltOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="冲突数量"
                  value={conflictResult?.conflicts.length || 0}
                  prefix={<BugOutlined />}
                  valueStyle={{ 
                    color: (conflictResult?.conflicts.length || 0) > 0 ? '#cf1322' : '#3f8600' 
                  }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="严重程度"
                  value={conflictResult?.severity || 'LOW'}
                  prefix={<WarningOutlined />}
                  valueStyle={{ 
                    color: conflictResult?.severity === 'CRITICAL' ? '#cf1322' : 
                           conflictResult?.severity === 'HIGH' ? '#fa541c' :
                           conflictResult?.severity === 'MEDIUM' ? '#fa8c16' : '#3f8600'
                  }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 测试结果展示 */}
      {testResults.length > 0 && (
        <Card title="自动化测试结果" style={{ marginBottom: 24 }}>
          <Timeline>
            {testResults.map((result, index) => (
              <Timeline.Item
                key={index}
                color={
                  result.status === 'passed' ? 'green' :
                  result.status === 'failed' ? 'red' : 'blue'
                }
                dot={
                  result.status === 'passed' ? <CheckCircleOutlined /> :
                  result.status === 'failed' ? <ExclamationCircleOutlined /> :
                  <PlayCircleOutlined spin />
                }
              >
                <div>
                  <Text strong>{result.name}</Text>
                  <div style={{ marginTop: 4 }}>
                    <Tag color={
                      result.status === 'passed' ? 'success' :
                      result.status === 'failed' ? 'error' : 'processing'
                    }>
                      {result.status === 'passed' ? '通过' :
                       result.status === 'failed' ? '失败' : '运行中'}
                    </Tag>
                    {result.duration && (
                      <Tag>{result.duration}ms</Tag>
                    )}
                  </div>
                  {result.details && (
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary">{result.details}</Text>
                    </div>
                  )}
                  {result.error && (
                    <div style={{ marginTop: 4 }}>
                      <Text type="danger">{result.error}</Text>
                    </div>
                  )}
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        </Card>
      )}

      {/* 检测结果展示 */}
      {selectedProject && (
        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            {/* 冲突检测结果 */}
            <TabPane 
              tab={
                <Badge count={conflictResult?.conflicts.length || 0} offset={[10, 0]}>
                  <Space>
                    <BugOutlined />
                    冲突检测
                  </Space>
                </Badge>
              } 
              key="detection"
            >
              {conflictResult ? (
                <div>
                  {conflictResult.hasConflicts ? (
                    <Alert
                      message={`检测到 ${conflictResult.conflicts.length} 个冲突`}
                      description={`严重程度: ${conflictResult.severity}, 影响任务: ${conflictResult.affectedTasks.length} 个`}
                      type="error"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  ) : (
                    <Alert
                      message="未发现任何冲突"
                      description="当前项目的任务依赖关系没有发现问题。"
                      type="success"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  )}

                  {conflictResult.conflicts.length > 0 && (
                    <Table
                      columns={conflictColumns}
                      dataSource={conflictResult.conflicts}
                      rowKey="id"
                      pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true
                      }}
                      expandable={{
                        expandedRowRender: (record: DependencyConflict) => (
                          <div style={{ padding: '16px', backgroundColor: '#fafafa' }}>
                            <Row gutter={16}>
                              <Col span={12}>
                                <Title level={5}>冲突详情</Title>
                                <p><strong>源:</strong> {record.conflictDetails.source}</p>
                                <p><strong>目标:</strong> {record.conflictDetails.target}</p>
                                <p><strong>原因:</strong> {record.conflictDetails.reason}</p>
                                <p><strong>影响:</strong> {record.conflictDetails.impact}</p>
                              </Col>
                              <Col span={12}>
                                <Title level={5}>影响范围</Title>
                                <p><strong>影响任务:</strong> {record.affectedTasks.join(', ')}</p>
                                <p><strong>影响依赖:</strong> {record.affectedDependencies.join(', ')}</p>
                              </Col>
                            </Row>
                          </div>
                        )
                      }}
                    />
                  )}
                </div>
              ) : (
                <Alert
                  message="尚未执行冲突检测"
                  description="请点击上方的'开始检测'按钮来分析项目依赖关系中的潜在冲突。"
                  type="info"
                  showIcon
                />
              )}
            </TabPane>

            {/* 警告信息 */}
            <TabPane 
              tab={
                <Badge count={conflictResult?.warnings.length || 0} offset={[10, 0]}>
                  <Space>
                    <WarningOutlined />
                    警告信息
                  </Space>
                </Badge>
              } 
              key="warnings"
            >
              {conflictResult?.warnings && conflictResult.warnings.length > 0 ? (
                <List
                  dataSource={conflictResult.warnings}
                  renderItem={(warning: DependencyWarning) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <Badge 
                            status={
                              warning.severity === 'HIGH' ? 'error' :
                              warning.severity === 'MEDIUM' ? 'warning' : 'success'
                            }
                          />
                        }
                        title={
                          <Space>
                            <Tag color={
                              warning.severity === 'HIGH' ? 'red' :
                              warning.severity === 'MEDIUM' ? 'orange' : 'green'
                            }>
                              {warning.severity}
                            </Tag>
                            <Text>{warning.type}</Text>
                          </Space>
                        }
                        description={
                          <div>
                            <p>{warning.message}</p>
                            {warning.suggestion && (
                              <p style={{ color: '#1890ff', marginTop: 8 }}>
                                <BulbOutlined /> 建议: {warning.suggestion}
                              </p>
                            )}
                            <div style={{ marginTop: 8 }}>
                              <Text type="secondary">
                                影响任务: {warning.taskIds.join(', ')} | 
                                影响依赖: {warning.dependencyIds.join(', ')}
                              </Text>
                            </div>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Alert
                  message="暂无警告信息"
                  description="当前检测结果中没有发现需要注意的警告信息。"
                  type="success"
                  showIcon
                />
              )}
            </TabPane>

            {/* 解决方案 */}
            <TabPane 
              tab={
                <Badge count={conflictResult?.suggestions.length || 0} offset={[10, 0]}>
                  <Space>
                    <BulbOutlined />
                    解决方案
                  </Space>
                </Badge>
              } 
              key="solutions"
            >
              {conflictResult?.suggestions && conflictResult.suggestions.length > 0 ? (
                <div>
                  <Alert
                    message="智能解决方案"
                    description="系统为检测到的冲突生成了以下解决方案，您可以选择合适的方案应用。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  
                  <Table
                    columns={resolutionColumns}
                    dataSource={conflictResult.suggestions}
                    rowKey={(record) => `${record.conflictId}-${record.type}`}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true
                    }}
                    expandable={{
                      expandedRowRender: (record: ConflictResolution) => (
                        <div style={{ padding: '16px', backgroundColor: '#fafafa' }}>
                          <Title level={5}>解决方案详情</Title>
                          <p><strong>描述:</strong> {record.description}</p>
                          <p><strong>预估工作量:</strong> {record.estimatedEffort} 小时</p>
                          <p><strong>优先级:</strong> {record.priority}</p>
                          <p><strong>可自动应用:</strong> {record.autoApplicable ? '是' : '否'}</p>
                          
                          <Title level={5}>执行步骤</Title>
                          <List
                            size="small"
                            dataSource={record.actions}
                            renderItem={(action, index) => (
                              <List.Item>
                                <Text>
                                  {index + 1}. {action.description} 
                                  <Tag style={{ marginLeft: 8 }}>{action.type}</Tag>
                                </Text>
                              </List.Item>
                            )}
                          />
                        </div>
                      )
                    }}
                  />
                </div>
              ) : (
                <Alert
                  message="暂无解决方案"
                  description="当前没有检测到需要解决的冲突，或解决方案尚未生成。"
                  type="info"
                  showIcon
                />
              )}
            </TabPane>

            {/* 依赖关系可视化 */}
            <TabPane 
              tab={
                <Space>
                  <ThunderboltOutlined />
                  依赖关系图
                </Space>
              } 
              key="visualization"
            >
              <DependencyGraphVisualization
                project={selectedProject}
                tasks={tasks}
                onNodeClick={(taskId) => {
                  const task = tasks.find(t => t.id === taskId);
                  if (task) {
                    message.info(`选中任务: ${task.title}`);
                  }
                }}
                onEdgeClick={(dependencyId) => {
                  message.info(`选中依赖关系: ${dependencyId}`);
                }}
                config={{
                  showCriticalPath: true,
                  highlightCriticalTasks: true,
                  showDependencyLines: true
                }}
              />
            </TabPane>

            {/* 智能调度 */}
            <TabPane 
              tab={
                <Space>
                  <SyncOutlined />
                  智能调度
                </Space>
              } 
              key="scheduling"
            >
              <AutoSchedulingManager
                project={selectedProject}
                tasks={tasks}
                onScheduleComplete={(result) => {
                  message.success('调度完成');
                  console.log('调度结果:', result);
                }}
                onTaskUpdate={(updatedTasks) => {
                  setTasks(updatedTasks);
                  message.success('任务时间已更新');
                }}
              />
            </TabPane>
          </Tabs>
        </Card>
      )}

      {/* 检测配置模态框 */}
      <Modal
        title="冲突检测配置"
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setConfigModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="ok" 
            type="primary" 
            onClick={() => {
              setConfigModalVisible(false);
              message.success('配置已更新');
            }}
          >
            确定
          </Button>
        ]}
      >
        <Form layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="循环依赖检测">
                <Switch
                  checked={detectionConfig.enableCircularDetection}
                  onChange={(checked) => 
                    setDetectionConfig(prev => ({ ...prev, enableCircularDetection: checked }))
                  }
                  checkedChildren="启用"
                  unCheckedChildren="禁用"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="时间逻辑验证">
                <Switch
                  checked={detectionConfig.enableTemporalValidation}
                  onChange={(checked) => 
                    setDetectionConfig(prev => ({ ...prev, enableTemporalValidation: checked }))
                  }
                  checkedChildren="启用"
                  unCheckedChildren="禁用"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="资源约束验证">
                <Switch
                  checked={detectionConfig.enableResourceValidation}
                  onChange={(checked) => 
                    setDetectionConfig(prev => ({ ...prev, enableResourceValidation: checked }))
                  }
                  checkedChildren="启用"
                  unCheckedChildren="禁用"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="逻辑一致性验证">
                <Switch
                  checked={detectionConfig.enableLogicalValidation}
                  onChange={(checked) => 
                    setDetectionConfig(prev => ({ ...prev, enableLogicalValidation: checked }))
                  }
                  checkedChildren="启用"
                  unCheckedChildren="禁用"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="最大依赖链长度">
                <InputNumber
                  value={detectionConfig.maxDependencyChainLength}
                  onChange={(value) => 
                    setDetectionConfig(prev => ({ ...prev, maxDependencyChainLength: value || 10 }))
                  }
                  min={5}
                  max={50}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="最大滞后天数">
                <InputNumber
                  value={detectionConfig.maxLagDays}
                  onChange={(value) => 
                    setDetectionConfig(prev => ({ ...prev, maxLagDays: value || 30 }))
                  }
                  min={1}
                  max={365}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="关键路径阈值">
            <InputNumber
              value={detectionConfig.criticalPathThreshold}
              onChange={(value) => 
                setDetectionConfig(prev => ({ ...prev, criticalPathThreshold: value || 0.8 }))
              }
              min={0.1}
              max={1}
              step={0.1}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ConflictDetectionTestPage;