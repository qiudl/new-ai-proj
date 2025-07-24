import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Button, 
  List, 
  Avatar, 
  Progress, 
  Tag, 
  Spin, 
  Alert,
  Typography,
  Empty,
  Tooltip,
  Dropdown,
  Input,
  Collapse,
  Badge,
  Divider,
  Tree,
  Menu
} from 'antd';
import { 
  ProjectOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  UserOutlined,
  CalendarOutlined,
  TrophyOutlined,
  WarningOutlined,
  TeamOutlined,
  BulbOutlined,
  ReloadOutlined,
  DownOutlined,
  SettingOutlined,
  SearchOutlined,
  FolderOutlined,
  StarOutlined,
  BellOutlined,
  UpOutlined,
  RightOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  FireOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';
import { 
  DashboardService, 
  DashboardStats, 
  ProjectProgressInfo, 
  UserWorkload 
} from '../services/dashboardService';
import { TaskService } from '../services/taskService';
import { projectService } from '../services/projectService';
import { Task, TimelineEvent, TaskStatus } from '../types/task';
import { Project } from '../types/project';
import { useCache } from '../hooks/useCache';
import { 
  formatTimeAgo, 
  getWorkloadStatus, 
  formatNumber
} from '../utils/formatters';
import TimerCard from '../components/TimerCard';
import TimerStatsCard from '../components/TimerStatsCard';
import TodayStatsCard from '../components/TodayStatsCard';
import TaskProgressCard from '../components/TaskProgressCard';
import RecentTasksList from '../components/RecentTasksList';
import TimerErrorBoundary from '../components/TimerErrorBoundary';
import '../styles/OptimizedDashboard.css';

const { Title, Text } = Typography;
const { Search } = Input;

interface TodayTasksOverview {
  today: Task[];
  thisWeek: Task[];
  overdue: Task[];
}

interface ProjectNavItem {
  id: number;
  name: string;
  description?: string;
  taskCount: number;
  completedCount: number;
  progress: number;
  tasks: Task[];
  isStarred: boolean;
}

const OptimizedDashboardPageEnhanced: React.FC = () => {
  
  // MEMORY OPTIMIZATION: Use refs for timers and mounted state
  const isMountedRef = useRef(true);
  
  const [collapsedSections, setCollapsedSections] = useState<string[]>(['team', 'activities']);
  const [starredProjects, setStarredProjects] = useState<Set<number>>(new Set());
  const [expandedProjectKeys, setExpandedProjectKeys] = useState<string[]>([]);
  
  // 计时器状态管理
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentTaskTitle, setCurrentTaskTitle] = useState<string | undefined>();
  
  // 处理计时器状态更新 - MEMORY OPTIMIZED
  const handleTimerUpdate = useCallback((isRunning: boolean, taskTitle?: string) => {
    if (!isMountedRef.current) return;
    
    setIsTimerRunning(isRunning);
    setCurrentTaskTitle(taskTitle);
    // 触发统计卡片刷新
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // 使用缓存钩子加载各类数据 - MEMORY OPTIMIZED
  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
    refresh: refreshStats
  } = useCache(
    'dashboard-stats',
    async () => {
      if (!isMountedRef.current) throw new Error('Component unmounted');
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        totalProjects: 12,
        activeProjects: 8,
        completedTasks: 89,
        totalTasks: 156,
        teamMembers: 24,
        overdueTasks: 15
      };
    },
    { ttl: 2 * 60 * 1000 } // 2 minutes cache
  );

  // CRITICAL: Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Clear large state objects
      setStarredProjects(new Set());
      setExpandedProjectKeys([]);
    };
  }, []);

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: '#262626' }}>
          工作台
        </Title>
        <Text type="secondary">
          管理您的项目、任务和工作时间
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* 左侧主要内容 */}
        <Col xs={24} lg={16}>
          {/* 计时器卡片 */}
          <Row gutter={[24, 24]}>
            <Col span={24}>
              <TimerErrorBoundary>
                <TimerCard onTimerUpdate={handleTimerUpdate} />
              </TimerErrorBoundary>
            </Col>
          </Row>


          {/* 统计卡片行 */}
          <Row gutter={[12, 12]} style={{ marginTop: '24px' }}>
            <Col xs={24} md={8}>
              <TimerErrorBoundary>
                <TodayStatsCard refreshTrigger={refreshTrigger} />
              </TimerErrorBoundary>
            </Col>
            <Col xs={24} md={8}>
              <TimerErrorBoundary>
                <TimerStatsCard refreshTrigger={refreshTrigger} />
              </TimerErrorBoundary>
            </Col>
            <Col xs={24} md={8}>
              <TimerErrorBoundary>
                <TaskProgressCard refreshTrigger={refreshTrigger} />
              </TimerErrorBoundary>
            </Col>
          </Row>

        </Col>

        {/* 右侧边栏 */}
        <Col xs={24} lg={8}>
          {/* 最近任务列表 */}
          <RecentTasksList 
            limit={8}
            showTimer={true}
            title="最近任务"
            onTimerUpdate={handleTimerUpdate}
          />


          {/* 系统信息卡片 */}
          {statsError && (
            <Card 
              title="系统状态" 
              style={{ marginTop: '24px' }}
            >
              <Alert
                message="数据加载错误"
                description={statsError.message}
                type="warning"
                showIcon
                action={
                  <Button size="small" onClick={refreshStats}>
                    重试
                  </Button>
                }
              />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default OptimizedDashboardPageEnhanced;