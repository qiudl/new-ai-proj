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
  Tooltip,
  Tag
} from 'antd';
import {
  ProjectOutlined,
  NodeIndexOutlined,
  GlobalOutlined,
  BarChartOutlined,
  FireOutlined,
  TrophyOutlined,
  ReloadOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { projectService } from '../services/projectService';
import { Project } from '../types/project';
import { Task } from '../types/task';
import ProjectGlobalGanttChart from '../components/ProjectGlobalGanttChart';

const { Title, Text } = Typography;
const { Option } = Select;

interface ProjectGlobalGanttTestPageProps {}

const ProjectGlobalGanttTestPage: React.FC<ProjectGlobalGanttTestPageProps> = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showFullscreen, setShowFullscreen] = useState(false);

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
        pageSize: 1000 // 获取所有任务用于全局甘特图
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
    
    // 关键任务统计 (高优先级任务)
    const criticalTasks = tasks.filter(t => t.custom_fields?.priority === 'high').length;
    
    // 里程碑统计 (高优先级且工时较少的任务)
    const milestones = tasks.filter(t => 
      t.custom_fields?.priority === 'high' && 
      (t.custom_fields?.estimated_hours || 8) <= 8
    ).length;
    
    // 总工时统计
    const totalHours = tasks.reduce((sum, task) => {
      return sum + (task.custom_fields?.estimated_hours || 8);
    }, 0);

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      hierarchicalTasks,
      rootTasks,
      criticalTasks,
      milestones,
      totalHours,
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
              <GlobalOutlined style={{ color: '#1890ff' }} />
              <span>项目全局甘特图测试页面</span>
              <Badge count="Task 302" style={{ backgroundColor: '#722ed1' }} />
            </Title>
            <Text type="secondary" style={{ fontSize: '14px', marginTop: '8px', display: 'block' }}>
              🌐 验证项目级时间线、关键路径分析、里程碑展示等全局功能 | Built with React & TypeScript
            </Text>
          </div>
          <Space>
            <Tooltip title="显示/隐藏功能说明">
              <Switch 
                checked={showInstructions} 
                onChange={setShowInstructions}
                checkedChildren="说明"
                unCheckedChildren="隐藏"
              />
            </Tooltip>
            <Tooltip title="全屏模式">
              <Switch 
                checked={showFullscreen} 
                onChange={setShowFullscreen}
                checkedChildren="全屏"
                unCheckedChildren="窗口"
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

      {/* 功能说明 */}
      {showInstructions && (
        <Alert
          message="🌐 项目全局甘特图功能测试指南"
          description={
            <div style={{ marginTop: '12px' }}>
              <Row gutter={[16, 8]}>
                <Col span={6}>
                  <Text strong>📊 项目时间线：</Text>
                  <br />
                  <Text type="secondary">查看整个项目的任务时间线分布</Text>
                </Col>
                <Col span={6}>
                  <Text strong>🔥 关键路径：</Text>
                  <br />
                  <Text type="secondary">自动识别并突出显示项目关键路径</Text>
                </Col>
                <Col span={6}>
                  <Text strong>🏆 里程碑：</Text>
                  <br />
                  <Text type="secondary">标记和显示项目重要节点</Text>
                </Col>
                <Col span={6}>
                  <Text strong>⚙️ 高级配置：</Text>
                  <br />
                  <Text type="secondary">时间缩放、视图切换、过滤器等</Text>
                </Col>
              </Row>
              <Divider style={{ margin: '12px 0' }} />
              <Space wrap>
                <Tag color="red" icon={<FireOutlined />}>关键任务</Tag>
                <Tag color="gold" icon={<TrophyOutlined />}>里程碑</Tag>
                <Tag color="blue" icon={<NodeIndexOutlined />}>层级结构</Tag>
                <Tag color="green" icon={<BarChartOutlined />}>进度统计</Tag>
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
        {!showFullscreen && (
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
                  <span>全局统计</span>
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
                    title="关键任务" 
                    value={stats.criticalTasks} 
                    valueStyle={{ fontSize: '16px', color: '#ff4d4f' }}
                    prefix={<FireOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic 
                    title="里程碑" 
                    value={stats.milestones} 
                    valueStyle={{ fontSize: '16px', color: '#faad14' }}
                    prefix={<TrophyOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic 
                    title="总工时" 
                    value={stats.totalHours} 
                    suffix="h"
                    valueStyle={{ fontSize: '14px', color: '#722ed1' }}
                    prefix={<ClockCircleOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic 
                    title="层级深度" 
                    value={stats.hierarchicalTasks > 0 ? '多层级' : '扁平'} 
                    valueStyle={{ fontSize: '14px', color: '#13c2c2' }}
                    prefix={<NodeIndexOutlined />}
                  />
                </Col>
              </Row>
            </Card>

            {/* 功能验证说明 */}
            <Card 
              title={
                <Space>
                  <RocketOutlined />
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
                  <li>项目级任务时间线</li>
                  <li>关键路径自动识别</li>
                  <li>里程碑标记显示</li>
                  <li>多时间缩放支持</li>
                  <li>高级过滤配置</li>
                  <li>统计数据展示</li>
                </ul>
                
                <div style={{ marginTop: '16px', marginBottom: '8px' }}>
                  <Text strong style={{ color: '#1890ff' }}>🔮 扩展功能：</Text>
                </div>
                <ul style={{ paddingLeft: '16px', margin: 0 }}>
                  <li>资源负载均衡</li>
                  <li>时间冲突检测</li>
                  <li>项目风险分析</li>
                  <li>协作分享功能</li>
                </ul>
              </div>
            </Card>
          </Col>
        )}

        {/* 甘特图显示区域 */}
        <Col span={showFullscreen ? 24 : 18}>
          {selectedProject && tasks.length > 0 ? (
            <ProjectGlobalGanttChart
              project={selectedProject}
              style={{ minHeight: showFullscreen ? 'calc(100vh - 200px)' : '800px' }}
              height={showFullscreen ? 'calc(100vh - 200px)' : '800px'}
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
                <GlobalOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                <Title level={4} style={{ color: '#8c8c8c' }}>项目暂无任务数据</Title>
                <Text type="secondary">请为该项目添加任务以测试全局甘特图功能</Text>
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
                <Text type="secondary">选择一个项目以查看全局甘特图</Text>
              </div>
            </Card>
          )}
        </Col>
      </Row>

      {/* 页面底部说明 */}
      <Card style={{ marginTop: '24px', textAlign: 'center' }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          🌐 Project Global Gantt Chart Test Page | 基于 Task 302: 项目全局甘特图功能 | 
          Built with React 18 + TypeScript + Ant Design | 
          测试环境：{process.env.NODE_ENV || 'development'} | 
          支持关键路径分析、里程碑管理、多时间缩放等高级功能
        </Text>
      </Card>
    </div>
  );
};

export default ProjectGlobalGanttTestPage;