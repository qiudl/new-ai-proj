import React, { useState, useEffect } from 'react';
import { Card, Statistic, Typography, Space, Row, Col, message } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, InboxOutlined } from '@ant-design/icons';
import TimerService from '../services/timerService';
import { TimerStatsResponse } from '../types/timer';

const { Text } = Typography;

interface TodayStatsCardProps {
  refreshTrigger?: number; // 用于触发刷新的属性
}

const TodayStatsCard: React.FC<TodayStatsCardProps> = ({ refreshTrigger }) => {
  const [stats, setStats] = useState<TimerStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await TimerService.getTimerStats();
      setStats(response);
    } catch (error) {
      console.error('Failed to load today stats:', error);
      message.error('加载今日统计失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [refreshTrigger]);

  // 如果没有数据，显示默认值
  const displayStats = stats || {
    today_total_seconds: 0,
    today_formatted_time: '00:00:00',
    completed_tasks_today: 0,
    in_progress_tasks: 0,
    recent_tasks: [],
    task_time_breakdown: []
  };

  return (
    <Card
      title={
        <Space>
          <ClockCircleOutlined />
          <span>今日工作统计</span>
        </Space>
      }
      loading={loading}
      className="today-stats-card"
    >
      <Row gutter={16}>
        {/* 今日工作总时间 */}
        <Col span={8}>
          <Statistic
            title="今日工作时间"
            value={displayStats.today_formatted_time}
            prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
            valueStyle={{ 
              color: '#1890ff',
              fontFamily: 'monospace',
              fontSize: '18px'
            }}
          />
        </Col>

        {/* 今日完成任务数 */}
        <Col span={8}>
          <Statistic
            title="今日完成任务"
            value={displayStats.completed_tasks_today}
            suffix="个"
            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Col>

        {/* 进行中任务数 */}
        <Col span={8}>
          <Statistic
            title="进行中任务"
            value={displayStats.in_progress_tasks}
            suffix="个"
            prefix={<InboxOutlined style={{ color: '#fa8c16' }} />}
            valueStyle={{ color: '#fa8c16' }}
          />
        </Col>
      </Row>

      {/* 最近计时任务列表 */}
      {displayStats.recent_tasks.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <Text strong style={{ fontSize: '14px', color: '#8c8c8c' }}>
            最近计时任务:
          </Text>
          <div style={{ marginTop: '8px' }}>
            {displayStats.recent_tasks.slice(0, 3).map((task, index) => (
              <div
                key={task.task_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '4px 0',
                  borderBottom: index < displayStats.recent_tasks.slice(0, 3).length - 1 ? '1px solid #f0f0f0' : 'none'
                }}
              >
                <div style={{ flex: 1 }}>
                  <Text ellipsis style={{ maxWidth: '200px' }}>
                    {task.task_title}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {task.project_name}
                  </Text>
                </div>
                <Text 
                  style={{ 
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: '#1890ff'
                  }}
                >
                  {task.formatted_time}
                </Text>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空状态提示 */}
      {displayStats.recent_tasks.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          marginTop: '16px',
          padding: '16px 0'
        }}>
          <Text type="secondary">
            今日还没有计时记录，开始您的第一个任务吧！
          </Text>
        </div>
      )}
    </Card>
  );
};

export default TodayStatsCard;