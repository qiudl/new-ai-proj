import React, { useState, useMemo } from 'react';
import { Button, Space, DatePicker, Typography } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { TaskTimeEntry } from '../services/weeklyReportService';
import '../utils/dayjs'; // 确保dayjs插件已加载
import './EnhancedTimeline.css';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface EnhancedTimelineProps {
  taskTimeEntries: TaskTimeEntry[];
  dateRange?: [Dayjs, Dayjs];
  onDateRangeChange?: (dates: [Dayjs, Dayjs]) => void;
}

type TaskStatus = 'completed' | 'in_progress' | 'todo';
type FilterType = 'all' | TaskStatus;

const EnhancedTimeline: React.FC<EnhancedTimelineProps> = ({
  taskTimeEntries,
  dateRange,
  onDateRangeChange
}) => {
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all');
  const [isGroupedByProject, setIsGroupedByProject] = useState(false);
  const [internalDateRange, setInternalDateRange] = useState<[Dayjs, Dayjs]>(
    dateRange || [dayjs().subtract(6, 'day'), dayjs()]
  );

  // 处理日期范围变化
  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      const newRange: [Dayjs, Dayjs] = [dates[0], dates[1]];
      setInternalDateRange(newRange);
      onDateRangeChange?.(newRange);
    }
  };

  // 重置到最近7天
  const resetToRecentDays = () => {
    const newRange: [Dayjs, Dayjs] = [dayjs().subtract(6, 'day'), dayjs()];
    setInternalDateRange(newRange);
    onDateRangeChange?.(newRange);
  };

  // 过滤任务
  const filteredTasks = useMemo(() => {
    let filtered = taskTimeEntries;
    
    if (currentFilter !== 'all') {
      filtered = filtered.filter(task => task.status === currentFilter);
    }

    return filtered;
  }, [taskTimeEntries, currentFilter]);

  // 生成日期范围
  const dateList = useMemo(() => {
    const dates: Dayjs[] = [];
    const current = internalDateRange[0].clone();
    const end = internalDateRange[1];
    
    while (current.isSameOrBefore(end)) {
      dates.push(current.clone());
      current.add(1, 'day');
    }
    
    return dates;
  }, [internalDateRange]);

  // 按日期分组任务
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, TaskTimeEntry[]> = {};
    
    dateList.forEach(date => {
      const dateStr = date.format('YYYY-MM-DD');
      grouped[dateStr] = filteredTasks.filter(task => 
        dayjs(task.date).format('YYYY-MM-DD') === dateStr
      );
    });
    
    return grouped;
  }, [dateList, filteredTasks]);

  // 统计信息
  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(task => task.status === 'completed').length;
    const totalHours = filteredTasks.reduce((sum, task) => sum + task.duration, 0);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, totalHours, completionRate };
  }, [filteredTasks]);

  // 渲染任务项
  const renderTaskItem = (task: TaskTimeEntry) => {
    const handleTaskClick = () => {
      // 修复路由路径，使用正确的任务详情页面路径
      window.open(`/tasks/${task.id}`, '_blank');
    };

    const statusIcon = task.status === 'completed' ? '✓' : 
                      task.status === 'in_progress' ? '⚡' : '○';

    return (
      <div
        key={task.id}
        className={`enhanced-timeline-task-item ${task.status}`}
        onClick={handleTaskClick}
      >
        <div className={`enhanced-timeline-task-status ${task.status}`}>
          {statusIcon}
        </div>
        <div className="enhanced-timeline-task-info">
          <div className="enhanced-timeline-task-title">
            <span className="enhanced-timeline-task-id">#{task.id}</span>
            {task.taskTitle}
          </div>
          <div className="enhanced-timeline-task-meta">
            <span className="enhanced-timeline-task-time">
              {task.startTime ? dayjs(task.startTime).format('HH:mm') : '--:--'}
            </span>
            <span className="enhanced-timeline-task-duration">{task.duration.toFixed(1)}h</span>
            {!isGroupedByProject && (
              <span className="enhanced-timeline-task-project">{task.projectName}</span>
            )}
            <span className={`enhanced-timeline-priority-badge priority-${task.priority}`}>
              {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // 按项目分组渲染任务
  const renderTasksGroupedByProject = (tasks: TaskTimeEntry[]) => {
    const projectGroups = tasks.reduce((groups, task) => {
      const project = task.projectName;
      if (!groups[project]) {
        groups[project] = [];
      }
      groups[project].push(task);
      return groups;
    }, {} as Record<string, TaskTimeEntry[]>);

    return Object.entries(projectGroups).map(([project, projectTasks]) => (
      <div key={project} className="enhanced-timeline-project-group">
        <div className="enhanced-timeline-project-header">
          {project}
          <span className="enhanced-timeline-project-count">{projectTasks.length}个任务</span>
        </div>
        {projectTasks.map(task => renderTaskItem(task))}
      </div>
    ));
  };

  // 平铺渲染任务
  const renderTasksFlat = (tasks: TaskTimeEntry[]) => {
    return tasks.map(task => renderTaskItem(task));
  };

  return (
    <div className="enhanced-timeline-container">
      {/* 控制栏 */}
      <div className="enhanced-timeline-controls">
        <div className="enhanced-timeline-filter-buttons">
          <Button
            type={currentFilter === 'all' ? 'primary' : 'default'}
            size="small"
            onClick={() => setCurrentFilter('all')}
          >
            全部
          </Button>
          <Button
            type={currentFilter === 'completed' ? 'primary' : 'default'}
            size="small"
            onClick={() => setCurrentFilter('completed')}
          >
            已完成
          </Button>
          <Button
            type={currentFilter === 'in_progress' ? 'primary' : 'default'}
            size="small"
            onClick={() => setCurrentFilter('in_progress')}
          >
            进行中
          </Button>
          <Button
            type={currentFilter === 'todo' ? 'primary' : 'default'}
            size="small"
            onClick={() => setCurrentFilter('todo')}
          >
            待办
          </Button>
          <Button
            type={isGroupedByProject ? 'primary' : 'default'}
            size="small"
            onClick={() => setIsGroupedByProject(!isGroupedByProject)}
          >
            {isGroupedByProject ? '取消分组' : '按项目分组'}
          </Button>
        </div>
        <div className="enhanced-timeline-date-range">
          <Space size="small">
            <Text type="secondary" style={{ fontSize: '12px' }}>日期范围:</Text>
            <RangePicker
              size="small"
              value={internalDateRange}
              onChange={handleDateRangeChange}
              format="YYYY-MM-DD"
              allowClear={false}
            />
            <Button size="small" onClick={resetToRecentDays}>
              最近7天
            </Button>
          </Space>
        </div>
      </div>

      {/* 时间轴主体 */}
      <div className="enhanced-timeline-main">
        <div className="enhanced-timeline">
          {/* 左侧日期轴 */}
          <div className="enhanced-timeline-date-axis">
            {dateList.map(date => {
              const isToday = date.isSame(dayjs(), 'day');
              const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
              const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
              
              return (
                <div
                  key={date.format('YYYY-MM-DD')}
                  className={`enhanced-timeline-date-item ${isToday ? 'today' : ''}`}
                >
                  <div className="enhanced-timeline-date-day">
                    {dayNames[date.day()]}
                  </div>
                  <div className="enhanced-timeline-date-number">
                    {date.date()}
                  </div>
                  <div className="enhanced-timeline-date-month">
                    {monthNames[date.month()]}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 右侧任务内容区 */}
          <div className="enhanced-timeline-tasks-content">
            {dateList.map(date => {
              const dateStr = date.format('YYYY-MM-DD');
              const dayTasks = tasksByDate[dateStr] || [];
              
              return (
                <div
                  key={dateStr}
                  className="enhanced-timeline-date-section"
                >
                  <div className="enhanced-timeline-task-list">
                    {dayTasks.length > 0 ? (
                      isGroupedByProject 
                        ? renderTasksGroupedByProject(dayTasks)
                        : renderTasksFlat(dayTasks)
                    ) : (
                      <div className="enhanced-timeline-empty-date">暂无任务</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部统计栏 */}
        <div className="enhanced-timeline-stats-bar">
          <div className="enhanced-timeline-stats-item">
            <Text type="secondary">总任务:</Text>
            <Text strong>{stats.total}</Text>
          </div>
          <div className="enhanced-timeline-stats-item">
            <Text type="secondary">已完成:</Text>
            <Text strong>{stats.completed}</Text>
          </div>
          <div className="enhanced-timeline-stats-item">
            <Text type="secondary">总时长:</Text>
            <Text strong>{stats.totalHours.toFixed(1)}h</Text>
          </div>
          <div className="enhanced-timeline-stats-item">
            <Text type="secondary">完成率:</Text>
            <Text strong>{stats.completionRate}%</Text>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedTimeline;