import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Table,
  Button,
  Space,
  Select,
  DatePicker,
  Alert,
  Typography,
  Tag,
  Modal,
  Form,
  InputNumber,
  Switch,
  message,
  Tooltip,
  Badge,
  Empty,
  List
} from 'antd';
import {
  DollarCircleOutlined,
  LineChartOutlined,
  WarningOutlined,
  SettingOutlined,
  ReloadOutlined,
  BellOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { AIProvider } from '../types/ai';
import aiTaskGeneratorService from '../services/aiTaskGeneratorService';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface CostSummary {
  period: string;
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  successfulRequests: number;
}

interface BudgetStatus {
  exceeded: boolean;
  currentUsage: number;
  budgetAmount: number;
  usagePercentage: number;
}

interface BudgetAlert {
  id: number;
  userId: number;
  projectId?: number;
  provider: AIProvider;
  alertType: string;
  message: string;
  threshold: number;
  currentUsage: number;
  budgetLimit: number;
  isRead: boolean;
  createdAt: string;
}

interface BudgetLimitRequest {
  projectId?: number;
  provider?: AIProvider;
  budgetType: string;
  budgetAmount: number;
  alertThreshold: number;
  isEnabled: boolean;
}

/**
 * AI成本管理器组件
 * 提供成本统计、预算管理和预警功能
 */
const AICostManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | ''>('');
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [form] = Form.useForm();

  const periods = [
    { value: 'daily', label: '日', icon: '📅' },
    { value: 'weekly', label: '周', icon: '📊' },
    { value: 'monthly', label: '月', icon: '📈' },
    { value: 'yearly', label: '年', icon: '📋' }
  ];

  const aiProviders = [
    { value: 'openai', label: 'OpenAI GPT', color: 'blue' },
    { value: 'claude', label: 'Claude', color: 'purple' },
    { value: 'deepseek', label: 'DeepSeek', color: 'green' }
  ];

  const budgetTypes = [
    { value: 'daily', label: '每日预算' },
    { value: 'weekly', label: '每周预算' },
    { value: 'monthly', label: '每月预算' },
    { value: 'yearly', label: '每年预算' }
  ];

  useEffect(() => {
    loadCostData();
    loadBudgetAlerts();
  }, [selectedPeriod, selectedProvider, selectedProject]);

  const loadCostData = async () => {
    try {
      setLoading(true);
      
      // 获取成本摘要
      const costParams = new URLSearchParams({
        period: selectedPeriod
      });
      if (selectedProject) {
        costParams.append('project_id', selectedProject.toString());
      }

      const costResponse = await aiTaskGeneratorService.getCostSummary(costParams.toString());
      if (costResponse.success) {
        setCostSummary(costResponse.data);
      }

      // 获取预算状态
      const budgetParams = new URLSearchParams();
      if (selectedProject) {
        budgetParams.append('project_id', selectedProject.toString());
      }
      if (selectedProvider) {
        budgetParams.append('provider', selectedProvider);
      }

      const budgetResponse = await aiTaskGeneratorService.getBudgetStatus(budgetParams.toString());
      if (budgetResponse.success) {
        setBudgetStatus(budgetResponse.data);
      }
    } catch (error: any) {
      message.error('加载成本数据失败: ' + (error?.message || '未知错误'));
      console.error('Failed to load cost data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBudgetAlerts = async () => {
    try {
      const response = await aiTaskGeneratorService.getBudgetAlerts();
      if (response.success) {
        setBudgetAlerts(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load budget alerts:', error);
    }
  };

  const handleSetBudgetLimit = async (values: BudgetLimitRequest) => {
    try {
      const response = await aiTaskGeneratorService.setBudgetLimit(values);
      if (response.success) {
        message.success('预算限制设置成功');
        setBudgetModalVisible(false);
        form.resetFields();
        loadCostData();
      } else {
        message.error('预算限制设置失败');
      }
    } catch (error: any) {
      message.error('预算限制设置失败: ' + (error?.message || '未知错误'));
      console.error('Failed to set budget limit:', error);
    }
  };

  const handleMarkAlertAsRead = async (alertId: number) => {
    try {
      // 这里应该调用标记警告为已读的API
      setBudgetAlerts(alerts => 
        alerts.map(alert => 
          alert.id === alertId ? { ...alert, isRead: true } : alert
        )
      );
      message.success('已标记为已读');
    } catch (error: Error | unknown) {
      message.error('操作失败');
      console.error('Failed to mark alert as read:', error);
    }
  };

  const getUsageStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'red';
    if (percentage >= 80) return 'orange';
    if (percentage >= 60) return 'gold';
    return 'green';
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'error':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'info':
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
      default:
        return <BellOutlined />;
    }
  };

  const alertColumns: ColumnsType<BudgetAlert> = [
    {
      title: '类型',
      dataIndex: 'alertType',
      key: 'alertType',
      width: 80,
      render: (type: string) => getAlertTypeIcon(type)
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message'
    },
    {
      title: '提供商',
      dataIndex: 'provider',
      key: 'provider',
      width: 100,
      render: (provider: AIProvider) => {
        const providerInfo = aiProviders.find(p => p.value === provider);
        return <Tag color={providerInfo?.color}>{providerInfo?.label}</Tag>;
      }
    },
    {
      title: '使用率',
      key: 'usage',
      width: 120,
      render: (_, record: BudgetAlert) => {
        const percentage = (record.currentUsage / record.budgetLimit) * 100;
        return (
          <Progress
            percent={percentage}
            size="small"
            strokeColor={getUsageStatusColor(percentage)}
            format={(percent) => `${percent?.toFixed(1)}%`}
          />
        );
      }
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => dayjs(date).format('MM-DD HH:mm')
    },
    {
      title: '状态',
      dataIndex: 'isRead',
      key: 'isRead',
      width: 80,
      render: (isRead: boolean) => (
        <Badge status={isRead ? 'default' : 'processing'} />
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      render: (_, record: BudgetAlert) => (
        !record.isRead && (
          <Button
            type="text"
            size="small"
            onClick={() => handleMarkAlertAsRead(record.id)}
          >
            标记已读
          </Button>
        )
      )
    }
  ];

  const unreadAlertsCount = budgetAlerts.filter(alert => !alert.isRead).length;

  return (
    <div>
      {/* 头部统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="总成本"
              value={costSummary?.totalCost || 0}
              precision={2}
              prefix={<DollarCircleOutlined />}
              suffix="$"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Token消耗"
              value={costSummary?.totalTokens || 0}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="请求次数"
              value={costSummary?.totalRequests || 0}
              prefix={<LineChartOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="成功率"
              value={
                costSummary?.totalRequests 
                  ? ((costSummary.successfulRequests / costSummary.totalRequests) * 100) 
                  : 0
              }
              precision={1}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 预算状态和警告 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <DollarCircleOutlined />
                预算使用情况
              </Space>
            }
            extra={
              <Button
                type="primary"
                icon={<SettingOutlined />}
                onClick={() => setBudgetModalVisible(true)}
              >
                设置预算
              </Button>
            }
          >
            {budgetStatus ? (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>当前使用: </Text>
                  <Text>${budgetStatus.currentUsage.toFixed(2)}</Text>
                  <Text type="secondary"> / ${budgetStatus.budgetAmount.toFixed(2)}</Text>
                </div>
                
                <Progress
                  percent={budgetStatus.usagePercentage}
                  strokeColor={getUsageStatusColor(budgetStatus.usagePercentage)}
                  format={(percent) => `${percent?.toFixed(1)}%`}
                />

                {budgetStatus.exceeded && (
                  <Alert
                    type="error"
                    message="预算已超支"
                    description="当前使用量已超过预算限制，请调整使用策略"
                    style={{ marginTop: '16px' }}
                    showIcon
                  />
                )}

                {budgetStatus.usagePercentage >= 80 && !budgetStatus.exceeded && (
                  <Alert
                    type="warning"
                    message="预算使用警告"
                    description="预算使用量已达到80%，请注意控制"
                    style={{ marginTop: '16px' }}
                    showIcon
                  />
                )}
              </div>
            ) : (
              <Empty description="暂无预算数据" />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <BellOutlined />
                预算警告
                {unreadAlertsCount > 0 && (
                  <Badge count={unreadAlertsCount} />
                )}
              </Space>
            }
            extra={
              <Button
                type="link"
                onClick={() => setAlertModalVisible(true)}
              >
                查看全部
              </Button>
            }
          >
            {budgetAlerts.length > 0 ? (
              <List
                size="small"
                dataSource={budgetAlerts.slice(0, 3)}
                renderItem={(alert) => (
                  <List.Item
                    style={{
                      opacity: alert.isRead ? 0.6 : 1,
                      background: alert.isRead ? 'transparent' : '#f6f6f6',
                      padding: '8px',
                      borderRadius: '4px',
                      marginBottom: '4px'
                    }}
                  >
                    <List.Item.Meta
                      avatar={getAlertTypeIcon(alert.alertType)}
                      title={
                        <Space>
                          <Text>{alert.message}</Text>
                          {!alert.isRead && <Badge status="processing" />}
                        </Space>
                      }
                      description={
                        <Space>
                          <Tag color={aiProviders.find(p => p.value === alert.provider)?.color}>
                            {aiProviders.find(p => p.value === alert.provider)?.label}
                          </Tag>
                          <Text type="secondary">
                            {dayjs(alert.createdAt).fromNow()}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无警告" />
            )}
          </Card>
        </Col>
      </Row>

      {/* 过滤器和操作 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={6}>
            <Space>
              <Text>统计周期:</Text>
              <Select
                value={selectedPeriod}
                onChange={setSelectedPeriod}
                style={{ width: 120 }}
              >
                {periods.map(period => (
                  <Option key={period.value} value={period.value}>
                    <Space>
                      <span>{period.icon}</span>
                      {period.label}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>
          
          <Col xs={24} sm={6}>
            <Space>
              <Text>提供商:</Text>
              <Select
                value={selectedProvider}
                onChange={setSelectedProvider}
                placeholder="全部"
                allowClear
                style={{ width: 120 }}
              >
                {aiProviders.map(provider => (
                  <Option key={provider.value} value={provider.value}>
                    <Tag color={provider.color}>{provider.label}</Tag>
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>

          <Col xs={24} sm={12}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadCostData}
                loading={loading}
              >
                刷新数据
              </Button>
              <Button
                type="primary"
                icon={<SettingOutlined />}
                onClick={() => setBudgetModalVisible(true)}
              >
                预算设置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 详细数据展示区域 */}
      <Card title="成本详情">
        {costSummary ? (
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <div style={{ padding: '16px', background: '#fafafa', borderRadius: '6px' }}>
                <Title level={5}>使用统计</Title>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text>总请求数: </Text>
                    <Text strong>{costSummary.totalRequests}</Text>
                  </div>
                  <div>
                    <Text>成功请求: </Text>
                    <Text strong>{costSummary.successfulRequests}</Text>
                  </div>
                  <div>
                    <Text>Token消耗: </Text>
                    <Text strong>{costSummary.totalTokens.toLocaleString()}</Text>
                  </div>
                  <div>
                    <Text>平均每请求Token: </Text>
                    <Text strong>
                      {costSummary.totalRequests > 0 
                        ? Math.round(costSummary.totalTokens / costSummary.totalRequests)
                        : 0
                      }
                    </Text>
                  </div>
                </Space>
              </div>
            </Col>
            
            <Col xs={24} md={12}>
              <div style={{ padding: '16px', background: '#fafafa', borderRadius: '6px' }}>
                <Title level={5}>成本分析</Title>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text>总成本: </Text>
                    <Text strong style={{ color: '#cf1322' }}>
                      ${costSummary.totalCost.toFixed(2)}
                    </Text>
                  </div>
                  <div>
                    <Text>平均每请求成本: </Text>
                    <Text strong>
                      ${costSummary.totalRequests > 0 
                        ? (costSummary.totalCost / costSummary.totalRequests).toFixed(4)
                        : '0.0000'
                      }
                    </Text>
                  </div>
                  <div>
                    <Text>平均每Token成本: </Text>
                    <Text strong>
                      ${costSummary.totalTokens > 0 
                        ? (costSummary.totalCost / costSummary.totalTokens).toFixed(6)
                        : '0.000000'
                      }
                    </Text>
                  </div>
                  <div>
                    <Text>统计周期: </Text>
                    <Text strong>{costSummary.period}</Text>
                  </div>
                </Space>
              </div>
            </Col>
          </Row>
        ) : (
          <Empty description="暂无成本数据" />
        )}
      </Card>

      {/* 设置预算模态框 */}
      <Modal
        title="设置预算限制"
        open={budgetModalVisible}
        onCancel={() => {
          setBudgetModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSetBudgetLimit}
          initialValues={{
            budgetType: 'monthly',
            budgetAmount: 100,
            alertThreshold: 80,
            isEnabled: true
          }}
        >
          <Form.Item
            name="budgetType"
            label="预算类型"
            rules={[{ required: true, message: '请选择预算类型' }]}
          >
            <Select>
              {budgetTypes.map(type => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="budgetAmount"
            label="预算金额 (USD)"
            rules={[{ required: true, message: '请输入预算金额' }]}
          >
            <InputNumber
              min={0}
              precision={2}
              style={{ width: '100%' }}
              placeholder="输入预算金额"
            />
          </Form.Item>

          <Form.Item
            name="alertThreshold"
            label="警告阈值 (%)"
            rules={[{ required: true, message: '请输入警告阈值' }]}
          >
            <InputNumber
              min={1}
              max={100}
              style={{ width: '100%' }}
              placeholder="达到多少百分比时发出警告"
            />
          </Form.Item>

          <Form.Item
            name="provider"
            label="适用提供商"
          >
            <Select placeholder="全部提供商" allowClear>
              {aiProviders.map(provider => (
                <Option key={provider.value} value={provider.value}>
                  <Tag color={provider.color}>{provider.label}</Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="isEnabled"
            label="启用状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存设置
              </Button>
              <Button onClick={() => {
                setBudgetModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 警告列表模态框 */}
      <Modal
        title={
          <Space>
            <BellOutlined />
            预算警告列表
            {unreadAlertsCount > 0 && (
              <Badge count={unreadAlertsCount} />
            )}
          </Space>
        }
        open={alertModalVisible}
        onCancel={() => setAlertModalVisible(false)}
        footer={null}
        width={800}
      >
        <Table
          columns={alertColumns}
          dataSource={budgetAlerts}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Modal>
    </div>
  );
};

export default AICostManager;