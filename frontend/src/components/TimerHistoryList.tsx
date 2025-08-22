import React, { useState, useEffect } from 'react';
import { Card, List, Typography, Tag, Space, Button, DatePicker, Select, Row, Col, Statistic, Divider, Empty } from 'antd';
import { ClockCircleOutlined, CalendarOutlined, FilterOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { personalTimerService } from '../services/personalTimerService';
import { Link } from 'react-router-dom';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface TimerSession {
  id: number;
  task_type: string;
  task_id?: number;
  project_id?: number;
  task_title: string;
  task_color: string;
  task_category: string;
  start_time: string;
  end_time?: string;
  duration_seconds: number;
  formatted_time: string;
  date: string;
  week_day: string;
}

interface TimerHistoryListProps {
  userId?: number;
}

const TimerHistoryList: React.FC<TimerHistoryListProps> = ({ userId }) => {
  const [sessions, setSessions] = useState<TimerSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  
  // 筛选状态
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>('');

  // 统计数据
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalTime: 0,
    averageSession: 0,
    todayTime: 0
  });

  // 加载计时历史记录
  const loadHistory = async (page = 1) => {
    try {
      setLoading(true);
      const offset = (page - 1) * pageSize;
      
      const response = await personalTimerService.getHistory({
        limit: pageSize,
        offset: offset
      });
      
      setSessions(response.sessions);
      setTotal(response.sessions.length); // Note: API返回结构可能需要调整
      setCCurrentPage(page);
      
      // 计算统计数据
      calculateStats(response.sessions);
      
    } catch (error) {
      console.error('Failed to load timer history:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // 计算统计数据
  const calculateStats = (sessionData: TimerSession[]) => {
    const totalSessions = sessionData.length;
    const totalTime = sessionData.reduce((sum, session) => sum + session.duration_seconds, 0);
    const averageSession = totalSessions > 0 ? Math.round(totalTime / totalSessions) : 0;
    
    // 今日时间计算
    const today = dayjs().format('YYYY-MM-DD');
    const todayTime = sessionData
      .filter(session => session.date === today)
      .reduce((sum, session) => sum + session.duration_seconds, 0);
    
    setStats({
      totalSessions,
      totalTime,
      averageSession,
      todayTime
    });
  };

  // 筛选会话
  const getFilteredSessions = () => {
    let filtered = sessions;
    
    // 日期范围筛选
    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      filtered = filtered.filter(session => 
        session.date >= startDate && session.date <= endDate
      );
    }
    
    // 分类筛选
    if (categoryFilter) {
      filtered = filtered.filter(session => session.task_category === categoryFilter);
    }
    
    // 任务类型筛选
    if (taskTypeFilter) {
      filtered = filtered.filter(session => session.task_type === taskTypeFilter);
    }
    
    return filtered;
  };

  // 导出数据
  const handleExport = () => {
    const filtered = getFilteredSessions();
    const csvContent = [
      ['日期', '任务标题', '分类', '类型', '开始时间', '结束时间', '持续时间'],
      ...filtered.map(session => [
        session.date,
        session.task_title,
        session.task_category,
        session.task_type === 'personal' ? '个人任务' : '项目任务',
        dayjs(session.start_time).format('HH:mm:ss'),
        session.end_time ? dayjs(session.end_time).format('HH:mm:ss') : '-',
        session.formatted_time
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `timer-history-${dayjs().format('YYYY-MM-DD')}.csv`);
    link.click();
  };

  // 获取分类颜色
  const getCategoryColor = (category: string) => {
    const colors = {
      personal: '#1890ff',
      work: '#52c41a',
      study: '#722ed1',
      fitness: '#fa8c16',
      hobby: '#eb2f96'
    };
    return colors[category as keyof typeof colors] || '#1890ff';
  };

  // 格式化时长显示
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filteredSessions = getFilteredSessions();

  return (
    <div>
      {/* 统计面板 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="总会话数"
              value={stats.totalSessions}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="总计时"
              value={formatDuration(stats.totalTime)}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="平均会话"
              value={formatDuration(stats.averageSession)}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="今日计时"
              value={formatDuration(stats.todayTime)}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选和操作栏 */}
      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8}>
            <Space>
              <FilterOutlined />
              <Text>筛选条件：</Text>
            </Space>
            <RangePicker
              style={{ width: '100%', marginTop: '8px' }}
              value={dateRange}
              onChange={setDateRange}
              placeholder={['开始日期', '结束日期']}
            />
          </Col>
          <Col xs={24} sm={5}>
            <Text>分类：</Text>
            <Select
              style={{ width: '100%', marginTop: '4px' }}
              placeholder="选择分类"
              allowClear
              value={categoryFilter}
              onChange={setCategoryFilter}
            >
              <Option value="personal">个人</Option>
              <Option value="work">工作</Option>
              <Option value="study">学习</Option>
              <Option value="fitness">健身</Option>
              <Option value="hobby">爱好</Option>
            </Select>
          </Col>
          <Col xs={24} sm={5}>
            <Text>类型：</Text>
            <Select
              style={{ width: '100%', marginTop: '4px' }}
              placeholder="选择类型"
              allowClear
              value={taskTypeFilter}
              onChange={setTaskTypeFilter}
            >
              <Option value="personal">个人任务</Option>
              <Option value="project">项目任务</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExport}
              disabled={filteredSessions.length === 0}
              style={{ marginTop: '20px' }}
            >
              导出记录
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 历史记录列表 */}
      <Card
        title={
          <Space>
            <ClockCircleOutlined />
            <span>计时历史记录</span>
            <Text type="secondary">({filteredSessions.length})</Text>
          </Space>
        }
        loading={loading}
      >
        {filteredSessions.length > 0 ? (
          <List
            dataSource={filteredSessions}
            renderItem={(session) => (
              <List.Item
                style={{
                  padding: '16px',
                  border: '1px solid #f0f0f0',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  background: '#fafafa'
                }}
              >
                <List.Item.Meta
                  avatar={
                    <div 
                      style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '50%', 
                        backgroundColor: getCategoryColor(session.task_category)
                      }}
                    />
                  }
title={
                    <Space>
                      {session.project_id && session.task_id ? (
                        <Link to={`/projects/${session.project_id}/tasks/${session.task_id}`}>
                          <Text strong>{session.task_title}</Text>
                        </Link>
                      ) : (
                        <Text strong>{session.task_title}</Text>
                      )}
                      <Tag color={session.task_type === 'personal' ? 'blue' : 'green'}>
                        {session.task_type === 'personal' ? '个人任务' : '项目任务'}
                      </Tag>
                      <Tag>{session.task_category}</Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Space>
                        <CalendarOutlined />
                        <Text type="secondary">
                          {session.date} ({session.week_day})
                        </Text>
                        <Divider type="vertical" />
                        <ClockCircleOutlined />
                        <Text type="secondary">
                          {dayjs(session.start_time).format('HH:mm:ss')} - {
                            session.end_time ? dayjs(session.end_time).format('HH:mm:ss') : '进行中'
                          }
                        </Text>
                      </Space>
                      <div>
<Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                          {formatDuration(session.duration_seconds)}
                        </Text>
                      </div>
                    </Space>
                  }
                />
              </List.Item>
            )}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: filteredSessions.length,
              onChange: (page) => setCCurrentPage(page),
              showSizeChanger: false,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`
            }}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无计时记录"
          />
        )}
      </Card>
    </div>
  );
};

export default TimerHistoryList;