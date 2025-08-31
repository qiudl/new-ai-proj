import React, { useState, useEffect, useCallback } from 'react';
import { Card, List, Typography, Spin, Empty, Button, Space, message, Tooltip } from 'antd';
import { ClockCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import TimerService from '../services/timerService';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

// 配置dayjs
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text, Title } = Typography;

// 类型定义
interface TaskHistoryItem {
  task_title: string;
  project_name: string;
  total_seconds: number;
  last_timed_at: string;
}

interface SimpleHistoryTasksProps {
  maxHeight?: string;
}

const SimpleHistoryTasks: React.FC<SimpleHistoryTasksProps> = ({
  maxHeight = '400px'
}) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载历史任务数据
  const loadHistoryTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 获取历史任务数据
      const statsResponse = await TimerService.getTimerStats();
      if (statsResponse && statsResponse.recent_tasks) {
        setTasks(statsResponse.recent_tasks);
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error('API调用失败:', error);
      const errorMessage = error instanceof Error ? error.message : '加载失败';
      setError(errorMessage);
      setTasks([]);
      message.error('加载历史任务失败: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // 组件挂载时加载数据
  useEffect(() => {
    loadHistoryTasks();
  }, [loadHistoryTasks]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  };

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Text type="danger">错误: {error}</Text>
        <br />
        <Button type="link" onClick={loadHistoryTasks}>
          重试
        </Button>
      </div>
    );
  }

  return (
    <div style={{ height: '100%' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div>
          <Title level={5} style={{ margin: 0, color: '#262626' }}>
            <ClockCircleOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            历史任务
          </Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            最近计时的任务
          </Text>
        </div>
        
        <Button 
          type="text" 
          size="small"
          icon={<ReloadOutlined />}
          onClick={loadHistoryTasks}
          loading={loading}
          title="刷新数据"
        />
      </div>
      
      <div style={{ 
        maxHeight,
        overflowY: 'auto',
        border: '1px solid #f0f0f0',
        borderRadius: '6px',
        background: '#fff'
      }}>
        <Spin spinning={loading}>
          {tasks.length > 0 ? (
            <List
              dataSource={tasks}
              renderItem={(task: TaskHistoryItem) => (
                <List.Item style={{ padding: '12px 16px' }}>
                  <div style={{ width: '100%' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong style={{ fontSize: '14px', display: 'block' }}>
                        {task.task_title}
                      </Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {task.project_name}
                      </Text>
                    </div>
                    
                    <Space size="middle">
                      <Text style={{ color: '#52c41a', fontWeight: 600 }}>
                        {formatDuration(task.total_seconds)}
                      </Text>
                      <Tooltip title={task.last_timed_at ? dayjs(task.last_timed_at).format('YYYY-MM-DD HH:mm:ss') : ''}>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {task.last_timed_at ? dayjs(task.last_timed_at).fromNow() : '未知时间'}
                        </Text>
                      </Tooltip>
                      {task.last_timed_at && (
                        <Text type="secondary" style={{ fontSize: '10px' }}>
                          {dayjs(task.last_timed_at).format('YYYY-MM-DD HH:mm:ss')}
                        </Text>
                      )}
                    </Space>
                  </div>
                </List.Item>
              )}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无历史计时任务"
              style={{ padding: '40px 20px' }}
            />
          )}
        </Spin>
      </div>
      
      <div style={{ 
        textAlign: 'center', 
        padding: '8px', 
        fontSize: '11px',
        color: '#999'
      }}>
        {tasks.length > 0 && `共 ${tasks.length} 个任务`}
      </div>
    </div>
  );
};

export default SimpleHistoryTasks;