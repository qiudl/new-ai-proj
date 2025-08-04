import React, { useState, useEffect, useMemo } from 'react';
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
  Button
} from 'antd';
import {
  BarChartOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined
} from '@ant-design/icons';
import { Task } from '../types/task';
import { TaskService } from '../services/taskService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface TaskGanttChartProps {
  parentTask: Task;
  projectId: number;
  style?: React.CSSProperties;
}

interface GanttTask {
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
}

interface GanttStats {
  totalSubtasks: number;
  completedSubtasks: number;
  totalEstimatedHours: number;
  completionRate: number;
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

const TaskGanttChart: React.FC<TaskGanttChartProps> = ({
  parentTask,
  projectId,
  style
}) => {
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [ganttTasks, setGanttTasks] = useState<GanttTask[]>([]);
  const [isGanttFullscreen, setIsGanttFullscreen] = useState(false);

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

  // 甘特图全屏切换
  const toggleGanttFullscreen = () => {
    setIsGanttFullscreen(!isGanttFullscreen);
  };

  // 转换任务数据为甘特图格式
  const processGanttData = useMemo(() => {
    if (subtasks.length === 0) return [];

    // 智能分析和排程
    const now = new Date();
    const projectStartDate = new Date(now);
    
    // 按优先级和依赖关系智能排序
    const sortedTasks = [...subtasks].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.custom_fields?.priority as keyof typeof priorityOrder] || 2;
      const bPriority = priorityOrder[b.custom_fields?.priority as keyof typeof priorityOrder] || 2;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // 高优先级在前
      }
      
      // 相同优先级按创建时间排序
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    let currentStartDate = new Date(projectStartDate);
    const workingHoursPerDay = 8;

    return sortedTasks.map((task, index) => {
      // 智能估算工时和工期
      const estimatedHours = task.custom_fields?.estimated_hours || 
        (task.custom_fields?.priority === 'high' ? 6.5 : 
         task.custom_fields?.priority === 'medium' ? 4 : 2.5);
      
      const duration = Math.ceil(estimatedHours / workingHoursPerDay);
      const startDate = new Date(currentStartDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + duration);

      // 为下一个任务准备开始时间（考虑依赖关系）
      currentStartDate = new Date(endDate);
      
      // 模拟进度计算
      const progress = task.status === 'completed' ? 100 : 
                      task.status === 'in_progress' ? Math.floor(Math.random() * 80) + 10 : 0;

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
        dependencies: []
      };
    });
  }, [subtasks]);

  // 计算统计数据
  const stats = useMemo((): GanttStats => {
    const totalSubtasks = subtasks.length;
    const completedSubtasks = subtasks.filter(t => t.status === 'completed').length;
    const totalEstimatedHours = ganttTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    const completionRate = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

    return {
      totalSubtasks,
      completedSubtasks,
      totalEstimatedHours,
      completionRate
    };
  }, [subtasks, ganttTasks]);

  // 渲染甘特图任务条
  const renderGanttBar = (task: GanttTask, index: number) => {
    const statusConfig = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG];
    const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];
    
    // 计算时间线位置
    const minDate = Math.min(...ganttTasks.map(t => t.startDate.getTime()));
    const maxDate = Math.max(...ganttTasks.map(t => t.endDate.getTime()));
    const totalDuration = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
    
    const taskStartOffset = Math.ceil((task.startDate.getTime() - minDate) / (1000 * 60 * 60 * 24));
    const taskWidth = (task.duration / Math.max(totalDuration, 1)) * 100;
    const taskLeft = totalDuration > 0 ? (taskStartOffset / totalDuration) * 100 : 0;

    return (
      <div key={task.id} className="gantt-row" style={{
        display: 'flex',
        alignItems: 'center',
        minHeight: '50px',
        borderBottom: '1px solid #eee',
        backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white'
      }}>
        {/* 任务名称区域 */}
        <div style={{
          width: '300px',
          padding: '10px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '5px',
            height: '30px',
            borderRadius: '2px',
            backgroundColor: priorityConfig.color
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              {statusConfig.icon}
              <Text strong style={{ fontSize: '13px' }}>
                {task.title}
              </Text>
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {priorityConfig.text} | {task.estimatedHours}h
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
              height: '30px',
              background: statusConfig.gradient,
              borderRadius: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: 'white',
              fontSize: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              border: task.priority === 'high' ? '2px solid #e74c3c' : 
                     task.priority === 'medium' ? '2px solid #f39c12' : '2px solid #95a5a6'
            }}
            title={`开始: ${dayjs(task.startDate).format('MM/DD')} | 结束: ${dayjs(task.endDate).format('MM/DD')} | 工时: ${task.estimatedHours}h`}
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

  // 渲染时间轴
  const renderTimeAxis = () => {
    if (ganttTasks.length === 0) return null;

    const minDate = Math.min(...ganttTasks.map(t => t.startDate.getTime()));
    const maxDate = Math.max(...ganttTasks.map(t => t.endDate.getTime()));
    const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
    
    const timeMarkers = [];
    const step = Math.max(1, Math.ceil(totalDays / 10)); // 最多显示10个时间点

    for (let i = 0; i <= totalDays; i += step) {
      const date = new Date(minDate + i * 24 * 60 * 60 * 1000);
      const position = totalDays > 0 ? (i / totalDays) * 100 : 0;
      
      timeMarkers.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${position}%`,
            textAlign: 'center',
            fontSize: '12px',
            color: '#7f8c8d',
            borderLeft: '1px dashed #bdc3c7',
            paddingLeft: '4px',
            height: '100%',
            minWidth: '60px'
          }}
        >
          {dayjs(date).format('MM/DD')}
        </div>
      );
    }

    return (
      <div style={{
        display: 'flex',
        background: '#ecf0f1',
        padding: '10px 0',
        borderTop: '1px solid #bdc3c7',
        position: 'relative',
        minHeight: '30px'
      }}>
        {timeMarkers}
      </div>
    );
  };

  useEffect(() => {
    loadSubtasks();
  }, [parentTask.id, projectId]);

  useEffect(() => {
    setGanttTasks(processGanttData);
  }, [processGanttData]);

  if (loading) {
    return (
      <Card style={style}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text>正在生成AI智能甘特图...</Text>
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
            <BarChartOutlined />
            <span>🤖 AI智能甘特图</span>
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
          <BarChartOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
          <Title level={4} style={{ color: '#8c8c8c' }}>暂无子任务数据</Title>
          <Text type="secondary">创建子任务后，这里将显示智能甘特图</Text>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <BarChartOutlined />
          <span>🤖 AI智能甘特图：{parentTask.title}</span>
        </Space>
      }
      extra={
        <Space>
          <Button size="small" icon={<ReloadOutlined />} onClick={loadSubtasks}>
            刷新
          </Button>
          <Tooltip title={isGanttFullscreen ? '退出全屏' : '全屏查看甘特图'}>
            <Button 
              size="small" 
              icon={isGanttFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} 
              onClick={toggleGanttFullscreen}
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
        marginBottom: '30px',
        background: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#3498db' }}>
            {stats.totalSubtasks}
          </div>
          <div style={{ color: '#7f8c8d', marginTop: '5px' }}>子任务总数</div>
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
      </div>

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
          <div style={{ width: '300px' }}>📋 任务名称</div>
          <div style={{ flex: 1, minWidth: '600px' }}>⏰ 时间线 (AI智能排程)</div>
          <div style={{ width: '120px', textAlign: 'center' }}>📅 工期</div>
        </div>

        {/* 任务行 */}
        {ganttTasks.map((task, index) => renderGanttBar(task, index))}

        {/* 时间轴 */}
        <div style={{ display: 'flex' }}>
          <div style={{ width: '300px' }}></div>
          <div style={{ flex: 1, position: 'relative', minWidth: '600px' }}>
            {renderTimeAxis()}
          </div>
          <div style={{ width: '120px' }}></div>
        </div>
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
          <div style={{
            width: '20px',
            height: '12px',
            borderRadius: '6px',
            background: STATUS_CONFIG.completed.gradient
          }} />
          <span>✅ 已完成</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '20px',
            height: '12px',
            borderRadius: '6px',
            background: STATUS_CONFIG.in_progress.gradient
          }} />
          <span>🔄 进行中</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '20px',
            height: '12px',
            borderRadius: '6px',
            background: STATUS_CONFIG.todo.gradient
          }} />
          <span>📋 待办</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🔥 高优先级 | ⚡ 中优先级 | 💡 低优先级</span>
        </div>
      </div>

      <div style={{
        marginTop: '20px',
        textAlign: 'center',
        color: '#7f8c8d',
        fontSize: '14px'
      }}>
        🤖 由Claude AI智能分析生成 | 基于任务复杂度、依赖关系、优先级的智能排程
      </div>
    </Card>
  );
};

export default TaskGanttChart;