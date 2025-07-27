import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Typography, Button, Switch } from 'antd';
import { UndoOutlined, DragOutlined, InteractionOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useTimer } from '../contexts/TimerContext';
import SimplifiedTimerCard from '../components/SimplifiedTimerCard';
import MyTasksTree from '../components/MyTasksTree';
import TimerStatsCard from '../components/TimerStatsCard';
import TodayStatsCard from '../components/TodayStatsCard';
import TaskProgressCard from '../components/TaskProgressCard';
import RecentTasksList from '../components/RecentTasksList';
import TimerErrorBoundary from '../components/TimerErrorBoundary';
import GridItemSettings, { GridItemConfig } from '../components/GridItemSettings';
import TimeManagementGuide from '../components/TimeManagementGuide';
import DragModeGuide from '../components/DragModeGuide';
import '../styles/OptimizedDashboard.css';
import '../styles/grid-layout.css';

// Import grid layout CSS locally to avoid Docker path issues
import '../styles/grid-layout-combined.css';

const { Title, Text } = Typography;

// Dynamic import state for react-grid-layout
let ResponsiveGridLayout: any = null;
let gridLayoutLoaded = false;

// Grid layout configuration with auto-expanding height - Timer-focused layout
const defaultLayouts = {
  lg: [
    // First row: Timer (6/12) + My Tasks Tree (6/12) - balanced layout
    { i: 'timer', x: 0, y: 0, w: 6, h: 8, minW: 5, minH: 6, maxH: 24 },
    { i: 'my-tasks', x: 6, y: 0, w: 6, h: 8, minW: 4, minH: 6, maxH: 24 },
    // Second row: Recent Tasks takes full width
    { i: 'recent-tasks', x: 0, y: 8, w: 12, h: 4, minW: 6, minH: 3, maxH: 12 },
    // Third row: Statistics cards  
    { i: 'today-stats', x: 0, y: 12, w: 4, h: 2, minW: 3, minH: 2 },
    { i: 'timer-stats', x: 4, y: 12, w: 4, h: 2, minW: 3, minH: 2 },
    { i: 'task-progress', x: 8, y: 12, w: 4, h: 2, minW: 3, minH: 2 }
  ],
  md: [
    // First row: Timer (5/10) + My Tasks (5/10)
    { i: 'timer', x: 0, y: 0, w: 5, h: 7, minW: 4, minH: 5, maxH: 20 },
    { i: 'my-tasks', x: 5, y: 0, w: 5, h: 7, minW: 3, minH: 5, maxH: 20 },
    // Second row: Recent Tasks full width
    { i: 'recent-tasks', x: 0, y: 7, w: 10, h: 3, minW: 6, minH: 3, maxH: 12 },
    // Third row: Statistics cards
    { i: 'today-stats', x: 0, y: 10, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'timer-stats', x: 3, y: 10, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'task-progress', x: 6, y: 10, w: 4, h: 2, minW: 3, minH: 2 }
  ],
  sm: [
    // Small screens: Stack vertically - Timer first for prominence
    { i: 'timer', x: 0, y: 0, w: 6, h: 6, minW: 4, minH: 5, maxH: 16 },
    { i: 'my-tasks', x: 0, y: 6, w: 6, h: 5, minW: 4, minH: 4, maxH: 16 },
    { i: 'recent-tasks', x: 0, y: 11, w: 6, h: 4, minW: 4, minH: 3, maxH: 12 },
    // Statistics stack vertically below
    { i: 'today-stats', x: 0, y: 15, w: 2, h: 2, minW: 2, minH: 2 },
    { i: 'timer-stats', x: 2, y: 15, w: 2, h: 2, minW: 2, minH: 2 },
    { i: 'task-progress', x: 4, y: 15, w: 2, h: 2, minW: 2, minH: 2 }
  ],
  xs: [
    // Extra small screens: Timer gets priority, then tasks tree, stack everything vertically
    { i: 'timer', x: 0, y: 0, w: 4, h: 6, minW: 4, minH: 5, maxH: 14 },
    { i: 'my-tasks', x: 0, y: 6, w: 4, h: 5, minW: 4, minH: 4, maxH: 12 },
    { i: 'recent-tasks', x: 0, y: 11, w: 4, h: 4, minW: 4, minH: 3, maxH: 10 },
    { i: 'today-stats', x: 0, y: 15, w: 4, h: 2, minW: 4, minH: 2 },
    { i: 'timer-stats', x: 0, y: 17, w: 4, h: 2, minW: 4, minH: 2 },
    { i: 'task-progress', x: 0, y: 19, w: 4, h: 2, minW: 4, minH: 2 }
  ]
};

const breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480 };
const cols = { lg: 12, md: 10, sm: 6, xs: 4 };

