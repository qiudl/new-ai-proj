import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Typography,
  Space,
  Badge,
  Tooltip,
  Row,
  Col,
  Statistic,
  Spin,
  Button,
  Switch,
  Select,
  DatePicker,
  Divider,
  Timeline,
  Progress,
  Tag,
  Alert,
  Drawer,
  List,
  Avatar,
  message
} from 'antd';
import {
  BarChartOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  CalendarOutlined,
  FilterOutlined,
  ExportOutlined,
  SettingOutlined,
  NodeIndexOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  TeamOutlined,
  AimOutlined,
  FireOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { Task } from '../types/task';
import { Project } from '../types/project';
import { TaskService } from '../services/taskService';
import dayjs, { Dayjs } from 'dayjs';
import '../styles/ProjectGlobalGanttChart.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// 全局甘特图任务接口
interface GlobalGanttTask extends Task {
  level: number;
  children?: GlobalGanttTask[];
  startDate: Date;
  endDate: Date;
  duration: number;
  isCriticalPath?: boolean;
  isMilestone?: boolean;
  dependencies: number[];
  completionPercentage: number;
  resourceLoad: number;
  isExpanded?: boolean;
}

// 时间缩放类型
type TimeScale = 'days' | 'weeks' | 'months' | 'quarters';

// 视图类型
type ViewType = 'gantt' | 'timeline' | 'critical-path' | 'milestones';

// 过滤器配置
interface GanttFilter {
  status?: string[];
  priority?: string[];
  assignee?: number[];
  dateRange?: [Dayjs, Dayjs];
  showOnlyCritical?: boolean;
  showOnlyMilestones?: boolean;
}

// 甘特图配置
interface GanttConfig {
  timeScale: TimeScale;
  viewType: ViewType;
  showDependencies: boolean;
  showCriticalPath: boolean;
  showProgress: boolean;
  compactMode: boolean;
}

interface ProjectGlobalGanttChartProps {
  project: Project;
  style?: React.CSSProperties;
  height?: string | number;
  onTaskUpdate?: (task: Task) => void;
}

const ProjectGlobalGanttChart: React.FC<ProjectGlobalGanttChartProps> = ({
  project,
  style,
  height = '800px',
  onTaskUpdate
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [globalGanttTasks, setGlobalGanttTasks] = useState<GlobalGanttTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [configDrawerVisible, setConfigDrawerVisible] = useState(false);
  const [criticalPathDrawerVisible, setCriticalPathDrawerVisible] = useState(false);
  
  // 甘特图配置状态
  const [config, setConfig] = useState<GanttConfig>({
    timeScale: 'weeks',
    viewType: 'gantt',
    showDependencies: true,
    showCriticalPath: true,
    showProgress: true,
    compactMode: false
  });

  // 过滤器状态
  const [filter, setFilter] = useState<GanttFilter>({
    showOnlyCritical: false,
    showOnlyMilestones: false
  });

  // 状态配置
  const STATUS_CONFIG = {
    todo: { 
      color: '#1890ff', 
      text: '待开始', 
      icon: <PauseCircleOutlined />,
      gradient: 'linear-gradient(90deg, #1890ff, #40a9ff)'
    },
    in_progress: { 
      color: '#fa8c16', 
      text: '进行中', 
      icon: <PlayCircleOutlined />,
      gradient: 'linear-gradient(90deg, #fa8c16, #ffa940)'
    },
    completed: { 
      color: '#52c41a', 
      text: '已完成', 
      icon: <CheckCircleOutlined />,
      gradient: 'linear-gradient(90deg, #52c41a, #73d13d)'
    },
    cancelled: { 
      color: '#ff4d4f', 
      text: '已取消', 
      icon: <PauseCircleOutlined />,
      gradient: 'linear-gradient(90deg, #ff4d4f, #ff7875)'
    }
  };

  // 优先级配置
  const PRIORITY_CONFIG = {
    high: { color: '#ff4d4f', text: '高', icon: '🔥' },
    medium: { color: '#fa8c16', text: '中', icon: '⚡' },
    low: { color: '#52c41a', text: '低', icon: '💡' }
  };

  // 加载项目任务
  const loadProjectTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await TaskService.getTasks(project.id, {
        page: 1,
        page_size: 1000 // 获取所有任务
      });
      const tasksList = response.data || [];
      setTasks(tasksList);
    } catch (error) {
      console.error('Failed to load project tasks:', error);
      message.error('加载项目任务失败');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  // 构建层级任务结构
  const buildHierarchicalTasks = useCallback((tasks: Task[]): GlobalGanttTask[] => {
    const taskMap = new Map<number, GlobalGanttTask>();
    const rootTasks: GlobalGanttTask[] = [];

    // 创建任务映射，添加甘特图特有属性
    tasks.forEach(task => {
      const now = new Date();
      const estimatedHours = task.custom_fields?.estimated_hours || 8;
      const duration = Math.max(1, Math.ceil(estimatedHours / 8)); // 按8小时工作日计算
      
      const startDate = task.due_date 
        ? new Date(new Date(task.due_date).getTime() - duration * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);
      
      const endDate = task.due_date 
        ? new Date(task.due_date)
        : new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);

      const globalTask: GlobalGanttTask = {
        ...task,
        level: 0,
        children: [],
        startDate,
        endDate,
        duration,
        dependencies: task.dependencies || [],
        completionPercentage: task.status === 'completed' ? 100 : 
                            task.status === 'in_progress' ? 45 : 0,
        resourceLoad: estimatedHours,
        isCriticalPath: false,
        isMilestone: task.custom_fields?.priority === 'high' && duration <= 1,
        isExpanded: true
      };

      taskMap.set(task.id, globalTask);
    });

    // 构建层级结构
    tasks.forEach(task => {
      const globalTask = taskMap.get(task.id)!;
      if (task.parent_id && taskMap.has(task.parent_id)) {
        const parent = taskMap.get(task.parent_id)!;
        parent.children = parent.children || [];
        globalTask.level = parent.level + 1;
        parent.children.push(globalTask);
      } else {
        rootTasks.push(globalTask);
      }
    });

    // 计算关键路径
    const criticalTasks = calculateCriticalPath(rootTasks);
    criticalTasks.forEach(taskId => {
      const task = taskMap.get(taskId);
      if (task) {
        task.isCriticalPath = true;
      }
    });

    return rootTasks;
  }, []);

  // 计算关键路径（简化版本）
  const calculateCriticalPath = (tasks: GlobalGanttTask[]): number[] => {
    const criticalTasks: number[] = [];
    
    const findLongestPath = (task: GlobalGanttTask): number => {
      if (!task.children || task.children.length === 0) {
        return task.duration;
      }
      
      const maxChildPath = Math.max(...task.children.map(findLongestPath));
      return task.duration + maxChildPath;
    };

    // 找到最长路径上的任务
    tasks.forEach(task => {
      const pathLength = findLongestPath(task);
      if (pathLength > 10) { // 简单阈值判断
        criticalTasks.push(task.id);
        if (task.children) {
          task.children.forEach(child => {
            if (findLongestPath(child) > 5) {
              criticalTasks.push(child.id);
            }
          });
        }
      }
    });

    return criticalTasks;
  };

  // 过滤任务
  const filteredTasks = useMemo(() => {
    let filtered = globalGanttTasks;

    if (filter.status && filter.status.length > 0) {
      filtered = filtered.filter(task => filter.status!.includes(task.status));
    }

    if (filter.priority && filter.priority.length > 0) {
      filtered = filtered.filter(task => 
        filter.priority!.includes(task.custom_fields?.priority || 'medium')
      );
    }

    if (filter.showOnlyCritical) {
      filtered = filtered.filter(task => task.isCriticalPath);
    }

    if (filter.showOnlyMilestones) {
      filtered = filtered.filter(task => task.isMilestone);
    }

    return filtered;
  }, [globalGanttTasks, filter]);

  // 计算时间轴范围
  const timeRange = useMemo(() => {
    if (filteredTasks.length === 0) return { start: new Date(), end: new Date() };

    const allTasks = filteredTasks.flatMap(task => {
      const flatTasks = [task];
      const addChildren = (t: GlobalGanttTask) => {
        if (t.children) {
          t.children.forEach(child => {
            flatTasks.push(child);
            addChildren(child);
          });
        }
      };
      addChildren(task);
      return flatTasks;
    });

    const minDate = new Date(Math.min(...allTasks.map(t => t.startDate.getTime())));
    const maxDate = new Date(Math.max(...allTasks.map(t => t.endDate.getTime())));

    return { start: minDate, end: maxDate };
  }, [filteredTasks]);

  // 渲染甘特图任务条
  const renderGanttBar = (task: GlobalGanttTask, index: number) => {
    const statusConfig = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG];
    const priorityConfig = PRIORITY_CONFIG[task.custom_fields?.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;

    // 计算位置和宽度
    const totalDuration = timeRange.end.getTime() - timeRange.start.getTime();
    const taskStart = task.startDate.getTime() - timeRange.start.getTime();
    const taskDuration = task.endDate.getTime() - task.startDate.getTime();
    
    const leftPercentage = totalDuration > 0 ? (taskStart / totalDuration) * 100 : 0;
    const widthPercentage = totalDuration > 0 ? (taskDuration / totalDuration) * 100 : 10;

    return (
      <div key={task.id} className="global-gantt-row" style={{
        display: 'flex',
        alignItems: 'center',
        minHeight: config.compactMode ? '40px' : '50px',
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: index % 2 === 0 ? '#fafafa' : 'white'
      }}>
        {/* 任务信息区域 */}
        <div className="task-info-section" style={{
          width: '350px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderRight: '1px solid #e8e8e8'
        }}>
          {/* 层级缩进 */}
          <div style={{ width: `${task.level * 20}px` }} />
          
          {/* 优先级指示器 */}
          <div style={{
            width: '4px',
            height: '32px',
            backgroundColor: priorityConfig.color,
            borderRadius: '2px'
          }} />

          {/* 任务内容 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              {statusConfig.icon}
              <Text strong style={{ 
                fontSize: config.compactMode ? '12px' : '13px',
                color: task.status === 'completed' ? '#8c8c8c' : '#262626',
                textDecoration: task.status === 'completed' ? 'line-through' : 'none'
              }}>
                {task.title}
              </Text>
              
              {/* 关键路径标记 */}
              {task.isCriticalPath && (
                <Tag color="red" size="small">
                  <FireOutlined style={{ fontSize: '10px' }} />
                  关键
                </Tag>
              )}
              
              {/* 里程碑标记 */}
              {task.isMilestone && (
                <Tag color="gold" size="small">
                  <TrophyOutlined style={{ fontSize: '10px' }} />
                  里程碑
                </Tag>
              )}
            </div>
            
            <div style={{ fontSize: '11px', color: '#666', display: 'flex', gap: '12px' }}>
              <span>{priorityConfig.icon} {priorityConfig.text}</span>
              <span><ClockCircleOutlined /> {task.duration}天</span>
              <span><ThunderboltOutlined /> {task.resourceLoad}h</span>
            </div>
          </div>
        </div>

        {/* 甘特图时间轴区域 */}
        <div className="timeline-section" style={{
          flex: 1,
          position: 'relative',
          height: '36px',
          margin: '7px',
          minWidth: '600px'
        }}>
          {/* 任务条 */}
          <div
            className="gantt-task-bar"
            style={{
              position: 'absolute',
              left: `${Math.max(0, leftPercentage)}%`,
              width: `${Math.min(widthPercentage, 100 - leftPercentage)}%`,
              height: '30px',
              background: task.isCriticalPath 
                ? 'linear-gradient(90deg, #ff4d4f, #ff7875)'
                : statusConfig.gradient,
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: task.isCriticalPath 
                ? '0 2px 8px rgba(255, 77, 79, 0.3)'
                : '0 1px 4px rgba(0,0,0,0.2)',
              border: task.isMilestone ? '2px solid #faad14' : 'none',
              zIndex: task.isCriticalPath ? 10 : 1
            }}
            onClick={() => onTaskUpdate?.(task)}
          >
            {config.showProgress && (
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${task.completionPercentage}%`,
                background: 'rgba(255,255,255,0.3)',
                borderRadius: '4px 0 0 4px'
              }} />
            )}
            <span>{Math.round(task.resourceLoad)}h</span>
          </div>

          {/* 依赖关系连线 */}
          {config.showDependencies && task.dependencies.length > 0 && (
            <div className="dependency-lines">
              {/* 简化的依赖线渲染 */}
            </div>
          )}
        </div>

        {/* 日期信息 */}
        <div className="date-info-section" style={{
          width: '140px',
          padding: '8px',
          fontSize: '11px',
          textAlign: 'center',
          borderLeft: '1px solid #e8e8e8'
        }}>
          <div>{dayjs(task.startDate).format('MM/DD')}</div>
          <div style={{ color: '#666' }}>-</div>
          <div>{dayjs(task.endDate).format('MM/DD')}</div>
        </div>
      </div>
    );
  };

  // 展平任务层级结构用于渲染
  const flattenTasks = (tasks: GlobalGanttTask[]): GlobalGanttTask[] => {
    const flattened: GlobalGanttTask[] = [];
    
    const flatten = (taskList: GlobalGanttTask[]) => {
      taskList.forEach(task => {
        flattened.push(task);
        if (task.children && task.children.length > 0 && task.isExpanded) {
          flatten(task.children);
        }
      });
    };
    
    flatten(tasks);
    return flattened;
  };

  // 渲染时间轴表头
  const renderTimeAxisHeader = () => {
    const { start, end } = timeRange;
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const intervals: JSX.Element[] = [];

    let step = 1;
    let format = 'MM/DD';
    
    switch (config.timeScale) {
      case 'days':
        step = Math.max(1, Math.ceil(totalDays / 20));
        format = 'MM/DD';
        break;
      case 'weeks':
        step = Math.max(7, Math.ceil(totalDays / 15));
        format = 'MM/DD';
        break;
      case 'months':
        step = Math.max(30, Math.ceil(totalDays / 12));
        format = 'MM月';
        break;
      case 'quarters':
        step = Math.max(90, Math.ceil(totalDays / 4));
        format = 'YYYY-Q';
        break;
    }

    for (let i = 0; i <= totalDays; i += step) {
      const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const position = totalDays > 0 ? (i / totalDays) * 100 : 0;
      
      intervals.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${position}%`,
            top: 0,
            borderLeft: '1px solid #d9d9d9',
            height: '100%',
            paddingLeft: '4px',
            fontSize: '11px',
            color: '#666',
            whiteSpace: 'nowrap'
          }}
        >
          {dayjs(date).format(format)}
        </div>
      );
    }

    return (
      <div style={{
        position: 'relative',
        height: '30px',
        background: '#fafafa',
        borderBottom: '2px solid #d9d9d9',
        borderTop: '1px solid #d9d9d9'
      }}>
        {intervals}
      </div>
    );
  };

  // 统计信息
  const stats = useMemo(() => {
    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter(t => t.status === 'completed').length;
    const criticalTasks = filteredTasks.filter(t => t.isCriticalPath).length;
    const milestones = filteredTasks.filter(t => t.isMilestone).length;
    const totalHours = filteredTasks.reduce((sum, t) => sum + t.resourceLoad, 0);

    return {
      totalTasks,
      completedTasks,
      criticalTasks,
      milestones,
      totalHours,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    };
  }, [filteredTasks]);

  useEffect(() => {
    loadProjectTasks();
  }, [loadProjectTasks]);

  useEffect(() => {
    if (tasks.length > 0) {
      const hierarchicalTasks = buildHierarchicalTasks(tasks);
      setGlobalGanttTasks(hierarchicalTasks);
    }
  }, [tasks, buildHierarchicalTasks]);

  if (loading) {
    return (
      <Card style={style}>
        <div style={{ textAlign: 'center', padding: '80px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text>正在加载项目全局甘特图...</Text>
          </div>
        </div>
      </Card>
    );
  }

  const flattened = flattenTasks(filteredTasks);

  return (
    <div className="project-global-gantt-chart">
      <Card
        title={
          <Space>
            <NodeIndexOutlined style={{ color: '#1890ff' }} />
            <span>🌐 项目全局甘特图: {project.name}</span>
            <Badge count={stats.totalTasks} style={{ backgroundColor: '#52c41a' }} />
          </Space>
        }
        extra={
          <Space>
            <Button
              size="small"
              icon={<FilterOutlined />}
              onClick={() => setConfigDrawerVisible(true)}
            >
              配置
            </Button>
            <Button
              size="small"
              icon={<RocketOutlined />}
              onClick={() => setCriticalPathDrawerVisible(true)}
              type={config.showCriticalPath ? 'primary' : 'default'}
            >
              关键路径
            </Button>
            <Button size="small" icon={<ExportOutlined />}>
              导出
            </Button>
            <Button size="small" icon={<ReloadOutlined />} onClick={loadProjectTasks}>
              刷新
            </Button>
            <Button
              size="small"
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? '退出全屏' : '全屏'}
            </Button>
          </Space>
        }
        style={{
          ...style,
          ...(isFullscreen ? {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            margin: 0,
            borderRadius: 0,
            height: '100vh'
          } : { height })
        }}
      >
        {/* 统计概览 */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col span={4}>
            <Statistic
              title="总任务"
              value={stats.totalTasks}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="完成率"
              value={stats.completionRate}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="关键任务"
              value={stats.criticalTasks}
              prefix={<FireOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="里程碑"
              value={stats.milestones}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="总工时"
              value={stats.totalHours}
              suffix="h"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
          <Col span={4}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#13c2c2' }}>
                {dayjs(timeRange.start).format('MM/DD')} - {dayjs(timeRange.end).format('MM/DD')}
              </div>
              <div style={{ color: '#666', fontSize: '12px' }}>项目周期</div>
            </div>
          </Col>
        </Row>

        {flattened.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px' }}>
            <BarChartOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
            <Title level={4} style={{ color: '#8c8c8c' }}>暂无项目任务</Title>
            <Text type="secondary">项目中还没有任务，请先创建任务</Text>
          </div>
        ) : (
          /* 甘特图主体 */
          <div className="gantt-container" style={{
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            background: 'white',
            overflow: 'auto',
            height: isFullscreen ? 'calc(100vh - 280px)' : 'calc(100% - 200px)'
          }}>
            {/* 表头 */}
            <div style={{
              display: 'flex',
              background: '#fafafa',
              borderBottom: '2px solid #d9d9d9',
              fontWeight: 'bold',
              fontSize: '13px',
              position: 'sticky',
              top: 0,
              zIndex: 100
            }}>
              <div style={{ width: '350px', padding: '12px', borderRight: '1px solid #d9d9d9' }}>
                📋 任务列表
              </div>
              <div style={{ flex: 1, padding: '12px', minWidth: '600px', position: 'relative' }}>
                📅 时间线 ({config.timeScale === 'days' ? '按天' : 
                       config.timeScale === 'weeks' ? '按周' : 
                       config.timeScale === 'months' ? '按月' : '按季度'})
              </div>
              <div style={{ width: '140px', padding: '12px', borderLeft: '1px solid #d9d9d9', textAlign: 'center' }}>
                📆 日期范围
              </div>
            </div>

            {/* 时间轴表头 */}
            <div style={{ display: 'flex' }}>
              <div style={{ width: '350px' }}></div>
              <div style={{ flex: 1, minWidth: '600px', position: 'relative' }}>
                {renderTimeAxisHeader()}
              </div>
              <div style={{ width: '140px' }}></div>
            </div>

            {/* 任务行 */}
            {flattened.map((task, index) => renderGanttBar(task, index))}
          </div>
        )}

        {/* 配置抽屉 */}
        <Drawer
          title="甘特图配置"
          placement="right"
          onClose={() => setConfigDrawerVisible(false)}
          open={configDrawerVisible}
          width={400}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Text strong>时间缩放</Text>
              <Select
                value={config.timeScale}
                onChange={(value) => setConfig(prev => ({ ...prev, timeScale: value }))}
                style={{ width: '100%', marginTop: '8px' }}
              >
                <Option value="days">按天显示</Option>
                <Option value="weeks">按周显示</Option>
                <Option value="months">按月显示</Option>
                <Option value="quarters">按季度显示</Option>
              </Select>
            </div>

            <div>
              <Text strong>显示选项</Text>
              <div style={{ marginTop: '12px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <Switch
                    checked={config.showDependencies}
                    onChange={(checked) => setConfig(prev => ({ ...prev, showDependencies: checked }))}
                  />
                  <span style={{ marginLeft: '8px' }}>显示依赖关系</span>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <Switch
                    checked={config.showCriticalPath}
                    onChange={(checked) => setConfig(prev => ({ ...prev, showCriticalPath: checked }))}
                  />
                  <span style={{ marginLeft: '8px' }}>显示关键路径</span>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <Switch
                    checked={config.showProgress}
                    onChange={(checked) => setConfig(prev => ({ ...prev, showProgress: checked }))}
                  />
                  <span style={{ marginLeft: '8px' }}>显示进度条</span>
                </div>
                <div>
                  <Switch
                    checked={config.compactMode}
                    onChange={(checked) => setConfig(prev => ({ ...prev, compactMode: checked }))}
                  />
                  <span style={{ marginLeft: '8px' }}>紧凑模式</span>
                </div>
              </div>
            </div>

            <div>
              <Text strong>过滤器</Text>
              <div style={{ marginTop: '12px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <Switch
                    checked={filter.showOnlyCritical}
                    onChange={(checked) => setFilter(prev => ({ ...prev, showOnlyCritical: checked }))}
                  />
                  <span style={{ marginLeft: '8px' }}>仅显示关键任务</span>
                </div>
                <div>
                  <Switch
                    checked={filter.showOnlyMilestones}
                    onChange={(checked) => setFilter(prev => ({ ...prev, showOnlyMilestones: checked }))}
                  />
                  <span style={{ marginLeft: '8px' }}>仅显示里程碑</span>
                </div>
              </div>
            </div>
          </Space>
        </Drawer>

        {/* 关键路径分析抽屉 */}
        <Drawer
          title="关键路径分析"
          placement="right"
          onClose={() => setCriticalPathDrawerVisible(false)}
          open={criticalPathDrawerVisible}
          width={500}
        >
          <Alert
            message="关键路径识别"
            description="以下任务位于项目的关键路径上，延迟将直接影响项目完成时间"
            type="warning"
            showIcon
            style={{ marginBottom: '16px' }}
          />
          
          <List
            dataSource={filteredTasks.filter(task => task.isCriticalPath)}
            renderItem={(task) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar style={{ backgroundColor: '#ff4d4f' }}><FireOutlined /></Avatar>}
                  title={<Text strong>{task.title}</Text>}
                  description={
                    <Space>
                      <Tag color="red">关键任务</Tag>
                      <span>工期: {task.duration}天</span>
                      <span>工时: {task.resourceLoad}h</span>
                      <span>完成度: {task.completionPercentage}%</span>
                    </Space>
                  }
                />
              </List.Item>
            )}
            locale={{ emptyText: '暂无关键路径任务' }}
          />
        </Drawer>
      </Card>
    </div>
  );
};

export default ProjectGlobalGanttChart;