import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Typography, Button, message, Tooltip } from 'antd';
import { QuestionCircleOutlined, ClockCircleOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
// 统一定时器系统
import { useTimer } from '../contexts/TimerContext';
import EnhancedTimerCard from '../components/EnhancedTimerCard';
import DashboardTimerWidget from '../components/DashboardTimerWidget';
import EnhancedHierarchicalTaskTree from '../components/EnhancedHierarchicalTaskTree';
import TimerErrorBoundary from '../components/TimerErrorBoundary';
import TimerDataVisualization from '../components/TimerDataVisualization';
// Phase 4: 交互优化组件
import ContextMenuProvider, { useContextMenu, createTimerContextMenu, createChartContextMenu } from '../components/ContextMenu';
import DragDropTaskManager from '../components/DragDropTaskManager';
import AccessibilityHelper, { voiceAnnouncer } from '../components/AccessibilityHelper';
import useMobileGestures, { createTimerGestureConfig } from '../hooks/useMobileGestures';
import useKeyboardShortcuts, { createTimerShortcuts } from '../hooks/useKeyboardShortcuts';
import '../styles/DashboardSimplified.css';

const { Title, Text } = Typography;

const DashboardPage: React.FC = () => {
  // 内存优化: 使用refs管理mounted状态
  const isMountedRef = useRef(true);
  
  const [showGuide, setShowGuide] = useState(false);
  
  // 浮动定时器显示状态
  const [floatingTimerVisible, setFloatingTimerVisible] = useState(true);
  
  // 获取定时器状态
  const { timerState, startTimer, stopTimer, pauseTimer } = useTimer();

  // Phase 4: 交互优化状态
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const timerSectionRef = useRef<HTMLDivElement>(null);
  const analyticsSectionRef = useRef<HTMLDivElement>(null);

  // Phase 4: 交互优化处理函数
  const handleStartTimer = useCallback((task?: any) => {
    if (task) {
      startTimer(task.id, task.title, 'project');
      voiceAnnouncer.announce(`开始为任务 "${task.title}" 计时`, 'medium');
      message.success(`开始计时: ${task.title}`);
    } else {
      startTimer();
      voiceAnnouncer.announce('开始计时', 'medium');
    }
  }, [startTimer]);

  const handleStopTimer = useCallback(() => {
    stopTimer();
    voiceAnnouncer.announce('计时已停止', 'medium');
    message.info('计时已停止');
  }, [stopTimer]);

  const handlePauseTimer = useCallback(() => {
    pauseTimer();
    voiceAnnouncer.announce('计时已暂停', 'medium');
    message.info('计时已暂停');
  }, [pauseTimer]);

  const handleTasksReorder = useCallback((reorderedTasks: any[]) => {
    setTasks(reorderedTasks);
    voiceAnnouncer.announce('任务顺序已更新', 'low');
  }, []);

  const handleTaskClick = useCallback((task: any) => {
    // 在这里可以导航到任务详情页面或打开任务编辑对话框
    message.info(`查看任务: ${task.title}`);
  }, []);

  const handleChartRefresh = useCallback(() => {
    voiceAnnouncer.announce('正在刷新数据分析图表', 'medium');
    message.loading('刷新数据中...', 1);
  }, []);

  const handleChartExport = useCallback(() => {
    voiceAnnouncer.announce('正在导出图表数据', 'medium');
    message.success('图表导出功能开发中');
  }, []);

  const handleChartFullscreen = useCallback(() => {
    voiceAnnouncer.announce('切换图表全屏模式', 'medium');
    message.info('全屏功能开发中');
  }, []);

  // Phase 4: 键盘快捷键配置
  const timerShortcuts = createTimerShortcuts({
    startTimer: handleStartTimer,
    stopTimer: handleStopTimer,
    pauseTimer: handlePauseTimer,
    createTask: () => message.info('创建任务功能'),
    openTaskList: () => message.info('打开任务列表'),
    openAnalytics: () => message.info('打开数据分析'),
    openHistory: () => message.info('打开历史记录'),
    showHelp: () => setShowGuide(true)
  });

  // Phase 4: 上下文菜单配置
  const timerContextMenu = createTimerContextMenu(
    timerState.isRunning,
    timerState.isPaused,
    handleStartTimer,
    handlePauseTimer,
    handleStopTimer,
    () => message.info('重置计时器'),
    () => message.info('查看历史'),
    () => message.info('计时器设置')
  );

  const chartContextMenu = createChartContextMenu(
    handleChartRefresh,
    handleChartExport,
    handleChartFullscreen,
    () => message.info('时间范围设置'),
    () => message.info('分享图表')
  );

  // Phase 4: 移动端手势配置
  const timerGestureConfig = createTimerGestureConfig({
    onStartTimer: handleStartTimer,
    onStopTimer: handleStopTimer,
    onPauseTimer: handlePauseTimer,
    onSwitchTask: () => message.info('切换任务'),
    onOpenSettings: () => message.info('打开设置'),
    onViewStats: () => message.info('查看统计')
  });

  // Phase 4: 注册快捷键
  useKeyboardShortcuts(timerShortcuts);

  // Phase 4: 注册移动端手势
  useMobileGestures(dashboardRef, timerGestureConfig);

  // Phase 4: 注册上下文菜单
  const timerMenu = useContextMenu(timerContextMenu);
  const chartMenu = useContextMenu(chartContextMenu);

  // Phase 4: 加载示例任务数据
  useEffect(() => {
    const sampleTasks = [
      {
        id: 1,
        title: 'Phase 4: 交互优化完成测试',
        status: 'in_progress' as const,
        priority: 'high' as const,
        project_name: 'AI项目管理平台MVP',
        custom_fields: {
          priority: 'high',
          estimated_hours: 2,
          tags: ['phase4', '交互优化', '测试']
        }
      },
      {
        id: 2,
        title: '拖拽功能验证',
        status: 'todo' as const,
        priority: 'medium' as const,
        project_name: 'AI项目管理平台MVP',
        custom_fields: {
          priority: 'medium',
          estimated_hours: 1,
          tags: ['拖拽', '功能测试']
        }
      },
      {
        id: 3,
        title: '快捷键系统测试',
        status: 'todo' as const,
        priority: 'low' as const,
        project_name: '个人计时系统',
        custom_fields: {
          priority: 'low',
          estimated_hours: 0.5,
          tags: ['快捷键', '无障碍']
        }
      },
      {
        id: 4,
        title: '移动端手势功能',
        status: 'completed' as const,
        priority: 'medium' as const,
        project_name: '个人计时系统',
        custom_fields: {
          priority: 'medium',
          estimated_hours: 3,
          tags: ['移动端', '手势', '完成']
        }
      }
    ];
    
    setTasks(sampleTasks);
    voiceAnnouncer.announce('Dashboard页面加载完成，包含拖拽任务管理功能', 'low');
  }, []);
  
  // 从localStorage恢复浮动定时器可见性状态
  useEffect(() => {
    try {
      const savedHidden = localStorage.getItem('floatingTimerHidden');
      if (savedHidden) {
        setFloatingTimerVisible(!JSON.parse(savedHidden));
      }
    } catch (error) {
      console.warn('Failed to restore floating timer visibility:', error);
    }
  }, []);

  // 切换浮动定时器显示/隐藏
  const toggleFloatingTimer = useCallback(() => {
    const newHidden = floatingTimerVisible;
    setFloatingTimerVisible(!newHidden);
    
    try {
      localStorage.setItem('floatingTimerHidden', JSON.stringify(newHidden));
      
      // 触发storage事件通知浮动定时器组件
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'floatingTimerHidden',
        newValue: JSON.stringify(newHidden),
        oldValue: JSON.stringify(!newHidden)
      }));
      
      if (newHidden) {
        message.info('浮动定时器已隐藏');
      } else {
        message.success('浮动定时器已显示');
      }
    } catch (error) {
      console.error('Failed to save floating timer visibility:', error);
    }
  }, [floatingTimerVisible]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return (
    <ContextMenuProvider>
      <div 
        ref={dashboardRef}
        style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}
        role="main"
        aria-label="工作台主面板"
      >
      {/* 页面标题 */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Title level={2} style={{ margin: 0, color: '#262626' }}>
              我的工作台
            </Title>
   
            <Tooltip 
              title={
                !timerState.isRunning 
                  ? '当前没有运行中的定时器' 
                  : floatingTimerVisible 
                    ? '隐藏浮动定时器' 
                    : '显示浮动定时器'
              }
            >
              <Button
                type="text"
                icon={
                  timerState.isRunning ? (
                    floatingTimerVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                  ) : (
                    <ClockCircleOutlined />
                  )
                }
                onClick={toggleFloatingTimer}
                disabled={!timerState.isRunning}
                title={
                  !timerState.isRunning 
                    ? '当前没有运行中的定时器' 
                    : floatingTimerVisible 
                      ? '隐藏浮动定时器' 
                      : '显示浮动定时器'
                }
                style={{ 
                  color: timerState.isRunning 
                    ? (floatingTimerVisible ? '#52c41a' : '#8c8c8c') 
                    : '#d9d9d9' 
                }}
              />
            </Tooltip>
          </div>
          <Text type="secondary">
            管理您的项目、任务和工作时间
          </Text>
        </div>
      </div>

      {/* 4列布局：任务计时 + 个人计时 + 数据分析 + 我的任务 */}
      <div className="dashboard-simplified-layout" style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 1.2fr 1fr', // 数据分析区域稍宽
        gap: '24px',
        height: 'calc(100vh - 140px)', // 占满剩余空间
        marginBottom: '24px'
      }}>
        {/* 左侧：任务计时 */}
        <div 
          ref={timerSectionRef}
          className="timer-section" 
          style={{
            background: '#fafafa',
            border: '1px solid #d9d9d9',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column'
          }}
          {...timerMenu.onContextMenu}
          role="region"
          aria-label="任务计时区域"
        >
          <div style={{ 
            marginBottom: '16px',
            borderBottom: '1px solid #e8e8e8',
            paddingBottom: '12px'
          }}>
            <Title level={3} style={{ margin: 0, color: '#262626' }}>
              任务计时
            </Title>
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <TimerErrorBoundary>
              <EnhancedTimerCard showHistory={true} />
            </TimerErrorBoundary>
          </div>
        </div>

        {/* 中间：个人计时器 */}
        <div className="personal-timer-section" style={{
          background: '#f0f9ff',
          border: '1px solid #91d5ff',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ 
            marginBottom: '16px',
            borderBottom: '1px solid #e8e8e8',
            paddingBottom: '12px'
          }}>
            <Title level={3} style={{ margin: 0, color: '#262626' }}>
              个人计时
            </Title>
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <TimerErrorBoundary>
              <DashboardTimerWidget 
                height="100%"
                showTaskCreation={true}
                showQuickStats={true}
                maxRecentTasks={5}
              />
            </TimerErrorBoundary>
          </div>
        </div>

        {/* 第三列：数据分析 */}
        <div 
          ref={analyticsSectionRef}
          className="analytics-section" 
          style={{
            background: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column'
          }}
          {...chartMenu.onContextMenu}
          role="region"
          aria-label="数据分析区域"
        >
          <div style={{ 
            marginBottom: '16px',
            borderBottom: '1px solid #e8e8e8',
            paddingBottom: '12px'
          }}>
            <Title level={3} style={{ margin: 0, color: '#262626' }}>
              数据分析
            </Title>
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <TimerErrorBoundary>
              <TimerDataVisualization 
                height="100%"
                compactMode={true}
                showTabs={true}
                autoRefresh={true}
                refreshInterval={300}
              />
            </TimerErrorBoundary>
          </div>
        </div>

        {/* 右侧：我的任务 */}
        <div 
          className="tasks-section" 
          style={{
            background: '#f9f0ff',
            border: '1px solid #d3adf7',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column'
          }}
          role="region"
          aria-label="我的任务区域"
        >
          <div style={{ 
            marginBottom: '16px',
            borderBottom: '1px solid #e8e8e8',
            paddingBottom: '12px'
          }}>
            <Title level={3} style={{ margin: 0, color: '#262626' }}>
              我的任务 (拖拽排序)
            </Title>
          </div>
          
          <div style={{ 
            flex: 1, 
            overflow: 'hidden'
          }}>
            <TimerErrorBoundary>
              <DragDropTaskManager
                tasks={tasks}
                onTasksReorder={handleTasksReorder}
                onStartTimer={handleStartTimer}
                onTaskClick={handleTaskClick}
                isTimerRunning={timerState.isRunning}
                currentTimingTaskId={timerState.currentTask?.id}
                height="100%"
                enableDropZone={true}
              />
            </TimerErrorBoundary>
          </div>
        </div>
      </div>

      {/* Phase 4: 无障碍辅助功能 */}
      <AccessibilityHelper shortcuts={timerShortcuts} />

      </div>
    </ContextMenuProvider>
  );
};

export default DashboardPage;