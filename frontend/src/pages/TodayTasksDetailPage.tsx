import React, { useState, useEffect } from 'react';
import {
  Layout,
  Row,
  Col,
  Card,
  Space,
  Button,
  Typography,
  Spin,
  Alert,
  Divider,
  message
} from 'antd';
import {
  ReloadOutlined,
  ArrowLeftOutlined,
  DownloadOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { todayTasksService, TodayTasksStats } from '../services/todayTasksService';
import {
  StatusDistributionChart,
  PriorityDistributionChart,
  TimeDistributionChart,
  TimeEfficiencyProgress,
  StatsOverviewCards,
  SmartRecommendations
} from '../components/today-stats';

const { Title, Text } = Typography;
const { Content } = Layout;

/**
 * 今日待办任务详情页
 *
 * 功能：
 * 1. 展示6个关键指标卡片
 * 2. 任务状态分布环形图
 * 3. 优先级分布饼图
 * 4. 时间分布柱状图
 * 5. 时间效率分析
 * 6. 数据刷新功能
 * 7. 响应式布局
 */
const TodayTasksDetailPage: React.FC = () => {
  const navigate = useNavigate();

  // 状态管理
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [stats, setStats] = useState<TodayTasksStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 加载统计数据
  const loadStats = async (showRefreshMessage = false) => {
    try {
      if (showRefreshMessage) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await todayTasksService.getTodayTasksStats();
      setStats(response);

      if (showRefreshMessage) {
        message.success('数据已刷新');
      }
    } catch (err: any) {
      console.error('Failed to load today tasks stats:', err);
      const errorMsg = err.response?.data?.message || '加载统计数据失败';
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadStats();
  }, []);

  // 返回按钮处理
  const handleBack = () => {
    navigate('/today-tasks');
  };

  // 刷新数据
  const handleRefresh = () => {
    loadStats(true);
  };

  // 导出报告（待实现）
  const handleExport = () => {
    message.info('导出功能开发中...');
  };

  // 加载状态
  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
        <Content style={{ padding: '24px' }}>
          <div style={{ textAlign: 'center', paddingTop: '100px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px' }}>
              <Text type="secondary">正在加载数据...</Text>
            </div>
          </div>
        </Content>
      </Layout>
    );
  }

  // 错误状态
  if (error || !stats) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
        <Content style={{ padding: '24px' }}>
          <Alert
            message="加载失败"
            description={error || '无法获取统计数据'}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={() => loadStats()}>
                重试
              </Button>
            }
          />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ padding: '24px' }}>
        {/* 页面头部 */}
        <div style={{ marginBottom: '24px' }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Space>
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={handleBack}
              >
                返回
              </Button>
            </Space>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space direction="vertical" size={0}>
                <Title level={2} style={{ margin: 0 }}>
                  <BarChartOutlined /> 今日任务详细分析
                </Title>
                <Text type="secondary">
                  全面分析今日任务的统计数据、时间分布和完成情况
                </Text>
              </Space>

              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                  loading={refreshing}
                >
                  刷新
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleExport}
                >
                  导出报告
                </Button>
              </Space>
            </div>
          </Space>
        </div>

        {/* 关键指标卡片 */}
        <div style={{ marginBottom: '24px' }}>
          <StatsOverviewCards data={stats} />
        </div>

        <Divider />

        {/* 第一行：状态分布 + 时间效率 */}
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col xs={24} lg={12}>
            <StatusDistributionChart data={stats} />
          </Col>
          <Col xs={24} lg={12}>
            <TimeEfficiencyProgress data={stats} />
          </Col>
        </Row>

        {/* 第二行：优先级分布 + 时间分布 */}
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col xs={24} lg={12}>
            <PriorityDistributionChart data={stats.priority_stats} />
          </Col>
          <Col xs={24} lg={12}>
            <TimeDistributionChart data={stats.timeDistribution} />
          </Col>
        </Row>

        {/* 第三行：智能建议 */}
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col xs={24}>
            <SmartRecommendations data={stats} />
          </Col>
        </Row>

        {/* 页脚信息 */}
        <Card variant="borderless" size="small" style={{ marginTop: '24px', textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            数据更新时间: {new Date().toLocaleString('zh-CN')} |
            自动刷新周期: 5分钟 |
            统计范围: 今日任务
          </Text>
        </Card>
      </Content>
    </Layout>
  );
};

export default TodayTasksDetailPage;
