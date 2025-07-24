import React, { useState, useMemo, useCallback } from 'react';
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
  Space,
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
  ImportOutlined,
  UserOutlined,
  CalendarOutlined,
  TrophyOutlined,
  WarningOutlined,
  LineChartOutlined,
  TeamOutlined,
  FileTextOutlined,
  BulbOutlined,
  ReloadOutlined,
  PlusOutlined,
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
import { useNavigate } from 'react-router-dom';
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
import TimerWorkflow from '../components/TimerWorkflow';
import SmartTimerAssistant from '../components/SmartTimerAssistant';
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
  const navigate = useNavigate();
  const [collapsedSections, setCollapsedSections] = useState<string[]>(['team', 'activities']);
  const [starredProjects, setStarredProjects] = useState<Set<number>>(new Set());
  const [expandedProjectKeys, setExpandedProjectKeys] = useState<string[]>([]);
  
  // 计时器状态管理
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentTaskTitle, setCurrentTaskTitle] = useState<string | undefined>();
  
  // 处理计时器状态更新
  const handleTimerUpdate = useCallback((isRunning: boolean, taskTitle?: string) => {
    setIsTimerRunning(isRunning);
    setCurrentTaskTitle(taskTitle);
    // 触发统计卡片刷新
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // 使用缓存钩子加载各类数据
  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
    refresh: refreshStats
  } = useCache(
    'dashboard-stats',
    async () => {
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
    }
  );

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
            <Col xs={24} lg={16}>
              <TimerErrorBoundary>
                <TimerCard onTimerUpdate={handleTimerUpdate} />
              </TimerErrorBoundary>
            </Col>
            <Col xs={24} lg={8}>
              <TimerErrorBoundary>
                <SmartTimerAssistant 
                  currentTimerState={{
                    isRunning: isTimerRunning,
                    elapsedSeconds: 0, // This would be passed from TimerCard in real implementation
                    taskTitle: currentTaskTitle
                  }}
                />
              </TimerErrorBoundary>
            </Col>
          </Row>

          {/* 工作流程卡片 */}
          <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
            <Col span={24}>
              <TimerErrorBoundary>
                <TimerWorkflow 
                  tasks={[]} // This would be populated with actual tasks
                  onWorkflowUpdate={(isActive, currentStep) => {
                    // Handle workflow updates
                    console.log('Workflow update:', { isActive, currentStep });
                  }}
                />
              </TimerErrorBoundary>
            </Col>
          </Row>

          {/* 统计卡片行 */}
          <Row gutter={[12, 12]} style={{ marginTop: '24px' }}>
            <Col xs={24} md={12}>
              <TimerErrorBoundary>
                <TodayStatsCard refreshTrigger={refreshTrigger} />
              </TimerErrorBoundary>
            </Col>
            <Col xs={24} md={12}>
              <TimerErrorBoundary>
                <TimerStatsCard refreshTrigger={refreshTrigger} />
              </TimerErrorBoundary>
            </Col>
            <Col xs={24} md={12}>
              <TimerErrorBoundary>
                <TaskProgressCard refreshTrigger={refreshTrigger} />
              </TimerErrorBoundary>
            </Col>
          </Row>

          {/* 项目统计卡片 */}
          <Row gutter={[12, 12]} style={{ marginTop: '24px' }}>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="总项目数"
                  value={stats?.totalProjects || 0}
                  prefix={<ProjectOutlined />}
                  loading={statsLoading}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="活跃项目"
                  value={stats?.activeProjects || 0}
                  prefix={<FolderOpenOutlined />}
                  loading={statsLoading}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="完成任务"
                  value={stats?.completedTasks || 0}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                  loading={statsLoading}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="总任务数"
                  value={stats?.totalTasks || 0}
                  prefix={<FileTextOutlined />}
                  loading={statsLoading}
                />
              </Card>
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

          {/* 快速操作卡片 */}
          <Card 
            title="快速操作" 
            style={{ marginTop: '24px' }}
            styles={{ body: { padding: '16px' } }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                block
                onClick={() => navigate('/tasks')}
              >
                新建任务
              </Button>
              <Button 
                icon={<ProjectOutlined />} 
                block
                onClick={() => navigate('/projects')}
              >
                管理项目
              </Button>
              <Button 
                icon={<ImportOutlined />} 
                block
                onClick={() => navigate('/projects/1/bulk-import')}
              >
                批量导入
              </Button>
              <Button 
                icon={<LineChartOutlined />} 
                block
                onClick={() => navigate('/tasks')}
              >
                查看报表
              </Button>
            </Space>
          </Card>

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