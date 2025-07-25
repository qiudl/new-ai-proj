import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Typography, Button, Switch } from 'antd';
import { UndoOutlined, DragOutlined, InteractionOutlined } from '@ant-design/icons';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import TimerCard from '../components/TimerCard';
import TimerStatsCard from '../components/TimerStatsCard';
import TodayStatsCard from '../components/TodayStatsCard';
import TaskProgressCard from '../components/TaskProgressCard';
import RecentTasksList from '../components/RecentTasksList';
import TimerErrorBoundary from '../components/TimerErrorBoundary';
import GridItemSettings, { GridItemConfig } from '../components/GridItemSettings';
import '../styles/OptimizedDashboard.css';
import '../styles/grid-layout.css';

const { Title, Text } = Typography;
const ResponsiveGridLayout = WidthProvider(Responsive);

// Grid layout configuration with auto-expanding height
const defaultLayouts = {
  lg: [
    // First row: Timer (7/12) + Recent Tasks (5/12) with increased auto height
    { i: 'timer', x: 0, y: 0, w: 7, h: 6, minW: 5, minH: 4, maxH: 20 },
    { i: 'recent-tasks', x: 7, y: 0, w: 5, h: 6, minW: 4, minH: 4, maxH: 20 },
    // Second row: Statistics cards  
    { i: 'today-stats', x: 0, y: 6, w: 4, h: 2, minW: 3, minH: 2 },
    { i: 'timer-stats', x: 4, y: 6, w: 4, h: 2, minW: 3, minH: 2 },
    { i: 'task-progress', x: 8, y: 6, w: 4, h: 2, minW: 3, minH: 2 }
  ],
  md: [
    // First row: Timer (6/10) + Recent Tasks (4/10) with auto height
    { i: 'timer', x: 0, y: 0, w: 6, h: 5, minW: 4, minH: 4, maxH: 16 },
    { i: 'recent-tasks', x: 6, y: 0, w: 4, h: 5, minW: 3, minH: 4, maxH: 16 },
    // Second row: Statistics cards
    { i: 'today-stats', x: 0, y: 5, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'timer-stats', x: 3, y: 5, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'task-progress', x: 6, y: 5, w: 4, h: 2, minW: 3, minH: 2 }
  ],
  sm: [
    // Medium screens: Timer (4/6) + Recent Tasks (2/6) with auto height
    { i: 'timer', x: 0, y: 0, w: 4, h: 5, minW: 3, minH: 4, maxH: 12 },
    { i: 'recent-tasks', x: 4, y: 0, w: 2, h: 5, minW: 2, minH: 4, maxH: 12 },
    // Statistics stack vertically
    { i: 'today-stats', x: 0, y: 5, w: 2, h: 2, minW: 2, minH: 2 },
    { i: 'timer-stats', x: 2, y: 5, w: 2, h: 2, minW: 2, minH: 2 },
    { i: 'task-progress', x: 4, y: 5, w: 2, h: 2, minW: 2, minH: 2 }
  ],
  xs: [
    // Small screens: Stack vertically with auto height
    { i: 'timer', x: 0, y: 0, w: 4, h: 5, minW: 4, minH: 4, maxH: 10 },
    { i: 'recent-tasks', x: 0, y: 5, w: 4, h: 5, minW: 4, minH: 4, maxH: 10 },
    { i: 'today-stats', x: 0, y: 10, w: 4, h: 2, minW: 4, minH: 2 },
    { i: 'timer-stats', x: 0, y: 12, w: 4, h: 2, minW: 4, minH: 2 },
    { i: 'task-progress', x: 0, y: 14, w: 4, h: 2, minW: 4, minH: 2 }
  ]
};

const breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480 };
const cols = { lg: 12, md: 10, sm: 6, xs: 4 };

