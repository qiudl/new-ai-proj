import React, { useState, useMemo } from 'react';
import { Timeline, Tag, Avatar, Card, Space, Typography, Select, Button, Checkbox, Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SwapOutlined,
  UserOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  BugOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  TeamOutlined,
  CalendarOutlined,
  TagOutlined,
  StarOutlined,
  ThunderboltOutlined,
  FilterOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { TaskTimelineEvent as TimelineEvent } from '../types/timeline';

const { Text, Title } = Typography;

interface TaskTimelineProps {
  events: TimelineEvent[];
  loading?: boolean;
  className?: string;
  onRefresh?: () => void;
  showFilters?: boolean;
}

const TaskTimeline: React.FC<TaskTimelineProps> = ({ events, loading = false, className, onRefresh, showFilters = true }) => {
  
  // 过滤状态
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showMetadata, setShowMetadata] = useState(true);
  // 获取事件类型的图标和颜色
  const getEventIcon = (eventType: string) => {
    const iconMap: Record<string, { icon: React.ReactNode; color: string; bgColor?: string }> = {
      created: { icon: <PlusOutlined />, color: '#52c41a', bgColor: '#f6ffed' },
      updated: { icon: <EditOutlined />, color: '#1890ff', bgColor: '#e6f7ff' },
      completed: { icon: <CheckCircleOutlined />, color: '#52c41a', bgColor: '#f6ffed' },
      deleted: { icon: <DeleteOutlined />, color: '#ff4d4f', bgColor: '#fff2f0' },
      restored: { icon: <HistoryOutlined />, color: '#722ed1', bgColor: '#f9f0ff' },
      status_changed: { icon: <SwapOutlined />, color: '#fa8c16', bgColor: '#fff7e6' },
      assigned: { icon: <TeamOutlined />, color: '#13c2c2', bgColor: '#e6fffb' },
      priority_changed: { icon: <ExclamationCircleOutlined />, color: '#eb2f96', bgColor: '#fff0f6' },
      deadline_changed: { icon: <CalendarOutlined />, color: '#fa541c', bgColor: '#fff2e8' },
      comment_added: { icon: <FileTextOutlined />, color: '#722ed1', bgColor: '#f9f0ff' },
      tag_added: { icon: <TagOutlined />, color: '#2f54eb', bgColor: '#f0f5ff' },
      bug_reported: { icon: <BugOutlined />, color: '#f5222d', bgColor: '#fff1f0' },
      milestone: { icon: <StarOutlined />, color: '#faad14', bgColor: '#fffbe6' },
      urgent: { icon: <ThunderboltOutlined />, color: '#ff4d4f', bgColor: '#fff2f0' },
    };
    
    return iconMap[eventType] || { icon: <ClockCircleOutlined />, color: '#d9d9d9', bgColor: '#fafafa' };
  };

  // 获取事件类型的中文名称
  const getEventTypeName = (eventType: string) => {
    const typeMap: Record<string, string> = {
      created: '创建',
      updated: '更新',
      completed: '完成',
      deleted: '删除',
      restored: '恢复',
      status_changed: '状态变更',
      assigned: '分配任务',
      priority_changed: '优先级变更',
      deadline_changed: '截止时间变更',
      comment_added: '添加评论',
      tag_added: '添加标签',
      bug_reported: '错误报告',
      milestone: '里程碑',
      urgent: '紧急处理',
    };
    
    return typeMap[eventType] || eventType;
  };

  // 格式化时间显示
  const formatEventTime = (dateString: string) => {
    const eventTime = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - eventTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return '刚刚';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}分钟前`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}小时前`;
    } else if (diffInMinutes < 43200) {
      return `${Math.floor(diffInMinutes / 1440)}天前`;
    } else {
      return eventTime.toLocaleDateString('zh-CN');
    }
  };

  // 获取用户头像
  const getUserAvatar = (event: TimelineEvent) => {
    if (event.username) {
      // 为不同用户生成不同颜色
      const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'];
      const colorIndex = event.username.length % colors.length;
      return (
        <Avatar 
           
          style={{ backgroundColor: colors[colorIndex] }}
          icon={<UserOutlined />}
        >
          {event.username.charAt(0).toUpperCase()}
        </Avatar>
      );
    }
    return (
      <Avatar 
         
        style={{ backgroundColor: '#d9d9d9' }}
        icon={<UserOutlined />}
      />
    );
  };

  // 获取事件优先级指示器
  const getPriorityIndicator = (event: TimelineEvent) => {
    if (event.metadata?.priority) {
      const priority = event.metadata.priority;
      const priorityConfig: Record<string, { color: string; text: string }> = {
        high: { color: 'red', text: '高' },
        medium: { color: 'orange', text: '中' },
        low: { color: 'green', text: '低' },
      };
      const config = priorityConfig[priority];
      if (config) {
        return (
          <Tag 
            color={config.color}
            style={{ fontSize: 10, lineHeight: '16px', marginLeft: 4 }}
          >
            {config.text}
          </Tag>
        );
      }
    }
    return null;
  };

  // 获取状态指示器
  const getStatusIndicator = (event: TimelineEvent) => {
    if (event.event_type === 'status_changed' && event.metadata?.new_status) {
      const status = event.metadata.new_status;
      const statusConfig: Record<string, { color: string; text: string }> = {
        todo: { color: 'default', text: '待办' },
        in_progress: { color: 'processing', text: '进行中' },
        completed: { color: 'success', text: '已完成' },
        cancelled: { color: 'error', text: '已取消' },
      };
      const config = statusConfig[status];
      if (config) {
        return (
          <Tag 
            color={config.color}
            style={{ fontSize: 10, lineHeight: '16px', marginLeft: 4 }}
          >
            → {config.text}
          </Tag>
        );
      }
    }
    return null;
  };

  // 获取所有可用的事件类型和用户
  const availableEventTypes = useMemo(() => {
    const types = Array.from(new Set(events.map(e => e.event_type)));
    return types.map(type => ({
      value: type,
      label: getEventTypeName(type),
      icon: getEventIcon(type).icon,
      color: getEventIcon(type).color,
    }));
  }, [events]);

  const availableUsers = useMemo(() => {
    const users = Array.from(new Set(events.map(e => e.username).filter(Boolean)));
    return users.map(user => ({
      value: user!,
      label: user!,
    }));
  }, [events]);

  // 过滤事件
  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    // 按事件类型过滤
    if (selectedEventTypes.length > 0) {
      filtered = filtered.filter(event => selectedEventTypes.includes(event.event_type));
    }

    // 按用户过滤
    if (selectedUsers.length > 0) {
      filtered = filtered.filter(event => event.username && selectedUsers.includes(event.username));
    }

    // 按时间范围过滤
    if (dateRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (dateRange) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(event => new Date(event.event_date) >= cutoffDate);
    }

    return filtered.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
  }, [events, selectedEventTypes, selectedUsers, dateRange]);

  // 重置过滤器
  const resetFilters = () => {
    setSelectedEventTypes([]);
    setSelectedUsers([]);
    setDateRange('all');
  };

  // 转换为 Ant Design Timeline 格式
  const timelineItems = filteredEvents.map((event) => {
    const { icon, color, bgColor } = getEventIcon(event.event_type);
    
    return {
      key: event.id,
      dot: (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 14,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          {icon}
        </div>
      ),
      children: (
        <Card 
           
          style={{ 
            marginLeft: 8, 
            marginBottom: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: `1px solid ${color}20`,
            borderRadius: 8,
            borderLeft: `4px solid ${color}`,
            backgroundColor: bgColor || '#ffffff',
          }}
        >
          <div>
            {/* 事件头部 */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 8,
            }}>
              <Space>
                <Tag color={color} style={{ margin: 0, fontWeight: 500 }}>
                  {getEventTypeName(event.event_type)}
                </Tag>
                {getPriorityIndicator(event)}
                {getStatusIndicator(event)}
                {event.task_title && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    任务: {event.task_title}
                  </Text>
                )}
              </Space>
              
              <Space>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {getUserAvatar(event)}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Text strong style={{ fontSize: '12px', color: '#262626', lineHeight: 1 }}>
                      {event.username || '系统'}
                    </Text>
                    <Text type="secondary" style={{ fontSize: '11px', lineHeight: 1 }}>
                      {event.user_id ? `ID: ${event.user_id}` : '自动'}
                    </Text>
                  </div>
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {formatEventTime(event.event_date)}
                </Text>
              </Space>
            </div>
            
            {/* 事件描述 */}
            <div style={{ color: '#333', lineHeight: 1.5, marginBottom: '8px' }}>
              {event.description}
            </div>
            
            {/* 增强的更新内容显示 */}
            {event.metadata && (
              <div style={{ 
                marginBottom: '8px',
                padding: '8px 12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                fontSize: '13px'
              }}>
                {/* 如果有旧值和新值，显示变更对比 */}
                {event.metadata.old_value && event.metadata.new_value && (
                  <div style={{ marginBottom: '6px' }}>
                    <Text strong style={{ color: '#595959', fontSize: '12px' }}>更新内容：</Text>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      marginTop: '4px',
                      fontFamily: 'monospace'
                    }}>
                      <span style={{ 
                        padding: '2px 6px',
                        backgroundColor: '#fff2f0',
                        border: '1px solid #ffccc7',
                        borderRadius: '3px',
                        fontSize: '12px',
                        textDecoration: 'line-through',
                        color: '#cf1322'
                      }}>
                        {typeof event.metadata.old_value === 'object' 
                          ? JSON.stringify(event.metadata.old_value)
                          : String(event.metadata.old_value)
                        }
                      </span>
                      <span style={{ color: '#8c8c8c' }}>→</span>
                      <span style={{ 
                        padding: '2px 6px',
                        backgroundColor: '#f6ffed',
                        border: '1px solid #b7eb8f',
                        borderRadius: '3px',
                        fontSize: '12px',
                        color: '#389e0d',
                        fontWeight: 500
                      }}>
                        {typeof event.metadata.new_value === 'object' 
                          ? JSON.stringify(event.metadata.new_value)
                          : String(event.metadata.new_value)
                        }
                      </span>
                    </div>
                  </div>
                )}
                
                {/* 显示其他元数据信息 */}
                {Object.entries(event.metadata).map(([key, value]) => {
                  if (key === 'old_value' || key === 'new_value' || key === 'priority' || key === 'new_status') {
                    return null;
                  }
                  
                  return (
                    <div key={key} style={{ marginBottom: '4px' }}>
                      <Text style={{ fontSize: '12px' }}>
                        <Text strong style={{ color: '#595959' }}>{key}:</Text>
                        <span style={{ marginLeft: '8px', color: '#262626', fontWeight: 500 }}>
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </Text>
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            )}
            
            {/* 精确时间 */}
            <div style={{ 
              marginTop: 8, 
              paddingTop: 8, 
              borderTop: '1px solid #f0f0f0',
              fontSize: 11,
              color: '#999',
            }}>
              {new Date(event.event_date).toLocaleString('zh-CN')}
            </div>
          </div>
        </Card>
      ),
    };
  });

  return (
    <div className={className}>
      {/* 过滤器和工具栏 */}
      {showFilters && events.length > 0 && (
        <Card 
           
          style={{ 
            marginBottom: 16,
            backgroundColor: '#fafafa',
            border: '1px solid #f0f0f0',
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <FilterOutlined style={{ color: '#1890ff' }} />
                <Text strong style={{ fontSize: 14 }}>时间线过滤器</Text>
                <Tag color="blue">{filteredEvents.length}/{events.length} 项</Tag>
              </Space>
              <Space>
                <Tooltip title="刷新时间线">
                  <Button
                    
                    icon={<ReloadOutlined />}
                    onClick={onRefresh}
                    disabled={!onRefresh}
                  />
                </Tooltip>
                <Button  onClick={resetFilters}>
                  重置过滤器
                </Button>
              </Space>
            </div>
            
            <Space wrap>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 12, color: '#666' }}>事件类型:</Text>
                <Select
                  mode="multiple"
                  placeholder="选择事件类型"
                  style={{ minWidth: 200 }}
                  
                  value={selectedEventTypes}
                  onChange={setSelectedEventTypes}
                  options={availableEventTypes}
                  maxTagCount="responsive"
                />
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 12, color: '#666' }}>用户:</Text>
                <Select
                  mode="multiple"
                  placeholder="选择用户"
                  style={{ minWidth: 150 }}
                  
                  value={selectedUsers}
                  onChange={setSelectedUsers}
                  options={availableUsers}
                  maxTagCount="responsive"
                />
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 12, color: '#666' }}>时间范围:</Text>
                <Select
                  placeholder="选择时间范围"
                  style={{ width: 120 }}
                  
                  value={dateRange}
                  onChange={setDateRange}
                  options={[
                    { value: 'all', label: '全部' },
                    { value: 'today', label: '今天' },
                    { value: 'week', label: '一周内' },
                    { value: 'month', label: '一月内' },
                  ]}
                />
              </div>
              
              <Checkbox
                checked={showMetadata}
                onChange={(e) => setShowMetadata(e.target.checked)}
                style={{ fontSize: 12 }}
              >
                显示详细信息
              </Checkbox>
            </Space>
          </Space>
        </Card>
      )}

      {filteredEvents.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <ClockCircleOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
          <Title level={4} type="secondary">暂无时间线事件</Title>
          <Text type="secondary">当任务发生变更时，相关事件将在此处显示</Text>
        </Card>
      ) : (
        <Timeline 
          mode="left"
          items={timelineItems}
          style={{
            marginTop: 16,
            paddingLeft: 8,
          }}
        />
      )}
    </div>
  );
};

export default TaskTimeline;