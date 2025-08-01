import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Button, Space, Divider, Spin, message } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, PlusOutlined, ClockCircleOutlined, TrophyOutlined, BarChartOutlined } from '@ant-design/icons';
import { personalTimerService } from '../services/personalTimerService';
import PersonalTimerControl from '../components/PersonalTimerControl';
import PersonalTimerTaskList from '../components/PersonalTimerTaskList';
import PersonalTimerTaskForm from '../components/PersonalTimerTaskForm';
import '../styles/personal-timer.css';

const { Title, Text } = Typography;

interface PersonalTimerCurrent {
  is_running: boolean;
  task_type?: string;
  task_id?: number;
  task_title?: string;
  task_color?: string;
  task_category?: string;
  start_time?: string;
  elapsed_seconds: number;
  formatted_time: string;
}

interface PersonalTimerTodayStats {
  total_seconds: number;
  formatted_time: string;
  sessions_count: number;
  tasks_worked_on: number;
  most_worked_task: string;
  productive_hours: number[];
  efficiency_score: number;
  longest_session: number;
}

interface UserTimerTaskResponse {
  id: number;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  color: string;
  is_favorite: boolean;
  total_time_seconds: number;
  target_time_seconds: number;
  formatted_total_time: string;
  formatted_target_time: string;
  completion_percent: number;
  created_at: string;
  updated_at: string;
}

interface PersonalTimerSummary {
  total_tasks: number;
  active_tasks: number;
  completed_tasks: number;
  favorite_tasks: number;
  total_time_seconds: number;
  formatted_total_time: string;
  average_daily_seconds: number;
  most_productive_day: string;
  most_used_category: string;
}

interface PersonalTimerDashboard {
  current_timer?: PersonalTimerCurrent;
  today_stats: PersonalTimerTodayStats;
  timer_tasks: UserTimerTaskResponse[];
  recent_sessions: any[];
  favorite_tasks: UserTimerTaskResponse[];
  summary: PersonalTimerSummary;
}

const PersonalTimerPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<PersonalTimerDashboard | null>(null);
  const [currentTimer, setCurrentTimer] = useState<PersonalTimerCurrent | null>(null);
  const [taskFormVisible, setTaskFormVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<UserTimerTaskResponse | null>(null);

  // 加载仪表板数据
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await personalTimerService.getDashboard();
      setDashboardData(data);
      setCurrentTimer(data.current_timer || null);
    } catch (error) {
      message.error('加载个人计时数据失败');
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 启动个人计时
  const startPersonalTimer = async (taskId: number) => {
    try {
      const response = await personalTimerService.startPersonalTimer({
        task_type: 'personal',
        task_id: taskId,
        auto_stop_others: true
      });
      message.success('个人计时已开始');
      // 重新加载数据
      await loadDashboardData();
    } catch (error) {
      message.error('启动计时失败');
      console.error('Failed to start personal timer:', error);
    }
  };

  // 停止计时
  const stopTimer = async () => {
    try {
      await personalTimerService.stopTimer();
      message.success('计时已停止');
      // 重新加载数据
      await loadDashboardData();
    } catch (error) {
      message.error('停止计时失败');
      console.error('Failed to stop timer:', error);
    }
  };

  // 打开任务表单
  const handleOpenTaskForm = (task?: UserTimerTaskResponse) => {
    setEditingTask(task || null);
    setTaskFormVisible(true);
  };

  // 关闭任务表单
  const handleCloseTaskForm = () => {
    setTaskFormVisible(false);
    setEditingTask(null);
  };

  // 任务表单保存成功
  const handleTaskFormSuccess = () => {
    handleCloseTaskForm();
    loadDashboardData();
  };

  // 删除任务
  const handleDeleteTask = async (taskId: number) => {
    try {
      await personalTimerService.deleteUserTimerTask(taskId);
      message.success('任务删除成功');
      loadDashboardData();
    } catch (error) {
      message.error('删除任务失败');
      console.error('Failed to delete task:', error);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Text type="secondary">暂无数据</Text>
      </div>
    );
  }

  return (
    <div className="personal-timer-page" style={{ padding: '24px' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} className="page-title" style={{ margin: 0 }}>
          <ClockCircleOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          个人计时系统 2.0
        </Title>
        <Text type="secondary" className="page-subtitle">管理您的个人计时任务，提升工作效率</Text>
      </div>

      {/* 计时器控制区域 */}
      <div style={{ marginBottom: '24px' }}>
        <PersonalTimerControl
          currentTimer={currentTimer}
          availableTasks={dashboardData.timer_tasks}
          onRefresh={loadDashboardData}
        />
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} className="stats-row" style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card className="stats-card">
            <div style={{ textAlign: 'center' }}>
              <ClockCircleOutlined style={{ fontSize: '24px', color: '#1890ff', marginBottom: '8px' }} />
              <div className="stats-number timer-number" style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                {dashboardData.today_stats.formatted_time}
              </div>
              <div style={{ color: '#666' }}>今日计时</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stats-card">
            <div style={{ textAlign: 'center' }}>
              <TrophyOutlined style={{ fontSize: '24px', color: '#52c41a', marginBottom: '8px' }} />
              <div className="stats-number" style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                {dashboardData.today_stats.sessions_count}
              </div>
              <div style={{ color: '#666' }}>今日会话</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stats-card">
            <div style={{ textAlign: 'center' }}>
              <BarChartOutlined style={{ fontSize: '24px', color: '#fa8c16', marginBottom: '8px' }} />
              <div className="stats-number" style={{ fontSize: '24px', fontWeight: 'bold', color: '#fa8c16' }}>
                {Math.round(dashboardData.today_stats.efficiency_score)}%
              </div>
              <div style={{ color: '#666' }}>效率评分</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stats-card">
            <div style={{ textAlign: 'center' }}>
              <ClockCircleOutlined style={{ fontSize: '24px', color: '#722ed1', marginBottom: '8px' }} />
              <div className="stats-number" style={{ fontSize: '24px', fontWeight: 'bold', color: '#722ed1' }}>
                {dashboardData.summary.active_tasks}
              </div>
              <div style={{ color: '#666' }}>活跃任务</div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 任务列表区域 */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <PersonalTimerTaskList
            tasks={dashboardData.timer_tasks}
            loading={loading}
            isTimerRunning={currentTimer?.is_running}
            onStartTimer={startPersonalTimer}
            onEditTask={handleOpenTaskForm}
            onDeleteTask={handleDeleteTask}
            onRefresh={loadDashboardData}
          />
        </Col>
      </Row>

      {/* 底部统计摘要 */}
      <Card title="📊 统计摘要" style={{ marginTop: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
                {dashboardData.summary.total_tasks}
              </div>
              <div style={{ color: '#666' }}>总任务数</div>
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>
                {dashboardData.summary.completed_tasks}
              </div>
              <div style={{ color: '#666' }}>已完成</div>
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#722ed1' }}>
                {dashboardData.summary.formatted_total_time}
              </div>
              <div style={{ color: '#666' }}>总计时</div>
            </div>
          </Col>
        </Row>
      </Card>
      
      {/* 任务表单弹窗 */}
      <PersonalTimerTaskForm
        visible={taskFormVisible}
        task={editingTask}
        onCancel={handleCloseTaskForm}
        onSuccess={handleTaskFormSuccess}
      />
    </div>
  );
};

export default PersonalTimerPage;