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
      <div>Dashboard Page Enhanced - {statsLoading ? 'Loading...' : 'Loaded'}</div>
      {statsError && <div>Error: {statsError.message}</div>}
      {stats && <div>Projects: {stats.totalProjects}</div>}
    </div>
  );
};

export default OptimizedDashboardPageEnhanced;