import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  DatePicker, 
  Typography, 
  Tag, 
  Tooltip, 
  Empty, 
  Spin, 
  Badge,
  Select,
  Input,
  message 
} from 'antd';
import { 
  CalendarOutlined, 
  FilterOutlined, 
  SearchOutlined,
  ReloadOutlined,
  BulbOutlined,
  ClockCircleOutlined 
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { TaskTimeEntry } from '../services/weeklyReportService';
import { TimelineEvent, TimelineFilter, timelineService } from '../services/timelineService';
import '../utils/dayjs';
import './EnhancedTaskTimeline.css';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { Search } = Input;

interface EnhancedTaskTimelineProps {
  taskTimeEntries: TaskTimeEntry[];
  dateRange?: [Dayjs, Dayjs];
  onDateRangeChange?: (dates: [Dayjs, Dayjs]) => void;
  projectId?: number;
  taskIds?: number[];
}

interface CombinedTimelineItem {
  type: 'task' | 'event';
  id: string;
  date: string;
  time: string;
  taskId: number;
  taskTitle: string;
  description: string;
  status?: 'completed' | 'in_progress' | 'todo';
  priority?: 'high' | 'medium' | 'low';
  duration?: number;
  eventType?: string;
  severity?: 'info' | 'warning' | 'error' | 'success';
  category?: 'user' | 'system' | 'timer' | 'status';
  projectName?: string;
  username?: string;
  metadata?: Record<string, any>;
}

const EnhancedTaskTimeline: React.FC<EnhancedTaskTimelineProps> = ({
  taskTimeEntries = [],
  dateRange,
  onDateRangeChange,
  projectId = 1,
  taskIds
}) => {
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [selectedView, setSelectedView] = useState<'combined' | 'tasks' | 'events'>('combined');
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // 过滤器状态
  const [eventTypeFilter, setEventTypeFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);

  // 内部日期范围状态
  const [internalDateRange, setInternalDateRange] = useState<[Dayjs, Dayjs]>(
    dateRange || [dayjs().subtract(6, 'day'), dayjs()]
  );

  // 获取时间轴事件数据
  const fetchTimelineEvents = useCallback(async () => {
    if (!taskIds || taskIds.length === 0) {
      setTimelineEvents([]);
      return;
    }

    setLoading(true);
    try {
      const filter: TimelineFilter = {
        startDate: internalDateRange[0].format('YYYY-MM-DD'),
        endDate: internalDateRange[1].format('YYYY-MM-DD'),
        eventTypes: eventTypeFilter.length > 0 ? eventTypeFilter : undefined,
        categories: categoryFilter.length > 0 ? categoryFilter : undefined,
        severities: severityFilter.length > 0 ? severityFilter : undefined,
        pageSize: 200, // 获取足够多的事件
        sortBy: 'event_date',
        sortOrder: 'desc'
      };

      const events = await timelineService.getTasksTimeline(taskIds, filter);
      setTimelineEvents(events);
    } catch (error) {
      console.error('获取时间轴事件失败:', error);
      setTimelineEvents([]); // 设置为空数组避免界面异常
      // 移除message.error避免过多弹窗
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(taskIds), internalDateRange[0].format('YYYY-MM-DD'), internalDateRange[1].format('YYYY-MM-DD'), JSON.stringify(eventTypeFilter), JSON.stringify(categoryFilter), JSON.stringify(severityFilter)]);

  // 页面加载和筛选条件变化时重新获取数据
  useEffect(() => {
    // 添加延迟避免频繁调用
    const timer = setTimeout(() => {
      fetchTimelineEvents();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [fetchTimelineEvents]);

  // 处理日期范围变化
  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      const newRange: [Dayjs, Dayjs] = [dates[0], dates[1]];
      setInternalDateRange(newRange);
      onDateRangeChange?.(newRange);
    }
  };

  // 合并任务记录和时间轴事件
  const combinedItems = useMemo(() => {
    const items: CombinedTimelineItem[] = [];

    // 转换任务时间记录
    if (selectedView === 'combined' || selectedView === 'tasks') {
      taskTimeEntries.forEach(task => {
        items.push({
          type: 'task',
          id: `task-${task.id}`,
          date: task.date,
          time: task.startTime ? dayjs(task.startTime).format('HH:mm') : '--:--',
          taskId: parseInt(task.id) || 0,
          taskTitle: task.taskTitle,
          description: `执行任务 ${task.duration.toFixed(1)} 小时`,
          status: task.status,
          priority: task.priority,
          duration: task.duration,
          projectName: task.projectName,
          username: '用户'
        });
      });
    }

    // 转换时间轴事件
    if (selectedView === 'combined' || selectedView === 'events') {
      timelineEvents.forEach(event => {
        items.push({
          type: 'event',
          id: `event-${event.id}`,
          date: dayjs(event.eventDate).format('YYYY-MM-DD'),
          time: dayjs(event.eventDate).format('HH:mm'),
          taskId: event.taskId,
          taskTitle: `任务 #${event.taskId}`,
          description: event.description,
          eventType: event.eventType,
          severity: event.severity,
          category: event.category,
          username: event.username,
          metadata: event.metadata
        });
      });
    }

    // 按日期和时间排序
    return items.sort((a, b) => {
      const aDateTime = `${a.date} ${a.time}`;
      const bDateTime = `${b.date} ${b.time}`;
      return bDateTime.localeCompare(aDateTime);
    });
  }, [taskTimeEntries, timelineEvents, selectedView]);

  // 应用文本搜索过滤
  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return combinedItems;
    
    const search = searchText.toLowerCase();
    return combinedItems.filter(item => 
      item.taskTitle.toLowerCase().includes(search) ||
      item.description.toLowerCase().includes(search) ||
      (item.username && item.username.toLowerCase().includes(search)) ||
      (item.projectName && item.projectName.toLowerCase().includes(search))
    );
  }, [combinedItems, searchText]);

  // 应用其他过滤器
  const finalFilteredItems = useMemo(() => {
    return filteredItems.filter(item => {
      // 状态过滤
      if (statusFilter.length > 0 && item.status && !statusFilter.includes(item.status)) {
        return false;
      }
      
      // 优先级过滤  
      if (priorityFilter.length > 0 && item.priority && !priorityFilter.includes(item.priority)) {
        return false;
      }

      return true;
    });
  }, [filteredItems, statusFilter, priorityFilter]);

  // 按日期分组
  const itemsByDate = useMemo(() => {
    const grouped: Record<string, CombinedTimelineItem[]> = {};
    
    // 生成日期列表 - 添加安全检查防止无限循环
    const startDate = internalDateRange[0].clone();
    const endDate = internalDateRange[1];
    const current = startDate.clone();
    
    // 防止日期范围过大导致性能问题
    const maxDays = 365; // 最多处理365天
    let dayCount = 0;
    
    while (current.isSameOrBefore(endDate) && dayCount < maxDays) {
      const dateStr = current.format('YYYY-MM-DD');
      grouped[dateStr] = [];
      current.add(1, 'day');
      dayCount++;
    }
    
    // 按日期分组项目
    finalFilteredItems.forEach(item => {
      if (item.date && grouped[item.date]) {
        grouped[item.date].push(item);
      }
    });
    
    return grouped;
  }, [finalFilteredItems, internalDateRange[0].format('YYYY-MM-DD'), internalDateRange[1].format('YYYY-MM-DD')]);

  // 获取事件类型标签颜色
  const getEventTypeColor = (eventType: string) => {
    const colorMap: Record<string, string> = {
      'task_created': 'blue',
      'task_updated': 'cyan',
      'task_status_changed': 'purple',
      'task_completed': 'green',
      'timer_started': 'orange',
      'timer_stopped': 'red',
      'timer_paused': 'yellow',
      'timer_resumed': 'orange'
    };
    return colorMap[eventType] || 'default';
  };

  // 获取严重性颜色
  const getSeverityColor = (severity: string) => {
    const colorMap: Record<string, string> = {
      'info': '#1890ff',
      'success': '#52c41a',
      'warning': '#faad14',
      'error': '#ff4d4f'
    };
    return colorMap[severity] || '#1890ff';
  };

  // 渲染时间线项目
  const renderTimelineItem = (item: CombinedTimelineItem) => {
    const handleItemClick = () => {
      window.open(`/tasks/${item.taskId}`, '_blank');
    };

    return (
      <div
        key={item.id}
        className={`enhanced-timeline-item ${item.type} ${item.severity || 'info'}`}
        onClick={handleItemClick}
      >
        <div className="enhanced-timeline-item-marker">
          {item.type === 'task' ? (
            <div className={`task-marker ${item.status}`}>
              {item.status === 'completed' ? '✓' : 
               item.status === 'in_progress' ? '⚡' : '○'}
            </div>
          ) : (
            <div 
              className="event-marker" 
              style={{ backgroundColor: getSeverityColor(item.severity || 'info') }}
            >
              {timelineService.getEventTypeIcon(item.eventType || 'task_updated')}
            </div>
          )}
        </div>
        
        <div className="enhanced-timeline-item-content">
          <div className="enhanced-timeline-item-header">
            <div className="enhanced-timeline-item-title">
              <span className="task-id">#{item.taskId}</span>
              {item.taskTitle}
            </div>
            <div className="enhanced-timeline-item-time">
              {item.time}
            </div>
          </div>
          
          <div className="enhanced-timeline-item-description">
            {item.description}
          </div>
          
          <div className="enhanced-timeline-item-meta">
            {item.type === 'task' && (
              <>
                {item.duration && (
                  <Tag icon={<ClockCircleOutlined />} color="blue">
                    {item.duration.toFixed(1)}h
                  </Tag>
                )}
                {item.priority && (
                  <Tag color={item.priority === 'high' ? 'red' : item.priority === 'medium' ? 'orange' : 'green'}>
                    {item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'}优先级
                  </Tag>
                )}
                {item.projectName && (
                  <Tag color="purple">{item.projectName}</Tag>
                )}
              </>
            )}
            
            {item.type === 'event' && (
              <>
                {item.eventType && (
                  <Tag color={getEventTypeColor(item.eventType)}>
                    {timelineService.getEventTypeLabel(item.eventType)}
                  </Tag>
                )}
                {item.category && (
                  <Tag color="cyan">{item.category}</Tag>
                )}
              </>
            )}
            
            {item.username && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                by {item.username}
              </Text>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 统计信息
  const stats = useMemo(() => {
    const total = finalFilteredItems.length;
    const tasks = finalFilteredItems.filter(item => item.type === 'task').length;
    const events = finalFilteredItems.filter(item => item.type === 'event').length;
    const completedTasks = finalFilteredItems.filter(item => item.type === 'task' && item.status === 'completed').length;
    const totalHours = finalFilteredItems
      .filter(item => item.type === 'task' && item.duration)
      .reduce((sum, item) => sum + (item.duration || 0), 0);

    return { total, tasks, events, completedTasks, totalHours };
  }, [finalFilteredItems]);

  return (
    <div className="enhanced-task-timeline-container">
      {/* 控制栏 */}
      <Card size="small" className="enhanced-timeline-controls-card">
        <div className="enhanced-timeline-controls">
          <div className="enhanced-timeline-controls-left">
            <Space wrap>
              <Select
                value={selectedView}
                onChange={setSelectedView}
                style={{ width: 120 }}
                size="small"
              >
                <Option value="combined">全部</Option>
                <Option value="tasks">任务记录</Option>
                <Option value="events">事件记录</Option>
              </Select>
              
              <Search
                placeholder="搜索任务或描述"
                style={{ width: 200 }}
                size="small"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
              
              <Button
                type={showFilters ? 'primary' : 'default'}
                size="small"
                icon={<FilterOutlined />}
                onClick={() => setShowFilters(!showFilters)}
              >
                过滤器
              </Button>
              
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={fetchTimelineEvents}
                loading={loading}
              >
                刷新
              </Button>
            </Space>
          </div>

          <div className="enhanced-timeline-controls-right">
            <Space size="small">
              <Text type="secondary" style={{ fontSize: '12px' }}>日期范围:</Text>
              <RangePicker
                size="small"
                value={internalDateRange}
                onChange={handleDateRangeChange}
                format="MM-DD"
                allowClear={false}
              />
              <Button 
                size="small" 
                onClick={() => {
                  const newRange: [Dayjs, Dayjs] = [dayjs().subtract(6, 'day'), dayjs()];
                  setInternalDateRange(newRange);
                  onDateRangeChange?.(newRange);
                }}
              >
                最近7天
              </Button>
            </Space>
          </div>
        </div>

        {/* 扩展过滤器 */}
        {showFilters && (
          <div className="enhanced-timeline-extended-filters">
            <Space wrap>
              <div>
                <Text type="secondary">状态:</Text>
                <Select
                  mode="multiple"
                  placeholder="选择状态"
                  style={{ width: 150, marginLeft: 8 }}
                  size="small"
                  value={statusFilter}
                  onChange={setStatusFilter}
                >
                  <Option value="completed">已完成</Option>
                  <Option value="in_progress">进行中</Option>
                  <Option value="todo">待办</Option>
                </Select>
              </div>

              <div>
                <Text type="secondary">优先级:</Text>
                <Select
                  mode="multiple"
                  placeholder="选择优先级"
                  style={{ width: 150, marginLeft: 8 }}
                  size="small"
                  value={priorityFilter}
                  onChange={setPriorityFilter}
                >
                  <Option value="high">高</Option>
                  <Option value="medium">中</Option>
                  <Option value="low">低</Option>
                </Select>
              </div>

              {(selectedView === 'combined' || selectedView === 'events') && (
                <>
                  <div>
                    <Text type="secondary">事件类型:</Text>
                    <Select
                      mode="multiple"
                      placeholder="选择事件类型"
                      style={{ width: 200, marginLeft: 8 }}
                      size="small"
                      value={eventTypeFilter}
                      onChange={setEventTypeFilter}
                    >
                      <Option value="task_created">任务创建</Option>
                      <Option value="task_updated">任务更新</Option>
                      <Option value="task_status_changed">状态变更</Option>
                      <Option value="task_completed">任务完成</Option>
                      <Option value="timer_started">开始计时</Option>
                      <Option value="timer_stopped">停止计时</Option>
                    </Select>
                  </div>

                  <div>
                    <Text type="secondary">事件类别:</Text>
                    <Select
                      mode="multiple"
                      placeholder="选择类别"
                      style={{ width: 150, marginLeft: 8 }}
                      size="small"
                      value={categoryFilter}
                      onChange={setCategoryFilter}
                    >
                      <Option value="user">用户操作</Option>
                      <Option value="system">系统事件</Option>
                      <Option value="timer">计时器</Option>
                      <Option value="status">状态变更</Option>
                    </Select>
                  </div>
                </>
              )}
            </Space>
          </div>
        )}
      </Card>

      {/* 统计信息栏 */}
      <Card size="small" className="enhanced-timeline-stats-card">
        <div className="enhanced-timeline-stats">
          <Space size="large">
            <div className="stat-item">
              <Text type="secondary">总记录:</Text>
              <Text strong>{stats.total}</Text>
            </div>
            <div className="stat-item">
              <Text type="secondary">任务记录:</Text>
              <Text strong>{stats.tasks}</Text>
            </div>
            <div className="stat-item">
              <Text type="secondary">事件记录:</Text>
              <Text strong>{stats.events}</Text>
            </div>
            <div className="stat-item">
              <Text type="secondary">已完成:</Text>
              <Text strong>{stats.completedTasks}</Text>
            </div>
            <div className="stat-item">
              <Text type="secondary">总时长:</Text>
              <Text strong>{stats.totalHours.toFixed(1)}h</Text>
            </div>
          </Space>
        </div>
      </Card>

      {/* 时间轴主体 */}
      <div className="enhanced-timeline-main">
        <Spin spinning={loading}>
          {Object.keys(itemsByDate).length === 0 ? (
            <Empty 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无时间轴数据"
              style={{ margin: '40px 0' }}
            />
          ) : (
            <div className="enhanced-timeline">
              {Object.entries(itemsByDate).map(([date, items]) => (
                <div key={date} className="enhanced-timeline-date-section">
                  <div className="enhanced-timeline-date-header">
                    <div className="enhanced-timeline-date-info">
                      <Text strong className="date-text">
                        {dayjs(date).format('MM月DD日')}
                      </Text>
                      <Text type="secondary" className="weekday-text">
                        {dayjs(date).format('dddd')}
                      </Text>
                      {dayjs(date).isSame(dayjs(), 'day') && (
                        <Badge status="processing" text="今天" />
                      )}
                    </div>
                    <div className="enhanced-timeline-date-stats">
                      {items.length > 0 && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {items.length} 项记录
                        </Text>
                      )}
                    </div>
                  </div>

                  <div className="enhanced-timeline-date-content">
                    {items.length === 0 ? (
                      <div className="enhanced-timeline-empty-date">
                        <BulbOutlined style={{ marginRight: 8 }} />
                        暂无记录
                      </div>
                    ) : (
                      <div className="enhanced-timeline-items">
                        {items.map(renderTimelineItem)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Spin>
      </div>
    </div>
  );
};

export default EnhancedTaskTimeline;