const DashboardPage: React.FC = () => {
  // Global timer context
  const { timerState } = useTimer();
  
  // Dynamic grid layout loading state
  const [gridLayoutLoading, setGridLayoutLoading] = useState(!gridLayoutLoaded);
  
  // Load react-grid-layout dynamically
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
  
  // MEMORY OPTIMIZATION: Use refs for timers and mounted state
  const isMountedRef = useRef(true);
  
  // Grid layout state
  const [layouts, setLayouts] = useState(defaultLayouts);
  const [currentBreakpoint, setCurrentBreakpoint] = useState('lg');
  const [isDragMode, setIsDragMode] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showDragGuide, setShowDragGuide] = useState(false);
  
  // Component configuration state
  const [componentConfigs, setComponentConfigs] = useState<Record<string, GridItemConfig>>({
    timer: {
      width: 6,
      height: 8,
      autoWidth: false,
      autoHeight: true,
      minWidth: 5,
      minHeight: 6,
      maxWidth: 12,
      maxHeight: 24,
      resizable: true,
      draggable: true
    },
    'my-tasks': {
      width: 6,
      height: 8,
      autoWidth: false,
      autoHeight: true,
      minWidth: 4,
      minHeight: 6,
      maxWidth: 12,
      maxHeight: 24,
      resizable: true,
      draggable: true
    },
    'recent-tasks': {
      width: 12,
      height: 4,
      autoWidth: false,
      autoHeight: true,
      minWidth: 6,
      minHeight: 3,
      maxWidth: 12,
      maxHeight: 12,
      resizable: true,
      draggable: true
    },
    'today-stats': {
      width: 4,
      height: 2,
      autoWidth: false,
      autoHeight: false,
      minWidth: 3,
      minHeight: 2,
      maxWidth: 6,
      maxHeight: 4,
      resizable: true,
      draggable: true
    },
    'timer-stats': {
      width: 4,
      height: 2,
      autoWidth: false,
      autoHeight: false,
      minWidth: 3,
      minHeight: 2,
      maxWidth: 6,
      maxHeight: 4,
      resizable: true,
      draggable: true
    },
    'task-progress': {
      width: 4,
      height: 2,
      autoWidth: false,
      autoHeight: false,
      minWidth: 3,
      minHeight: 2,
      maxWidth: 6,
      maxHeight: 4,
      resizable: true,
      draggable: true
    }
  });
  
  // 计时器状态管理
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
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

  // Handle timer updates from global context - MEMORY OPTIMIZED
  const handleTimerUpdate = useCallback((isRunning: boolean, taskTitle?: string) => {
    if (!isMountedRef.current) return;
    
    // 触发统计卡片刷新
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Handle drag mode toggle
  const toggleDragMode = useCallback(() => {
    setIsDragMode(prev => {
      const newValue = !prev;
      
      // 第一次启用拖拽模式时显示指导
      if (newValue && !localStorage.getItem('dragGuideShown')) {
        setShowDragGuide(true);
        localStorage.setItem('dragGuideShown', 'true');
      }
      
      try {
        localStorage.setItem('dashboardDragMode', JSON.stringify(newValue));
      } catch (error) {
        console.warn('Failed to save drag mode to localStorage:', error);
      }
      return newValue;
    });
  }, []);

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

  // Load saved layouts and configs from localStorage
  useEffect(() => {
    try {
      const savedLayouts = localStorage.getItem('dashboardLayouts');
      const savedConfigs = localStorage.getItem('dashboardComponentConfigs');
      const savedDragMode = localStorage.getItem('dashboardDragMode');
      
      if (savedLayouts) {
        const parsedLayouts = JSON.parse(savedLayouts);
        setLayouts(parsedLayouts);
      }
      
      if (savedConfigs) {
        const parsedConfigs = JSON.parse(savedConfigs);
        setComponentConfigs(prev => ({ ...prev, ...parsedConfigs }));
      }

      if (savedDragMode) {
        setIsDragMode(JSON.parse(savedDragMode));
      }
    } catch (error) {
      console.warn('Failed to load dashboard configs from localStorage:', error);
    }
  }, []);

  // Save component configs to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('dashboardComponentConfigs', JSON.stringify(componentConfigs));
    } catch (error) {
      console.warn('Failed to save component configs to localStorage:', error);
    }
  }, [componentConfigs]);

  // Handle timer state changes from global context
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    // 触发统计卡片刷新当定时器状态改变时
    setRefreshTrigger(prev => prev + 1);
  }, [timerState.isRunning]);

  // CRITICAL: Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Reset layout to default
  const resetLayout = useCallback(() => {
    setLayouts(defaultLayouts);
    
    // Reset component configurations to default
    const defaultConfigs = {
      timer: {
        width: 6,
        height: 8,
        autoWidth: false,
        autoHeight: true,
        minWidth: 5,
        minHeight: 6,
        resizable: true,
        draggable: true
      },
      'my-tasks': {
        width: 6,
        height: 8,
        autoWidth: false,
        autoHeight: true,
        minWidth: 4,
        minHeight: 6,
        resizable: true,
        draggable: true
      },
      'recent-tasks': {
        width: 12,
        height: 4,
        autoWidth: false,
        autoHeight: true,
        minWidth: 6,
        minHeight: 3,
        resizable: true,
        draggable: true
      },
      'today-stats': {
        width: 4,
        height: 2,
        autoWidth: false,
        autoHeight: false,
        minWidth: 3,
        minHeight: 2,
        resizable: true,
        draggable: true
      },
      'timer-stats': {
        width: 4,
        height: 2,
        autoWidth: false,
        autoHeight: false,
        minWidth: 3,
        minHeight: 2,
        resizable: true,
        draggable: true
      },
      'task-progress': {
        width: 4,
        height: 2,
        autoWidth: false,
        autoHeight: false,
        minWidth: 3,
        minHeight: 2,
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

  // Render dashboard items (for both grid and fallback layouts)
  const renderDashboardItems = () => {
    const items = [
      {
        key: 'timer',
        component: <TimerErrorBoundary><SimplifiedTimerCard /></TimerErrorBoundary>,
        name: '定时器'
      },
      {
        key: 'my-tasks',
        component: <MyTasksTree />,
        name: '我的任务'
      },
      {
        key: 'recent-tasks',
        component: <RecentTasksList limit={8} showTimer={true} title="最近任务" />,
        name: '最近任务'
      },
      {
        key: 'today-stats',
        component: <TimerErrorBoundary><TodayStatsCard refreshTrigger={refreshTrigger} /></TimerErrorBoundary>,
        name: '今日统计'
      },
      {
        key: 'timer-stats',
        component: <TimerErrorBoundary><TimerStatsCard refreshTrigger={refreshTrigger} /></TimerErrorBoundary>,
        name: '定时器统计'
      },
      {
        key: 'task-progress',
        component: <TimerErrorBoundary><TaskProgressCard refreshTrigger={refreshTrigger} /></TimerErrorBoundary>,
        name: '任务进度'
      }
    ];

    return items.map(item => (
      <div key={item.key} style={{ background: 'transparent', position: 'relative', marginBottom: '16px' }}>
        {/* 改进的控制栏 */}
        <div className={`grid-item-controls ${isDragMode ? 'drag-mode-active' : ''}`}>
          <div className="grid-item-drag-handle" title="拖拽移动组件">
            <DragOutlined />
          </div>
          <GridItemSettings
            componentId={item.key}
            config={componentConfigs[item.key]}
            onConfigChange={handleComponentConfigChange}
            gridCols={(cols as any)[currentBreakpoint]}
            componentName={item.name}
            isDragMode={isDragMode}
          />
        </div>
        {item.component}
      </div>
    ));
  };

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
          </div>
          <Text type="secondary">
            管理您的项目、任务和工作时间 · {isDragMode ? '拖拽模式已启用' : '正常交互模式'}
          </Text>
        </div>
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
      </div>

      {/* React Grid Layout or Fallback */}
      {gridLayoutLoading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Text>Loading dashboard layout...</Text>
        </div>
      ) : ResponsiveGridLayout ? (
        <ResponsiveGridLayout
          className={`dashboard-grid-layout ${isDragMode ? 'drag-mode' : ''}`}
          layouts={layouts}
          breakpoints={breakpoints}
          cols={cols}
          rowHeight={60}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          isDraggable={isDragMode}
          isResizable={isDragMode}
          onLayoutChange={handleLayoutChange}
          onBreakpointChange={handleBreakpointChange}
          draggableHandle=".grid-item-drag-handle"
          useCSSTransforms={true}
        >
          {renderDashboardItems()}
        </ResponsiveGridLayout>
      ) : (
        <div className="dashboard-fallback-layout" style={{ 
          display: 'grid', 
          gap: '16px', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gridAutoRows: 'minmax(200px, auto)'
        }}>
          {renderDashboardItems()}
        </div>
      )}

      {/* 拖拽模式指导 */}
      <DragModeGuide 
        isDragMode={isDragMode && showDragGuide}
        onDismiss={() => setShowDragGuide(false)}
      />

      {/* 使用指南模态框 */}
      <TimeManagementGuide
        visible={showGuide}
        onClose={() => setShowGuide(false)}
      />
    </div>
  );
};

export default DashboardPage;