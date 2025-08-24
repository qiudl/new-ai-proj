import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Alert,
  Spin,
  Tabs,
  Form,
  Select,
  InputNumber,
  Switch,
  Divider,
  Statistic,
  Progress,
  Table,
  Tag,
  Modal,
  message,
  Typography,
  Timeline,
  Badge
} from 'antd';
import {
  PlayCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  BugOutlined,
  ToolOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  SearchOutlined,
  ReloadOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import { Task } from '../../types/task';
import type { Project } from '../../types/project';
import { TaskDependency, DependencyType, DependencyStrength } from '../../types/dependency';
import DependencyGraphVisualization from './DependencyGraphVisualization';
import AutoSchedulingManager from '../scheduling/AutoSchedulingManager';
import ConflictDetectionService, {
  ConflictDetectionResult,
  ConflictDetectionConfig,
  DependencyConflict,
  DependencyWarning,
  ConflictResolution,
  ConflictType,
  WarningType
} from '../../services/conflictDetectionService';
import DependencyService from '../../services/dependencyService';
import SchedulingService, { SchedulingResult } from '../../services/schedulingService';

const { TabPane } = Tabs;
const { Text, Title } = Typography;
const { Option } = Select;

interface DependencyManagementIntegratedTestPageProps {
  project?: Project;
  tasks?: Task[];
}

const DependencyManagementIntegratedTestPage: React.FC<DependencyManagementIntegratedTestPageProps> = ({
  project: initialProject,
  tasks: initialTasks
}) => {
  // 状态管理
  const [project, setProject] = useState<Project>(initialProject || {
    id: 1,
    name: '依赖管理测试项目',
    description: '综合测试依赖关系管理、冲突检测和自动调度功能',
    owner_id: 1,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const [tasks, setTasks] = useState<Task[]>(initialTasks || []);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('detection');

  // 冲突检测相关状态
  const [conflictResult, setConflictResult] = useState<ConflictDetectionResult | null>(null);
  const [detectionConfig, setDetectionConfig] = useState<Partial<ConflictDetectionConfig>>({
    enableCircularDetection: true,
    enableTemporalValidation: true,
    enableResourceValidation: false,
    enableLogicalValidation: true,
    maxDependencyChainLength: 10,
    maxLagDays: 30,
    criticalPathThreshold: 0.8
  });

  // 调度相关状态
  const [schedulingResult, setSchedulingResult] = useState<SchedulingResult | null>(null);
  const [resolutionModalVisible, setResolutionModalVisible] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<ConflictResolution | null>(null);

  // 服务实例
  const conflictService = ConflictDetectionService.getInstance();
  const dependencyService = DependencyService;
  const schedulingService = SchedulingService.getInstance();

  // 初始化测试数据
  const initializeTestData = useCallback(async () => {
    setLoading(true);
    try {
      // 创建测试任务
      const testTasks: Task[] = [
        {
          id: 1,
          title: '需求分析',
          description: '分析项目需求和功能规格',
          status: 'completed',
          project_id: project.id,
          task_level: 1,
          sort_order: 1,
          estimated_hours: 16,
          start_datetime: '2025-01-01T09:00:00Z',
          due_date: '2025-01-03T17:00:00Z',
          custom_fields: { priority: 'high', complexity: 'medium' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          title: '系统设计',
          description: '设计系统架构和技术方案',
          status: 'in_progress',
          project_id: project.id,
          task_level: 1,
          sort_order: 2,
          estimated_hours: 24,
          start_datetime: '2025-01-04T09:00:00Z',
          due_date: '2025-01-07T17:00:00Z',
          custom_fields: { priority: 'high', complexity: 'high' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 3,
          title: '前端开发',
          description: '开发用户界面和前端逻辑',
          status: 'todo',
          project_id: project.id,
          task_level: 1,
          sort_order: 3,
          estimated_hours: 40,
          start_datetime: '2025-01-08T09:00:00Z',
          due_date: '2025-01-15T17:00:00Z',
          custom_fields: { priority: 'medium', complexity: 'high' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 4,
          title: '后端开发',
          description: '开发API和后端服务',
          status: 'todo',
          project_id: project.id,
          task_level: 1,
          sort_order: 4,
          estimated_hours: 32,
          start_datetime: '2025-01-08T09:00:00Z',
          due_date: '2025-01-14T17:00:00Z',
          custom_fields: { priority: 'medium', complexity: 'high' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 5,
          title: '系统集成测试',
          description: '集成测试和端到端测试',
          status: 'todo',
          project_id: project.id,
          task_level: 1,
          sort_order: 5,
          estimated_hours: 16,
          start_datetime: '2025-01-16T09:00:00Z',
          due_date: '2025-01-18T17:00:00Z',
          custom_fields: { priority: 'high', complexity: 'medium' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 6,
          title: '部署上线',
          description: '生产环境部署和上线',
          status: 'todo',
          project_id: project.id,
          task_level: 1,
          sort_order: 6,
          estimated_hours: 8,
          start_datetime: '2025-01-19T09:00:00Z',
          due_date: '2025-01-20T17:00:00Z',
          custom_fields: { priority: 'critical', complexity: 'low' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      // 创建测试依赖关系
      const testDependencies: TaskDependency[] = [
        {
          id: 1,
          predecessor_id: 1,
          successor_id: 2,
          type: DependencyType.FINISH_TO_START,
          strength: DependencyStrength.MANDATORY,
          lag_days: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 1,
        },
        {
          id: 2,
          predecessor_id: 2,
          successor_id: 3,
          type: DependencyType.FINISH_TO_START,
          strength: DependencyStrength.MANDATORY,
          lag_days: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 1,
        },
        {
          id: 3,
          predecessor_id: 2,
          successor_id: 4,
          type: DependencyType.FINISH_TO_START,
          strength: DependencyStrength.MANDATORY,
          lag_days: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 1,
        },
        {
          id: 4,
          predecessor_id: 3,
          successor_id: 5,
          type: DependencyType.FINISH_TO_START,
          strength: DependencyStrength.MANDATORY,
          lag_days: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 1,
        },
        {
          id: 5,
          predecessor_id: 4,
          successor_id: 5,
          type: DependencyType.FINISH_TO_START,
          strength: DependencyStrength.MANDATORY,
          lag_days: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 1,
        },
        {
          id: 6,
          predecessor_id: 5,
          successor_id: 6,
          type: DependencyType.FINISH_TO_START,
          strength: DependencyStrength.MANDATORY,
          lag_days: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 1,
        }
      ];

      setTasks(testTasks);
      setDependencies(testDependencies);
      message.success('测试数据初始化完成');
    } catch (error) {
      message.error('初始化测试数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  // 执行冲突检测
  const runConflictDetection = useCallback(async () => {
    if (tasks.length === 0) {
      message.warning('请先初始化测试数据');
      return;
    }

    setLoading(true);
    try {
      const result = await conflictService.detectConflicts(
        project.id,
        tasks,
        dependencies,
        detectionConfig
      );
      setConflictResult(result);
      
      if (result.hasConflicts) {
        message.warning(`检测到 ${result.conflicts.length} 个冲突和 ${result.warnings.length} 个警告`);
      } else {
        message.success('未发现依赖冲突');
      }
    } catch (error) {
      message.error('冲突检测失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [project.id, tasks, dependencies, detectionConfig, conflictService]);

  // 执行自动调度
  const runAutoScheduling = useCallback(async () => {
    if (tasks.length === 0) {
      message.warning('请先初始化测试数据');
      return;
    }

    setLoading(true);
    try {
      const result = await schedulingService.scheduleProject(project.id, tasks);
      setSchedulingResult(result);
      message.success('自动调度完成');
    } catch (error) {
      message.error('自动调度失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [project.id, tasks, schedulingService]);

  // 应用解决方案
  const applyResolution = useCallback(async (resolution: ConflictResolution) => {
    setLoading(true);
    try {
      const result = await conflictService.applyResolution(project.id, resolution);
      if (result.success) {
        message.success(result.message);
        await runConflictDetection(); // 重新检测
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('应用解决方案失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [project.id, conflictService, runConflictDetection]);

  // 创建有问题的依赖关系（用于测试）
  const createProblematicDependencies = useCallback(async () => {
    const problematicDeps: TaskDependency[] = [
      // 创建循环依赖：任务3 -> 任务2
      {
        id: 7,
        predecessor_id: 3,
        successor_id: 2,
        type: DependencyType.FINISH_TO_START,
        strength: DependencyStrength.MANDATORY,
        lag_days: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 1,
      },
      // 创建时间冲突：过长的滞后时间
      {
        id: 8,
        predecessor_id: 1,
        successor_id: 6,
        type: DependencyType.FINISH_TO_START,
        strength: DependencyStrength.PREFERRED,
        lag_days: 50, // 超过限制
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 1,
      }
    ];

    setDependencies(prev => [...prev, ...problematicDeps]);
    message.info('已添加有问题的依赖关系，请重新执行冲突检测');
  }, [project.id]);

  // 运行自动化测试
  const runAutomatedTests = useCallback(async () => {
    setLoading(true);
    message.info('开始执行自动化测试套件...');

    try {
      // 1. 初始化干净数据
      await initializeTestData();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 2. 基础冲突检测测试
      message.info('步骤 1/5: 基础冲突检测测试');
      await runConflictDetection();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. 添加问题依赖并检测
      message.info('步骤 2/5: 添加问题依赖关系');
      await createProblematicDependencies();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 4. 重新检测冲突
      message.info('步骤 3/5: 检测问题依赖关系');
      await runConflictDetection();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 5. 测试调度算法
      message.info('步骤 4/5: 测试自动调度算法');
      await runAutoScheduling();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 6. 切换到结果标签页
      message.info('步骤 5/5: 切换到结果视图');
      setActiveTab('conflicts');

      message.success('自动化测试完成！请查看各个标签页的结果');
    } catch (error) {
      message.error('自动化测试失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [initializeTestData, runConflictDetection, createProblematicDependencies, runAutoScheduling]);

  // 冲突表格列配置
  const conflictColumns: ColumnsType<DependencyConflict> = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 150,
      render: (type: ConflictType) => {
        const typeConfig = {
          [ConflictType.CIRCULAR_DEPENDENCY]: { color: 'red', text: '循环依赖' },
          [ConflictType.TEMPORAL_CONFLICT]: { color: 'orange', text: '时间冲突' },
          [ConflictType.LOGICAL_INCONSISTENCY]: { color: 'purple', text: '逻辑不一致' },
          [ConflictType.CONSTRAINT_VIOLATION]: { color: 'blue', text: '约束违反' },
          [ConflictType.RESOURCE_CONFLICT]: { color: 'yellow', text: '资源冲突' },
          [ConflictType.REDUNDANT_DEPENDENCY]: { color: 'gray', text: '冗余依赖' },
          [ConflictType.IMPOSSIBLE_SCHEDULE]: { color: 'volcano', text: '无法调度' }
        };
        const config = typeConfig[type];
        return <Tag color={config.color}>{config.text}</Tag>;
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
      }
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200
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
        <span>{taskIds.length} 个任务</span>
      )
    },
    {
      title: '检测时间',
      dataIndex: 'detectedAt',
      key: 'detectedAt',
      width: 120,
      render: (date: Date) => new Date(date).toLocaleTimeString()
    }
  ];

  // 解决方案表格列配置
  const resolutionColumns: ColumnsType<ConflictResolution> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => <Tag>{type}</Tag>
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => {
        const colors = { HIGH: 'red', MEDIUM: 'orange', LOW: 'green' };
        return <Tag color={colors[priority as keyof typeof colors]}>{priority}</Tag>;
      }
    },
    {
      title: '预估工作量',
      dataIndex: 'estimatedEffort',
      key: 'estimatedEffort',
      width: 100,
      render: (effort: number) => `${effort}h`
    },
    {
      title: '可自动应用',
      dataIndex: 'autoApplicable',
      key: 'autoApplicable',
      width: 100,
      render: (auto: boolean) => auto ? '✅' : '❌'
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record: ConflictResolution) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setSelectedResolution(record);
              setResolutionModalVisible(true);
            }}
          >
            查看详情
          </Button>
          <Button
            size="small"
            type="primary"
            onClick={() => applyResolution(record)}
            loading={loading}
          >
            应用
          </Button>
        </Space>
      )
    }
  ];

  // 初始化
  useEffect(() => {
    initializeTestData();
  }, [initializeTestData]);

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <Row gutter={[24, 24]}>
        {/* 页面标题和控制面板 */}
        <Col span={24}>
          <Card>
            <Title level={2}>
              <ToolOutlined /> 依赖关系管理集成测试平台
            </Title>
            <Text type="secondary">
              综合测试任务依赖关系管理、冲突检测、自动调度和可视化功能
            </Text>
            
            <Divider />
            
            <Space wrap>
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={runAutomatedTests}
                loading={loading}
                size="large"
              >
                运行自动化测试
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={initializeTestData}
                loading={loading}
              >
                重置测试数据
              </Button>
              <Button
                icon={<SearchOutlined />}
                onClick={runConflictDetection}
                loading={loading}
              >
                执行冲突检测
              </Button>
              <Button
                icon={<BarChartOutlined />}
                onClick={runAutoScheduling}
                loading={loading}
              >
                执行自动调度
              </Button>
              <Button
                icon={<BugOutlined />}
                onClick={createProblematicDependencies}
                loading={loading}
              >
                添加问题依赖
              </Button>
            </Space>
          </Card>
        </Col>

        {/* 统计概览 */}
        <Col span={24}>
          <Row gutter={16}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="测试任务"
                  value={tasks.length}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="依赖关系"
                  value={dependencies.length}
                  prefix={<BarChartOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="检测到的冲突"
                  value={conflictResult?.conflicts.length || 0}
                  prefix={<ExclamationCircleOutlined />}
                  valueStyle={{ color: conflictResult?.hasConflicts ? '#cf1322' : '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="警告数量"
                  value={conflictResult?.warnings.length || 0}
                  prefix={<WarningOutlined />}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Card>
            </Col>
          </Row>
        </Col>

        {/* 主要内容区域 */}
        <Col span={24}>
          <Card>
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              {/* 冲突检测配置 */}
              <TabPane tab="检测配置" key="detection">
                <Row gutter={16}>
                  <Col span={12}>
                    <Title level={4}>冲突检测配置</Title>
                    <Form layout="vertical">
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item label="启用循环依赖检测">
                            <Switch
                              checked={detectionConfig.enableCircularDetection}
                              onChange={(checked) => 
                                setDetectionConfig(prev => ({ ...prev, enableCircularDetection: checked }))
                              }
                            />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="启用时间逻辑验证">
                            <Switch
                              checked={detectionConfig.enableTemporalValidation}
                              onChange={(checked) => 
                                setDetectionConfig(prev => ({ ...prev, enableTemporalValidation: checked }))
                              }
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                      
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item label="启用逻辑一致性验证">
                            <Switch
                              checked={detectionConfig.enableLogicalValidation}
                              onChange={(checked) => 
                                setDetectionConfig(prev => ({ ...prev, enableLogicalValidation: checked }))
                              }
                            />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="启用资源验证">
                            <Switch
                              checked={detectionConfig.enableResourceValidation}
                              onChange={(checked) => 
                                setDetectionConfig(prev => ({ ...prev, enableResourceValidation: checked }))
                              }
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                      
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item label="最大依赖链长度">
                            <InputNumber
                              min={3}
                              max={50}
                              value={detectionConfig.maxDependencyChainLength}
                              onChange={(value) => 
                                setDetectionConfig(prev => ({ ...prev, maxDependencyChainLength: value || 10 }))
                              }
                              style={{ width: '100%' }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="最大滞后天数">
                            <InputNumber
                              min={1}
                              max={365}
                              value={detectionConfig.maxLagDays}
                              onChange={(value) => 
                                setDetectionConfig(prev => ({ ...prev, maxLagDays: value || 30 }))
                              }
                              style={{ width: '100%' }}
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Form>
                  </Col>
                  
                  <Col span={12}>
                    <Title level={4}>检测状态</Title>
                    {conflictResult && (
                      <div>
                        <Alert
                          message={`检测完成`}
                          description={`发现 ${conflictResult.conflicts.length} 个冲突，${conflictResult.warnings.length} 个警告`}
                          type={conflictResult.hasConflicts ? 'warning' : 'success'}
                          showIcon
                          style={{ marginBottom: 16 }}
                        />
                        
                        <div>
                          <Text strong>整体严重程度: </Text>
                          <Tag color={
                            conflictResult.severity === 'CRITICAL' ? 'red' :
                            conflictResult.severity === 'HIGH' ? 'orange' :
                            conflictResult.severity === 'MEDIUM' ? 'yellow' : 'green'
                          }>
                            {conflictResult.severity}
                          </Tag>
                        </div>
                        
                        <div style={{ marginTop: 16 }}>
                          <Text strong>受影响的任务: </Text>
                          <Text>{conflictResult.affectedTasks.length} 个</Text>
                        </div>
                      </div>
                    )}
                  </Col>
                </Row>
              </TabPane>

              {/* 冲突详情 */}
              <TabPane 
                tab={
                  <Badge count={conflictResult?.conflicts.length || 0} size="small">
                    <span>冲突详情</span>
                  </Badge>
                } 
                key="conflicts"
              >
                {conflictResult?.conflicts.length ? (
                  <Table
                    columns={conflictColumns}
                    dataSource={conflictResult.conflicts}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    expandable={{
                      expandedRowRender: (record: DependencyConflict) => (
                        <div style={{ padding: '16px', background: '#fafafa' }}>
                          <Row gutter={16}>
                            <Col span={12}>
                              <Title level={5}>冲突详情</Title>
                              <Text><strong>源:</strong> {record.conflictDetails.source}</Text><br />
                              <Text><strong>目标:</strong> {record.conflictDetails.target}</Text><br />
                              <Text><strong>原因:</strong> {record.conflictDetails.reason}</Text><br />
                              <Text><strong>影响:</strong> {record.conflictDetails.impact}</Text>
                            </Col>
                            <Col span={12}>
                              <Title level={5}>受影响的资源</Title>
                              <Text><strong>任务ID:</strong> {record.affectedTasks.join(', ')}</Text><br />
                              <Text><strong>依赖ID:</strong> {record.affectedDependencies.join(', ')}</Text><br />
                              <Text><strong>检测时间:</strong> {new Date(record.detectedAt).toLocaleString()}</Text>
                            </Col>
                          </Row>
                        </div>
                      )
                    }}
                  />
                ) : (
                  <Alert
                    message="未发现冲突"
                    description="当前依赖关系配置没有检测到任何冲突"
                    type="success"
                    showIcon
                  />
                )}
              </TabPane>

              {/* 警告详情 */}
              <TabPane 
                tab={
                  <Badge count={conflictResult?.warnings.length || 0} size="small">
                    <span>警告信息</span>
                  </Badge>
                } 
                key="warnings"
              >
                {conflictResult?.warnings.length ? (
                  <div>
                    {conflictResult.warnings.map((warning, index) => (
                      <Alert
                        key={index}
                        message={warning.message}
                        description={warning.suggestion}
                        type="warning"
                        showIcon
                        style={{ marginBottom: 8 }}
                        action={
                          warning.taskIds.length > 0 && (
                            <Text type="secondary">任务: {warning.taskIds.join(', ')}</Text>
                          )
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <Alert
                    message="无警告信息"
                    description="当前配置没有产生任何警告"
                    type="info"
                    showIcon
                  />
                )}
              </TabPane>

              {/* 解决方案 */}
              <TabPane 
                tab={
                  <Badge count={conflictResult?.suggestions.length || 0} size="small">
                    <span>解决方案</span>
                  </Badge>
                } 
                key="solutions"
              >
                {conflictResult?.suggestions.length ? (
                  <Table
                    columns={resolutionColumns}
                    dataSource={conflictResult.suggestions}
                    rowKey="conflictId"
                    pagination={{ pageSize: 10 }}
                  />
                ) : (
                  <Alert
                    message="无可用解决方案"
                    description="当前没有生成任何自动解决方案"
                    type="info"
                    showIcon
                  />
                )}
              </TabPane>

              {/* 依赖关系可视化 */}
              <TabPane tab="依赖可视化" key="visualization">
                <DependencyGraphVisualization
                  project={project}
                  tasks={tasks}
                  onNodeClick={(taskId) => {
                    message.info(`选择了任务: ${tasks.find(t => t.id === taskId)?.title}`);
                  }}
                  onEdgeClick={(dependencyId) => {
                    message.info(`选择了依赖关系: ${dependencyId}`);
                  }}
                />
              </TabPane>

              {/* 自动调度 */}
              <TabPane tab="自动调度" key="scheduling">
                <AutoSchedulingManager
                  project={project}
                  tasks={tasks}
                  onScheduleComplete={(result) => {
                    setSchedulingResult(result);
                    message.success('调度完成');
                  }}
                  onTaskUpdate={(updatedTasks) => {
                    setTasks(updatedTasks);
                    message.success('任务时间已更新');
                  }}
                />
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>

      {/* 解决方案详情模态框 */}
      <Modal
        title="解决方案详情"
        open={resolutionModalVisible}
        onCancel={() => setResolutionModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setResolutionModalVisible(false)}>
            取消
          </Button>,
          <Button
            key="apply"
            type="primary"
            onClick={() => {
              if (selectedResolution) {
                applyResolution(selectedResolution);
                setResolutionModalVisible(false);
              }
            }}
            loading={loading}
          >
            应用解决方案
          </Button>
        ]}
        width={800}
      >
        {selectedResolution && (
          <div>
            <Title level={4}>{selectedResolution.title}</Title>
            <Text>{selectedResolution.description}</Text>
            
            <Divider />
            
            <Title level={5}>执行步骤:</Title>
            <Timeline>
              {selectedResolution.actions.map((action, index) => (
                <Timeline.Item key={index}>
                  <Text strong>{action.type}</Text>: {action.description}
                </Timeline.Item>
              ))}
            </Timeline>
            
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={8}>
                <Statistic title="预估工作量" value={selectedResolution.estimatedEffort} suffix="小时" />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="优先级" 
                  value={selectedResolution.priority}
                  valueStyle={{ 
                    color: selectedResolution.priority === 'HIGH' ? '#cf1322' : 
                           selectedResolution.priority === 'MEDIUM' ? '#fa8c16' : '#3f8600' 
                  }}
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="可自动应用" 
                  value={selectedResolution.autoApplicable ? '是' : '否'}
                  valueStyle={{ color: selectedResolution.autoApplicable ? '#3f8600' : '#cf1322' }}
                />
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* 加载遮罩 */}
      {loading && (
        <Spin size="large" style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999
        }} />
      )}
    </div>
  );
};

export default DependencyManagementIntegratedTestPage;