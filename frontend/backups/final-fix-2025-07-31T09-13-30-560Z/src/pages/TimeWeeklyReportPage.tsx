// @ts-nocheck
import React, { useState, useEffect} from 'react';
import {
 Card, 
 Statistic, 
 Typography, 
 Empty, 
 message, 
 DatePicker, 
 Calendar, 
 Select
} from 'antd';
import {
 ReloadOutlined,
 BarChartOutlined, 
 PrinterOutlined,
 LineChartOutlined, 
 ProjectOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import isBetween from 'dayjs/plugin/isBetween';
// 使用统一的dayjs配置
import '../utils/dayjs';
// 导入Google日历风格样式
import '../components/GoogleCalendarWeekView.css';
// 导入周报API服务
import weeklyReportService, { 
 WeeklyStats, 
 DailyStats, 
 TaskTimeEntry, 
 ProjectTimeStats 
} from '../services/weeklyReportService';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;



dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(isBetween);

const TimeWeeklyReportPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(dayjs());
  const [activeTab, setActiveTab] = useState('week-view');
  const [selectedDateRange, setSelectedDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('week'),
    dayjs().endOf('week')
  ]);

  // 真实数据状态
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    totalHours: 0,
    completedTasks: 0,
    totalTasks: 0,
    efficiency: 0,
    weekStart: dayjs().startOf('week').format('YYYY-MM-DD'),
    weekEnd: dayjs().endOf('week').format('YYYY-MM-DD')
  });
  const [taskTimeEntries, setTaskTimeEntries] = useState<TaskTimeEntry[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [projectStats, setProjectStats] = useState<ProjectTimeStats[]>([]);

  // 计算周统计
  const weekSummary = useMemo(() => {
    const totalDaysWorked = dailyStats.filter(day => day.totalHours > 0).length;
    const avgHoursPerDay = weeklyStats.totalHours / totalDaysWorked || 0;
    const avgEfficiency = dailyStats.reduce((sum, day) => sum + day.efficiency, 0) / dailyStats.length;
    const bestDay = dailyStats.reduce((max, day) => day.efficiency > max.efficiency ? day : max, dailyStats[0]);
    
    return {
      totalDaysWorked,
      avgHoursPerDay,
      avgEfficiency,
      bestDay,
      completionRate: (weeklyStats.completedTasks / weeklyStats.totalTasks) * 100
    };
  }, [weeklyStats, dailyStats]);

  // 加载周报数据
  const loadWeeklyReport = async () => {
    try {
      setLoading(true);
      const startDate = selectedDateRange[0].format('YYYY-MM-DD');
      const endDate = selectedDateRange[1].format('YYYY-MM-DD');
      
      const reportData = await weeklyReportService.getWeeklyReport(startDate, endDate);
      
      setWeeklyStats(reportData.weeklyStats);
      setDailyStats(reportData.dailyStats);
      setTaskTimeEntries(reportData.taskTimeEntries);
      setProjectStats(reportData.projectStats);
      
      message.success('周报数据加载成功');
    } catch (error) {
      console.error('加载周报数据失败:', error);
      message.error('加载周报数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时获取数据
  useEffect(() => {
    loadWeeklyReport();
  }, []);

  // 日期范围变化时重新加载数据
  useEffect(() => {
    if (selectedDateRange[0] && selectedDateRange[1]) {
      loadWeeklyReport();
    }
  }, [selectedDateRange]);

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ff4d4f';
      case 'medium': return '#faad14';
      case 'low': return '#52c41a';
      default: return '#d9d9d9';
    }
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusMap = {
      'completed': { color: 'success', text: '已完成' },
      'in_progress': { color: 'processing', text: '进行中' },
      'todo': { color: 'default', text: '待办' }
    };
    const config = statusMap[status as keyof typeof statusMap];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 导出报告
  const handleExportReport = async () => {
    try {
      const startDate = selectedDateRange[0].format('YYYY-MM-DD');
      const endDate = selectedDateRange[1].format('YYYY-MM-DD');
      
      const jsonData = await weeklyReportService.exportWeeklyReportJSON(startDate, endDate);
      
      // 创建下载链接
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `weekly-report-${startDate}-to-${endDate}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      message.success('报告导出成功！');
    } catch (error) {
      console.error('导出报告失败:', error);
      message.error('导出报告失败，请稍后重试');
    }
  };

  // 打印报告
  const handlePrintReport = () => {
    window.print();
  };

  // 刷新数据
  const handleRefresh = () => {
    loadWeeklyReport();
  };

  // 时间轴数据
  const timelineData = useMemo(() => {
    return taskTimeEntries.map(entry => ({
      color: entry.status === 'completed' ? 'green' : entry.status === 'in_progress' ? 'blue' : 'gray',
      children: (
        <div>
          <Space direction="vertical" size="small">
            <Text strong>{entry.taskTitle}</Text>
            <Text type="secondary">{entry.projectName}</Text>
            <Space>
              <Tag color={getPriorityColor(entry.priority)}>
                {entry.priority === 'high' ? '高' : entry.priority === 'medium' ? '中' : '低'}优先级
              </Tag>
              {getStatusTag(entry.status)}
              <Text>{entry.duration}小时</Text>
            </Space>
          </Space>
        </div>
      )
    }));
  }, [taskTimeEntries]);

  // 日历数据 - Google Calendar 风格
  const getCalendarData = (value: dayjs.Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    const dayData = dailyStats.find(day => day.date === dateStr);
    const dayTasks = taskTimeEntries.filter(entry => 
      dayjs(entry.date).format('YYYY-MM-DD') === dateStr
    );
    
    if (!dayData || (dayData.totalHours === 0 && dayTasks.length === 0)) return null;
    
    return {
      type: dayData?.efficiency >= 85 ? 'success' : dayData?.efficiency >= 70 ? 'warning' : 'error',
      content: `${dayData?.totalHours || 0}h`,
      tasks: dayTasks
    };
  };

  // 日历单元格渲染 - Google Calendar 风格
  const dateCellRender = (value: dayjs.Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    const dayTasks = taskTimeEntries.filter(entry => 
      dayjs(entry.date).format('YYYY-MM-DD') === dateStr
    );
    
    if (dayTasks.length === 0) return null;

    return (
      <div style={{ fontSize: '12px', lineHeight: '16px' }}>
        {dayTasks.slice(0, 3).map((task, index) => (
          <div
            key={index}
            style={{
              background: task.status === 'completed' ? '#f6ffed' : 
                         task.status === 'in_progress' ? '#e6f7ff' : '#fff7e6',
              border: `1px solid ${task.status === 'completed' ? '#b7eb8f' : 
                                  task.status === 'in_progress' ? '#91d5ff' : '#ffd591'}`,
              borderRadius: '4px',
              padding: '2px 4px',
              margin: '1px 0',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              cursor: 'pointer'
            }}
            title={`${task.taskTitle} - ${task.projectName} (${task.duration}h)`}
          >
            <span style={{
              color: task.status === 'completed' ? '#52c41a' : 
                     task.status === 'in_progress' ? '#1890ff' : '#fa8c16',
              fontSize: '10px',
              marginRight: '2px'
            }}>
              ●
            </span>
            <span style={{ fontSize: '10px' }}>
              {task.taskTitle.length > 15 ? `${task.taskTitle.substring(0, 15)}...` : task.taskTitle}
            </span>
          </div>
        ))}
        {dayTasks.length > 3 && (
          <div style={{
            fontSize: '10px',
            color: '#666',
            textAlign: 'center',
            padding: '1px 0'
          }}>
            +{dayTasks.length - 3} 更多
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 页面标题和操作 */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            <CalendarOutlined style={{ marginRight: '8px' }} />
            时间周报
          </Title>
          <Text type="secondary" style={{ fontSize: '16px' }}>
            {selectedDateRange[0].format('MM月DD日')} - {selectedDateRange[1].format('MM月DD日')} 工作总结
          </Text>
        </div>
        <Space>
          <RangePicker
            value={selectedDateRange}
            onChange={(dates) => dates && setSelectedDateRange(dates as [Dayjs, Dayjs])}
            format="MM-DD"
            allowClear={false}
          />
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleRefresh}
            loading={loading}
          >
            刷新
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExportReport}>
            导出
          </Button>
          <Button icon={<PrinterOutlined />} onClick={handlePrintReport}>
            打印
          </Button>
        </Space>
      </div>

      {/* 核心统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总工作时长"
              value={weeklyStats.totalHours}
              suffix="小时"
              prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary">
                日均 {weekSummary.avgHoursPerDay.toFixed(1)} 小时
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="任务完成率"
              value={weekSummary.completionRate}
              suffix="%"
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary">
                {weeklyStats.completedTasks}/{weeklyStats.totalTasks} 个任务
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="工作效率"
              value={weekSummary.avgEfficiency}
              suffix="%"
              prefix={<ThunderboltOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary">
                最佳: {weekSummary.bestDay?.date && dayjs(weekSummary.bestDay.date).format('MM-DD')}
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="工作天数"
              value={weekSummary.totalDaysWorked}
              suffix="天"
              prefix={<CalendarOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary">
                连续工作周
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 详细分析标签页 */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={<span><BarChartOutlined />概览分析</span>} key="overview">
            <Row gutter={[16, 16]}>
              {/* 每日工作统计 */}
              <Col xs={24} lg={12}>
                <Card title="每日工作统计" size="small">
                  <Table
                    dataSource={dailyStats}
                    rowKey="date"
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: '日期',
                        dataIndex: 'date',
                        render: (date) => dayjs(date).format('MM-DD dddd')
                      },
                      {
                        title: '工作时长',
                        dataIndex: 'totalHours',
                        render: (hours) => `${hours}h`
                      },
                      {
                        title: '完成任务',
                        dataIndex: 'tasksCompleted',
                        render: (count) => <Badge count={count} showZero />
                      },
                      {
                        title: '效率',
                        dataIndex: 'efficiency',
                        render: (efficiency) => (
                          <Progress
                            percent={efficiency}
                            size="small"
                            status={efficiency >= 85 ? 'success' : efficiency >= 70 ? 'active' : 'exception'}
                            showInfo={false}
                          />
                        )
                      }
                    ]}
                  />
                </Card>
              </Col>

              {/* 项目时间分布 */}
              <Col xs={24} lg={12}>
                <Card title="项目时间分布" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {projectStats.map((project, index) => (
                      <div key={index}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <Text strong>{project.projectName}</Text>
                          <Text>{project.totalHours}h</Text>
                        </div>
                        <Progress
                          percent={(project.totalHours / weeklyStats.totalHours) * 100}
                          strokeColor={project.color}
                          showInfo={false}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
                          <span>{project.tasksCount} 个任务</span>
                          <span>完成率 {project.completionRate}%</span>
                        </div>
                      </div>
                    ))}
                  </Space>
                </Card>
              </Col>

              {/* 工作亮点 */}
              <Col xs={24}>
                <Card title="本周亮点" size="small">
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={8}>
                      <Alert
                        message="最高效的一天"
                        description={
                          <div>
                            <Text strong>{dayjs(weekSummary.bestDay?.date).format('MM月DD日')}</Text>
                            <br />
                            <Text>效率达到 {weekSummary.bestDay?.efficiency}%</Text>
                            <br />
                            <Text type="secondary">主要任务: {weekSummary.bestDay?.topTask}</Text>
                          </div>
                        }
                        type="success"
                        showIcon
                      />
                    </Col>
                    <Col xs={24} sm={8}>
                      <Alert
                        message="工作时长统计"
                        description={
                          <div>
                            <Text>总计 {weeklyStats.totalHours} 小时</Text>
                            <br />
                            <Text>超出计划 2.5 小时</Text>
                            <br />
                            <Text type="secondary">建议合理安排工作量</Text>
                          </div>
                        }
                        type="info"
                        showIcon
                      />
                    </Col>
                    <Col xs={24} sm={8}>
                      <Alert
                        message="任务完成情况"
                        description={
                          <div>
                            <Text>完成率 {weekSummary.completionRate.toFixed(0)}%</Text>
                            <br />
                            <Text>超额完成 3 个任务</Text>
                            <br />
                            <Text type="secondary">表现优秀</Text>
                          </div>
                        }
                        type="warning"
                        showIcon
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab={<span><LineChartOutlined />任务时间轴</span>} key="timeline">
            <Card title="任务执行时间轴" size="small">
              <Timeline items={timelineData} />
            </Card>
          </TabPane>

          <TabPane tab={<span><CalendarOutlined />周视图</span>} key="week-view">
            <Card title="Google 日历风格周视图" size="small">
              <div className="google-calendar-week-view">
                {/* 星期标题 */}
                {['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map((day, index) => (
                  <div key={day} className="week-day-header">
                    {day}
                  </div>
                ))}
                
                {/* 日期格子 */}
                {Array.from({ length: 7 }, (_, index) => {
                  const currentDate = selectedDateRange[0].startOf('week').add(index, 'day');
                  const dateStr = currentDate.format('YYYY-MM-DD');
                  const dayTasks = taskTimeEntries.filter(entry => 
                    dayjs(entry.date).format('YYYY-MM-DD') === dateStr
                  );
                  const dayData = dailyStats.find(day => day.date === dateStr);
                  const isToday = currentDate.isSame(dayjs(), 'day');
                  const isInSelectedRange = currentDate.isBetween(
                    selectedDateRange[0], 
                    selectedDateRange[1], 
                    'day', 
                    '[]'
                  );

                  return (
                    <div 
                      key={dateStr} 
                      className={`week-day-cell ${isToday ? 'today' : ''} ${!isInSelectedRange ? 'out-of-range' : ''}`}
                    >
                      {/* 日期头部 */}
                      <div className="day-header">
                        <Text className={`day-number ${isToday ? 'today' : ''}`}>
                          {currentDate.date()}
                        </Text>
                        {dayData && dayData.totalHours > 0 && (
                          <Tag color={
                            dayData.efficiency >= 85 ? 'success' : 
                            dayData.efficiency >= 70 ? 'warning' : 'error'
                          }>
                            {dayData.totalHours}h
                          </Tag>
                        )}
                      </div>
                      
                      {/* 任务列表 */}
                      <div className="day-tasks">
                        {dayTasks.slice(0, 4).map((task, taskIndex) => (
                          <Tooltip 
                            key={taskIndex}
                            title={`${task.taskTitle} - ${task.projectName} (${task.duration}h)`}
                          >
                            <div className={`task-item ${task.status}`}>
                              <div className="task-content">
                                <div className="task-title-wrapper">
                                  <span className={`task-status-dot ${task.status}`}>
                                    ●
                                  </span>
                                  <Text ellipsis className="task-title">
                                    {task.taskTitle}
                                  </Text>
                                </div>
                                <Text type="secondary" className="task-duration">
                                  {task.duration}h
                                </Text>
                              </div>
                              {task.projectName && (
                                <Text type="secondary" className="task-project" ellipsis>
                                  📁 {task.projectName}
                                </Text>
                              )}
                            </div>
                          </Tooltip>
                        ))}
                        
                        {/* 显示更多任务的提示 */}
                        {dayTasks.length > 4 && (
                          <div className="more-tasks">
                            +{dayTasks.length - 4} 个任务
                          </div>
                        )}
                        
                        {/* 空状态 */}
                        {dayTasks.length === 0 && isInSelectedRange && (
                          <div className="empty-day">
                            无任务
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* 图例说明 */}
              <div className="legend">
                <Title level={5} style={{ margin: '0 0 8px 0' }}>图例说明</Title>
                <Space wrap>
                  <div className="legend-item">
                    <div className="legend-dot completed"></div>
                    <Text className="legend-text">已完成任务</Text>
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot in-progress"></div>
                    <Text className="legend-text">进行中任务</Text>
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot todo"></div>
                    <Text className="legend-text">待办任务</Text>
                  </div>
                </Space>
              </div>
              
              {/* 周视图统计 */}
              <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
                <Col span={8}>
                  <Statistic
                    title="本周总任务"
                    value={taskTimeEntries.length}
                    suffix="个"
                    prefix={<ProjectOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="总工作时长"
                    value={weeklyStats.totalHours}
                    suffix="小时"
                    prefix={<ClockCircleOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="完成率"
                    value={weekSummary.completionRate}
                    suffix="%"
                    prefix={<CheckCircleOutlined />}
                  />
                </Col>
              </Row>
            </Card>
          </TabPane>

          <TabPane tab={<span><CalendarOutlined />月视图</span>} key="calendar">
            <Card title="工作日历视图" size="small">
              <Calendar
                value={currentWeek}
                onChange={setCurrentWeek}
                dateCellRender={dateCellRender}
                style={{ 
                  background: '#fff',
                  borderRadius: '6px'
                }}
              />
              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                background: '#fafafa', 
                borderRadius: '6px',
                border: '1px solid #f0f0f0'
              }}>
                <Title level={5} style={{ margin: '0 0 8px 0' }}>图例说明</Title>
                <Space wrap>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      background: '#52c41a',
                      borderRadius: '50%',
                      marginRight: '6px'
                    }}></div>
                    <Text style={{ fontSize: '12px' }}>已完成任务</Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      background: '#1890ff',
                      borderRadius: '50%',
                      marginRight: '6px'
                    }}></div>
                    <Text style={{ fontSize: '12px' }}>进行中任务</Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      background: '#fa8c16',
                      borderRadius: '50%',
                      marginRight: '6px'
                    }}></div>
                    <Text style={{ fontSize: '12px' }}>待办任务</Text>
                  </div>
                </Space>
              </div>
            </Card>
          </TabPane>

          <TabPane tab={<span><TeamOutlined />团队对比</span>} key="team">
            <Card title="团队工作效率对比" size="small">
              <Empty description="团队数据正在开发中..." />
            </Card>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default TimeWeeklyReportPage;