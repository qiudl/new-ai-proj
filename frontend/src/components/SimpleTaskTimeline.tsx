import React, { useState, useMemo } from 'react';
import { Card, Empty, Spin, Typography, Tag, Button, Space } from 'antd';
import { ClockCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { TaskTimeEntry } from '../services/weeklyReportService';

const { Text } = Typography;

interface SimpleTaskTimelineProps {
  taskTimeEntries: TaskTimeEntry[];
  dateRange?: [Dayjs, Dayjs];
  onDateRangeChange?: (dates: [Dayjs, Dayjs]) => void;
  projectId?: number;
  taskIds?: number[];
}

const SimpleTaskTimeline: React.FC<SimpleTaskTimelineProps> = ({
  taskTimeEntries = []
}) => {
  const [loading] = useState(false);

  // 简单的任务分组 - 只按日期分组
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, TaskTimeEntry[]> = {};
    
    taskTimeEntries.forEach(task => {
      if (task.date) {
        if (!grouped[task.date]) {
          grouped[task.date] = [];
        }
        grouped[task.date].push(task);
      }
    });
    
    // 按日期排序
    const sortedEntries = Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));
    return Object.fromEntries(sortedEntries);
  }, [taskTimeEntries]);

  // 渲染任务项
  const renderTaskItem = (task: TaskTimeEntry) => {
    const handleTaskClick = () => {
      window.open(`/tasks/${task.id}`, '_blank');
    };

    const statusColor = task.status === 'completed' ? 'green' : 
                       task.status === 'in_progress' ? 'blue' : 'orange';

    const priorityColor = task.priority === 'high' ? 'red' : 
                         task.priority === 'medium' ? 'orange' : 'green';

    return (
      <div
        key={task.id}
        style={{
          padding: '12px 16px',
          margin: '8px 0',
          backgroundColor: '#fafafa',
          borderRadius: '6px',
          border: '1px solid #f0f0f0',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onClick={handleTaskClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f0f0f0';
          e.currentTarget.style.transform = 'translateX(4px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#fafafa';
          e.currentTarget.style.transform = 'translateX(0px)';
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: '14px' }}>
              <span style={{ color: '#666', fontSize: '12px', marginRight: '8px' }}>#{task.id}</span>
              {task.taskTitle}
            </Text>
          </div>
          <div style={{ fontSize: '12px', color: '#1890ff' }}>
            {task.startTime ? dayjs(task.startTime).format('HH:mm') : '--:--'}
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Tag icon={<ClockCircleOutlined />} color="blue">
            {task.duration.toFixed(1)}h
          </Tag>
          <Tag color={statusColor}>
            {task.status === 'completed' ? '已完成' : 
             task.status === 'in_progress' ? '进行中' : '待办'}
          </Tag>
          <Tag color={priorityColor}>
            {task.priority === 'high' ? '高' : 
             task.priority === 'medium' ? '中' : '低'}优先级
          </Tag>
          {task.projectName && (
            <Tag color="purple">{task.projectName}</Tag>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (Object.keys(tasksByDate).length === 0) {
    return (
      <div style={{ padding: '20px' }}>
        <Empty 
          description="暂无任务记录"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      {/* 简单的统计信息 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space>
          <Text type="secondary">总任务:</Text>
          <Text strong>{taskTimeEntries.length}</Text>
          
          <Text type="secondary">已完成:</Text>
          <Text strong>{taskTimeEntries.filter(t => t.status === 'completed').length}</Text>
          
          <Text type="secondary">总时长:</Text>
          <Text strong>{taskTimeEntries.reduce((sum, t) => sum + t.duration, 0).toFixed(1)}h</Text>
        </Space>
      </Card>

      {/* 任务时间轴 */}
      <div style={{ background: 'white', borderRadius: '8px', padding: '16px' }}>
        {Object.entries(tasksByDate).map(([date, tasks]) => (
          <div key={date} style={{ marginBottom: '24px' }}>
            <div style={{ 
              marginBottom: '12px', 
              paddingBottom: '8px', 
              borderBottom: '2px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <Text strong style={{ fontSize: '16px', color: '#262626' }}>
                  {dayjs(date).format('MM月DD日')}
                </Text>
                <Text type="secondary" style={{ marginLeft: '12px' }}>
                  {dayjs(date).format('dddd')}
                </Text>
                {dayjs(date).isSame(dayjs(), 'day') && (
                  <Tag color="processing" style={{ marginLeft: '8px' }}>今天</Tag>
                )}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {tasks.length} 项任务
              </Text>
            </div>
            
            <div>
              {tasks.map(renderTaskItem)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimpleTaskTimeline;