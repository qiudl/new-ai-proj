import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Typography,
  Space,
  Badge,
  Tag,
  Tooltip,
  Row,
  Col,
  Statistic,
  Spin,
  Alert,
  Button,
  Switch,
  Slider,
  Divider
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
  BranchesOutlined,
  CaretRightOutlined,
  CaretDownOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { Task } from '../types/task';
import { TaskService } from '../services/taskService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface HierarchicalGanttChartProps {
  parentTask: Task;
  projectId: number;
  style?: React.CSSProperties;
}

interface HierarchicalGanttTask {
  id: number;
  title: string;
  status: string;
  priority: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  estimatedHours: number;
  progress: number;
  dependencies: number[];
  level: number;  // 层级深度，0为根级
  parentId?: number;
  children?: HierarchicalGanttTask[];
  isExpanded?: boolean;
  isVisible?: boolean;
}

interface GanttStats {
  totalSubtasks: number;
  completedSubtasks: number;
  totalEstimatedHours: number;
  completionRate: number;
  maxLevel: number;  // 最大层级深度
}

const STATUS_CONFIG = {
  todo: { 
    color: '#3498db', 
    text: '待开始', 
    icon: <PauseCircleOutlined />,
    gradient: 'linear-gradient(45deg, #3498db, #5dade2)'
  },
  in_progress: { 
    color: '#f39c12', 
    text: '进行中', 
    icon: <PlayCircleOutlined />,
    gradient: 'linear-gradient(45deg, #f39c12, #f1c40f)'
  },
  completed: { 
    color: '#27ae60', 
    text: '已完成', 
    icon: <CheckCircleOutlined />,
    gradient: 'linear-gradient(45deg, #27ae60, #2ecc71)'
  },
  cancelled: { 
    color: '#e74c3c', 
    text: '已取消', 
    icon: <PauseCircleOutlined />,
    gradient: 'linear-gradient(45deg, #e74c3c, #c0392b)'
  }
};

const PRIORITY_CONFIG = {
  high: { color: '#e74c3c', text: '🔥 高' },
  medium: { color: '#f39c12', text: '⚡ 中' },
  low: { color: '#95a5a6', text: '💡 低' }
};

