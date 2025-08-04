import React, { useState, useEffect } from 'react';
import {
  Card,
  Select,
  Button,
  Space,
  Typography,
  Alert,
  Divider,
  Row,
  Col,
  Statistic,
  Badge,
  message,
  Switch,
  Tooltip
} from 'antd';
import {
  ProjectOutlined,
  InteractionOutlined,
  ExperimentOutlined,
  BarChartOutlined,
  EditOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { projectService } from '../services/projectService';
import { Project } from '../types/project';
import { Task } from '../types/task';
import InteractiveGanttChart from '../components/InteractiveGanttChart';

const { Title, Text } = Typography;
const { Option } = Select;

interface InteractiveGanttTestPageProps {}

const InteractiveGanttTestPage: React.FC<InteractiveGanttTestPageProps> = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const [testMode, setTestMode] = useState<'edit' | 'batch' | 'inline'>('edit');

  // 加载项目列表
  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectService.getProjects();
      const projectsList = response?.data || [];
      setProjects(projectsList);

      // 自动选择第一个项目
      if (projectsList.length > 0 && !selectedProject) {
        setSelectedProject(projectsList[0]);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      message.error('加载项目失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载项目任务
  const loadProjectTasks = async (project: Project) => {
    try {
      setLoading(true);
      const tasksResponse = await projectService.getProjectTasks(project.id, {
        page: 1,
        pageSize: 100
      });
      const tasksList = tasksResponse?.data || [];
      setTasks(tasksList);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      message.error('加载任务失败');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // 处理项目选择
  const handleProjectChange = (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setSelectedProject(project);
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    if (selectedProject) {
      loadProjectTasks(selectedProject);
    }
  };

  // 统计信息
  const stats = React.useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const todoTasks = tasks.filter(t => t.status === 'todo').length;
    const hierarchicalTasks = tasks.filter(t => t.parent_id).length;
    const rootTasks = tasks.filter(t => !t.parent_id).length;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      hierarchicalTasks,
      rootTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    };
  }, [tasks]);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectTasks(selectedProject);
    }
  }, [selectedProject, refreshKey]);

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#f5f5f5' }}>
      {/* 页面标题 */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <InteractionOutlined style={{ color: '#1890ff' }} />
              <span>交互式甘特图测试页面</span>
              <Badge count="Task 301" style={{ backgroundColor: '#52c41a' }} />
            </Title>
            <Text type="secondary" style={{ fontSize: '14px', marginTop: '8px', display: 'block' }}>
              🚀 验证双击编辑、内联编辑、批量编辑等交互式功能 | Built with React & TypeScript
            </Text>
          </div>
          <Space>
            <Tooltip title="显示/隐藏操作说明">
              <Switch 
                checked={showInstructions} 
                onChange={setShowInstructions}
                checkedChildren="说明"
                unCheckedChildren="隐藏"
              />
            </Tooltip>
            <Button 
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loading}
            >
              刷新数据
            </Button>
          </Space>
        </div>
      </Card>

      {/* 操作说明 */}
      {showInstructions && (
        <Alert
          message="🎯 交互式甘特图功能测试指南"
          description={
            <div style={{ marginTop: '12px' }}>
              <Row gutter={[16, 8]}>
                <Col span={8}>
                  <Text strong>📝 双击编辑：</Text>
                  <br />
                  <Text type="secondary">双击任务条打开编辑弹窗，支持完整字段编辑</Text>
                </Col>
                <Col span={8}>
                  <Text strong>⚡ 内联编辑：</Text>
                  <br />
                  <Text type="secondary">点击任务字段进行快速内联编辑</Text>
                </Col>
                <Col span={8}>
                  <Text strong>📦 批量编辑：</Text>
                  <br />
                  <Text type="secondary">勾选多个任务，进行批量状态更新</Text>
                </Col>
              </Row>
              <Divider style={{ margin: '12px 0' }} />
              <Space>
                <Text type="secondary">测试模式：</Text>
                <Select
                  value={testMode}
                  onChange={setTestMode}
                  style={{ width: 120 }}
                  size="small"
                >
                  <Option value="edit">编辑模式</Option>
                  <Option value="batch">批量模式</Option>
                  <Option value="inline">内联模式</Option>
                </Select>
              </Space>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: '24px' }}
        />
      )}

      <Row gutter={[24, 24]}>
        {/* 左侧控制面板 */}
        <Col span={6}>
          <Card 
            title={
              <Space>
                <ProjectOutlined />
                <span>项目选择</span>
              </Space>
            }
            size="small"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>选择项目：</Text>
                <Select
                  style={{ width: '100%', marginTop: '8px' }}
                  placeholder="选择项目进行测试"
                  value={selectedProject?.id}
                  onChange={handleProjectChange}
                  loading={loading}
                >
                  {projects.map(project => (
                    <Option key={project.id} value={project.id}>
                      {project.name}
                    </Option>
                  ))}
                </Select>
              </div>

              {selectedProject && (
                <>
                  <Divider style={{ margin: '16px 0' }} />
                  <div>
                    <Text strong>项目信息：</Text>
                    <div style={{ marginTop: '8px', fontSize: '12px' }}>
                      <div><Text type="secondary">名称：</Text>{selectedProject.name}</div>
                      <div><Text type="secondary">ID：</Text>{selectedProject.id}</div>
                      <div><Text type="secondary">状态：</Text>
                        <Badge 
                          status={selectedProject.status === 'active' ? 'success' : 'default'} 
                          text={selectedProject.status === 'active' ? '活跃' : '非活跃'} 
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </Space>
          </Card>

          {/* 统计信息 */}
          <Card 
            title={
              <Space>
                <BarChartOutlined />
                <span>数据统计</span>
              </Space>
            }
            size="small"
            style={{ marginTop: '16px' }}
          >
            <Row gutter={[8, 16]}>
              <Col span={12}>
                <Statistic 
                  title="总任务" 
                  value={stats.totalTasks} 
                  valueStyle={{ fontSize: '18px', color: '#1890ff' }}
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="完成率" 
                  value={stats.completionRate} 
                  suffix="%" 
                  valueStyle={{ fontSize: '18px', color: '#52c41a' }}
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="进行中" 
                  value={stats.inProgressTasks} 
                  valueStyle={{ fontSize: '16px', color: '#fa8c16' }}
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="已完成" 
                  value={stats.completedTasks} 
                  valueStyle={{ fontSize: '16px', color: '#52c41a' }}
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="根任务" 
                  value={stats.rootTasks} 
                  valueStyle={{ fontSize: '14px', color: '#722ed1' }}
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="子任务" 
                  value={stats.hierarchicalTasks} 
                  valueStyle={{ fontSize: '14px', color: '#13c2c2' }}
                />
              </Col>
            </Row>
          </Card>

          {/* 测试功能说明 */}
          <Card 
            title={
              <Space>
                <ExperimentOutlined />
                <span>功能验证</span>
              </Space>
            }
            size="small"
            style={{ marginTop: '16px' }}
          >
            <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
              <div style={{ marginBottom: '8px' }}>
                <Text strong style={{ color: '#52c41a' }}>✅ 已实现功能：</Text>
              </div>
              <ul style={{ paddingLeft: '16px', margin: 0 }}>
                <li>双击编辑弹窗</li>
                <li>内联字段编辑</li>
                <li>批量状态更新</li>
                <li>任务选择管理</li>
                <li>编辑状态指示器</li>
                <li>层级关系展示</li>
              </ul>
              
              <div style={{ marginTop: '16px', marginBottom: '8px' }}>
                <Text strong style={{ color: '#1890ff' }}>🔮 规划功能：</Text>
              </div>
              <ul style={{ paddingLeft: '16px', margin: 0 }}>
                <li>拖拽时间调整</li>
                <li>依赖关系编辑</li>
                <li>资源分配管理</li>
                <li>进度可视化</li>
              </ul>
            </div>
          </Card>
        </Col>

        {/* 右侧甘特图显示区域 */}
        <Col span={18}>
          {selectedProject && tasks.length > 0 ? (
            <InteractiveGanttChart
              tasks={tasks}
              projectId={selectedProject.id}
              style={{ minHeight: '800px' }}
              onTaskUpdate={(updatedTask) => {
                setTasks(prevTasks => 
                  prevTasks.map(task => 
                    task.id === updatedTask.id ? updatedTask : task
                  )
                );
                message.success(`任务 "${updatedTask.title}" 更新成功`);
              }}
            />
          ) : selectedProject && tasks.length === 0 ? (
            <Card 
              style={{ minHeight: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              loading={loading}
            >
              <div style={{ textAlign: 'center' }}>
                <EditOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                <Title level={4} style={{ color: '#8c8c8c' }}>项目暂无任务数据</Title>
                <Text type="secondary">请为该项目添加任务以测试交互式甘特图功能</Text>
              </div>
            </Card>
          ) : (
            <Card 
              style={{ minHeight: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              loading={loading}
            >
              <div style={{ textAlign: 'center' }}>
                <ProjectOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                <Title level={4} style={{ color: '#8c8c8c' }}>请选择项目</Title>
                <Text type="secondary">选择一个项目以查看交互式甘特图</Text>
              </div>
            </Card>
          )}
        </Col>
      </Row>

      {/* 页面底部说明 */}
      <Card style={{ marginTop: '24px', textAlign: 'center' }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          🚀 Interactive Gantt Chart Test Page | 基于 Task 301: 交互式任务编辑功能 | 
          Built with React 18 + TypeScript + Ant Design | 
          测试环境：{process.env.NODE_ENV || 'development'}
        </Text>
      </Card>
    </div>
  );
};

export default InteractiveGanttTestPage;