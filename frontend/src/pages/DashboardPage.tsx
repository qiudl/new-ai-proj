import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Typography, Button, message, Tooltip } from 'antd';
// 🔽 COMMENTED OUT: 拖拽相关导入 - 简化第1步
// import { Typography, Button, Switch } from 'antd';
// import { UndoOutlined, DragOutlined, InteractionOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { QuestionCircleOutlined, BugOutlined, ClockCircleOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
// 🔽 UPDATED: 使用统一定时器系统
import { useTimer } from '../contexts/TimerContext';
import MVPTimerCard from '../components/MVPTimerCard';
import EnhancedHierarchicalTaskTree from '../components/EnhancedHierarchicalTaskTree';
import TimerStatsCard from '../components/TimerStatsCard';
import TodayStatsCard from '../components/TodayStatsCard';
import TaskProgressCard from '../components/TaskProgressCard';
import TimerErrorBoundary from '../components/TimerErrorBoundary';
import TimerDebugModal from '../components/TimerDebugModal';
// 🔽 COMMENTED OUT: 拖拽相关导入 - 简化第1步
// import GridItemSettings, { GridItemConfig } from '../components/GridItemSettings';
import TimeManagementGuide from '../components/TimeManagementGuide';
import '../styles/OptimizedDashboard.css';
// 🔽 COMMENTED OUT: 拖拽布局相关CSS - 简化第1步
// import '../styles/grid-layout.css';
import '../styles/TimeManagementLayout.css';
import '../styles/Dashboard2ColumnLayout.css';

// 🔽 COMMENTED OUT: react-grid-layout CSS - 简化第1步
// Import grid layout CSS locally to avoid Docker path issues
// import '../styles/grid-layout-combined.css';

const { Title, Text } = Typography;

// 🔽 COMMENTED OUT: react-grid-layout动态加载 - 简化第1步
// Dynamic import state for react-grid-layout
// let ResponsiveGridLayout: any = null;
// let gridLayoutLoaded = false;

// 🔽 COMMENTED OUT: 网格布局配置 - 简化第1步  
// Grid layout configuration - Time management focused layout
/*
const defaultLayouts = {
  lg: [
    // First row: 3 components each taking 1/3 of space (4/12 each)
    { i: 'timer', x: 0, y: 0, w: 4, h: 8, minW: 3, minH: 6, maxH: 24 },
    { i: 'my-tasks', x: 4, y: 0, w: 4, h: 8, minW: 3, minH: 6, maxH: 24 },
    { i: 'today-stats', x: 8, y: 0, w: 4, h: 8, minW: 3, minH: 6, maxH: 24 },
    // Second row: Task stats (2/3) and Task progress (1/3)
    { i: 'timer-stats', x: 0, y: 8, w: 8, h: 6, minW: 6, minH: 4, maxH: 16 },
    { i: 'task-progress', x: 8, y: 8, w: 4, h: 6, minW: 3, minH: 4, maxH: 16 }
  ],
  md: [
    // First row: 3 components with adjusted sizes for medium screens (3.33/10 each)
    { i: 'timer', x: 0, y: 0, w: 3, h: 7, minW: 2, minH: 5, maxH: 20 },
    { i: 'my-tasks', x: 3, y: 0, w: 3, h: 7, minW: 2, minH: 5, maxH: 20 },
    { i: 'today-stats', x: 6, y: 0, w: 4, h: 7, minW: 3, minH: 5, maxH: 20 },
    // Second row: Task stats (2/3) and Task progress (1/3)  
    { i: 'timer-stats', x: 0, y: 7, w: 7, h: 5, minW: 5, minH: 3, maxH: 12 },
    { i: 'task-progress', x: 7, y: 7, w: 3, h: 5, minW: 2, minH: 3, maxH: 12 }
  ],
  sm: [
    // Small screens: Stack vertically but maintain first row layout
    { i: 'timer', x: 0, y: 0, w: 2, h: 6, minW: 2, minH: 5, maxH: 16 },
    { i: 'my-tasks', x: 2, y: 0, w: 2, h: 6, minW: 2, minH: 5, maxH: 16 },
    { i: 'today-stats', x: 4, y: 0, w: 2, h: 6, minW: 2, minH: 5, maxH: 16 },
    // Second row stacked
    { i: 'timer-stats', x: 0, y: 6, w: 4, h: 4, minW: 3, minH: 3, maxH: 12 },
    { i: 'task-progress', x: 4, y: 6, w: 2, h: 4, minW: 2, minH: 3, maxH: 12 }
  ],
  xs: [
    // Extra small screens: Full vertical stack
    { i: 'timer', x: 0, y: 0, w: 4, h: 6, minW: 4, minH: 5, maxH: 14 },
    { i: 'my-tasks', x: 0, y: 6, w: 4, h: 5, minW: 4, minH: 4, maxH: 12 },
    { i: 'today-stats', x: 0, y: 11, w: 4, h: 4, minW: 4, minH: 3, maxH: 10 },
    { i: 'timer-stats', x: 0, y: 15, w: 4, h: 5, minW: 4, minH: 4, maxH: 12 },
    { i: 'task-progress', x: 0, y: 20, w: 4, h: 4, minW: 4, minH: 3, maxH: 10 }
  ]
};

const breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480 };
const cols = { lg: 12, md: 10, sm: 6, xs: 4 };
*/

