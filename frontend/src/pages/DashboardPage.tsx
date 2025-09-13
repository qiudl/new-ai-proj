import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Typography, Button, message, Tooltip } from 'antd';
import { 
  QuestionCircleOutlined, 
  ClockCircleOutlined, 
  EyeOutlined, 
  EyeInvisibleOutlined
} from '@ant-design/icons';
// 统一定时器系统
import useSafeTimer from '../hooks/useSafeTimer';
import UniversalTimerWidget from '../components/UniversalTimerWidget';
import EnhancedHierarchicalTaskTree from '../components/EnhancedHierarchicalTaskTree';
import DailyFocusTasks from '../components/DailyFocusTasks';
import OKRModule from '../components/OKRModule';
import TimerErrorBoundary from '../components/TimerErrorBoundary';
// Phase 4: 交互优化组件
import ContextMenuProvider, { useContextMenu, createTimerContextMenu, createChartContextMenu } from '../components/ContextMenu';
// import AccessibilityHelper, { voiceAnnouncer } from '../components/AccessibilityHelper'; // 隐藏调试功能
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
  const { timerState, startTimer, stopTimer, pauseTimer } = useSafeTimer();

  // Phase 4: 交互优化状态
  const dashboardRef = useRef<HTMLDivElement>(null);
  const timerSectionRef = useRef<HTMLDivElement>(null);
  const analyticsSectionRef = useRef<HTMLDivElement>(null);

  // Phase 4: 交互优化处理函数
  const handleStartTimer = useCallback((task?: any) => {
    if (task) {
      startTimer(task.id, task.title, 'project');
      // voiceAnnouncer.announce(`开始为任务 "${task.title}" 计时`, 'medium'); // 隐藏调试功能
      message.success(`开始计时: ${task.title}`);
    } else {
      startTimer(0, '默认任务', 'personal');
      // voiceAnnouncer.announce('开始计时', 'medium'); // 隐藏调试功能
    }
  }, [startTimer]);

  const handleStopTimer = useCallback(() => {
    stopTimer();
    // voiceAnnouncer.announce('计时已停止', 'medium'); // 隐藏调试功能
    message.info('计时已停止');
  }, [stopTimer]);

  const handlePauseTimer = useCallback(() => {
    pauseTimer();
    // voiceAnnouncer.announce('计时已暂停', 'medium'); // 隐藏调试功能
    message.info('计时已暂停');
  }, [pauseTimer]);


  const handleChartRefresh = useCallback(() => {
    // voiceAnnouncer.announce('正在刷新数据分析图表', 'medium'); // 隐藏调试功能
    message.loading('刷新数据中...', 1);
  }, []);

  const handleChartExport = useCallback(() => {
    // voiceAnnouncer.announce('正在导出图表数据', 'medium'); // 隐藏调试功能
    message.success('图表导出功能开发中');
  }, []);

  const handleChartFullscreen = useCallback(() => {
    // voiceAnnouncer.announce('切换图表全屏模式', 'medium'); // 隐藏调试功能
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

  // Dashboard页面加载完成通知
  useEffect(() => {
    // voiceAnnouncer.announce('Dashboard页面加载完成，包含优秀的任务树功能', 'low'); // 隐藏调试功能
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

      {/* 第一行：今日主要任务 + OKR目标管理 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        marginBottom: '24px'
      }}>
        {/* 左侧：今日主要任务 */}
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid #d9d9d9',
          overflow: 'hidden'
        }}>
          <TimerErrorBoundary>
            <DailyFocusTasks
              title="今日主要任务"
              showHeader={true}
              maxHeight={300}
              compact={false}
              showStats={true}
              enableBulkActions={false}
              maxTasks={5}
            />
          </TimerErrorBoundary>
        </div>

        {/* 右侧：OKR目标管理 */}
        <div>
          <TimerErrorBoundary>
            <OKRModule 
              quarter="2025-Q1"
              style={{ 
                marginTop: 0,
                background: '#fff', 
                borderRadius: '12px',
                border: '1px solid #d9d9d9'
              }}
            />
          </TimerErrorBoundary>
        </div>
      </div>

      {/* 第二行：统一计时器 + 任务树 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        marginBottom: '24px'
      }}>
        {/* 左侧：统一计时器 */}
        <div 
          ref={timerSectionRef}
          className="unified-timer-section" 
          style={{
            background: '#fafafa',
            border: '1px solid #d9d9d9',
            borderRadius: '12px',
            padding: '24px',
            minHeight: '400px'
          }}
          {...timerMenu.onContextMenu}
          role="region"
          aria-label="统一计时器区域"
        >
          <TimerErrorBoundary>
            <UniversalTimerWidget 
              size="normal"
              showSuggestions={true}
              showHistory={true}
              allowFullscreen={false}
              embedded={true}
              onTimerStart={(data) => {
                // voiceAnnouncer.announce(`开始计时: ${data.title}`, 'medium'); // 隐藏调试功能
                message.success(`开始计时: ${data.title}`);
              }}
              onTimerStop={(data) => {
                // voiceAnnouncer.announce(`计时已停止`, 'medium'); // 隐藏调试功能
                message.info(`计时已停止，本次 ${data.duration || '0分钟'}`);
              }}
            />
          </TimerErrorBoundary>
        </div>

        {/* 右侧：任务树（恢复原来优秀的EnhancedHierarchicalTaskTree）*/}
        <div 
          className="tasks-tree-section" 
          style={{
            background: '#f9f0ff',
            border: '1px solid #d3adf7',
            borderRadius: '12px',
            overflow: 'hidden'
          }}
          role="region"
          aria-label="任务树区域"
        >
          <TimerErrorBoundary>
            <EnhancedHierarchicalTaskTree
              height="100%"
              showProjectInfo={true}
              compactMode={true}
            />
          </TimerErrorBoundary>
        </div>
      </div>


      {/* Phase 4: 无障碍辅助功能 (隐藏调试功能) */}
      {/* <AccessibilityHelper shortcuts={timerShortcuts} /> */}

      </div>
    </ContextMenuProvider>
  );
};

export default DashboardPage;