// @ts-nocheck
import React, { useState, useEffect} from 'react';
import {
 Card, 
 Statistic, 
 Typography, 
 Empty, 
 message,
 DatePicker} from 'antd';
import {
 
 ReloadOutlined, 
 PrinterOutlined, 
 WifiOutlined} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs, {} from 'dayjs';
// 使用增强的服务
import weeklyReportService, { 
 WeeklyStats, 
 DailyStats, 
 TaskTimeEntry, 
 ProjectTimeStats 
} from '../services/weeklyReportServiceEnhanced';
import { checkTokenValidity } from '../services/apiEnhanced';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;


const TimeWeeklyReportPageEnhanced: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDateRange, setSelectedDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('week'),
    dayjs().endOf('week')
  ]);

  // 数据状态
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
    const avgHoursPerDay = totalDaysWorked > 0 ? weeklyStats.totalHours / totalDaysWorked : 0;
    const avgEfficiency = dailyStats.length > 0 
      ? dailyStats.reduce((sum, day) => sum + day.efficiency, 0) / dailyStats.length 
      : 0;
    const bestDay = dailyStats.length > 0 
      ? dailyStats.reduce((max, day) => day.efficiency > max.efficiency ? day : max, dailyStats[0])
      : null;
    
    return {
      totalDaysWorked,
      avgHoursPerDay,
      avgEfficiency,
      bestDay,
      completionRate: weeklyStats.totalTasks > 0 
        ? (weeklyStats.completedTasks / weeklyStats.totalTasks) * 100 
        : 0
    };
  }, [weeklyStats, dailyStats]);

  // 加载周报数据 - 增强版本
  const loadWeeklyReport = async (showLoading = true, isRetry = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      
      // 检查Token有效性
      if (!checkTokenValidity()) {
        console.warn('🔐 Token无效，重定向到登录页');
        navigate('/login');
        return;
      }
      
      const startDate = selectedDateRange[0].format('YYYY-MM-DD');
      const endDate = selectedDateRange[1].format('YYYY-MM-DD');
      
      console.log(`📅 加载周报数据: ${startDate} 到 ${endDate}`);
      
      const reportData = await weeklyReportService.getWeeklyReport(startDate, endDate);
      
      console.log('📊 收到周报数据:', reportData);
      
      // 更新状态
      setWeeklyStats(reportData.weeklyStats);
      setDailyStats(reportData.dailyStats);
      setTaskTimeEntries(reportData.taskTimeEntries);
      setProjectStats(reportData.projectStats);
      setLastUpdateTime(new Date());
      setRetryCount(0);
      
      if (!isRetry) {
        message.success('周报数据加载成功');
      }
    } catch (error: any) {
      console.error('💥 加载周报数据失败:', error);
      setError('加载周报数据失败，请检查网络连接或稍后重试');
      
      if (error?.message?.includes('401') || error?.message?.includes('认证')) {
        console.warn('🔐 认证失败，可能需要重新登录');
        navigate('/login');
      } else {
        message.error('加载周报数据失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  // 重试加载
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    console.log(`🔄 重试加载周报数据 (第${retryCount + 1}次)`);
    loadWeeklyReport(true, true);
  };

  // 页面加载时获取数据
  useEffect(() => {
    console.log('🚀 周报页面组件挂载，开始加载数据');
    loadWeeklyReport();
  }, []);

  // 日期范围变化时重新加载数据
  useEffect(() => {
    if (selectedDateRange[0] && selectedDateRange[1]) {
      console.log('📅 日期范围变更，重新加载数据');
      loadWeeklyReport();
    }
  }, [selectedDateRange]);

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
      console.error('💥 导出报告失败:', error);
      message.error('导出报告失败，请稍后重试');
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    console.log('🔄 用户手动刷新数据');
    loadWeeklyReport();
  };

  // 错误状态渲染
  if (error && !loading) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="数据加载失败"
          description={
            <div>
              <p>{error}</p>
              <p>已重试 {retryCount} 次</p>
              <Space style={{ marginTop: '12px' }}>
                <Button 
                  type="primary" 
                  icon={<ReloadOutlined />} 
                  onClick={handleRetry}
                >
                  重试
                </Button>
                <Button 
                  icon={<WifiOutlined />} 
                  onClick={() => window.location.reload()}
                >
                  刷新页面
                </Button>
              </Space>
            </div>
          }
          type="error"
          showIcon
        />
      </div>
    );
  }
  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 页面标题和操作 */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            <CalendarOutlined style={{ marginRight: '8px' }} />
            时间周报
            {loading && <Spin size="small" style={{ marginLeft: '12px' }} />}
          </Title>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Text type="secondary" style={{ fontSize: '16px' }}>
              {selectedDateRange[0].format('MM月DD日')} - {selectedDateRange[1].format('MM月DD日')} 工作总结
            </Text>
            {lastUpdateTime && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                (更新于 {lastUpdateTime.toLocaleTimeString()})
              </Text>
            )}
          </div>
        </div>
        <Space>
          <RangePicker
            value={selectedDateRange}
            onChange={(dates) => dates && setSelectedDateRange(dates as [Dayjs, Dayjs])}
            format="MM-DD"
            allowClear={false}
            disabled={loading}
          />
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleRefresh}
            loading={loading}
          >
            刷新
          </Button>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={handleExportReport}
            disabled={loading}
          >
            导出
          </Button>
          <Button 
            icon={<PrinterOutlined />} 
            onClick={() => window.print()}
            disabled={loading}
          >
            打印
          </Button>
        </Space>
      </div>

      {/* 连接状态指示器 */}
      {!checkTokenValidity() && (
        <Alert
          message="认证状态异常"
          description="您的登录状态可能已过期，部分功能可能无法正常使用。"
          type="warning"
          action={
            <Button 
              size="small" 
              type="primary" 
              onClick={() => navigate('/login')}
            >
              重新登录
            </Button>
          }
          style={{ marginBottom: '16px' }}
          showIcon
        />
      )}

      {/* 数据为空状态 */}
      {!loading && weeklyStats.totalHours === 0 && taskTimeEntries.length === 0 && (
        <Card>
          <Empty 
            description="暂无周报数据"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <p>选择的时间范围内没有工作记录</p>
            <Button type="primary" onClick={handleRefresh}>
              刷新数据
            </Button>
          </Empty>
        </Card>
      )}

      {/* 核心统计卡片 */}
      {(weeklyStats.totalHours > 0 || taskTimeEntries.length > 0) && (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="总工作时长"
                  value={weeklyStats.totalHours}
                  suffix="小时"
                  prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
                  valueStyle={{ color: '#1890ff' }}
                  loading={loading}
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
                  loading={loading}
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
                  prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                  valueStyle={{ color: '#faad14' }}
                  loading={loading}
                />
                <div style={{ marginTop: '8px' }}>
                  <Text type="secondary">
                    {weekSummary.bestDay ? 
                      `最佳: ${dayjs(weekSummary.bestDay.date).format('MM-DD')}` : 
                      '暂无数据'
                    }
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
                  loading={loading}
                />
                <div style={{ marginTop: '8px' }}>
                  <Text type="secondary">
                    活跃天数
                  </Text>
                </div>
              </Card>
            </Col>
          </Row>

          {/* 详细分析区域 */}
          <Card loading={loading}>
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              <TabPane tab="概览分析" key="overview">
                <Row gutter={[16, 16]}>
                  {/* 每日统计 */}
                  <Col xs={24} lg={12}>
                    <Card title="每日工作统计" size="small">
                      {dailyStats.length > 0 ? (
                        <Space direction="vertical" style={{ width: '100%' }}>
                          {dailyStats.map((day, index) => (
                            <div key={index} style={{ 
                              padding: '8px', 
                              border: '1px solid #f0f0f0', 
                              borderRadius: '6px' 
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text strong>{dayjs(day.date).format('MM-DD dddd')}</Text>
                                <Text>{day.totalHours}h</Text>
                              </div>
                              <div style={{ marginTop: '4px' }}>
                                <Progress
                                  percent={day.efficiency}
                                  size="small"
                                  status={day.efficiency >= 85 ? 'success' : day.efficiency >= 70 ? 'active' : 'exception'}
                                />
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  {day.tasksCompleted} 个任务完成，效率 {day.efficiency}%
                                </Text>
                              </div>
                            </div>
                          ))}
                        </Space>
                      ) : (
                        <Empty description="暂无每日统计" />
                      )}
                    </Card>
                  </Col>

                  {/* 项目统计 */}
                  <Col xs={24} lg={12}>
                    <Card title="项目时间分布" size="small">
                      {projectStats.length > 0 ? (
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
                      ) : (
                        <Empty description="暂无项目统计" />
                      )}
                    </Card>
                  </Col>

                  {/* 任务列表 */}
                  <Col xs={24}>
                    <Card title="任务执行记录" size="small">
                      {taskTimeEntries.length > 0 ? (
                        <Space direction="vertical" style={{ width: '100%' }}>
                          {taskTimeEntries.slice(0, 10).map((task, index) => (
                            <div key={index} style={{ 
                              padding: '12px', 
                              border: '1px solid #f0f0f0', 
                              borderRadius: '6px',
                              background: task.status === 'completed' ? '#f6ffed' : 
                                         task.status === 'in_progress' ? '#e6f7ff' : '#fff7e6'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <Text strong>{task.taskTitle}</Text>
                                  <br />
                                  <Text type="secondary">{task.projectName}</Text>
                                </div>
                                <Space>
                                  <Tag color={
                                    task.priority === 'high' ? 'red' : 
                                    task.priority === 'medium' ? 'orange' : 'green'
                                  }>
                                    {task.priority === 'high' ? '高' : 
                                     task.priority === 'medium' ? '中' : '低'}优先级
                                  </Tag>
                                  <Tag color={
                                    task.status === 'completed' ? 'success' : 
                                    task.status === 'in_progress' ? 'processing' : 'default'
                                  }>
                                    {task.status === 'completed' ? '已完成' : 
                                     task.status === 'in_progress' ? '进行中' : '待办'}
                                  </Tag>
                                  <Text>{task.duration}h</Text>
                                </Space>
                              </div>
                            </div>
                          ))}
                          {taskTimeEntries.length > 10 && (
                            <Text type="secondary">
                              还有 {taskTimeEntries.length - 10} 个任务记录...
                            </Text>
                          )}
                        </Space>
                      ) : (
                        <Empty description="暂无任务记录" />
                      )}
                    </Card>
                  </Col>
                </Row>
              </TabPane>

              <TabPane tab="数据详情" key="details">
                <Row gutter={[16, 16]}>
                  <Col xs={24}>
                    <Alert
                      message="调试信息"
                      description={
                        <div>
                          <p><strong>数据统计:</strong></p>
                          <ul>
                            <li>周报数据: {weeklyStats.totalHours}小时 / {weeklyStats.totalTasks}任务</li>
                            <li>每日统计: {dailyStats.length} 天</li>
                            <li>任务记录: {taskTimeEntries.length} 条</li>
                            <li>项目统计: {projectStats.length} 个项目</li>
                            <li>最后更新: {lastUpdateTime?.toLocaleString() || '未知'}</li>
                            <li>重试次数: {retryCount}</li>
                          </ul>
                        </div>
                      }
                      type="info"
                      showIcon
                    />
                  </Col>
                </Row>
              </TabPane>
            </Tabs>
          </Card>
        </>
      )}
    </div>
  );
};

export default TimeWeeklyReportPageEnhanced;