const DashboardPage: React.FC = () => {
  // 🔽 REMOVED: 不再需要复杂的timer context
  
  // 🔽 COMMENTED OUT: 动态网格布局加载状态 - 简化第1步
  // Dynamic grid layout loading state
  // const [gridLayoutLoading, setGridLayoutLoading] = useState(!gridLayoutLoaded);
  
  // 🔽 COMMENTED OUT: react-grid-layout动态加载 - 简化第1步
  // Load react-grid-layout dynamically
  /*
  useEffect(() => {
    const loadGridLayout = async () => {
      if (!gridLayoutLoaded) {
        try {
          const { Responsive, WidthProvider } = await import('react-grid-layout');
          ResponsiveGridLayout = WidthProvider(Responsive);
          gridLayoutLoaded = true;
          setGridLayoutLoading(false);
        } catch (error) {
          console.warn('Failed to load react-grid-layout, using fallback layout:', error);
          setGridLayoutLoading(false);
        }
      } else {
        setGridLayoutLoading(false);
      }
    };
    
    loadGridLayout();
  }, []);
  */
  
  // MEMORY OPTIMIZATION: Use refs for timers and mounted state
  const isMountedRef = useRef(true);
  
  // 🔽 COMMENTED OUT: 网格布局状态 - 简化第1步
  // Grid layout state
  // const [layouts, setLayouts] = useState(defaultLayouts);
  // const [currentBreakpoint, setCurrentBreakpoint] = useState('lg');
  // const [isDragMode, setIsDragMode] = useState(false);
  
  const [showGuide, setShowGuide] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  
  // 浮动定时器显示状态
  const [floatingTimerVisible, setFloatingTimerVisible] = useState(true);
  
  // 获取定时器状态
  const { timerState } = useTimer();

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
  
  // 🔽 SIMPLIFIED: 简化的状态管理
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // 🔽 COMMENTED OUT: 组件配置状态 - 简化第1步
  // Component configuration state
  /*
  const [componentConfigs, setComponentConfigs] = useState<Record<string, GridItemConfig>>({
    timer: {
      width: 4,
      height: 8,
      autoWidth: false,
      autoHeight: true,
      minWidth: 3,
      minHeight: 6,
      maxWidth: 12,
      maxHeight: 24,
      resizable: true,
      draggable: true
    },
    'my-tasks': {
      width: 4,
      height: 8,
      autoWidth: false,
      autoHeight: true,
      minWidth: 3,
      minHeight: 6,
      maxWidth: 12,
      maxHeight: 24,
      resizable: true,
      draggable: true
    },
    'today-stats': {
      width: 4,
      height: 8,
      autoWidth: false,
      autoHeight: true,
      minWidth: 3,
      minHeight: 6,
      maxWidth: 12,
      maxHeight: 24,
      resizable: true,
      draggable: true
    },
    'timer-stats': {
      width: 8,
      height: 6,
      autoWidth: false,
      autoHeight: true,
      minWidth: 6,
      minHeight: 4,
      maxWidth: 12,
      maxHeight: 16,
      resizable: true,
      draggable: true
    },
    'task-progress': {
      width: 4,
      height: 6,
      autoWidth: false,
      autoHeight: true,
      minWidth: 3,
      minHeight: 4,
      maxWidth: 6,
      maxHeight: 16,
      resizable: true,
      draggable: true
    }
  });
  
  // 处理组件配置更新
  const handleComponentConfigChange = useCallback((componentId: string, newConfig: Partial<GridItemConfig>) => {
    setComponentConfigs(prev => ({
      ...prev,
      [componentId]: { ...prev[componentId], ...newConfig }
    }));
    
    // 同时更新网格布局
    setLayouts(prevLayouts => {
      const updatedLayouts = { ...prevLayouts };
      Object.keys(updatedLayouts).forEach(breakpoint => {
        const layout = (updatedLayouts as any)[breakpoint].map((item: any) => {
          if (item.i === componentId) {
            const config = { ...componentConfigs[componentId], ...newConfig };
            return {
              ...item,
              w: config.width,
              h: config.autoHeight ? item.h : config.height,
              minW: config.minWidth,
              minH: config.minHeight,
              maxW: config.maxWidth || Infinity,
              maxH: config.autoHeight ? Infinity : (config.maxHeight || Infinity),
              isResizable: config.resizable,
              isDraggable: config.draggable
            };
          }
          return item;
        });
        (updatedLayouts as any)[breakpoint] = layout;
      });
      return updatedLayouts;
    });
  }, [componentConfigs]);
  */

  // 🔽 SIMPLIFIED: 简化的刷新逻辑
  const handleRefresh = useCallback(() => {
    if (!isMountedRef.current) return;
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // 🔽 COMMENTED OUT: 拖拽相关处理函数 - 简化第1步
  // Handle drag mode toggle
  /*
  const toggleDragMode = useCallback(() => {
    setIsDragMode(prev => {
      const newValue = !prev;
      try {
        localStorage.setItem('dashboardDragMode', JSON.stringify(newValue));
      } catch (error) {
        console.warn('Failed to save drag mode to localStorage:', error);
      }
      return newValue;
    });
  }, []);
  */

  // 🔽 COMMENTED OUT: Layout and breakpoint handlers - 简化第1步
  /*
  // Handle layout change
  const handleLayoutChange = useCallback((layout: any[], layouts: any) => {
    if (!isDragMode) return; // Only save when in drag mode
    
    setLayouts(layouts);
    // Save to localStorage
    try {
      localStorage.setItem('dashboardLayouts', JSON.stringify(layouts));
    } catch (error) {
      console.warn('Failed to save layout to localStorage:', error);
    }
  }, [isDragMode]);

  // Handle breakpoint change
  const handleBreakpointChange = useCallback((breakpoint: string) => {
    setCurrentBreakpoint(breakpoint);
  }, []);
  */

  // 🔽 COMMENTED OUT: Load saved layouts and configs from localStorage - 简化第1步
  // Load saved layouts and configs from localStorage
  /*
  useEffect(() => {
    try {
      const savedLayouts = localStorage.getItem('dashboardLayouts');
      const savedConfigs = localStorage.getItem('dashboardComponentConfigs');
      const savedDragMode = localStorage.getItem('dashboardDragMode');
      
      // 检查并清理旧的布局数据
      if (savedLayouts) {
        const parsedLayouts = JSON.parse(savedLayouts);
        
        // 验证布局数据的有效性
        const expectedKeys = ['timer', 'my-tasks', 'today-stats', 'timer-stats', 'task-progress'];
        const hasValidLayout = parsedLayouts.lg && 
          Array.isArray(parsedLayouts.lg) && 
          parsedLayouts.lg.length === 5 &&
          parsedLayouts.lg.every((item: any) => expectedKeys.includes(item.i));
        
        if (hasValidLayout) {
          setLayouts(parsedLayouts);
        } else {
          // 清理无效的布局数据
          console.warn('检测到无效的布局数据，使用默认布局');
          localStorage.removeItem('dashboardLayouts');
          localStorage.removeItem('dashboardComponentConfigs');
        }
      }
      
      if (savedConfigs) {
        const parsedConfigs = JSON.parse(savedConfigs);
        // 只保留有效的组件配置
        const validConfigs: Record<string, GridItemConfig> = {};
        const expectedKeys = ['timer', 'my-tasks', 'today-stats', 'timer-stats', 'task-progress'];
        
        expectedKeys.forEach(key => {
          if (parsedConfigs[key]) {
            validConfigs[key] = parsedConfigs[key];
          }
        });
        
        if (Object.keys(validConfigs).length === 5) {
          setComponentConfigs(prev => ({ ...prev, ...validConfigs }));
        }
      }

      if (savedDragMode) {
        setIsDragMode(JSON.parse(savedDragMode));
      }
    } catch (error) {
      console.warn('Failed to load dashboard configs from localStorage:', error);
      // 清理损坏的数据
      localStorage.removeItem('dashboardLayouts');
      localStorage.removeItem('dashboardComponentConfigs');
      localStorage.removeItem('dashboardDragMode');
    }
  }, []);
  */

  // 🔽 COMMENTED OUT: Save component configs useEffect - 简化第1步
  // Save component configs to localStorage when they change
  /*
  useEffect(() => {
    try {
      localStorage.setItem('dashboardComponentConfigs', JSON.stringify(componentConfigs));
    } catch (error) {
      console.warn('Failed to save component configs to localStorage:', error);
    }
  }, [componentConfigs]);
  */

  // 🔽 REMOVED: 不再需要复杂的定时器状态监听

  // CRITICAL: Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 🔽 COMMENTED OUT: Reset layout function - 简化第1步
  // Reset layout to default
  /*
  const resetLayout = useCallback(() => {
    setLayouts(defaultLayouts);
    
    // Reset component configurations to default
    const defaultConfigs = {
      timer: {
        width: 4,
        height: 8,
        autoWidth: false,
        autoHeight: true,
        minWidth: 3,
        minHeight: 6,
        resizable: true,
        draggable: true
      },
      'my-tasks': {
        width: 4,
        height: 8,
        autoWidth: false,
        autoHeight: true,
        minWidth: 3,
        minHeight: 6,
        resizable: true,
        draggable: true
      },
      'today-stats': {
        width: 4,
        height: 8,
        autoWidth: false,
        autoHeight: true,
        minWidth: 3,
        minHeight: 6,
        resizable: true,
        draggable: true
      },
      'timer-stats': {
        width: 8,
        height: 6,
        autoWidth: false,
        autoHeight: true,
        minWidth: 6,
        minHeight: 4,
        resizable: true,
        draggable: true
      },
      'task-progress': {
        width: 4,
        height: 6,
        autoWidth: false,
        autoHeight: true,
        minWidth: 3,
        minHeight: 4,
        resizable: true,
        draggable: true
      }
    };
    setComponentConfigs(defaultConfigs);
    
    try {
      localStorage.removeItem('dashboardLayouts');
      localStorage.removeItem('dashboardComponentConfigs');
      localStorage.removeItem('dashboardDragMode');
    } catch (error) {
      console.warn('Failed to clear dashboard configs from localStorage:', error);
    }
  }, []);
  */

  // 🔽 REMOVED: renderDashboardItems函数已移除，使用固定3列布局 - 简化第2步
  // Render dashboard items (simplified layout) - 已移除，直接在JSX中定义布局

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Title level={2} style={{ margin: 0, color: '#262626' }}>
              时间管理
            </Title>
            <Button
              type="text"
              icon={<QuestionCircleOutlined />}
              onClick={() => setShowGuide(true)}
              title="查看使用指南"
              style={{ color: '#8c8c8c' }}
            />
            <Button
              type="text"
              icon={<BugOutlined />}
              onClick={() => setShowDebug(true)}
              title="定时器调试"
              style={{ color: '#8c8c8c' }}
            />
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
        {/* 🔽 COMMENTED OUT: 拖拽模式控制 - 简化第1步 */}
        {/*
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <InteractionOutlined style={{ color: isDragMode ? '#999' : '#1890ff' }} />
            <Switch
              checked={isDragMode}
              onChange={toggleDragMode}
              checkedChildren={<DragOutlined />}
              unCheckedChildren={<InteractionOutlined />}
              title={isDragMode ? '切换到正常模式' : '切换到拖拽模式'}
            />
            <DragOutlined style={{ color: isDragMode ? '#1890ff' : '#999' }} />
            <Text type="secondary" style={{ fontSize: '12px', marginLeft: '4px' }}>
              {isDragMode ? '拖拽模式' : '正常模式'}
            </Text>
          </div>
          <Button 
            icon={<UndoOutlined />}
            onClick={resetLayout}
            title="恢复默认布局"
            disabled={!isDragMode}
          >
            重置布局
          </Button>
        </div>
        */}
      </div>

      {/* 🔽 NEW: 3等分列宽布局设计 */}
      <div className="dashboard-3-equal-column-layout" style={{ 
        display: 'grid', 
        gridTemplateColumns: '2fr 1fr', // 左侧2列宽度 + 右侧1列宽度
        gap: '16px',
        minHeight: '600px', // 最小高度保证内容可见
        height: 'calc(100vh - 140px)' // 减去头部高度
      }}>
        {/* 左侧区域：2列宽度的内容区 */}
        <div className="left-content-area" style={{
          display: 'grid',
          gridTemplateRows: 'auto auto auto', // 3行布局
          gap: '16px'
        }}>
          {/* 第一行 - 任务计时 + 任务进度分析（占2列） */}
          <div className="row-1" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr', // 平均分为2列
            gap: '16px',
            height: '300px'
          }}>
            <div className="timer-card" style={{ 
              background: 'transparent',
              overflow: 'hidden'
            }}>
              <TimerErrorBoundary>
                <MVPTimerCard />
              </TimerErrorBoundary>
            </div>
            
            <div className="task-progress-card" style={{ 
              background: 'transparent',
              overflow: 'hidden'
            }}>
              <TimerErrorBoundary>
                <TaskProgressCard refreshTrigger={refreshTrigger} />
              </TimerErrorBoundary>
            </div>
          </div>

          {/* 第二行 - 今日工作统计（占2列） */}
          <div className="row-2" style={{
            height: '280px'
          }}>
            <div className="today-stats-card" style={{ 
              background: 'transparent',
              height: '100%',
              overflow: 'hidden'
            }}>
              <TimerErrorBoundary>
                <TodayStatsCard refreshTrigger={refreshTrigger} />
              </TimerErrorBoundary>
            </div>
          </div>

          {/* 第三行 - 时间段任务统计（占2列） */}
          <div className="row-3" style={{
            minHeight: '320px'
          }}>
            <div className="timer-stats-card" style={{ 
              background: 'transparent',
              height: '100%'
            }}>
              <div style={{ 
                marginBottom: '16px',
                borderBottom: '1px solid #e8e8e8',
                paddingBottom: '8px'
              }}>
                <Title level={4} style={{ margin: 0, color: '#262626' }}>
                  时间段任务统计
                </Title>
              </div>
              <TimerErrorBoundary>
                <TimerStatsCard refreshTrigger={refreshTrigger} />
              </TimerErrorBoundary>
            </div>
          </div>
        </div>

        {/* 右侧区域：我的任务（固定1列宽度） */}
        <div className="right-tasks-area" style={{
          background: 'transparent',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div className="my-tasks-card" style={{ 
            background: 'transparent',
            flex: 1, // 占用全部可用高度
            overflow: 'hidden',
            minHeight: '600px' // 确保有足够的显示空间
          }}>
            <TimerErrorBoundary>
              <EnhancedHierarchicalTaskTree 
                height="100%" 
                showProjectInfo={true}
                compactMode={true}
              />
            </TimerErrorBoundary>
          </div>
        </div>
      </div>
      
      {/* 🔽 REMOVED: 原拖拽网格布局代码已移除 - 简化第1步完成 */}

      {/* 使用指南模态框 */}
      <TimeManagementGuide
        visible={showGuide}
        onClose={() => setShowGuide(false)}
      />
      
      {/* 🔽 NEW: 定时器调试模态框 */}
      <TimerDebugModal
        visible={showDebug}
        onClose={() => setShowDebug(false)}
      />
      </div>
  );
};

export default DashboardPage;