const DashboardPage: React.FC = () => {
  // MEMORY OPTIMIZATION: Use refs for timers and mounted state
  const isMountedRef = useRef(true);
  
  // Grid layout state
  const [layouts, setLayouts] = useState(defaultLayouts);
  const [currentBreakpoint, setCurrentBreakpoint] = useState('lg');
  const [isDragMode, setIsDragMode] = useState(false);
  
  // Component configuration state
  const [componentConfigs, setComponentConfigs] = useState<Record<string, GridItemConfig>>({
    timer: {
      width: 7,
      height: 6,
      autoWidth: false,
      autoHeight: true,
      minWidth: 5,
      minHeight: 4,
      resizable: true,
      draggable: true
    },
    'recent-tasks': {
      width: 5,
      height: 6,
      autoWidth: false,
      autoHeight: true,
      minWidth: 4,
      minHeight: 4,
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
              maxW: config.maxWidth,
              maxH: config.autoHeight ? Infinity : config.maxHeight,
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

  // 处理计时器状态更新 - MEMORY OPTIMIZED
  const handleTimerUpdate = useCallback((isRunning: boolean, taskTitle?: string) => {
    if (!isMountedRef.current) return;
    
    // 触发统计卡片刷新
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Handle drag mode toggle
  const toggleDragMode = useCallback(() => {
    setIsDragMode(prev => {
      const newValue = !prev;
      try {
        localStorage.setItem('dashboardDragMode', JSON.stringify(newValue));
        console.log('Saved drag mode to localStorage:', newValue);
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
      console.log('Layout saved to localStorage');
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
        console.log('Loaded saved layouts from localStorage');
      }
      
      if (savedConfigs) {
        const parsedConfigs = JSON.parse(savedConfigs);
        setComponentConfigs(prev => ({ ...prev, ...parsedConfigs }));
        console.log('Loaded saved component configs from localStorage');
      }

      if (savedDragMode) {
        setIsDragMode(JSON.parse(savedDragMode));
        console.log('Loaded saved drag mode from localStorage');
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
        width: 7,
        height: 6,
        autoWidth: false,
        autoHeight: true,
        minWidth: 5,
        minHeight: 4,
        resizable: true,
        draggable: true
      },
      'recent-tasks': {
        width: 5,
        height: 6,
        autoWidth: false,
        autoHeight: true,
        minWidth: 4,
        minHeight: 4,
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
      console.log('Reset layouts and cleared localStorage');
    } catch (error) {
      console.warn('Failed to clear dashboard configs from localStorage:', error);
    }
  }, []);

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0, color: '#262626' }}>
            工作台
          </Title>
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

      {/* React Grid Layout */}
      <ResponsiveGridLayout
        className="dashboard-grid-layout"
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
        draggableHandle={isDragMode ? ".grid-item-drag-handle" : ""}
        useCSSTransforms={true}
      >
          {/* Timer Card */}
          <div key="timer" style={{ background: 'transparent', position: 'relative' }}>
            <div 
              className="grid-item-drag-handle" 
              title="拖拽移动"
              style={{ display: isDragMode ? 'block' : 'none' }}
            ></div>
            <GridItemSettings
              componentId="timer"
              config={componentConfigs.timer}
              onConfigChange={handleComponentConfigChange}
              gridCols={(cols as any)[currentBreakpoint]}
              componentName="定时器"
            />
            <TimerErrorBoundary>
              <TimerCard onTimerUpdate={handleTimerUpdate} />
            </TimerErrorBoundary>
          </div>

          {/* Today Stats Card */}
          <div key="today-stats" style={{ background: 'transparent', position: 'relative' }}>
            <div 
              className="grid-item-drag-handle" 
              title="拖拽移动"
              style={{ display: isDragMode ? 'block' : 'none' }}
            ></div>
            <GridItemSettings
              componentId="today-stats"
              config={componentConfigs['today-stats']}
              onConfigChange={handleComponentConfigChange}
              gridCols={(cols as any)[currentBreakpoint]}
              componentName="今日统计"
            />
            <TimerErrorBoundary>
              <TodayStatsCard refreshTrigger={refreshTrigger} />
            </TimerErrorBoundary>
          </div>

          {/* Timer Stats Card */}
          <div key="timer-stats" style={{ background: 'transparent', position: 'relative' }}>
            <div 
              className="grid-item-drag-handle" 
              title="拖拽移动"
              style={{ display: isDragMode ? 'block' : 'none' }}
            ></div>
            <GridItemSettings
              componentId="timer-stats"
              config={componentConfigs['timer-stats']}
              onConfigChange={handleComponentConfigChange}
              gridCols={(cols as any)[currentBreakpoint]}
              componentName="定时器统计"
            />
            <TimerErrorBoundary>
              <TimerStatsCard refreshTrigger={refreshTrigger} />
            </TimerErrorBoundary>
          </div>

          {/* Task Progress Card */}
          <div key="task-progress" style={{ background: 'transparent', position: 'relative' }}>
            <div 
              className="grid-item-drag-handle" 
              title="拖拽移动"
              style={{ display: isDragMode ? 'block' : 'none' }}
            ></div>
            <GridItemSettings
              componentId="task-progress"
              config={componentConfigs['task-progress']}
              onConfigChange={handleComponentConfigChange}
              gridCols={(cols as any)[currentBreakpoint]}
              componentName="任务进度"
            />
            <TimerErrorBoundary>
              <TaskProgressCard refreshTrigger={refreshTrigger} />
            </TimerErrorBoundary>
          </div>

          {/* Recent Tasks List */}
          <div key="recent-tasks" style={{ background: 'transparent', position: 'relative' }}>
            <div 
              className="grid-item-drag-handle" 
              title="拖拽移动"
              style={{ display: isDragMode ? 'block' : 'none' }}
            ></div>
            <GridItemSettings
              componentId="recent-tasks"
              config={componentConfigs['recent-tasks']}
              onConfigChange={handleComponentConfigChange}
              gridCols={(cols as any)[currentBreakpoint]}
              componentName="最近任务"
            />
            <RecentTasksList 
              limit={8}
              showTimer={true}
              title="最近任务"
              onTimerUpdate={handleTimerUpdate}
            />
          </div>
      </ResponsiveGridLayout>
    </div>
  );
};

export default DashboardPage;