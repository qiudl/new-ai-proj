import React, { useState, useEffect, useCallback } from 'react';
import { Card, Statistic, Row, Col, Button, DatePicker, Space, message, Spin, Typography, Table } from 'antd';
import { DownloadOutlined, BarChartOutlined, ClockCircleOutlined, TrophyOutlined } from '@ant-design/icons';
import TimerService from '../services/timerService';
import { TimerStatsResponse } from '../types/timer';
import dayjs, { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

interface TimerStatsCardProps {
  refreshTrigger?: number;
}

interface DailyStats {
  date: string;
  totalTime: number;
  formattedTime: string;
  taskCount: number;
  tasks: string[];
}

const TimerStatsCard: React.FC<TimerStatsCardProps> = ({ refreshTrigger }) => {
  const [stats, setStats] = useState<TimerStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(7, 'days'),
    dayjs()
  ]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);

  // ✅ 修复说明：该组件已修改为使用真实的API数据而非Mock数据
  // 现在调用 /api/v1/timer/weekly 接口获取真实的每日计时统计

  // Load timer statistics
  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      // 使用真实的周报API获取数据
      const [startDate, endDate] = dateRange;
      const weeklyReport = await TimerService.getWeeklyReport(
        startDate.format('YYYY-MM-DD'),
        endDate.format('YYYY-MM-DD')
      );
      
      // 设置基础统计
      setStats({
        today_total_seconds: weeklyReport.weekly_stats?.total_time_seconds || 0,
        today_formatted_time: weeklyReport.weekly_stats?.total_formatted_time || '00:00:00',
        completed_tasks_today: weeklyReport.weekly_stats?.total_tasks || 0,
        in_progress_tasks: 0,
        recent_tasks: [],
        task_time_breakdown: weeklyReport.task_time_entries || []
      });
      
      // 使用真实的每日统计数据
      generateDailyStatsFromAPI(weeklyReport);
    } catch (error) {
      console.error('Failed to load timer stats:', error);
      message.error('加载计时统计失败');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // Generate daily statistics from real API data
  const generateDailyStatsFromAPI = (weeklyReport: any) => {
    const days: DailyStats[] = [];
    const [startDate, endDate] = dateRange;
    
    // 创建日期映射，用于快速查找API返回的数据
    const apiDailyStats = weeklyReport.daily_stats || [];
    const dailyDataMap = new Map();
    
    apiDailyStats.forEach((dayData: any) => {
      dailyDataMap.set(dayData.date, dayData);
    });
    
    // 为日期范围内的每一天生成数据
    for (let i = 0; i <= endDate.diff(startDate, 'day'); i++) {
      const currentDate = startDate.add(i, 'day');
      const dateString = currentDate.format('YYYY-MM-DD');
      
      // 从API数据中获取该日的真实数据
      const apiDayData = dailyDataMap.get(dateString);
      
      const dayData: DailyStats = {
        date: dateString,
        totalTime: apiDayData?.total_time_seconds || 0,
        formattedTime: apiDayData?.formatted_time || '00:00:00',
        taskCount: apiDayData?.task_count || 0,
        tasks: apiDayData?.task_names || []
      };
      
      // 如果API没有返回格式化时间，自己格式化
      if (!dayData.formattedTime && dayData.totalTime > 0) {
        dayData.formattedTime = TimerService.formatDuration(dayData.totalTime);
      }
      
      days.push(dayData);
    }
    
    setDailyStats(days);
  };

  // Export statistics to CSV
  const exportToCSV = () => {
    if (!stats || dailyStats.length === 0) {
      message.warning('没有可导出的数据');
      return;
    }

    const csvHeaders = ['日期', '总时长', '任务数量', '任务列表'];
    const csvData = dailyStats.map(day => [
      day.date,
      day.formattedTime,
      day.taskCount.toString(),
      day.tasks.join('; ')
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `timer_stats_${dateRange[0].format('YYYY-MM-DD')}_${dateRange[1].format('YYYY-MM-DD')}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    message.success('统计数据已导出到CSV文件');
  };

  // Handle date range change
  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
      // Reload stats with new date range
      setTimeout(() => {
        loadStats();
      }, 100);
    }
  };

  // Load stats on component mount and when refresh trigger changes
  useEffect(() => {
    loadStats();
  }, [loadStats, refreshTrigger]);

  // Table columns for daily statistics
  const dailyStatsColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('MM-DD'),
    },
    {
      title: '总时长',
      dataIndex: 'formattedTime',
      key: 'formattedTime',
      sorter: (a: DailyStats, b: DailyStats) => a.totalTime - b.totalTime,
    },
    {
      title: '任务数',
      dataIndex: 'taskCount',
      key: 'taskCount',
      sorter: (a: DailyStats, b: DailyStats) => a.taskCount - b.taskCount,
    },
    {
      title: '主要任务',
      dataIndex: 'tasks',
      key: 'tasks',
      render: (tasks: string[]) => tasks.slice(0, 2).join(', ') + (tasks.length > 2 ? '...' : ''),
    }
  ];

  const totalTime = dailyStats.reduce((sum, day) => sum + day.totalTime, 0);
  const avgDaily = dailyStats.length > 0 ? totalTime / dailyStats.length : 0;
  const totalTasks = dailyStats.reduce((sum, day) => sum + day.taskCount, 0);

  return (
    <Card
      title={
        <Space>
          <BarChartOutlined />
          <span>计时统计</span>
        </Space>
      }
      extra={
        <Space>
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            format="YYYY-MM-DD"
            allowClear={false}
          />
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={exportToCSV}
            disabled={loading || !stats}
            size="small"
          >
            导出CSV
          </Button>
        </Space>
      }
      className="timer-stats-card"
    >
      <Spin spinning={loading}>
        {/* Summary Statistics */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Statistic
              title="总计时间"
              value={TimerService.formatDuration(totalTime)}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="日均时间"
              value={TimerService.formatDuration(Math.floor(avgDaily))}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="总任务数"
              value={totalTasks}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="活跃天数"
              value={dailyStats.filter(day => day.totalTime > 0).length}
              suffix={`/ ${dailyStats.length}`}
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
        </Row>

        {/* Daily Statistics Table */}
        <div style={{ marginTop: '24px' }}>
          <Title level={5} style={{ marginBottom: '16px' }}>
            每日详情
          </Title>
          <Table
            dataSource={dailyStats}
            columns={dailyStatsColumns}
            rowKey="date"
            size="small"
            pagination={{
              pageSize: 7,
              showSizeChanger: false,
              showQuickJumper: false,
            }}
            scroll={{ x: true }}
          />
        </div>

        {/* Quick Actions */}
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Space>
            <Button onClick={loadStats} disabled={loading}>
              刷新数据
            </Button>
            <Button 
              type="link" 
              onClick={() => {
                setDateRange([dayjs().subtract(30, 'days'), dayjs()]);
                setTimeout(loadStats, 100);
              }}
            >
              最近30天
            </Button>
            <Button 
              type="link"
              onClick={() => {
                const startOfMonth = dayjs().startOf('month');
                const endOfMonth = dayjs().endOf('month');
                setDateRange([startOfMonth, endOfMonth]);
                setTimeout(loadStats, 100);
              }}
            >
              本月
            </Button>
          </Space>
        </div>

        {/* Performance Tips */}
        {stats && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f6f8fa', borderRadius: '6px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <strong>效率提示:</strong> 
              {avgDaily > 14400 ? ' 保持良好的工作节奏！' : 
               avgDaily > 7200 ? ' 可以适当增加专注时间。' : 
               ' 建议设定每日计时目标。'}
              {totalTasks > dailyStats.length * 2 && ' 任务切换较频繁，建议专注单个任务。'}
            </Text>
          </div>
        )}
      </Spin>
    </Card>
  );
};

export default TimerStatsCard;