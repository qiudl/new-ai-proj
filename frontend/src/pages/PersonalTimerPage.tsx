import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Button, Space, Divider, Spin, message } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, PlusOutlined, ClockCircleOutlined, TrophyOutlined, BarChartOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { personalTimerService } from '../services/personalTimerService';
import { useTimer } from '../contexts/TimerContext';
import PersonalTimerControl from '../components/PersonalTimerControl';
import PersonalTimerTaskList from '../components/PersonalTimerTaskList';
import PersonalTimerTaskForm from '../components/PersonalTimerTaskForm';
import KeyboardShortcutsHelp from '../components/KeyboardShortcutsHelp';
import useKeyboardShortcuts, { createTimerShortcuts } from '../hooks/useKeyboardShortcuts';
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
  recent_sessions: unknown[];
  favorite_tasks: UserTimerTaskResponse[];
  summary: PersonalTimerSummary;
}

const PersonalTimerPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<PersonalTimerDashboard | null>(null);
  const [taskFormVisible, setTaskFormVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<UserTimerTaskResponse | null>(null);
  const [shortcutsHelpVisible, setShortcutsHelpVisible] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState<number>(-1);
  
  // 🔧 使用TimerContext获取计时器状态和操作
  const { timerState, startTimer, stopTimer: stopTimerContext, refreshTimer } = useTimer();

  // 加载仪表板数据
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await personalTimerService.getDashboard();
      
      // 验证数据结构
      if (!data || typeof data !== 'object') {
        console.error('Dashboard API returned invalid data:', data);
        throw new Error('Invalid dashboard data structure');
      }
      
      // 验证必要字段
      if (!data.hasOwnProperty('current_timer') || !data.hasOwnProperty('today_stats')) {
        console.error('Dashboard data missing required fields:', data);
        throw new Error('Dashboard data missing required fields');
      }
      
      setDashboardData(data);
      // 🔧 不再需要setCurrentTimer，计时器状态由TimerContext管理
    } catch (error) {
      message.error('加载个人计时数据失败，请刷新页面重试');
      console.error('Failed to load dashboard data:', error);
      
      // 设置默认数据避免页面崩溃
      setDashboardData({
        current_timer: undefined,
        today_stats: {
          total_seconds: 0,
          formatted_time: '00:00:00',
          sessions_count: 0,
          tasks_worked_on: 0,
          most_worked_task: '',
          productive_hours: Array(24).fill(0),
          efficiency_score: 0,
          longest_session: 0
        },
        timer_tasks: [],
        recent_sessions: [],
        favorite_tasks: [],
        summary: {
          total_tasks: 0,
          active_tasks: 0,
          completed_tasks: 0,
          favorite_tasks: 0,
          total_time_seconds: 0,
          formatted_total_time: '00:00:00',
          average_daily_seconds: 0,
          most_productive_day: '',
          most_used_category: ''
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // 启动个人计时
  const startPersonalTimer = async (taskId: number) => {
    try {
      // 🔧 从dashboardData中找到任务标题
      const task = dashboardData?.timer_tasks.find(t => t.id === taskId);
      const taskTitle = task?.title || '未知任务';
      
      // 使用TimerContext的startTimer方法
      const success = await startTimer(taskId, taskTitle);
      if (success) {
        // 重新加载数据以更新统计信息
        await loadDashboardData();
      }
    } catch (error) {
      message.error('启动计时失败');
      console.error('Failed to start personal timer:', error);
    }
  };

  // 停止计时
  const stopTimer = async () => {
    try {
      // 🔧 使用TimerContext的stopTimer方法
      const success = await stopTimerContext();
      if (success) {
        // 重新加载数据以更新统计信息
        await loadDashboardData();
      }
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

  // 键盘快捷键配置
  const shortcuts = createTimerShortcuts({
    startTimer: () => {
      if (dashboardData?.timer_tasks && dashboardData.timer_tasks.length > 0) {
        const firstTask = dashboardData.timer_tasks[0];
        startPersonalTimer(firstTask.id);
      } else {
        message.warning('没有可用的计时任务');
      }
    },
    stopTimer: () => {
      if (dashboardData?.current_timer?.is_running) {
        stopTimer();
      } else {
        message.info('当前没有运行中的计时器');
      }
    },
    pauseTimer: () => {
      // 暂停功能（如果支持）
      message.info('暂停功能即将推出');
    },
    createTask: () => {
      setTaskFormVisible(true);
    },
    openTaskList: () => {
      // 滚动到任务列表
      const element = document.querySelector('.task-list-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    },
    openAnalytics: () => {
      navigate('/timer-analytics');
    },
    openHistory: () => {
      navigate('/timer-analytics');
    },
    showHelp: () => {
      setShortcutsHelpVisible(true);
    },
    toggleFocus: () => {
      setFocusMode(!focusMode);
      message.info(focusMode ? '已退出专注模式' : '已进入专注模式');
    },
    quickSave: () => {
      // 快速保存当前状态
      loadDashboardData();
      message.success('数据已刷新');
    }
  });

  const { getShortcutsHelp } = useKeyboardShortcuts(shortcuts);

  // 监听数字键选择任务
  useEffect(() => {
    const handleSelectTaskByIndex = (event: CustomEvent) => {
      const { index } = event.detail;
      if (dashboardData?.timer_tasks && dashboardData.timer_tasks[index]) {
        const task = dashboardData.timer_tasks[index];
        setSelectedTaskIndex(index);
        startPersonalTimer(task.id);
        message.success(`已选择任务: ${task.title}`);
      }
    };

    document.addEventListener('selectTaskByIndex', handleSelectTaskByIndex as EventListener);
    return () => {
      document.removeEventListener('selectTaskByIndex', handleSelectTaskByIndex as EventListener);
    };
  }, [dashboardData?.timer_tasks]);

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
    <div className={`personal-timer-page ${focusMode ? 'focus-mode' : ''}`} style={{ padding: '24px' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Title level={2} className="page-title" style={{ margin: 0 }}>
              <ClockCircleOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
              个人计时系统 2.0
            </Title>
            <Text type="secondary" className="page-subtitle">管理您的个人计时任务，提升工作效率</Text>
          </div>
          
          {/* 右侧快捷操作按钮 */}
          {!focusMode && (
            <Space>
              <Button
                type="text"
                icon={<QuestionCircleOutlined />}
                onClick={() => setShortcutsHelpVisible(true)}
                title="键盘快捷键 (Shift + ?)"
              >
                快捷键
              </Button>
              <Button
                type={focusMode ? 'primary' : 'default'}
                onClick={() => {
                  setFocusMode(!focusMode);
                  message.info(focusMode ? '已退出专注模式' : '已进入专注模式');
                }}
                title="专注模式 (Cmd/Ctrl + F)"
              >
                {focusMode ? '退出专注' : '专注模式'}
              </Button>
            </Space>
          )}
        </div>
      </div>

      {/* 计时器控制区域 */}
      <div style={{ marginBottom: '24px' }}>
        <PersonalTimerControl
          currentTimer={{
            is_running: timerState.isRunning,
            task_id: timerState.taskId,
            task_title: timerState.taskTitle,
            task_color: '#1890ff', // 默认颜色，或从任务数据中获取
            task_category: '个人任务',
            start_time: timerState.startTime?.toISOString(), 
            elapsed_seconds: timerState.elapsedSeconds,
            formatted_time: timerState.formattedTime
          }}
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
            isTimerRunning={timerState.isRunning}
            selectedTaskIndex={selectedTaskIndex}
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

      {/* 快捷键帮助弹窗 */}
      <KeyboardShortcutsHelp
        visible={shortcutsHelpVisible}
        onClose={() => setShortcutsHelpVisible(false)}
        shortcuts={getShortcutsHelp()}
      />

      {/* 专注模式提示 */}
      {focusMode && (
        <div 
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            zIndex: 1000,
            backdropFilter: 'blur(8px)'
          }}
        >
          🎯 专注模式 - 按 Cmd/Ctrl + F 退出
        </div>
      )}
    </div>
  );
};

export default PersonalTimerPage;