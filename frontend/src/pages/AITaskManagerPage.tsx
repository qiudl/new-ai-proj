import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Space,
  Button,
  Row,
  Col,
  Statistic,
  Progress,
  Typography,
  Alert,
  Spin,
  message,
  Badge,
  Tooltip
} from 'antd';
import {
  RobotOutlined,
  FileTextOutlined,
  HistoryOutlined,
  DollarCircleOutlined,
  BarChartOutlined,
  ToolOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import AITaskGenerator from '../components/AITaskGenerator';
import AITemplateManager from '../components/AITemplateManager';
import AIGenerationHistory from '../components/AIGenerationHistory';
import AIBatchOptimizer from '../components/AIBatchOptimizer';
import AICostManager from '../components/AICostManager';
import AIUsageStats from '../components/AIUsageStats';
import aiTaskGeneratorService from '../services/aiTaskGeneratorService';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface AISystemStats {
  totalGenerations: number;
  successRate: number;
  averageProcessingTime: number;
  totalCostSavings: number;
  templatesUsed: number;
  optimizationsCompleted: number;
}

/**
 * AI任务管理主页面
 * 提供AI任务生成、模板管理、历史记录、成本控制等功能的统一入口
 */
const AITaskManagerPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AISystemStats>({
    totalGenerations: 0,
    successRate: 0,
    averageProcessingTime: 0,
    totalCostSavings: 0,
    templatesUsed: 0,
    optimizationsCompleted: 0
  });
  const [systemHealth, setSystemHealth] = useState<'good' | 'warning' | 'error'>('good');
  const [activeTab, setActiveTab] = useState('generator');

  useEffect(() => {
    loadSystemStats();
    checkSystemHealth();
  }, []);

  const loadSystemStats = async () => {
    try {
      setLoading(true);
      // 模拟获取系统统计数据
      // 在实际实现中，这里会调用后端API获取真实数据
      const mockStats: AISystemStats = {
        totalGenerations: 1247,
        successRate: 94.2,
        averageProcessingTime: 2.8,
        totalCostSavings: 156.7,
        templatesUsed: 43,
        optimizationsCompleted: 89
      };
      
      setStats(mockStats);
    } catch (error) {
      message.error('加载系统统计数据失败');
      console.error('Failed to load system stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkSystemHealth = async () => {
    try {
      // 检查AI服务状态
      const healthStatus = await aiTaskGeneratorService.checkSystemHealth();
      setSystemHealth(healthStatus ? 'good' : 'warning');
    } catch (error) {
      setSystemHealth('error');
      console.error('System health check failed:', error);
    }
  };

  const getHealthStatusInfo = () => {
    switch (systemHealth) {
      case 'good':
        return { color: 'success', icon: <CheckCircleOutlined />, text: '系统运行正常' };
      case 'warning':
        return { color: 'warning', icon: <ExclamationCircleOutlined />, text: '系统性能下降' };
      case 'error':
        return { color: 'error', icon: <ExclamationCircleOutlined />, text: '系统异常' };
      default:
        return { color: 'default', icon: <CheckCircleOutlined />, text: '状态未知' };
    }
  };

  const healthInfo = getHealthStatusInfo();

  const tabItems = [
    {
      label: (
        <span>
          <RobotOutlined />
          任务生成
        </span>
      ),
      key: 'generator',
      children: <AITaskGenerator />
    },
    {
      label: (
        <span>
          <FileTextOutlined />
          模板管理
        </span>
      ),
      key: 'templates',
      children: <AITemplateManager />
    },
    {
      label: (
        <span>
          <ToolOutlined />
          批量优化
        </span>
      ),
      key: 'optimizer',
      children: <AIBatchOptimizer />
    },
    {
      label: (
        <span>
          <HistoryOutlined />
          生成历史
        </span>
      ),
      key: 'history',
      children: <AIGenerationHistory showDetailedView={true} />
    },
    {
      label: (
        <span>
          <DollarCircleOutlined />
          成本管理
        </span>
      ),
      key: 'costs',
      children: <AICostManager />
    },
    {
      label: (
        <span>
          <BarChartOutlined />
          使用统计
        </span>
      ),
      key: 'stats',
      children: <AIUsageStats />
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面标题和系统状态 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          <Title level={2}>
            <RobotOutlined style={{ marginRight: '12px', color: '#1890ff' }} />
            AI任务管理中心
          </Title>
          <Text type="secondary">
            智能任务生成、模板管理、批量优化和成本控制的统一平台
          </Text>
        </Col>
        <Col>
          <Space>
            <Badge status={healthInfo.color as unknown} />
            <Tooltip title={healthInfo.text}>
              {healthInfo.icon}
              <Text style={{ marginLeft: '8px' }}>{healthInfo.text}</Text>
            </Tooltip>
            <Button
              icon={<ThunderboltOutlined />}
              onClick={checkSystemHealth}
              type="link"
            >
              刷新状态
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 系统概览统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="总生成次数"
              value={stats.totalGenerations}
              prefix={<RobotOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="成功率"
              value={stats.successRate}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress
              percent={stats.successRate}
              size="small"
              showInfo={false}
              strokeColor="#52c41a"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="平均处理时间"
              value={stats.averageProcessingTime}
              suffix="秒"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="成本节省"
              value={stats.totalCostSavings}
              suffix="小时"
              prefix={<DollarCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="模板使用"
              value={stats.templatesUsed}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="优化完成"
              value={stats.optimizationsCompleted}
              prefix={<ToolOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 系统健康状态警告 */}
      {systemHealth !== 'good' && (
        <Alert
          message={healthInfo.text}
          description={
            systemHealth === 'error'
              ? 'AI服务可能不可用，请检查服务状态或联系管理员'
              : 'AI服务响应时间较长，建议稍后重试或使用缓存功能'
          }
          type={systemHealth === 'error' ? 'error' : 'warning'}
          showIcon
          style={{ marginBottom: '24px' }}
          action={
            <Button size="small" onClick={checkSystemHealth}>
              重新检查
            </Button>
          }
        />
      )}

      {/* 主要功能标签页 */}
      <Card>
        <Spin spinning={loading}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            size="large"
            tabBarStyle={{ marginBottom: '24px' }}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default AITaskManagerPage;