const HierarchicalGanttChart: React.FC<HierarchicalGanttChartProps> = ({
  parentTask,
  projectId,
  style
}) => {
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [hierarchicalTasks, setHierarchicalTasks] = useState<HierarchicalGanttTask[]>([]);
  const [isGanttFullscreen, setIsGanttFullscreen] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [visibilityLevels, setVisibilityLevels] = useState<number[]>([0, 1, 2, 3, 4]); // 默认显示5级
  const [maxLevelFilter, setMaxLevelFilter] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');

  // 加载子任务数据
  const loadSubtasks = async () => {
    setLoading(true);
    try {
      const children = await TaskService.getTaskChildren(projectId, parentTask.id);
      setSubtasks(Array.isArray(children) ? children : []);
    } catch (error) {
      console.error('加载子任务失败:', error);
      setSubtasks([]);
    } finally {
      setLoading(false);
    }
  };

  // 构建层级任务结构
  const buildHierarchicalStructure = useCallback((tasks: Task[]): HierarchicalGanttTask[] => {
    const taskMap = new Map<number, Task & { children: Task[] }>();
    const rootTasks: (Task & { children: Task[] })[] = [];

    // 初始化任务映射
    tasks.forEach(task => {
      taskMap.set(task.id, { ...task, children: [] });
    });

    // 构建父子关系
    tasks.forEach(task => {
      if (task.parent_id && taskMap.has(task.parent_id)) {
        const parent = taskMap.get(task.parent_id)!;
        parent.children.push(taskMap.get(task.id)!);
      } else {
        rootTasks.push(taskMap.get(task.id)!);
      }
    });

    // 转换为甘特图任务格式
    const convertToGanttTask = (
      task: Task & { children: Task[] }, 
      level: number = 0, 
      projectStartDate: Date
    ): HierarchicalGanttTask => {
      const estimatedHours = task.custom_fields?.estimated_hours || 
        (task.custom_fields?.priority === 'high' ? 6.5 : 
         task.custom_fields?.priority === 'medium' ? 4 : 2.5);
      
      const duration = Math.ceil(estimatedHours / 8); // 8小时工作日
      const startDate = new Date(projectStartDate);
      startDate.setDate(startDate.getDate() + level * 2); // 层级间隔
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + duration);

      const progress = task.status === 'completed' ? 100 : 
                      task.status === 'in_progress' ? Math.floor(Math.random() * 80) + 10 : 0;

      const children = (task.children || []).map(child => 
        convertToGanttTask({ ...child, children: (child as any).children || [] }, level + 1, startDate)
      );

      return {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.custom_fields?.priority || 'medium',
        startDate,
        endDate,
        duration,
        estimatedHours,
        progress,
        dependencies: [],
        level,
        parentId: task.parent_id,
        children,
        isExpanded: level === 0, // 默认展开根级任务
        isVisible: true
      };
    };

    const now = new Date();
    return rootTasks.map(task => convertToGanttTask({ ...task, children: task.children || [] }, 0, now));
  }, []);

  // 展平层级结构为可视化列表（考虑展开状态）
  const flattenHierarchicalTasks = useCallback((
    tasks: HierarchicalGanttTask[], 
    maxLevel: number = 5,
    searchTerm: string = ''
  ): HierarchicalGanttTask[] => {
    const result: HierarchicalGanttTask[] = [];
    
    const traverse = (task: HierarchicalGanttTask) => {
      // 层级过滤
      if (task.level > maxLevel) return;
      
      // 搜索过滤
      if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        // 如果当前任务不匹配，但子任务匹配，则显示当前任务
        const hasMatchingChildren = (t: HierarchicalGanttTask): boolean => {
          return t.children?.some(child => 
            child.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            hasMatchingChildren(child)
          ) || false;
        };
        
        if (!hasMatchingChildren(task)) return;
      }
      
      task.isVisible = true;
      result.push(task);
      
      // 如果任务展开且有子任务，遍历子任务
      if (task.isExpanded && task.children) {
        task.children.forEach(child => traverse(child));
      }
    };
    
    tasks.forEach(task => traverse(task));
    return result;
  }, []);

  // 切换任务展开状态
  const toggleTaskExpanded = useCallback((taskId: number) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });

    // 更新层级任务的展开状态
    const updateExpandedState = (tasks: HierarchicalGanttTask[]): HierarchicalGanttTask[] => {
      return tasks.map(task => ({
        ...task,
        isExpanded: expandedTasks.has(task.id),
        children: task.children ? updateExpandedState(task.children) : undefined
      }));
    };

    setHierarchicalTasks(prev => updateExpandedState(prev));
  }, [expandedTasks]);

  // 处理甘特图数据
  const processedGanttData = useMemo(() => {
    const hierarchical = buildHierarchicalStructure(subtasks);
    
    // 更新展开状态
    const updateExpandedState = (tasks: HierarchicalGanttTask[]): HierarchicalGanttTask[] => {
      return tasks.map(task => ({
        ...task,
        isExpanded: expandedTasks.has(task.id) || task.level === 0,
        children: task.children ? updateExpandedState(task.children) : undefined
      }));
    };

    return updateExpandedState(hierarchical);
  }, [subtasks, buildHierarchicalStructure, expandedTasks]);

  // 获取可见任务列表
  const visibleTasks = useMemo(() => {
    return flattenHierarchicalTasks(processedGanttData, maxLevelFilter, searchTerm);
  }, [processedGanttData, flattenHierarchicalTasks, maxLevelFilter, searchTerm]);

  // 计算统计数据
  const stats = useMemo((): GanttStats => {
    const allTasks = flattenHierarchicalTasks(processedGanttData, 10); // 获取所有任务用于统计
    const totalSubtasks = allTasks.length;
    const completedSubtasks = allTasks.filter(t => t.status === 'completed').length;
    const totalEstimatedHours = allTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    const completionRate = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
    const maxLevel = Math.max(...allTasks.map(t => t.level), 0);

    return {
      totalSubtasks,
      completedSubtasks,
      totalEstimatedHours,
      completionRate,
      maxLevel
    };
  }, [processedGanttData, flattenHierarchicalTasks]);

  // 渲染层级甘特图任务条
  const renderHierarchicalGanttBar = (task: HierarchicalGanttTask, index: number) => {
    const statusConfig = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG];
    const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];
    const hasChildren = task.children && task.children.length > 0;
    const isExpanded = expandedTasks.has(task.id) || task.level === 0;
    
    // 计算缩进
    const indentWidth = task.level * 20;
    
    // 计算时间线位置
    const allTasks = flattenHierarchicalTasks(processedGanttData, 10);
    const minDate = Math.min(...allTasks.map(t => t.startDate.getTime()));
    const maxDate = Math.max(...allTasks.map(t => t.endDate.getTime()));
    const totalDuration = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
    
    const taskStartOffset = Math.ceil((task.startDate.getTime() - minDate) / (1000 * 60 * 60 * 24));
    const taskWidth = (task.duration / Math.max(totalDuration, 1)) * 100;
    const taskLeft = totalDuration > 0 ? (taskStartOffset / totalDuration) * 100 : 0;

    return (
      <div key={task.id} className="hierarchical-gantt-row" style={{
        display: 'flex',
        alignItems: 'center',
        minHeight: '50px',
        borderBottom: '1px solid #eee',
        backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white',
        opacity: task.level > maxLevelFilter ? 0.5 : 1
      }}>
        {/* 任务名称区域（带层级缩进） */}
        <div style={{
          width: '350px',
          padding: '10px',
          fontWeight: task.level === 0 ? 600 : 500,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          paddingLeft: `${10 + indentWidth}px`
        }}>
          {/* 层级连接线 */}
          {task.level > 0 && (
            <>
              {/* 垂直连接线 */}
              <div style={{
                position: 'absolute',
                left: `${10 + (task.level - 1) * 20 + 10}px`,
                top: '-25px',
                width: '1px',
                height: '50px',
                backgroundColor: '#d9d9d9',
                zIndex: 1
              }} />
              {/* 水平连接线 */}
              <div style={{
                position: 'absolute',
                left: `${10 + (task.level - 1) * 20 + 10}px`,
                width: '15px',
                height: '1px',
                backgroundColor: '#d9d9d9',
                top: '50%',
                zIndex: 1
              }} />
            </>
          )}
          
          {/* 展开/折叠按钮 */}
          {hasChildren && (
            <Button
              type="text"
              size="small"
              icon={isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
              onClick={() => toggleTaskExpanded(task.id)}
              style={{
                width: '16px',
                height: '16px',
                padding: 0,
                fontSize: '10px',
                border: '1px solid #d9d9d9',
                borderRadius: '2px'
              }}
            />
          )}
          
          {/* 优先级指示条 */}
          <div style={{
            width: '4px',
            height: '30px',
            borderRadius: '2px',
            backgroundColor: priorityConfig.color,
            marginLeft: hasChildren ? '4px' : '20px'
          }} />
          
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              {statusConfig.icon}
              <Text 
                strong={task.level === 0} 
                style={{ 
                  fontSize: task.level === 0 ? '14px' : '13px',
                  color: task.level > 2 ? '#666' : '#262626'
                }}
              >
                {task.title}
              </Text>
              {/* 层级标识 */}
              <Text type="secondary" style={{ fontSize: '10px' }}>
                L{task.level}
              </Text>
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {priorityConfig.text} | {task.estimatedHours}h
              {hasChildren && (
                <span style={{ marginLeft: '8px', color: '#1890ff' }}>
                  📁 {task.children?.length}项
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 甘特图时间线区域 */}
        <div style={{
          flex: 1,
          position: 'relative',
          height: '40px',
          margin: '5px',
          minWidth: '600px'
        }}>
          <div
            style={{
              position: 'absolute',
              left: `${Math.max(0, taskLeft)}%`,
              width: `${Math.min(taskWidth, 100 - taskLeft)}%`,
              height: task.level === 0 ? '32px' : '26px',
              background: statusConfig.gradient,
              borderRadius: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: 'white',
              fontSize: '12px',
              boxShadow: task.level === 0 ? '0 4px 8px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              border: task.level === 0 ? '3px solid #fff' : `2px solid ${priorityConfig.color}`,
              zIndex: 10 - task.level // 确保父任务在上层
            }}
            title={`${task.title} | 开始: ${dayjs(task.startDate).format('MM/DD')} | 结束: ${dayjs(task.endDate).format('MM/DD')} | 工时: ${task.estimatedHours}h | 层级: L${task.level}`}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {task.estimatedHours}h
          </div>
        </div>

        {/* 时间信息 */}
        <div style={{
          width: '120px',
          padding: '10px',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          <div>{dayjs(task.startDate).format('MM/DD')}</div>
          <div style={{ color: '#666' }}>{task.duration}天</div>
        </div>
      </div>
    );
  };

  // 渲染层级控制面板
  const renderHierarchyControls = () => (
    <div style={{
      marginBottom: '20px',
      padding: '16px',
      background: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e6f7ff'
    }}>
      <Row gutter={16} align="middle">
        <Col span={6}>
          <Space>
            <BranchesOutlined />
            <Text strong>层级控制</Text>
          </Space>
        </Col>
        <Col span={8}>
          <Space align="center">
            <Text>显示层级：</Text>
            <Slider
              min={0}
              max={stats.maxLevel}
              value={maxLevelFilter}
              onChange={setMaxLevelFilter}
              marks={{
                0: 'L0',
                [Math.ceil(stats.maxLevel/2)]: `L${Math.ceil(stats.maxLevel/2)}`,
                [stats.maxLevel]: `L${stats.maxLevel}`
              }}
              style={{ width: 120 }}
              tooltip={{ formatter: (value) => `显示到L${value}层级` }}
            />
            <Text type="secondary">L{maxLevelFilter}</Text>
          </Space>
        </Col>
        <Col span={6}>
          <Space>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                // 展开所有任务
                const allTaskIds = new Set<number>();
                const collectIds = (tasks: HierarchicalGanttTask[]) => {
                  tasks.forEach(task => {
                    if (task.children && task.children.length > 0) {
                      allTaskIds.add(task.id);
                      collectIds(task.children);
                    }
                  });
                };
                collectIds(processedGanttData);
                setExpandedTasks(allTaskIds);
              }}
            >
              全部展开
            </Button>
            <Button
              size="small"
              icon={<EyeInvisibleOutlined />}
              onClick={() => setExpandedTasks(new Set())}
            >
              全部折叠
            </Button>
          </Space>
        </Col>
        <Col span={4}>
          <div style={{ textAlign: 'right' }}>
            <Text type="secondary">
              显示 {visibleTasks.length}/{stats.totalSubtasks} 项任务
            </Text>
          </div>
        </Col>
      </Row>
    </div>
  );

  useEffect(() => {
    loadSubtasks();
  }, [parentTask.id, projectId]);

  useEffect(() => {
    setHierarchicalTasks(processedGanttData);
  }, [processedGanttData]);

  if (loading) {
    return (
      <Card style={style}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text>正在生成层级甘特图...</Text>
          </div>
        </div>
      </Card>
    );
  }

  if (subtasks.length === 0) {
    return (
      <Card 
        title={
          <Space>
            <BranchesOutlined />
            <span>🎯 层级甘特图</span>
          </Space>
        }
        style={style}
      >
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          borderRadius: '8px'
        }}>
          <BranchesOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
          <Title level={4} style={{ color: '#8c8c8c' }}>暂无子任务数据</Title>
          <Text type="secondary">创建子任务后，这里将显示层级甘特图</Text>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <BranchesOutlined />
          <span>🎯 层级甘特图：{parentTask.title}</span>
          <Badge count={stats.maxLevel + 1} title="层级深度" />
        </Space>
      }
      extra={
        <Space>
          <Button size="small" icon={<ReloadOutlined />} onClick={loadSubtasks}>
            刷新
          </Button>
          <Tooltip title={isGanttFullscreen ? '退出全屏' : '全屏查看'}>
            <Button 
              size="small" 
              icon={isGanttFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} 
              onClick={() => setIsGanttFullscreen(!isGanttFullscreen)}
            >
              {isGanttFullscreen ? '退出全屏' : '全屏'}
            </Button>
          </Tooltip>
        </Space>
      }
      style={{
        ...style,
        ...(isGanttFullscreen ? {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          margin: 0,
          borderRadius: 0,
          height: '100vh',
          overflow: 'auto'
        } : {})
      }}
    >
      {/* 统计数据 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        marginBottom: '20px',
        background: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#3498db' }}>
            {stats.totalSubtasks}
          </div>
          <div style={{ color: '#7f8c8d', marginTop: '5px' }}>总任务数</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#27ae60' }}>
            {stats.completedSubtasks}
          </div>
          <div style={{ color: '#7f8c8d', marginTop: '5px' }}>已完成</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#f39c12' }}>
            {stats.totalEstimatedHours.toFixed(1)}h
          </div>
          <div style={{ color: '#7f8c8d', marginTop: '5px' }}>预估总工时</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#e74c3c' }}>
            {stats.completionRate}%
          </div>
          <div style={{ color: '#7f8c8d', marginTop: '5px' }}>完成进度</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#9b59b6' }}>
            L{stats.maxLevel}
          </div>
          <div style={{ color: '#7f8c8d', marginTop: '5px' }}>最大层级</div>
        </div>
      </div>

      {/* 层级控制面板 */}
      {renderHierarchyControls()}

      {/* 甘特图容器 */}
      <div style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        background: 'white',
        overflow: 'auto'
      }}>
        {/* 表头 */}
        <div style={{
          background: '#34495e',
          color: 'white',
          padding: '15px',
          fontWeight: 'bold',
          display: 'flex'
        }}>
          <div style={{ width: '350px' }}>📋 任务层级结构</div>
          <div style={{ flex: 1, minWidth: '600px' }}>⏰ 时间线 (层级甘特图)</div>
          <div style={{ width: '120px', textAlign: 'center' }}>📅 工期</div>
        </div>

        {/* 任务行 */}
        {visibleTasks.map((task, index) => renderHierarchicalGanttBar(task, index))}
      </div>

      {/* 图例 */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '30px',
        marginTop: '20px',
        padding: '15px',
        background: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BranchesOutlined style={{ color: '#1890ff' }} />
          <span>🎯 层级甘特图</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🔥 高优先级 | ⚡ 中优先级 | 💡 低优先级</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>L0-L{stats.maxLevel}: 任务层级深度</span>
        </div>
      </div>

      <div style={{
        marginTop: '20px',
        textAlign: 'center',
        color: '#7f8c8d',
        fontSize: '14px'
      }}>
        🎯 层级关系可视化甘特图 | 支持{stats.maxLevel + 1}级任务层级 | 智能展开折叠管理
      </div>
    </Card>
  );
};

export default HierarchicalGanttChart;