import React, { useState, useMemo, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Tag, 
  Button, 
  Space, 
  Typography, 
  Spin,
  Select,
  Input,
  Progress,
  Empty,
  Badge,
  Statistic,
  List,
  Avatar,
  Tooltip,
  Radio,
  message,
  Tabs
} from 'antd';
import { 
  ClockCircleOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  EditOutlined,
  EyeOutlined,
  CalendarOutlined,
  UserOutlined,
  ProjectOutlined,
  LeftOutlined,
  RightOutlined,
  TeamOutlined,
  BarChartOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
  DashboardOutlined,
  ToolOutlined,
  BulbOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { DashboardService } from '../services/dashboardService';
import { projectService } from '../services/projectService';
import companyService from '../services/companyService';
import { Task } from '../types/task';
import { formatTaskStatus } from '../utils/formatters';
import { Project } from '../types/project';
import { Company } from '../types/company';
import { useWeeklyDashboardStats, useDashboardManager } from '../hooks/useDashboard';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../utils/queryClient';
import { CACHE_TTL, CACHE_KEYS } from '../utils/cache';
import { useDashboardPreload } from '../hooks/useSmartPreload';
import { 
  DashboardPageSkeleton, 
  WeeklyCalendarSkeleton, 
  DashboardStatsSkeleton,
  ProjectSelectorSkeleton,
  TaskListSkeleton,
  SmartLoading
} from '../components/SkeletonLoaders';
import { useTaskDashboardUrlState, generateShareableUrl } from '../hooks/useUrlState';
import { useFilterPersistence } from '../hooks/useFilterPersistence';
import { QuickDatePicker } from '../components/QuickDatePicker';
import { ExportModal } from '../components/ExportModal';
import { PerformanceMonitorDashboard } from '../components/PerformanceMonitorDashboard';
import { SystemValidationPanel } from '../components/SystemValidationPanel';
import TaskAnalysisPanel from '../components/TaskAnalysisPanel';
import { 
  useComponentPerformanceTracking, 
  usePagePerformanceTracking,
  useSearchPerformanceTracking
} from '../hooks/usePerformanceTracking';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

// 扩展 dayjs 插件
dayjs.extend(isBetween);
dayjs.extend(weekOfYear);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

// 转换英文星期为中文
const getDayName = (englishDay: string): string => {
  const dayMap: Record<string, string> = {
    'Sunday': '周日',
    'Monday': '周一',
    'Tuesday': '周二',
    'Wednesday': '周三',
    'Thursday': '周四',
    'Friday': '周五',
    'Saturday': '周六'
  };
  return dayMap[englishDay] || englishDay;
};

// 获取优先级颜色
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return '#ff4d4f';
    case 'high': return '#fa8c16';
    case 'medium': return '#1890ff';
    case 'low': return '#52c41a';
    default: return '#8c8c8c';
  }
};

// 使用统一的状态格式化函数 - 已迁移到 formatters.ts

interface WeeklyStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  overdueTasks: number;
  completionRate: number;
  weekRange: string;
}

interface DayTasks {
  date: string;
  dayName: string;
  tasks: Task[];
  isToday: boolean;
  isPast: boolean;
}

const TaskDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [performanceModalVisible, setPerformanceModalVisible] = useState(false);
  const [validationPanelVisible, setValidationPanelVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // 性能追踪
  const { trackUserInteraction } = useComponentPerformanceTracking('TaskDashboardPage');
  const { trackPageAction } = usePagePerformanceTracking('task-dashboard');
  const { trackSearchStart, trackSearchResult } = useSearchPerformanceTracking('task-dashboard-search');
  
  // URL状态管理
  const [urlFilters, setUrlFilters] = useTaskDashboardUrlState();
  
  // 筛选条件持久化
  const {
    bookmarks,
    saveBookmark,
    loadBookmark,
    deleteBookmark,
    exportBookmarks,
    importBookmarks,
    getRecommendedBookmarks,
  } = useFilterPersistence(urlFilters);
  
  // 解构URL状态为单独的变量(保持向后兼容)
  const {
    selectedWeek,
    selectedProject,
    selectedCustomer,
    selectedStatus,
    searchText,
    viewMode,
  } = urlFilters;
  
  // 更新单个筛选条件的辅助函数
  const updateFilter = <K extends keyof typeof urlFilters>(key: K, value: typeof urlFilters[K]) => {
    setUrlFilters({ ...urlFilters, [key]: value });
  };
  
  const setSelectedWeek = (week: Dayjs) => {
    trackUserInteraction('week-selection', { 
      from: selectedWeek.format('YYYY-MM-DD'), 
      to: week.format('YYYY-MM-DD') 
    });
    updateFilter('selectedWeek', week);
  };
  const setSelectedProject = (projectId: number | undefined) => {
    trackUserInteraction('project-filter', { projectId });
    updateFilter('selectedProject', projectId);
  };
  const setSelectedCustomer = (customerId: number | undefined) => {
    trackUserInteraction('customer-filter', { customerId });  
    updateFilter('selectedCustomer', customerId);
  };
  const setSelectedStatus = (status: string) => {
    trackUserInteraction('status-filter', { status });
    updateFilter('selectedStatus', status);
  };
  const setSearchText = (text: string) => {
    if (text !== searchText) {
      if (text.length > 0) {
        trackSearchStart(text);
      }
      updateFilter('searchText', text);
    }
  };
  const setViewMode = (mode: 'calendar' | 'list') => updateFilter('viewMode', mode);

  // 计算当前周的开始和结束日期
  const weekStart = useMemo(() => {
    return selectedWeek.startOf('week');
  }, [selectedWeek]);

  const weekEnd = useMemo(() => {
    return selectedWeek.endOf('week');
  }, [selectedWeek]);

  // 获取当前用户ID
  const getCurrentUserId = (): number => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.user_id || 1;
      }
    } catch (error) {
      console.warn('Failed to get user ID from token:', error);
    }
    return 1;
  };

  const userId = getCurrentUserId();

  // 获取项目列表
  const {
    data: projects,
    isLoading: projectsLoading,
    error: projectsError,
    refetch: refreshProjects
  } = useQuery({
    queryKey: queryKeys.projects.list(userId, 1, 100),
    queryFn: async () => {
      try {
        const response = await projectService.getProjects({ page: 1, pageSize: 100 });
        return response.data || [];
      } catch (error) {
        console.error('获取项目列表失败:', error);
        message.error('获取项目列表失败');
        return [];
      }
    },
    staleTime: CACHE_TTL.REGULAR,
    gcTime: CACHE_TTL.FREQUENT,
  });

  // 获取客户列表
  const {
    data: customers,
    isLoading: customersLoading,
    error: customersError,
    refetch: refreshCustomers
  } = useQuery({
    queryKey: ['companies', userId, 1, 100],
    queryFn: async () => {
      try {
        const response = await companyService.getCompanies({ page: 1, pageSize: 100 });
        return response.data || [];
      } catch (error) {
        console.error('获取客户列表失败:', error);
        message.error('获取客户列表失败');
        return [];
      }
    },
    staleTime: CACHE_TTL.REGULAR,
    gcTime: CACHE_TTL.FREQUENT,
  });

  // 获取所有任务数据
  const {
    data: allTasks,
    isLoading: tasksLoading,
    error: tasksError,
    refetch: refreshTasks
  } = useQuery({
    queryKey: ['tasks', 'all', userId],
    queryFn: async () => {
      try {
        setLoading(true);
        // 检查认证状态
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('❌ 未找到认证token，用户未登录');
          message.error('请先登录');
          throw new Error('未登录');
        }
        
        const tasks = await DashboardService.getAllTasks();
        console.log('🔍 TaskDashboardPage - getAllTasks结果:', {
          isArray: Array.isArray(tasks),
          length: tasks?.length || 0,
          firstTask: tasks?.[0] || null
        });
        
        if (!tasks || tasks.length === 0) {
          console.warn('⚠️ TaskDashboardPage - 未获取到任务数据，可能是没有任务或API返回空数组');
        }
        
        return tasks || [];
      } catch (error) {
        console.error('❌ 获取任务数据失败:', error);
        
        // 更详细的错误处理
        if (error instanceof Error) {
          if (error.message.includes('401') || error.message.includes('未登录')) {
            message.error('认证失败，请重新登录');
          } else if (error.message.includes('网络')) {
            message.error('网络连接失败，请检查网络');
          } else {
            message.error(`获取任务数据失败: ${error.message}`);
          }
        } else {
          message.error('获取任务数据失败');
        }
        
        return [];
      } finally {
        setLoading(false);
      }
    },
    staleTime: CACHE_TTL.LIVE_UPDATES,
    gcTime: CACHE_TTL.FREQUENT,
    refetchInterval: 30000, // 30秒自动刷新
    refetchIntervalInBackground: false,
  });

  // 筛选本周任务
  const weeklyTasks = useMemo(() => {
    if (!allTasks) {
      return [];
    }

    console.log('🔍 筛选本周任务：', weekStart.format('YYYY-MM-DD'), '到', weekEnd.format('YYYY-MM-DD'));
    console.log('🔍 当前allTasks数量:', allTasks.length);
    console.log('🔍 weekStart对象:', weekStart.toISOString());
    console.log('🔍 weekEnd对象:', weekEnd.toISOString());

    const filteredTasks = allTasks.filter((task: Task) => {
      if (!task.due_date && !task.created_at) {
        console.log(`❌ 任务 ${task.title} 没有due_date和created_at，跳过`);
        return false;
      }
      
      const taskDate = task.due_date ? dayjs(task.due_date) : dayjs(task.created_at);
      const isInWeek = taskDate.isBetween(weekStart, weekEnd, 'day', '[]');
      
      if (isInWeek) {
        console.log(`✅ 任务 ${task.title} -> 日期: ${taskDate.format('YYYY-MM-DD')} -> 在本周: ${isInWeek}`);
      }
      
      return isInWeek;
    });

    console.log(`🎯 本周任务筛选结果: ${filteredTasks.length}/${allTasks.length}`);
    if (filteredTasks.length === 0) {
      console.log('⚠️ 没有找到本周任务，检查前5个任务的日期:');
      allTasks.slice(0, 5).forEach((task: Task) => {
        const taskDate = task.due_date ? dayjs(task.due_date) : dayjs(task.created_at);
        console.log(`  - ${task.title}: ${taskDate?.format('YYYY-MM-DD') || '无日期'}`);
      });
    }
    return filteredTasks;
  }, [allTasks, weekStart, weekEnd]);

  // 计算每日任务分布
  const dailyTasks: DayTasks[] = useMemo(() => {
    if (!weeklyTasks) return [];

    const days: DayTasks[] = [];
    const today = dayjs();
    
    for (let i = 0; i < 7; i++) {
      const currentDay = weekStart.add(i, 'day');
      const dayTasks = weeklyTasks.filter((task: Task) => {
        const taskDate = task.due_date ? dayjs(task.due_date) : dayjs(task.created_at);
        return taskDate.isSame(currentDay, 'day');
      });

      days.push({
        date: currentDay.format('YYYY-MM-DD'),
        dayName: getDayName(currentDay.format('dddd')),
        tasks: dayTasks,
        isToday: currentDay.isSame(today, 'day'),
        isPast: currentDay.isBefore(today, 'day')
      });
    }

    return days;
  }, [weeklyTasks, weekStart]);

  // 计算本周统计数据
  const weeklyStats: WeeklyStats = useMemo(() => {
    console.log('🔍 计算weeklyStats，weeklyTasks:', {
      isArray: Array.isArray(weeklyTasks),
      length: weeklyTasks?.length || 0,
      isNull: weeklyTasks === null,
      isUndefined: weeklyTasks === undefined,
      actualValue: weeklyTasks
    });

    if (!weeklyTasks) {
      console.log('⚠️ weeklyTasks为空，返回默认统计数据');
      return {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        todoTasks: 0,
        overdueTasks: 0,
        completionRate: 0,
        weekRange: `${weekStart.format('MM/DD')} - ${weekEnd.format('MM/DD')}`
      };
    }

    const totalTasks = weeklyTasks.length;
    const completedTasks = weeklyTasks.filter(task => task.status === 'completed').length;
    const inProgressTasks = weeklyTasks.filter(task => ['in_progress', 'testing'].includes(task.status)).length;
    const todoTasks = weeklyTasks.filter(task => ['todo', 'draft', 'planning'].includes(task.status)).length;
    
    console.log('📊 weeklyStats计算结果:', {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks
    });
    
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 计算逾期任务
    const today = dayjs();
    const overdueTasks = weeklyTasks.filter(task => {
      if (!task.due_date || ['completed', 'cancelled', 'archived'].includes(task.status)) return false;
      return dayjs(task.due_date).isBefore(today, 'day');
    }).length;

    const finalStats = {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      overdueTasks,
      completionRate,
      weekRange: `${weekStart.format('MM/DD')} - ${weekEnd.format('MM/DD')}`
    };
    
    console.log('🎯 最终weeklyStats:', finalStats);
    return finalStats;
  }, [weeklyTasks, weekStart, weekEnd]);

  // 过滤任务
  const filteredTasks = useMemo(() => {
    if (!weeklyTasks) return [];
    
    const startTime = performance.now();

    const filtered = weeklyTasks.filter(task => {
      // 文本搜索
      const matchesSearch = !searchText || 
        task.title.toLowerCase().includes(searchText.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchText.toLowerCase());
      
      // 状态筛选
      const matchesStatus = selectedStatus === 'all' || task.status === selectedStatus;
      
      // 项目筛选
      const matchesProject = !selectedProject || task.project_id === selectedProject;
      
      // 客户筛选（通过项目关联）
      let matchesCustomer = true;
      if (selectedCustomer && projects) {
        const project = projects.find(p => p.id === task.project_id);
        if (project) {
          // 检查项目的主客户ID是否匹配
          matchesCustomer = project.company_id === selectedCustomer;
          
          // 如果有多客户关联，也检查这些客户
          if (!matchesCustomer && project.companies && project.companies.length > 0) {
            matchesCustomer = project.companies.some(
              company => company.company_id === selectedCustomer
            );
          }
        } else {
          // 如果找不到项目，则不匹配
          matchesCustomer = false;
        }
      }

      return matchesSearch && matchesStatus && matchesProject && matchesCustomer;
    });
    
    // 追踪搜索结果性能
    const endTime = performance.now();
    if (searchText.length > 0) {
      trackSearchResult(searchText, filtered.length);
    }
    
    return filtered;
  }, [weeklyTasks, searchText, selectedStatus, selectedProject, selectedCustomer, projects, trackSearchResult]);

  // 根据筛选重新计算每日任务
  const filteredDailyTasks: DayTasks[] = useMemo(() => {
    if (!filteredTasks) return [];

    const days: DayTasks[] = [];
    const today = dayjs();
    
    for (let i = 0; i < 7; i++) {
      const currentDay = weekStart.add(i, 'day');
      const dayTasks = filteredTasks.filter((task: Task) => {
        const taskDate = task.due_date ? dayjs(task.due_date) : dayjs(task.created_at);
        return taskDate.isSame(currentDay, 'day');
      });

      days.push({
        date: currentDay.format('YYYY-MM-DD'),
        dayName: getDayName(currentDay.format('dddd')),
        tasks: dayTasks,
        isToday: currentDay.isSame(today, 'day'),
        isPast: currentDay.isBefore(today, 'day')
      });
    }

    return days;
  }, [filteredTasks, weekStart]);

  // React Query dashboard manager
  const dashboardManager = useDashboardManager();
  
  // 智能预加载
  const preloadManager = useDashboardPreload();

  // 刷新所有数据
  const refreshAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        refreshTasks(),
        refreshProjects(),
        refreshCustomers()
      ]);
      // 同时失效仪表板缓存
      dashboardManager.invalidateDashboard();
      // 预加载新数据
      preloadManager.preloadNow(['dashboard', 'tasks']);
      message.success('数据刷新成功');
    } catch (error) {
      console.error('刷新数据失败:', error);
      message.error('刷新数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取任务的项目名称
  const getTaskProjectName = (projectId: number): string => {
    const project = projects?.find(p => p.id === projectId);
    return project?.name || `项目${projectId}`;
  };

  // 获取任务的客户名称
  const getTaskCustomerName = (projectId: number): string => {
    const project = projects?.find(p => p.id === projectId);
    if (!project || !customers) return '';
    
    // 首先尝试从主客户ID获取客户名称
    if (project.company_id) {
      const customer = customers.find(c => c.id === project.company_id);
      if (customer) return customer.companyName;
    }
    
    // 如果有company_name字段，直接使用
    if (project.company_name) {
      return project.company_name;
    }
    
    return '';
  };

  const isDataLoading = tasksLoading || projectsLoading || customersLoading || loading;
  const isInitialLoading = isDataLoading && !allTasks && !projects;
  
  // 智能加载状态 - 如果数据仍在加载且没有缓存数据，显示完整骨架屏
  if (isInitialLoading) {
    return <DashboardPageSkeleton />;
  }

  // 显示错误状态
  if (tasksError) {
    return (
      <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical">
                <Text type="danger">
                  <ExclamationCircleOutlined /> 数据加载失败
                </Text>
                <Text type="secondary">
                  {tasksError?.toString() || '未知错误'}
                </Text>
                <Space>
                  <Button type="primary" onClick={refreshAllData} loading={isDataLoading}>
                    重新加载
                  </Button>
                  <Button onClick={() => window.location.href = '/login'}>
                    返回登录
                  </Button>
                </Space>
              </Space>
            }
          />
        </Card>
      </div>
    );
  }

  // 显示数据为空的状态
  if (!allTasks || allTasks.length === 0) {
    return (
      <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
        <Card>
          <Empty
            description={
              <Space direction="vertical">
                <Text>暂无任务数据</Text>
                <Text type="secondary">
                  系统中还没有任务，或者您没有权限查看任务
                </Text>
                <Space>
                  <Button type="primary" onClick={refreshAllData} loading={isDataLoading}>
                    刷新数据
                  </Button>
                  <Button onClick={() => navigate('/projects')}>
                    查看项目
                  </Button>
                </Space>
              </Space>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      

      {/* 主要标签页内容 */}
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        size="large"
        style={{ background: 'transparent' }}
      >
        <TabPane 
          tab={
            <Space>
              <BarChartOutlined />
              任务周报
            </Space>
          } 
          key="dashboard"
        >
      {/* 周选择器和标题 */}
      <Card style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="large">
              <div>
                <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                  <BarChartOutlined /> 任务周报
                </Title>
                <Space>
                  <Text type="secondary" style={{ fontSize: '16px' }}>
                    {selectedWeek.format('YYYY年M月')} • {weeklyStats.weekRange}
                  </Text>
                  <Badge 
                    count={`第${selectedWeek.week()}周`} 
                    style={{ backgroundColor: '#1890ff' }}
                  />
                  {selectedWeek.isSame(dayjs(), 'week') && (
                    <Badge count="本周" color="#52c41a" />
                  )}
                </Space>
              </div>
              <Space>
                <Button 
                  icon={<LeftOutlined />} 
                  onClick={() => setSelectedWeek(selectedWeek.subtract(1, 'week'))}
                  type="text"
                >
                  上周
                </Button>
                <Button 
                  type="primary" 
                  onClick={() => setSelectedWeek(dayjs())}
                  style={{ minWidth: '80px' }}
                >
                  回到本周
                </Button>
                <Button 
                  icon={<RightOutlined />} 
                  onClick={() => setSelectedWeek(selectedWeek.add(1, 'week'))}
                  type="text"
                >
                  下周
                </Button>
              </Space>
            </Space>
          </Col>
          <Col>
            <Space>
              <Radio.Group 
                value={viewMode} 
                onChange={(e) => setViewMode(e.target.value)}
                optionType="button"
                buttonStyle="solid"
              >
                <Radio.Button value="calendar">
                  <AppstoreOutlined /> 日历视图
                </Radio.Button>
                <Radio.Button value="list">
                  <UnorderedListOutlined /> 列表视图
                </Radio.Button>
              </Radio.Group>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={refreshAllData}
                loading={isDataLoading}
              >
                刷新
              </Button>
              <Button 
                icon={<DownloadOutlined />} 
                onClick={() => {
                  trackPageAction('export-open', { taskCount: weeklyTasks?.length || 0 });
                  setExportModalVisible(true);
                }}
                disabled={!weeklyTasks || weeklyTasks.length === 0}
              >
                导出
              </Button>
              <Button 
                icon={<DashboardOutlined />} 
                onClick={() => {
                  trackPageAction('performance-monitor-open');
                  setPerformanceModalVisible(true);
                }}
                type="dashed"
              >
                性能监控
              </Button>
              <Button 
                icon={<ToolOutlined />} 
                onClick={() => {
                  trackPageAction('system-validation-open');
                  setValidationPanelVisible(true);
                }}
                type="dashed"
              >
                系统验证
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 筛选控制区域 */}
      <Card style={{ marginBottom: '24px' }}>
        <SmartLoading
          loading={projectsLoading && !projects}
          data={projects}
          skeleton={<ProjectSelectorSkeleton />}
        >
          <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={5}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary">项目筛选</Text>
              <Select
                value={selectedProject}
                onChange={setSelectedProject}
                style={{ width: '100%' }}
                placeholder="选择项目"
                allowClear
                loading={projectsLoading}
                showSearch
                optionFilterProp="children"
                notFoundContent={projectsError ? '加载失败' : '暂无项目'}
              >
                {projects?.map(project => (
                  <Option key={project.id} value={project.id}>
                    <ProjectOutlined style={{ marginRight: '4px' }} />
                    {project.name}
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary">客户筛选</Text>
              <Select
                value={selectedCustomer}
                onChange={setSelectedCustomer}
                style={{ width: '100%' }}
                placeholder="选择客户"
                allowClear
                loading={customersLoading}
                showSearch
                optionFilterProp="children"
                notFoundContent={customersError ? '加载失败' : '暂无客户'}
              >
                {customers?.map(customer => (
                  <Option key={customer.id} value={customer.id}>
                    <TeamOutlined style={{ marginRight: '4px' }} />
                    {customer.companyName}
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary">状态筛选</Text>
              <Select
                value={selectedStatus}
                onChange={setSelectedStatus}
                style={{ width: '100%' }}
                placeholder="选择状态"
              >
                <Option value="all">全部状态</Option>
                <Option value="todo">待办</Option>
                <Option value="in_progress">进行中</Option>
                <Option value="completed">已完成</Option>
                <Option value="cancelled">已取消</Option>
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary">搜索任务</Text>
              <Search
                placeholder="搜索任务..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: '100%' }}
                allowClear
              />
            </Space>
          </Col>
          <Col xs={24} sm={24} md={3}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary">统计</Text>
              <div style={{ padding: '6px 0' }}>
                <Badge count={filteredTasks.length} color="#1890ff" style={{ marginRight: '8px' }} />
                <Text>筛选结果</Text>
              </div>
            </Space>
          </Col>
          </Row>
        </SmartLoading>
      </Card>

      {/* 本周统计概览 */}
      <div style={{ marginBottom: '24px' }}>
        <SmartLoading
          loading={tasksLoading && !allTasks}
          data={weeklyTasks}
          skeleton={<DashboardStatsSkeleton />}
        >
          {(() => {
            console.log('🎨 UI渲染时的weeklyStats:', weeklyStats);
            console.log('🎨 UI渲染时的加载状态:', { tasksLoading, hasAllTasks: !!allTasks, hasWeeklyTasks: !!weeklyTasks });
            return null;
          })()}
          <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="本周任务总数"
              value={weeklyStats.totalTasks || 0}
              prefix={<BarChartOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff', fontSize: '24px' }}
              suffix="个"
              precision={0}
              formatter={(value) => {
                console.log('🔢 Statistic formatter called with value:', value, typeof value);
                return value?.toString() || '0';
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <div style={{ marginBottom: '4px' }}>
              <Text type="secondary">已完成</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
              <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                {weeklyStats.completedTasks}
              </span>
            </div>
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#722ed1', fontWeight: 'bold' }}>
              完成率 {weeklyStats.completionRate}%
            </div>
            <Progress 
              percent={weeklyStats.completionRate} 
              size="small" 
              showInfo={false}
              strokeColor="#722ed1"
              style={{ marginTop: '4px' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="进行中"
              value={weeklyStats.inProgressTasks || 0}
              prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16', fontSize: '24px' }}
              suffix="个"
              precision={0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="适期任务"
              value={weeklyStats.totalTasks - weeklyStats.overdueTasks}
              prefix={<CalendarOutlined style={{ color: '#13c2c2' }} />}
              valueStyle={{ color: '#13c2c2' }}
              suffix="个"
            />
            {weeklyStats.overdueTasks > 0 && (
              <div style={{ marginTop: '4px' }}>
                <Text type="danger" style={{ fontSize: '12px' }}>
                  <ExclamationCircleOutlined /> {weeklyStats.overdueTasks} 个逾期
                </Text>
              </div>
            )}
          </Card>
        </Col>
          </Row>
        </SmartLoading>
      </div>

      {/* 主要内容区域 */}
      <SmartLoading
        loading={tasksLoading && !allTasks}
        data={filteredTasks}
        skeleton={viewMode === 'calendar' ? <WeeklyCalendarSkeleton /> : <TaskListSkeleton rows={10} />}
        emptyFallback={
          <Card>
            <Empty
              description={
                <Space direction="vertical">
                  <Text>暂无符合条件的任务</Text>
                  <Text type="secondary">
                    尝试调整筛选条件或选择其他时间范围
                  </Text>
                </Space>
              }
            />
          </Card>
        }
      >
        {viewMode === 'calendar' ? (
          /* 日历视图 */
          <Row gutter={[12, 12]}>
          {filteredDailyTasks.map((day, index) => {
            const completedCount = day.tasks.filter(t => t.status === 'completed').length;
            const totalCount = day.tasks.length;
            const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            
            return (
              <Col key={day.date} xs={24} sm={12} md={8} lg={6} xl={3.42}>
                <Card
                  size="small"
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space>
                        <Text strong style={{ 
                          color: day.isToday ? '#1890ff' : day.isPast ? '#8c8c8c' : '#000000',
                          fontSize: '14px'
                        }}>
                          {day.dayName}
                        </Text>
                        {day.isToday && <Badge dot color="#1890ff" />}
                      </Space>
                      <Badge 
                        count={totalCount} 
                        color={day.isToday ? '#1890ff' : '#8c8c8c'} 
                        size="small"
                      />
                    </div>
                  }
                  extra={
                    <div style={{ textAlign: 'right' }}>
                      <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                        {dayjs(day.date).format('MM/DD')}
                      </Text>
                      {totalCount > 0 && (
                        <Text 
                          style={{ 
                            fontSize: '10px', 
                            color: completionRate === 100 ? '#52c41a' : '#fa8c16'
                          }}
                        >
                          {completionRate}%
                        </Text>
                      )}
                    </div>
                  }
                  style={{
                    borderColor: day.isToday ? '#1890ff' : undefined,
                    borderWidth: day.isToday ? '2px' : '1px',
                    backgroundColor: day.isPast ? '#fafafa' : 
                                    day.isToday ? '#f0f9ff' : undefined,
                    boxShadow: day.isToday ? '0 4px 12px rgba(24, 144, 255, 0.15)' : undefined
                  }}
                  styles={{ body: { padding: '12px 8px' } }}
                >
                  <div style={{ minHeight: '200px' }}>
                    {/* 进度条 */}
                    {totalCount > 0 && (
                      <Progress 
                        percent={completionRate}
                        size="small"
                        showInfo={false}
                        strokeColor={completionRate === 100 ? '#52c41a' : '#1890ff'}
                        style={{ marginBottom: '12px' }}
                      />
                    )}
                    
                    {totalCount === 0 ? (
                      <Empty 
                        image={Empty.PRESENTED_IMAGE_SIMPLE} 
                        description={
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {day.isToday ? '今日暂无任务' : '无任务安排'}
                          </Text>
                        }
                        style={{ margin: '40px 0' }}
                      />
                    ) : (
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        {day.tasks.map((task: Task) => {
                          const projectName = getTaskProjectName(task.project_id);
                          const isOverdue = task.due_date && 
                            !['completed', 'cancelled', 'archived'].includes(task.status) && 
                            dayjs(task.due_date).isBefore(dayjs(), 'day');
                          
                          return (
                            <Card
                              key={task.id}
                              size="small"
                              hoverable
                              style={{
                                cursor: 'pointer',
                                borderLeft: `4px solid ${getStatusColor(task.status)}`,
                                transition: 'all 0.3s ease',
                                backgroundColor: isOverdue ? '#fff2f0' : undefined
                              }}
                              onClick={() => navigate(`/projects/${task.project_id}/tasks/${task.id}`)}
                              styles={{ body: { padding: '8px' } }}
                            >
                              <div>
                                <Text 
                                  ellipsis={{ tooltip: task.title }} 
                                  style={{ 
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    display: 'block',
                                    marginBottom: '4px',
                                    textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                                    opacity: task.status === 'completed' ? 0.7 : 1,
                                    color: isOverdue ? '#ff4d4f' : undefined
                                  }}
                                >
                                  {isOverdue && '⚠️ '}
                                  {task.title}
                                </Text>
                                
                                <div style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center',
                                  marginBottom: '4px'
                                }}>
                                  <Tag 
                                    color={getStatusColor(task.status)} 
                                    style={{ fontSize: '10px', margin: 0, padding: '1px 4px' }}
                                  >
                                    {getStatusText(task.status)}
                                  </Tag>
                                  {task.custom_fields?.priority && (
                                    <Tag 
                                      color={getPriorityColor(task.custom_fields.priority)} 
                                      style={{ fontSize: '10px', margin: 0, padding: '1px 4px' }}
                                    >
                                      {task.custom_fields.priority === 'high' ? 'H' : 
                                       task.custom_fields.priority === 'medium' ? 'M' : 'L'}
                                    </Tag>
                                  )}
                                </div>
                                
                                {/* 项目信息 */}
                                <Text 
                                  type="secondary" 
                                  style={{ fontSize: '10px', display: 'block', marginBottom: '2px' }}
                                  ellipsis={{ tooltip: projectName }}
                                >
                                  📁 {projectName}
                                </Text>
                                
                                {/* 负责人 */}
                                {task.assignee_name && (
                                  <Text 
                                    type="secondary" 
                                    style={{ fontSize: '10px', display: 'block' }}
                                  >
                                    👤 {task.assignee_name}
                                  </Text>
                                )}
                              </div>
                            </Card>
                          );
                        })}
                      </Space>
                    )}
                  </div>
                </Card>
              </Col>
            );
            })}
          </Row>
        ) : (
          /* 列表视图 */
          <Card title="任务列表">
            <List
            itemLayout="horizontal"
            dataSource={filteredTasks}
            loading={isDataLoading}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条任务`,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <Space direction="vertical">
                      <Text>暂无符合条件的任务</Text>
                      {tasksError && (
                        <Text type="danger">
                          <ExclamationCircleOutlined /> 数据加载失败
                        </Text>
                      )}
                    </Space>
                  }
                />
              )
            }}
            renderItem={(task: Task) => {
              const projectName = getTaskProjectName(task.project_id);
              const customerName = getTaskCustomerName(task.project_id);
              const isOverdue = task.due_date && 
                !['completed', 'cancelled', 'archived'].includes(task.status) && 
                dayjs(task.due_date).isBefore(dayjs(), 'day');
              
              return (
                <List.Item
                  style={{ backgroundColor: isOverdue ? '#fff2f0' : undefined }}
                  actions={[
                    <Tooltip title="查看详情" key="view">
                      <Button 
                        type="text" 
                        icon={<EyeOutlined />} 
                        onClick={() => navigate(`/projects/${task.project_id}/tasks/${task.id}`)}
                      />
                    </Tooltip>,
                    <Tooltip title="编辑任务" key="edit">
                      <Button 
                        type="text" 
                        icon={<EditOutlined />} 
                        onClick={() => navigate(`/projects/${task.project_id}/tasks/${task.id}/edit`)}
                      />
                    </Tooltip>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        style={{ 
                          backgroundColor: getStatusColor(task.status),
                          color: '#fff'
                        }}
                        icon={
                          task.status === 'completed' ? <CheckCircleOutlined /> : 
                          ['in_progress', 'testing'].includes(task.status) ? <ClockCircleOutlined /> : 
                          <UserOutlined />
                        }
                      />
                    }
                    title={
                      <Space wrap>
                        <Text strong style={{ color: isOverdue ? '#ff4d4f' : undefined }}>
                          {isOverdue && '⚠️ '}
                          {task.title}
                        </Text>
                        <Tag color={getStatusColor(task.status)}>
                          {getStatusText(task.status)}
                        </Tag>
                        {task.custom_fields?.priority && (
                          <Tag color={getPriorityColor(task.custom_fields.priority)}>
                            {task.custom_fields.priority.toUpperCase()}
                          </Tag>
                        )}
                        {isOverdue && (
                          <Tag color="red">逾期</Tag>
                        )}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={4}>
                        {task.description && (
                          <Text type="secondary" ellipsis>
                            {task.description}
                          </Text>
                        )}
                        <Space wrap>
                          <Text type="secondary">
                            <ProjectOutlined /> {projectName}
                          </Text>
                          {customerName && (
                            <Text type="secondary">
                              <TeamOutlined /> {customerName}
                            </Text>
                          )}
                          {task.due_date && (
                            <Text 
                              type={isOverdue ? 'danger' : 'secondary'}
                            >
                              <CalendarOutlined /> 到期: {dayjs(task.due_date).format('MM-DD')}
                            </Text>
                          )}
                          {task.assignee_name && (
                            <Text type="secondary">
                              <UserOutlined /> {task.assignee_name}
                            </Text>
                          )}
                        </Space>
                      </Space>
                    }
                  />
                </List.Item>
              );
            }}
          />
          </Card>
        )}
      </SmartLoading>

      {/* 导出模态框 */}
      <ExportModal
        visible={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        data={{
          weekRange: `${weekStart.format('YYYY年MM月DD日')} - ${weekEnd.format('MM月DD日')}`,
          selectedWeek,
          tasks: weeklyTasks || [],
          projects: projects || [],
          customers: customers || [],
          stats: {
            totalTasks: weeklyTasks?.length || 0,
            completedTasks: weeklyTasks?.filter(task => task.status === 'completed').length || 0,
            inProgressTasks: weeklyTasks?.filter(task => task.status === 'in_progress').length || 0,
            todoTasks: weeklyTasks?.filter(task => task.status === 'todo').length || 0,
            overdueTasks: weeklyTasks?.filter(task => 
              task.due_date && dayjs(task.due_date).isBefore(dayjs(), 'day') && task.status !== 'completed'
            ).length || 0,
            completionRate: weeklyTasks?.length ? 
              Math.round((weeklyTasks.filter(task => task.status === 'completed').length / weeklyTasks.length) * 100) : 0,
          },
          filters: {
            selectedProject,
            selectedCustomer,
            selectedStatus,
            searchText,
          },
        }}
      />

      {/* 性能监控仪表板 */}
      <PerformanceMonitorDashboard
        visible={performanceModalVisible}
        onClose={() => setPerformanceModalVisible(false)}
      />

        </TabPane>

        <TabPane 
          tab={
            <Space>
              <BulbOutlined />
              任务分析
            </Space>
          } 
          key="analysis"
        >
          <TaskAnalysisPanel 
            projectId={selectedProject}
            taskId={undefined}
            style={{ marginTop: 16 }}
            allTasks={allTasks}
          />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default TaskDashboardPage;