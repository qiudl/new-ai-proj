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
  message
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
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { DashboardService } from '../services/dashboardService';
import { projectService } from '../services/projectService';
import companyService from '../services/companyService';
import { Task } from '../types/task';
import { Project } from '../types/project';
import { Company } from '../types/company';
import { useCache } from '../hooks/useCache';
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

// 获取状态颜色
const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return '#52c41a';
    case 'in_progress': return '#1890ff';
    case 'todo': return '#8c8c8c';
    case 'cancelled': return '#ff4d4f';
    default: return '#8c8c8c';
  }
};

// 获取状态文本
const getStatusText = (status: string) => {
  switch (status) {
    case 'completed': return '已完成';
    case 'in_progress': return '进行中';
    case 'todo': return '待办';
    case 'cancelled': return '已取消';
    default: return status;
  }
};

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
  const [selectedWeek, setSelectedWeek] = useState<Dayjs>(dayjs());
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<number | undefined>(undefined);
  const [selectedCustomer, setSelectedCustomer] = useState<number | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [loading, setLoading] = useState(false);

  // 计算当前周的开始和结束日期
  const weekStart = useMemo(() => {
    return selectedWeek.startOf('week');
  }, [selectedWeek]);

  const weekEnd = useMemo(() => {
    return selectedWeek.endOf('week');
  }, [selectedWeek]);

  // 获取项目列表
  const {
    data: projects,
    loading: projectsLoading,
    error: projectsError,
    refresh: refreshProjects
  } = useCache<Project[]>(
    'task-dashboard-projects',
    async () => {
      try {
        const response = await projectService.getProjects({ page: 1, pageSize: 100 });
        return response.data || [];
      } catch (error) {
        console.error('获取项目列表失败:', error);
        message.error('获取项目列表失败');
        return [];
      }
    },
    { ttl: 5 * 60 * 1000 } // 5分钟缓存
  );

  // 获取客户列表
  const {
    data: customers,
    loading: customersLoading,
    error: customersError,
    refresh: refreshCustomers
  } = useCache<Company[]>(
    'task-dashboard-customers',
    async () => {
      try {
        const response = await companyService.getCompanies({ page: 1, pageSize: 100 });
        return response.data || [];
      } catch (error) {
        console.error('获取客户列表失败:', error);
        message.error('获取客户列表失败');
        return [];
      }
    },
    { ttl: 5 * 60 * 1000 } // 5分钟缓存
  );

  // 获取所有任务数据
  const {
    data: allTasks,
    loading: tasksLoading,
    error: tasksError,
    refresh: refreshTasks
  } = useCache<Task[]>(
    'task-dashboard-all-tasks',
    async () => {
      try {
        setLoading(true);
        console.log('🔄 开始获取所有任务数据...');
        
        // 检查认证状态
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('❌ 未找到认证token，用户未登录');
          message.error('请先登录');
          throw new Error('未登录');
        }
        
        const tasks = await DashboardService.getAllTasks();
        console.log('✅ 获取到的所有任务:', tasks, '总数:', tasks?.length || 0);
        
        if (!tasks || tasks.length === 0) {
          console.warn('⚠️ 未获取到任务数据，可能是没有任务或API返回空数组');
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
    { ttl: 2 * 60 * 1000 } // 2分钟缓存
  );

  // 筛选本周任务
  const weeklyTasks = useMemo(() => {
    if (!allTasks) {
      console.log('🔍 筛选本周任务: allTasks为空');
      return [];
    }

    console.log('🔍 筛选本周任务: 总任务数', allTasks.length);
    console.log('🔍 本周范围:', weekStart.format('YYYY-MM-DD'), '到', weekEnd.format('YYYY-MM-DD'));

    const filteredTasks = allTasks.filter((task: Task) => {
      if (!task.due_date && !task.created_at) {
        console.log('  🔍 任务无日期:', task.title);
        return false;
      }
      
      const taskDate = task.due_date ? dayjs(task.due_date) : dayjs(task.created_at);
      const isInWeek = taskDate.isBetween(weekStart, weekEnd, 'day', '[]');
      
      console.log(`  🔍 任务 "${task.title}": ${taskDate.format('YYYY-MM-DD')} -> 在本周: ${isInWeek}`);
      
      return isInWeek;
    });

    console.log('✅ 本周任务筛选结果:', filteredTasks.length, '个任务');
    
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
    if (!weeklyTasks) {
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
    const inProgressTasks = weeklyTasks.filter(task => task.status === 'in_progress').length;
    const todoTasks = weeklyTasks.filter(task => task.status === 'todo').length;
    
    // 计算逾期任务
    const today = dayjs();
    const overdueTasks = weeklyTasks.filter(task => {
      if (!task.due_date || task.status === 'completed') return false;
      return dayjs(task.due_date).isBefore(today, 'day');
    }).length;

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      overdueTasks,
      completionRate,
      weekRange: `${weekStart.format('MM/DD')} - ${weekEnd.format('MM/DD')}`
    };
  }, [weeklyTasks, weekStart, weekEnd]);

  // 过滤任务
  const filteredTasks = useMemo(() => {
    if (!weeklyTasks) return [];

    return weeklyTasks.filter(task => {
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
  }, [weeklyTasks, searchText, selectedStatus, selectedProject, selectedCustomer, projects]);

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

  // 刷新所有数据
  const refreshAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        refreshTasks(),
        refreshProjects(),
        refreshCustomers()
      ]);
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

  // 如果数据仍在加载且没有缓存数据
  if (isDataLoading && !allTasks) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <Spin size="large" tip="加载任务数据...">
          <div style={{ height: '200px', width: '100%' }} />
        </Spin>
      </div>
    );
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
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 筛选控制区域 */}
      <Card style={{ marginBottom: '24px' }}>
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
      </Card>

      {/* 本周统计概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="本周任务总数"
              value={weeklyStats.totalTasks}
              prefix={<BarChartOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="已完成"
              value={weeklyStats.completedTasks}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="进行中"
              value={weeklyStats.inProgressTasks}
              prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <div style={{ marginBottom: '8px' }}>
              <Text type="secondary">完成率</Text>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#722ed1', marginBottom: '8px' }}>
              {weeklyStats.completionRate}%
            </div>
            <Progress 
              percent={weeklyStats.completionRate} 
              size="small" 
              showInfo={false}
              strokeColor="#722ed1"
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

      {/* 主要内容区域 */}
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
                            task.status !== 'completed' && 
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
                task.status !== 'completed' && 
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
                          task.status === 'in_progress' ? <ClockCircleOutlined /> : 
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
    </div>
  );
};

export default TaskDashboardPage;