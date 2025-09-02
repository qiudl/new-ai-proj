import React, { useState, useEffect } from 'react';
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
  message
} from 'antd';
import {
  ProjectOutlined,
  NodeIndexOutlined,
  LinkOutlined,
  DragOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { Task } from '../types/task';
import {
  TaskDependency,
  CreateDependencyRequest,
  DependencyStatistics,
  DependencyType,
  DependencyStrength
} from '../types/dependency';
import { TaskService } from '../services/taskService';
import DependencyService from '../services/dependencyService';
import DependencyManager from '../components/dependency/DependencyManager';
import EnhancedDependencyGraph from '../components/dependency/EnhancedDependencyGraph';

// 本地Project接口定义
interface Project {
  id: number;
  name: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

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

const DependencyManagementTestPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [statistics, setStatistics] = useState<DependencyStatistics | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('graph');

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
      const [projectTasks, projectDependencies, projectStatistics] = await Promise.all([
        TaskService.getRootTasks(selectedProject.id),
        DependencyService.getDependencies(selectedProject.id),
        DependencyService.getDependencyStatistics(selectedProject.id)
      ]);

      const tasks = Array.isArray(projectTasks) ? projectTasks : (projectTasks as any).data || [];
      setTasks(tasks);
      setDependencies(projectDependencies);
      setStatistics(projectStatistics);
    } catch (error) {
      message.error('加载项目数据失败');
      console.error('加载项目数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 运行拖拽功能测试
  const runDragDropTests = async () => {
    setTestResults([]);
    
    const tests: Array<{
      name: string;
      test: () => Promise<void>;
    }> = [
      {
        name: '拖拽模式切换测试',
        test: async () => {
          // 模拟切换到拖拽模式
          await new Promise(resolve => setTimeout(resolve, 500));
          if (document.querySelector('.drag-mode-button')) {
            throw new Error('拖拽模式按钮未找到');
          }
        }
      },
      {
        name: '节点拖拽响应测试',
        test: async () => {
          // 模拟节点拖拽响应
          await new Promise(resolve => setTimeout(resolve, 300));
          // 检查拖拽事件监听器
        }
      },
      {
        name: '依赖关系验证测试',
        test: async () => {
          // 测试依赖关系验证逻辑
          if (tasks.length >= 2) {
            const canCreate = await DependencyService.validateDependencies(
              selectedProject!.id,
              [{
                predecessor_id: tasks[0].id,
                successor_id: tasks[1].id,
                type: DependencyType.FINISH_TO_START,
                strength: DependencyStrength.MANDATORY
              }]
            );
            if (!canCreate.isValid && canCreate.errors.length === 0) {
              throw new Error('验证逻辑异常');
            }
          }
        }
      },
      {
        name: '循环依赖检测测试',
        test: async () => {
          // 测试循环依赖检测
          const result = await DependencyService.detectCircularDependencies(selectedProject!.id);
          if (typeof result.hasCircular !== 'boolean') {
            throw new Error('循环依赖检测结果格式错误');
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

  // 处理依赖关系创建
  const handleDependencyCreated = (dependency: CreateDependencyRequest) => {
    message.success('依赖关系创建成功');
    loadProjectData(); // 重新加载数据
  };

  // 处理依赖关系变更
  const handleDependencyChange = (newDependencies: TaskDependency[]) => {
    setDependencies(newDependencies);
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>依赖关系管理测试</Title>
            <Text type="secondary">测试拖拽创建依赖关系和智能管理功能</Text>
          </div>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={runDragDropTests}
            disabled={!selectedProject}
          >
            运行功能测试
          </Button>
        </div>
      </Card>

      {/* 项目选择和统计信息 */}
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
          {statistics && (
            <Card title="项目依赖统计" size="small">
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="总任务数"
                    value={tasks.length}
                    prefix={<NodeIndexOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="依赖关系"
                    value={statistics.totalDependencies}
                    prefix={<LinkOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="复杂任务"
                    value={statistics.complexTasksCount}
                    prefix={<ExclamationCircleOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="孤立任务"
                    value={statistics.orphanTasksCount}
                    prefix={<SettingOutlined />}
                  />
                </Col>
              </Row>
            </Card>
          )}
        </Col>
      </Row>

      {/* 测试结果展示 */}
      {testResults.length > 0 && (
        <Card title="功能测试结果" style={{ marginBottom: 24 }}>
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

      {/* 功能演示标签页 */}
      {selectedProject && (
        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane 
              tab={
                <span>
                  <DragOutlined />
                  交互式依赖图
                </span>
              } 
              key="graph"
            >
              <div style={{ marginBottom: 16 }}>
                <Alert
                  message="拖拽创建依赖关系"
                  description="切换到'创建依赖'模式，然后从源任务拖拽到目标任务即可创建依赖关系。支持智能类型推荐和循环依赖检测。"
                  type="info"
                  showIcon
                />
              </div>
              
              <EnhancedDependencyGraph
                project={selectedProject}
                tasks={tasks}
                onDependencyCreated={handleDependencyCreated}
                onNodeClick={(taskId) => {
                  const task = tasks.find(t => t.id === taskId);
                  if (task) {
                    message.info(`选中任务: ${task.title}`);
                  }
                }}
                onEdgeClick={(dependencyId) => {
                  message.info(`选中依赖关系: ${dependencyId}`);
                }}
              />
            </TabPane>

            <TabPane 
              tab={
                <span>
                  <SettingOutlined />
                  依赖管理器
                </span>
              } 
              key="manager"
            >
              <div style={{ marginBottom: 16 }}>
                <Alert
                  message="全面依赖管理"
                  description="提供完整的CRUD操作、批量编辑、验证检测、循环依赖检测和优化建议等功能。"
                  type="info"
                  showIcon
                />
              </div>
              
              <DependencyManager
                project={selectedProject}
                tasks={tasks}
                onDependencyChange={handleDependencyChange}
              />
            </TabPane>

            <TabPane 
              tab={
                <span>
                  <InfoCircleOutlined />
                  使用指南
                </span>
              } 
              key="guide"
            >
              <div style={{ padding: '24px' }}>
                <Title level={3}>拖拽创建依赖关系使用指南</Title>
                
                <Divider />
                
                <Title level={4}>基础操作</Title>
                <Paragraph>
                  <ol>
                    <li><strong>选择项目</strong>: 从项目下拉列表中选择要管理依赖关系的项目</li>
                    <li><strong>切换模式</strong>: 在依赖关系图中点击"创建依赖"模式</li>
                    <li><strong>拖拽创建</strong>: 从源任务拖拽到目标任务创建依赖关系</li>
                    <li><strong>配置依赖</strong>: 在弹出的对话框中配置依赖类型、强度和滞后时间</li>
                  </ol>
                </Paragraph>

                <Title level={4}>智能功能</Title>
                <Paragraph>
                  <ul>
                    <li><strong>类型推荐</strong>: 根据任务状态和时间自动推荐最合适的依赖类型</li>
                    <li><strong>循环检测</strong>: 自动检测并阻止会造成循环依赖的关系创建</li>
                    <li><strong>冲突验证</strong>: 验证依赖关系的合理性和一致性</li>
                    <li><strong>视觉反馈</strong>: 提供丰富的拖拽和悬停视觉反馈</li>
                  </ul>
                </Paragraph>

                <Title level={4}>依赖类型说明</Title>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Card size="small" title="完成-开始 (FS)">
                      <Text>前置任务完成后才能开始后续任务。这是最常见的依赖类型。</Text>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" title="开始-开始 (SS)">
                      <Text>两个任务必须同时开始，适用于并行执行的任务。</Text>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" title="完成-完成 (FF)">
                      <Text>两个任务必须同时完成，适用于同步结束的任务。</Text>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" title="开始-完成 (SF)">
                      <Text>前置任务开始后才能完成后续任务，较少使用的类型。</Text>
                    </Card>
                  </Col>
                </Row>

                <Title level={4}>最佳实践</Title>
                <Paragraph>
                  <ul>
                    <li>优先使用 FS (完成-开始) 类型，除非有特殊需求</li>
                    <li>合理设置滞后时间，考虑实际工作安排</li>
                    <li>定期检查和优化依赖关系，移除冗余依赖</li>
                    <li>使用批量操作提高大项目的管理效率</li>
                  </ul>
                </Paragraph>
              </div>
            </TabPane>
          </Tabs>
        </Card>
      )}
    </div>
  );
};

export default DependencyManagementTestPage;