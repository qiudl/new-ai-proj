import React, { useState, useEffect } from 'react';
import { Card, Progress, Typography, Space, List, Tag, message } from 'antd';
import { BarChartOutlined, ClockCircleOutlined } from '@ant-design/icons';
import TimerService from '../services/timerService';
import { TimerStatsResponse, TaskTimeBreakdown } from '../types/timer';

const { Text, Title } = Typography;

interface TaskProgressCardProps {
  refreshTrigger?: number; // 用于触发刷新的属性
}

const TaskProgressCard: React.FC<TaskProgressCardProps> = ({ refreshTrigger }) => {
  const [stats, setStats] = useState<TimerStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await TimerService.getTimerStats();
      setStats(response);
    } catch (error) {
      console.error('Failed to load task progress stats:', error);
      message.error('加载任务进度统计失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [refreshTrigger]);

  // 计算任务完成率
  const getCompletionRate = () => {
    if (!stats) return 0;
    const total = stats.completed_tasks_today + stats.in_progress_tasks;
    if (total === 0) return 0;
    return Math.round((stats.completed_tasks_today / total) * 100);
  };

  // 获取状态标签颜色
  const getStatusColor = (totalSeconds: number) => {
    const hours = totalSeconds / 3600;
    if (hours >= 4) return '#52c41a'; // 绿色 - 高进度
    if (hours >= 2) return '#1890ff'; // 蓝色 - 中等进度
    if (hours >= 1) return '#fa8c16'; // 橙色 - 低进度
    return '#f5222d'; // 红色 - 很少进度
  };

  // 任务时间分布数据
  const taskBreakdown = stats?.task_time_breakdown || [];
  const totalWorkTime = taskBreakdown.reduce((sum, task) => sum + task.total_seconds, 0);

  return (
    <Card
      title={
        <Space>
          <BarChartOutlined />
          <span>任务进度分析</span>
        </Space>
      }
      loading={loading}
      className="task-progress-card"
    >
      {/* 总体完成率 */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <Text strong>今日任务完成率</Text>
          <Text style={{ color: '#1890ff' }}>{getCompletionRate()}%</Text>
        </div>
        <Progress 
          percent={getCompletionRate()} 
          strokeColor="#1890ff"
          trailColor="#f0f0f0"
          showInfo={false}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            已完成: {stats?.completed_tasks_today || 0}个
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            进行中: {stats?.in_progress_tasks || 0}个
          </Text>
        </div>
      </div>

      {/* 任务时间分布 */}
      {taskBreakdown.length > 0 ? (
        <div>
          <Title level={5} style={{ marginBottom: '12px' }}>
            <ClockCircleOutlined style={{ marginRight: '6px', color: '#1890ff' }} />
            任务时间分布
          </Title>
          <List
            dataSource={taskBreakdown.slice(0, 5)} // 显示前5个任务
            renderItem={(item: TaskTimeBreakdown, index) => {
              const percentage = totalWorkTime > 0 ? Math.round((item.total_seconds / totalWorkTime) * 100) : 0;
              const hours = item.total_seconds / 3600;
              
              return (
                <List.Item style={{ padding: '8px 0' }}>
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ flex: 1 }}>
                        <Text ellipsis style={{ maxWidth: '150px', fontWeight: 500 }}>
                          {item.task_title}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {item.project_name}
                        </Text>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Text 
                          style={{ 
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            color: getStatusColor(item.total_seconds)
                          }}
                        >
                          {item.formatted_time}
                        </Text>
                        <br />
                        <Tag 
                          color={getStatusColor(item.total_seconds)}
                          style={{ fontSize: '10px' }}
                        >
                          {percentage}%
                        </Tag>
                      </div>
                    </div>
                    <Progress 
                      percent={percentage} 
                      showInfo={false}
                      strokeColor={getStatusColor(item.total_seconds)}
                      trailColor="#f5f5f5"
                              />
                  </div>
                </List.Item>
              );
            }}
          />
          
          {taskBreakdown.length > 5 && (
            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                还有 {taskBreakdown.length - 5} 个任务未显示
              </Text>
            </div>
          )}
        </div>
      ) : (
        /* 空状态 */
        <div style={{ 
          textAlign: 'center', 
          padding: '32px 16px',
          color: '#8c8c8c' 
        }}>
          <BarChartOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
          <br />
          <Text type="secondary">
            暂无任务时间数据
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            开始计时后这里将显示详细的进度分析
          </Text>
        </div>
      )}

      {/* 工作效率提示 */}
      {totalWorkTime > 0 && (
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          backgroundColor: '#f6ffed', 
          border: '1px solid #b7eb8f',
          borderRadius: '4px'
        }}>
          <Text style={{ fontSize: '12px', color: '#52c41a' }}>
            💡 今日总工作时间: {TimerService.formatDuration(totalWorkTime)}，
            平均每个任务投入 {TimerService.formatDuration(Math.round(totalWorkTime / taskBreakdown.length))}
          </Text>
        </div>
      )}
    </Card>
  );
};

export default TaskProgressCard;