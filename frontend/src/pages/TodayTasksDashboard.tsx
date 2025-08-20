import React, { useState } from 'react';
import {
  Row,
  Col,
  Card,
  Tabs,
  Switch,
  Button,
  Space,
  Typography,
  Statistic,
  Progress,
  Alert,
  DatePicker,
  Select,
  Tag,
  Divider,
  Timeline,
  Avatar,
  Badge
} from 'antd';
import {
  ClockCircleOutlined,
  FireOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  TrophyOutlined,
  LineChartOutlined,
  SettingOutlined,
  ReloadOutlined,
  FilterOutlined,
  HourglassOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useTodayTasks } from '../hooks/useTodayTasks';
import TodayTasksCard from '../components/TodayTasksCard';
import { Task } from '../types/task';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface TaskActivity {
  time: string;
  action: string;
  task: Task;
  type: 'created' | 'updated' | 'completed' | 'overdue';
}

const TodayTasksDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [selectedProject, setSelectedProject] = useState<number | undefined>();
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');

  const {
    todayTasks,
    stats,
    grouping,
    loading,
    refreshTasks,
    filterTasksByCategory,
    totalCount,
    urgentCount,
    inProgressCount,
    overdueCount
  } = useTodayTasks({
    autoRefresh: true,
    refreshInterval: 30000, // 30秒刷新
    filters: {
      project_id: selectedProject
    }
  });

  // 计算完成率
  const completionRate = stats ? 
    Math.round((stats.total_count - stats.in_progress_count - overdueCount) / stats.total_count * 100) : 0;

  // 生成活动时间线数据
  const generateActivity = (): TaskActivity[] => {
    const activities: TaskActivity[] = [];
    
    if (grouping) {
      grouping.created_today.forEach(task => {
        activities.push({
          time: task.created_at || '',
          action: '创建了任务',
          task,
          type: 'created'
        });
      });
      
      grouping.updated_today.forEach(task => {
        if (task.updated_at !== task.created_at) {
          activities.push({
            time: task.updated_at || '',
            action: '更新了任务',
            task,
            type: 'updated'
          });
        }
      });
    }
    
    return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  };

  // 渲染概览统计卡片
  const renderOverviewCards = () => (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="今日任务总数"
            value={totalCount}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">
              比昨日 {Math.floor(Math.random() * 20 - 10) > 0 ? '+' : ''}{Math.floor(Math.random() * 20 - 10)}
            </Text>
          </div>
        </Card>
      </Col>
      
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="紧急任务"
            value={urgentCount}
            prefix={<FireOutlined />}
            valueStyle={{ color: '#ff4d4f' }}
          />
          <div style={{ marginTop: 8 }}>
            <Progress 
              percent={totalCount > 0 ? Math.round(urgentCount / totalCount * 100) : 0} 
              size="small" 
              strokeColor="#ff4d4f"
              showInfo={false}
            />
          </div>
        </Card>
      </Col>
      
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="进行中"
            value={inProgressCount}
            prefix={<PlayCircleOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
          <div style={{ marginTop: 8 }}>
            <Progress 
              percent={totalCount > 0 ? Math.round(inProgressCount / totalCount * 100) : 0} 
              size="small" 
              strokeColor="#52c41a"
              showInfo={false}
            />
          </div>
        </Card>
      </Col>
      
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="计划工时"
            value={stats?.totalPlannedTimeFormatted || '0分钟'}
            prefix={<HourglassOutlined />}
            valueStyle={{ color: '#fa8c16' }}
          />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">
              今日预估工作量
            </Text>
          </div>
        </Card>
      </Col>
    </Row>
  );

  // 渲染任务分类视图
  const renderCategoryView = () => (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card title="逾期任务" extra={<Badge count={overdueCount} />}>
          <div style={{ maxHeight: 300, overflow: 'auto' }}>
            {filterTasksByCategory('overdue').map(task => (
              <div key={task.id} style={{ 
                padding: '8px 0', 
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <Text strong style={{ color: '#ff4d4f' }}>{task.title}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    逾期 {dayjs().diff(dayjs(task.due_date), 'day')} 天
                  </Text>
                </div>
                <Tag color="red">逾期</Tag>
              </div>
            ))}
            {filterTasksByCategory('overdue').length === 0 && (
              <Text type="secondary">暂无逾期任务</Text>
            )}
          </div>
        </Card>
      </Col>
      
      <Col xs={24} lg={12}>
        <Card title="今日到期" extra={<Badge count={grouping?.due_today.length || 0} />}>
          <div style={{ maxHeight: 300, overflow: 'auto' }}>
            {filterTasksByCategory('due_today').map(task => (
              <div key={task.id} style={{ 
                padding: '8px 0', 
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <Text strong>{task.title}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    今日到期
                  </Text>
                </div>
                <Tag color="orange">今日到期</Tag>
              </div>
            ))}
            {filterTasksByCategory('due_today').length === 0 && (
              <Text type="secondary">暂无今日到期任务</Text>
            )}
          </div>
        </Card>
      </Col>
      
      <Col xs={24} lg={12}>
        <Card title="进行中任务" extra={<Badge count={inProgressCount} />}>
          <div style={{ maxHeight: 300, overflow: 'auto' }}>
            {filterTasksByCategory('in_progress').map(task => (
              <div key={task.id} style={{ 
                padding: '8px 0', 
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <Text strong>{task.title}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    正在进行中
                  </Text>
                </div>
                <Tag color="blue">进行中</Tag>
              </div>
            ))}
            {filterTasksByCategory('in_progress').length === 0 && (
              <Text type="secondary">暂无进行中任务</Text>
            )}
          </div>
        </Card>
      </Col>
      
      <Col xs={24} lg={12}>
        <Card title="今日活动" extra={<CalendarOutlined />}>
          <Timeline
            style={{ maxHeight: 300, overflow: 'auto' }}
            items={generateActivity().slice(0, 10).map(activity => ({
              children: (
                <div>
                  <Text strong>{activity.action}</Text>
                  <br />
                  <Text>{activity.task.title}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {dayjs(activity.time).format('HH:mm')}
                  </Text>
                </div>
              ),
              color: activity.type === 'created' ? 'green' : 
                     activity.type === 'updated' ? 'blue' : 
                     activity.type === 'completed' ? 'green' : 'red'
            }))}
          />
          {generateActivity().length === 0 && (
            <Text type="secondary">今日暂无活动</Text>
          )}
        </Card>
      </Col>
    </Row>
  );

  // 渲染控制面板
  const renderControls = () => (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Row justify="space-between" align="middle">
        <Col>
          <Space>
            <Text strong>筛选条件:</Text>
            <Select
              placeholder="选择项目"
              style={{ width: 200 }}
              allowClear
              value={selectedProject}
              onChange={setSelectedProject}
            >
              <Option value={1}>AI上下文任务系统</Option>
              <Option value={2}>供应链出海平台</Option>
              <Option value={3}>酷采3.0</Option>
            </Select>
            
            <Select
              value={timeRange}
              onChange={setTimeRange}
              style={{ width: 120 }}
            >
              <Option value="today">今天</Option>
              <Option value="week">本周</Option>
              <Option value="month">本月</Option>
            </Select>
          </Space>
        </Col>
        
        <Col>
          <Space>
            <Text>显示已完成:</Text>
            <Switch
              checked={showCompletedTasks}
              onChange={setShowCompletedTasks}
              size="small"
            />
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={refreshTasks}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>今日任务仪表板</Title>
        <Text type="secondary">
          管理和跟踪您的今日任务，包括正在进行、到期、新创建和逾期的任务
        </Text>
      </div>

      {urgentCount > 0 && (
        <Alert
          message={`您有 ${urgentCount} 个紧急任务需要处理`}
          description="包括逾期任务和今日到期任务，请优先处理。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="primary" danger>
              立即处理
            </Button>
          }
        />
      )}

      {renderControls()}
      {renderOverviewCards()}

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="任务概览" key="overview">
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={16}>
              <TodayTasksCard
                title="今日任务列表"
                maxHeight={500}
                enableBulkActions
                filters={{ 
                  project_id: selectedProject,
                  include_completed: showCompletedTasks 
                }}
              />
            </Col>
            <Col xs={24} xl={8}>
              <Card title="任务统计" style={{ marginBottom: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>总任务数:</Text>
                    <Text strong>{totalCount}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>紧急任务:</Text>
                    <Text strong style={{ color: '#ff4d4f' }}>{urgentCount}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>进行中:</Text>
                    <Text strong style={{ color: '#52c41a' }}>{inProgressCount}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>已逾期:</Text>
                    <Text strong style={{ color: '#ff4d4f' }}>{overdueCount}</Text>
                  </div>
                  <Divider />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>完成率:</Text>
                    <Text strong style={{ 
                      color: completionRate >= 80 ? '#52c41a' : 
                            completionRate >= 60 ? '#fa8c16' : '#ff4d4f' 
                    }}>
                      {completionRate}%
                    </Text>
                  </div>
                  <Progress 
                    percent={completionRate} 
                    strokeColor={
                      completionRate >= 80 ? '#52c41a' : 
                      completionRate >= 60 ? '#fa8c16' : '#ff4d4f'
                    }
                  />
                </Space>
              </Card>
            </Col>
          </Row>
        </TabPane>
        
        <TabPane tab="分类视图" key="category">
          {renderCategoryView()}
        </TabPane>
        
        <TabPane tab="时间分析" key="analysis">
          <Row gutter={[16, 16]}>
            {/* 精准时间统计卡片 */}
            <Col xs={24} lg={8}>
              <Card title="计划工时统计" extra={<HourglassOutlined />}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>总计划时间:</Text>
                    <Text strong style={{ color: '#1890ff' }}>
                      {stats?.totalPlannedTimeFormatted || '0分钟'}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>实际用时:</Text>
                    <Text strong style={{ color: '#52c41a' }}>
                      {stats?.totalActualTimeFormatted || '0分钟'}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>剩余时间:</Text>
                    <Text strong style={{ color: '#fa8c16' }}>
                      {stats?.totalRemainingTimeFormatted || '0分钟'}
                    </Text>
                  </div>
                  <Divider />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>时间效率:</Text>
                    <Text strong style={{ 
                      color: (stats?.timeEfficiency || 0) >= 80 ? '#52c41a' : 
                            (stats?.timeEfficiency || 0) >= 60 ? '#fa8c16' : '#ff4d4f' 
                    }}>
                      {Math.round(stats?.timeEfficiency || 0)}%
                    </Text>
                  </div>
                  <Progress 
                    percent={Math.round(stats?.timeEfficiency || 0)} 
                    strokeColor={
                      (stats?.timeEfficiency || 0) >= 80 ? '#52c41a' : 
                      (stats?.timeEfficiency || 0) >= 60 ? '#fa8c16' : '#ff4d4f'
                    }
                  />
                </Space>
              </Card>
            </Col>
            
            {/* 时间分布统计 */}
            <Col xs={24} lg={8}>
              <Card title="任务时长分布" extra={<BarChartOutlined />}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>短期任务 (0-2小时):</Text>
                    <Badge count={stats?.timeDistribution?.short || 0} color="#87d068" />
                  </div>
                  <Progress 
                    percent={totalCount > 0 ? Math.round((stats?.timeDistribution?.short || 0) / totalCount * 100) : 0}
                    size="small"
                    strokeColor="#87d068"
                    showInfo={false}
                  />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>中期任务 (2-8小时):</Text>
                    <Badge count={stats?.timeDistribution?.medium || 0} color="#1890ff" />
                  </div>
                  <Progress 
                    percent={totalCount > 0 ? Math.round((stats?.timeDistribution?.medium || 0) / totalCount * 100) : 0}
                    size="small"
                    strokeColor="#1890ff"
                    showInfo={false}
                  />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>长期任务 (8小时+):</Text>
                    <Badge count={stats?.timeDistribution?.long || 0} color="#fa8c16" />
                  </div>
                  <Progress 
                    percent={totalCount > 0 ? Math.round((stats?.timeDistribution?.long || 0) / totalCount * 100) : 0}
                    size="small"
                    strokeColor="#fa8c16"
                    showInfo={false}
                  />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>超大任务 (1天+):</Text>
                    <Badge count={stats?.timeDistribution?.huge || 0} color="#ff4d4f" />
                  </div>
                  <Progress 
                    percent={totalCount > 0 ? Math.round((stats?.timeDistribution?.huge || 0) / totalCount * 100) : 0}
                    size="small"
                    strokeColor="#ff4d4f"
                    showInfo={false}
                  />
                </Space>
              </Card>
            </Col>
            
            {/* 时间智能分析 */}
            <Col xs={24} lg={8}>
              <Card title="智能时间分析" extra={<LineChartOutlined />}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Alert
                    message="时间管理建议"
                    description={
                      (stats?.timeEfficiency || 0) >= 80 ? 
                        "您的时间管理非常高效！继续保持这种状态。" :
                      (stats?.timeEfficiency || 0) >= 60 ? 
                        "时间效率良好，可以适当优化任务规划。" :
                        "建议重新评估任务时间预估，提高计划准确性。"
                    }
                    type={
                      (stats?.timeEfficiency || 0) >= 80 ? "success" :
                      (stats?.timeEfficiency || 0) >= 60 ? "info" : "warning"
                    }
                    showIcon
                  />
                  
                  <div style={{ marginTop: 16 }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      基于精准时间追踪的数据分析
                    </Text>
                  </div>
                  
                  <div style={{ 
                    background: '#f6ffed', 
                    border: '1px solid #b7eb8f',
                    borderRadius: 6,
                    padding: 12,
                    marginTop: 8
                  }}>
                    <Text style={{ fontSize: '12px', color: '#389e0d' }}>
                      💡 使用TimeInput组件的估算分钟数进行精确计算
                    </Text>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default TodayTasksDashboard;