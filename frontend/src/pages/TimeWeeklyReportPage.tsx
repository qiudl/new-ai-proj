import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Progress,
  Typography,
  Space,
  Tag,
  Button,
  Badge,
  message,
  DatePicker,
  Table,
  Tabs
} from 'antd';
import {
  CalendarOutlined,
  ReloadOutlined,
  BarChartOutlined,
  DownloadOutlined,
  PrinterOutlined,
  LineChartOutlined,
  ProjectOutlined,
  RiseOutlined
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
// 使用统一的dayjs配置
import '../utils/dayjs';
// 导入周报API服务
import weeklyReportService, { 
  WeeklyStats, 
  DailyStats, 
  TaskTimeEntry, 
  ProjectTimeStats 
} from '../services/weeklyReportService';
// 🔧 [任务#714] 导入PDF导出和打印预览功能
import { exportToPDF, ExportData } from '../services/exportService';
import PrintPreview from '../components/PrintPreview';
import { Task } from '../types/task';
// 导入数据分析图表组件
import TimerAnalyticsCharts from '../components/TimerAnalyticsCharts';
// 导入任务统计组件
import TaskStatsTab from '../components/TaskStatsTab';
// 导入每日工作详情组件
import DailyWorkDetail from '../components/DailyWorkDetail';
// 导入最近7天工作详情组件
import RecentWeekWorkDetail from '../components/RecentWeekWorkDetail';
// 导入简化版任务时间轴组件（临时修复卡死问题）
import SimpleTaskTimeline from '../components/SimpleTaskTimeline';
// 导入日效率对比分析组件
import DailyComparisonView from '../components/DailyComparisonView';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

const TimeWeeklyReportPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
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
  
  // 🔧 [任务#714] PrintPreview相关状态
  const [printPreviewVisible, setPrintPreviewVisible] = useState(false);
  const [exportData, setExportData] = useState<ExportData | null>(null);
  
  // 每日详情状态
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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
    const completionRate = weeklyStats.totalTasks > 0 
      ? (weeklyStats.completedTasks / weeklyStats.totalTasks) * 100 
      : 0;
    
    return {
      totalDaysWorked,
      avgHoursPerDay,
      avgEfficiency: Math.max(0, avgEfficiency), // 确保不为负数
      bestDay,
      completionRate: Math.max(0, Math.min(100, completionRate)) // 确保在0-100之间
    };
  }, [weeklyStats, dailyStats]);

  // 加载周报数据
  const loadWeeklyReport = async (force: boolean = false) => {
    try {
      setLoading(true);
      const startDate = selectedDateRange[0].format('YYYY-MM-DD');
      const endDate = selectedDateRange[1].format('YYYY-MM-DD');
      
      const reportData = await weeklyReportService.getWeeklyReport(startDate, endDate, { force });
      
      setWeeklyStats(reportData.weeklyStats);
      setDailyStats(reportData.dailyStats);
      setTaskTimeEntries(reportData.taskTimeEntries);
      setProjectStats(reportData.projectStats);
      
      if (force) {
        message.success('周报数据刷新成功');
      }
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
      // 重置选中的日期
      setSelectedDate(null);
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
    const config = statusMap[status as keyof typeof statusMap] || { color: 'default', text: '未知' };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 🔧 [任务#714] 导出报告 - 支持PDF和Excel格式
  const handleExportReport = async () => {
    try {
      const startDate = selectedDateRange[0].format('YYYY-MM-DD');
      const endDate = selectedDateRange[1].format('YYYY-MM-DD');
      
      // 准备导出数据
      const exportData: ExportData = {
        weekRange: `${selectedDateRange[0].format('MM月DD日')} - ${selectedDateRange[1].format('MM月DD日')}`,
        selectedWeek: selectedDateRange[0],
        tasks: taskTimeEntries.map((entry, index) => ({
          id: parseInt(entry.id) || index + 1,
          title: entry.taskTitle,
          description: '',
          status: entry.status,
          project_id: 1, // 默认项目ID
          created_at: new Date().toISOString(),
          due_date: null,
          task_level: 1,
          sort_order: 0,
          updated_at: new Date().toISOString(),
          custom_fields: {
            priority: entry.priority
          }
        } as Task)),
        stats: {
          totalTasks: weeklyStats.totalTasks,
          completedTasks: weeklyStats.completedTasks,
          inProgressTasks: weeklyStats.totalTasks - weeklyStats.completedTasks,
          todoTasks: 0,
          overdueTasks: 0,
          completionRate: weekSummary.completionRate
        },
        filters: {
          selectedStatus: 'all',
          searchText: ''
        }
      };
      
      // 直接导出PDF
      await exportToPDF(exportData, {
        filename: `任务周报_${selectedDateRange[0].format('YYYY年第ww周')}_${dayjs().format('MMDD')}.pdf`
      });
      
      message.success('PDF报告导出成功！');
    } catch (error) {
      console.error('导出报告失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      message.error(`导出报告失败: ${errorMessage}`);
    }
  };

  // 🔧 [任务#714] 打印报告 - 打开打印预览
  const handlePrintReport = () => {
    try {
      const startDate = selectedDateRange[0].format('YYYY-MM-DD');
      const endDate = selectedDateRange[1].format('YYYY-MM-DD');
      
      // 准备打印预览数据
      const previewData: ExportData = {
        weekRange: `${selectedDateRange[0].format('MM月DD日')} - ${selectedDateRange[1].format('MM月DD日')}`,
        selectedWeek: selectedDateRange[0],
        tasks: taskTimeEntries.map((entry, index) => ({
          id: parseInt(entry.id) || index + 1,
          title: entry.taskTitle,
          description: '',
          status: entry.status,
          project_id: 1, // 默认项目ID
          created_at: new Date().toISOString(),
          due_date: null,
          task_level: 1,
          sort_order: 0,
          updated_at: new Date().toISOString(),
          custom_fields: {
            priority: entry.priority
          }
        } as Task)),
        stats: {
          totalTasks: weeklyStats.totalTasks,
          completedTasks: weeklyStats.completedTasks,
          inProgressTasks: weeklyStats.totalTasks - weeklyStats.completedTasks,
          todoTasks: 0,
          overdueTasks: 0,
          completionRate: weekSummary.completionRate
        },
        filters: {
          selectedStatus: 'all',
          searchText: ''
        }
      };
      
      // 设置打印预览数据并显示模态框
      setExportData(previewData);
      setPrintPreviewVisible(true);
    } catch (error) {
      console.error('打印预览失败:', error);
      message.error('打印预览失败，请稍后重试');
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    loadWeeklyReport(true); // 强制跳过缓存，获取最新数据
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
          <Space.Compact>
            <Button 
              type={
                selectedDateRange[0].isSame(dayjs().startOf('week'), 'day') && 
                selectedDateRange[1].isSame(dayjs().endOf('week'), 'day') 
                  ? 'primary' : 'default'
              }
              onClick={() => {
                const thisWeekStart = dayjs().startOf('week');
                const thisWeekEnd = dayjs().endOf('week');
                setSelectedDateRange([thisWeekStart, thisWeekEnd]);
              }}
            >
              本周
            </Button>
            <Button 
              type={
                selectedDateRange[0].isSame(dayjs().subtract(1, 'week').startOf('week'), 'day') && 
                selectedDateRange[1].isSame(dayjs().subtract(1, 'week').endOf('week'), 'day') 
                  ? 'primary' : 'default'
              }
              onClick={() => {
                const lastWeekStart = dayjs().subtract(1, 'week').startOf('week');
                const lastWeekEnd = dayjs().subtract(1, 'week').endOf('week');
                setSelectedDateRange([lastWeekStart, lastWeekEnd]);
              }}
            >
              上周
            </Button>
          </Space.Compact>
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


      {/* 详细分析标签页 */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'overview',
              label: (<span><BarChartOutlined />概览分析</span>),
              children: (
                <div>
                  {/* 数据分析图表 - 第一部分 */}
                  <div style={{ marginBottom: '24px' }}>
                    <TimerAnalyticsCharts 
                      weeklyStats={weeklyStats}
                      dailyStats={dailyStats}
                      taskTimeEntries={taskTimeEntries}
                      projectStats={projectStats}
                      dateRange={selectedDateRange}
                    />
                  </div>
                  
                  <Row gutter={[16, 16]}>
                    {/* 每日工作统计 */}
                    <Col xs={24} lg={8}>
                    <Card title="每日工作统计" >
                      <Table
                        dataSource={dailyStats}
                        rowKey="date"
                        pagination={false}
                        onRow={(record) => ({
                          onClick: () => setSelectedDate(record.date),
                          style: {
                            cursor: 'pointer',
                            backgroundColor: selectedDate === record.date ? '#e6f7ff' : 'transparent'
                          },
                          onMouseEnter: (e) => {
                            if (selectedDate !== record.date) {
                              e.currentTarget.style.backgroundColor = '#f5f5f5';
                            }
                          },
                          onMouseLeave: (e) => {
                            if (selectedDate !== record.date) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }
                        })}
                        columns={[
                          {
                            title: '日期',
                            dataIndex: 'date',
                            render: (date) => (
                              <Text style={{ 
                                color: selectedDate === date ? '#1890ff' : '#000',
                                fontWeight: selectedDate === date ? 'bold' : 'normal'
                              }}>
                                {dayjs(date).format('MM-DD dddd')}
                              </Text>
                            )
                          },
                          {
                            title: '工作时长',
                            dataIndex: 'totalHours',
                            render: (hours) => `${hours.toFixed(2)}h`
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
                                percent={parseFloat(efficiency.toFixed(2))}
                                
                                status={efficiency >= 85 ? 'success' : efficiency >= 70 ? 'active' : 'exception'}
                                showInfo={false}
                              />
                            )
                          }
                        ]}
                      />
                    </Card>
                  </Col>

                  {/* 项目时间分布 / 每日工作详情 */}
                  <Col xs={24} lg={16}>
                    {selectedDate ? (
                      <Card 
                        title={
                          <Space>
                            <span>每日工作详情</span>
                            <Button 
                              type="text" 
                              size="small" 
                              onClick={() => setSelectedDate(null)}
                              style={{ color: '#666' }}
                            >
                              返回周视图
                            </Button>
                          </Space>
                        }
                      >
                        <DailyWorkDetail
                          selectedDate={selectedDate}
                          dailyStats={dailyStats.find(day => day.date === selectedDate) || {
                            date: selectedDate,
                            totalHours: 0,
                            tasksCompleted: 0,
                            efficiency: 0,
                            topTask: '无任务'
                          }}
                          taskEntries={taskTimeEntries}
                        />
                      </Card>
                    ) : (
                      <Card title="最近7天工作详情" >
                        <RecentWeekWorkDetail
                          dailyStats={dailyStats}
                          taskEntries={taskTimeEntries}
                          weeklyStats={weeklyStats}
                        />
                      </Card>
                    )}
                    </Col>
                  </Row>
                </div>
              )
            },
            {
              key: 'timeline',
              label: (<span><LineChartOutlined />任务时间轴</span>),
              children: (
                <SimpleTaskTimeline 
                  taskTimeEntries={taskTimeEntries}
                  dateRange={selectedDateRange}
                  onDateRangeChange={setSelectedDateRange}
                  projectId={1}
                  taskIds={taskTimeEntries.map(entry => parseInt(entry.id)).filter(id => !isNaN(id))}
                />
              )
            },
            {
              key: 'task-stats',
              label: (<span><ProjectOutlined />任务统计</span>),
              children: (
                <TaskStatsTab 
                  dateRange={selectedDateRange}
                  projectId={1}
                />
              )
            },
            {
              key: 'efficiency-analysis',
              label: (<span><RiseOutlined />效率分析</span>),
              children: (
                <DailyComparisonView 
                  style={{ padding: 0 }}
                />
              )
            }
          ]}
        />
      </Card>


      {/* 🔧 [任务#714] 打印预览模态框 */}
      {exportData && (
        <PrintPreview
          visible={printPreviewVisible}
          data={exportData}
          onCancel={() => setPrintPreviewVisible(false)}
          onExport={async (data, options) => {
            await exportToPDF(data, options);
            setPrintPreviewVisible(false);
          }}
        />
      )}
    </div>
  );
};

export default TimeWeeklyReportPage;
