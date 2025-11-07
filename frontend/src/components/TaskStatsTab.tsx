import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Progress,
  Tag,
  Space,
  Alert,
  Spin,
  Empty,
  Divider,
  Typography
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  TrophyOutlined,
  FireOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { getDailyWorkReport, DailyWorkReport, formatSeconds } from '../services/taskReportService';
import type { Dayjs } from 'dayjs';

const { Title, Text } = Typography;

// ✅ FIXED - Added taskId property (TS2322)
interface TaskStatsTabProps {
  taskId?: number;
  dateRange?: [Dayjs, Dayjs];
  projectId?: number;
}

const TaskStatsTab: React.FC<TaskStatsTabProps> = ({ dateRange, projectId = 1 }) => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<DailyWorkReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTaskReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getDailyWorkReport(projectId);
      console.log('Component received response:', response); // 调试日志
      
      if (response && response.report) {
        setReportData(response.report);
      } else {
        throw new Error('响应数据格式错误或为空');
      }
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : '加载任务报告失败';
      
      // 如果是权限错误，提供友好的错误信息
      if (errorMessage.includes('权限') || errorMessage.includes('unauthorized') || errorMessage.includes('authorization')) {
        errorMessage = '需要登录权限才能查看任务统计。请确保已登录。';
      }
      
      setError(errorMessage);
      console.error('任务报告加载失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaskReport();
  }, [dateRange, projectId]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <Spin size="large" tip="正在加载任务统计...">
          <div style={{ minHeight: '100px' }} />
        </Spin>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="加载失败"
        description={error}
        type="error"
        action={
          <Space>
            <button onClick={loadTaskReport} style={{ border: 'none', background: 'none', color: '#1890ff', cursor: 'pointer' }}>
              重试
            </button>
          </Space>
        }
      />
    );
  }

  if (!reportData) {
    return <Empty description="暂无任务数据" />;
  }

  const { task_statistics, time_statistics } = reportData;

  // 安全获取统计数据，提供默认值
  const taskStats = {
    total_tasks: task_statistics?.total_tasks || 0,
    completed_tasks: task_statistics?.completed_tasks || 0,
    in_progress_tasks: task_statistics?.in_progress_tasks || 0,
    todo_tasks: task_statistics?.todo_tasks || 0,
    other_tasks: task_statistics?.other_tasks || 0,
    completion_rate: task_statistics?.completion_rate || 0,
    priority_breakdown: task_statistics?.priority_breakdown || { high: 0, medium: 0, low: 0 }
  };

  const timeStats = {
    total_seconds: time_statistics?.total_seconds || 0,
    session_count: time_statistics?.session_count || 0,
    avg_session_seconds: time_statistics?.avg_session_seconds || 0
  };

  // 计算优先级占比
  const totalPriorityTasks = taskStats.priority_breakdown.high + 
                            taskStats.priority_breakdown.medium + 
                            taskStats.priority_breakdown.low;

  return (
    <div>
      {/* 任务完成概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="总任务数"
              value={taskStats.total_tasks}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="已完成"
              value={taskStats.completed_tasks}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="进行中"
              value={taskStats.in_progress_tasks}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="完成率"
              value={taskStats.completion_rate}
              suffix="%"
              precision={1}
              prefix={<TrophyOutlined />}
              valueStyle={{ 
                color: taskStats.completion_rate >= 80 ? '#52c41a' : 
                       taskStats.completion_rate >= 60 ? '#faad14' : '#ff4d4f' 
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* 详细分析 */}
      <Row gutter={[16, 16]}>
        {/* 任务状态分布 */}
        <Col xs={24} lg={12}>
          <Card title="📊 任务状态分布" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <Text>已完成</Text>
                  <Text strong style={{ color: '#52c41a' }}>{taskStats.completed_tasks}</Text>
                </div>
                <Progress
                  percent={taskStats.total_tasks > 0 ? (taskStats.completed_tasks / taskStats.total_tasks) * 100 : 0}
                  strokeColor="#52c41a"
                  showInfo={false}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <Text>进行中</Text>
                  <Text strong style={{ color: '#faad14' }}>{taskStats.in_progress_tasks}</Text>
                </div>
                <Progress
                  percent={taskStats.total_tasks > 0 ? (taskStats.in_progress_tasks / taskStats.total_tasks) * 100 : 0}
                  strokeColor="#faad14"
                  showInfo={false}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <Text>待办</Text>
                  <Text strong style={{ color: '#1890ff' }}>{taskStats.todo_tasks}</Text>
                </div>
                <Progress
                  percent={taskStats.total_tasks > 0 ? (taskStats.todo_tasks / taskStats.total_tasks) * 100 : 0}
                  strokeColor="#1890ff"
                  showInfo={false}
                />
              </div>

              {taskStats.other_tasks > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <Text>其他</Text>
                    <Text strong style={{ color: '#8c8c8c' }}>{taskStats.other_tasks}</Text>
                  </div>
                  <Progress
                    percent={taskStats.total_tasks > 0 ? (taskStats.other_tasks / taskStats.total_tasks) * 100 : 0}
                    strokeColor="#8c8c8c"
                    showInfo={false}
                  />
                </div>
              )}
            </Space>
          </Card>
        </Col>

        {/* 优先级分布 */}
        <Col xs={24} lg={12}>
          <Card title="🎯 优先级分布" size="small">
            {totalPriorityTasks > 0 ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space>
                    <FireOutlined style={{ color: '#ff4d4f' }} />
                    <Text>高优先级</Text>
                  </Space>
                  <Tag color="red">{taskStats.priority_breakdown.high}</Tag>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space>
                    <ThunderboltOutlined style={{ color: '#faad14' }} />
                    <Text>中优先级</Text>
                  </Space>
                  <Tag color="orange">{taskStats.priority_breakdown.medium}</Tag>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space>
                    <ExclamationCircleOutlined style={{ color: '#52c41a' }} />
                    <Text>低优先级</Text>
                  </Space>
                  <Tag color="green">{taskStats.priority_breakdown.low}</Tag>
                </div>
              </Space>
            ) : (
              <Empty description="暂无优先级数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
      </Row>

      <Divider />

      {/* 时间与效率 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card size="small">
            <Statistic
              title="今日工作时长"
              value={formatSeconds(timeStats.total_seconds)}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card size="small">
            <Statistic
              title="工作会话"
              value={timeStats.session_count}
              suffix="次"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card size="small">
            <Statistic
              title="平均会话时长"
              value={formatSeconds(timeStats.avg_session_seconds)}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 报告信息 */}
      <div style={{ marginTop: '16px', textAlign: 'right' }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          报告生成时间: {reportData.generated_at}
        </Text>
      </div>
    </div>
  );
};

export default TaskStatsTab;