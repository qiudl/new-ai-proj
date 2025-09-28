import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Form,
  Input,
  Select,
  DatePicker,
  Switch,
  Button,
  Space,
  Row,
  Col,
  Statistic,
  Tag,
  Alert,
  Spin,
  Divider,
  Modal,
  InputNumber,
  Typography,
  List,
  Progress,
  Tooltip
} from 'antd';
import {
  ExperimentOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  RocketOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  SettingOutlined,
  DatabaseOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { testDataService } from '../services/testDataService';
import {
  WorkPattern,
  TaskTemplate,
  GenerateTimerDataRequest,
  QuickGenerateRequest,
  TestDataStats
} from '../types/testData';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const TestDataGenerator: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [workPatterns, setWorkPatterns] = useState<Record<string, WorkPattern>>({});
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [stats, setStats] = useState<TestDataStats | null>(null);
  const [cleanupModalVisible, setCleanupModalVisible] = useState(false);
  
  const [generateForm] = Form.useForm();
  const [quickForm] = Form.useForm();
  const [cleanupForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [patterns, templates, currentStats] = await Promise.all([
        testDataService.getWorkPatterns(),
        testDataService.getTaskTemplates(),
        testDataService.getGenerationStatus()
      ]);
      
      setWorkPatterns(patterns);
      setTaskTemplates(templates);
      setStats(currentStats);
    } catch (error) {
      console.error('Failed to load test data info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (values: any) => {
    setLoading(true);
    try {
      const request: GenerateTimerDataRequest = {
        start_date: values.dateRange[0].format('YYYY-MM-DD'),
        end_date: values.dateRange[1].format('YYYY-MM-DD'),
        work_pattern: values.workPattern,
        dry_run: values.dryRun || false,
        task_categories: values.taskCategories
      };

      await testDataService.generateTimerData(request);
      await loadData(); // Refresh stats
      generateForm.resetFields();
    } catch (error) {
      console.error('Generate failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickGenerate = async (values: any) => {
    setLoading(true);
    try {
      const request: QuickGenerateRequest = {
        days: values.days,
        work_pattern: values.workPattern
      };

      await testDataService.quickGenerate(request);
      await loadData(); // Refresh stats
      quickForm.resetFields();
    } catch (error) {
      console.error('Quick generate failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async (values: any) => {
    setLoading(true);
    try {
      await testDataService.cleanupTestData({
        older_than_days: values.olderThanDays,
        confirm: true
      });
      
      await loadData(); // Refresh stats
      setCleanupModalVisible(false);
      cleanupForm.resetFields();
    } catch (error) {
      console.error('Cleanup failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPatternColor = (patternName: string) => {
    const colors: Record<string, string> = {
      'focused_developer': '#52c41a',
      'meeting_heavy': '#fa8c16',
      'balanced_worker': '#1890ff',
      'creative_burst': '#722ed1'
    };
    return colors[patternName] || '#666';
  };

  const getTaskCategoryOptions = () => {
    const categories = ['开发', '调试', '文档', '测试', '会议', '研究'];
    return categories.map(cat => ({ label: cat, value: cat }));
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>
        <ExperimentOutlined style={{ marginRight: 8 }} />
        测试数据生成器
      </Title>
      
      <Paragraph type="secondary">
        为效率分析系统生成真实的工作数据，包含多种工作模式和任务类型
      </Paragraph>

      <Alert
        message="开发环境专用功能"
        description="此功能仅在开发环境中可用，用于生成测试数据进行功能验证"
        type="warning"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Spin spinning={loading}>
        {/* 统计信息卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="计时会话总数"
                value={stats?.total_timer_sessions || 0}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="总工作时长"
                value={stats?.total_hours || 0}
                precision={1}
                suffix="小时"
                prefix={<BarChartOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="数据时间范围"
                value={stats?.date_range || '无数据'}
                prefix={<DatabaseOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="最后生成时间"
                value={stats?.last_generated ? 
                  dayjs(stats.last_generated).format('MM-DD HH:mm') : '从未生成'
                }
                prefix={<ThunderboltOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Tabs defaultActiveKey="quick" type="card">
          {/* 快速生成 */}
          <TabPane
            tab={
              <span>
                <RocketOutlined />
                快速生成
              </span>
            }
            key="quick"
          >
            <Card>
              <Form
                form={quickForm}
                layout="horizontal"
                labelCol={{ span: 6 }}
                wrapperCol={{ span: 18 }}
                onFinish={handleQuickGenerate}
              >
                <Form.Item
                  label="生成天数"
                  name="days"
                  rules={[{ required: true, message: '请选择生成天数' }]}
                  extra="从今天往前推的工作日天数（跳过周末）"
                >
                  <InputNumber
                    min={1}
                    max={30}
                    placeholder="输入天数"
                    style={{ width: '100%' }}
                  />
                </Form.Item>

                <Form.Item
                  label="工作模式"
                  name="workPattern"
                  extra="选择工作模式模板，影响生成的数据特征"
                >
                  <Select placeholder="选择工作模式（默认：平衡型工作者）">
                    {Object.entries(workPatterns).map(([key, pattern]) => (
                      <Option key={key} value={key}>
                        <Space>
                          <Tag color={getPatternColor(key)}>{pattern.name}</Tag>
                          <span>{pattern.description}</span>
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    <RocketOutlined /> 快速生成
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>

          {/* 自定义生成 */}
          <TabPane
            tab={
              <span>
                <SettingOutlined />
                自定义生成
              </span>
            }
            key="custom"
          >
            <Card>
              <Form
                form={generateForm}
                layout="horizontal"
                labelCol={{ span: 6 }}
                wrapperCol={{ span: 18 }}
                onFinish={handleGenerate}
              >
                <Form.Item
                  label="日期范围"
                  name="dateRange"
                  rules={[{ required: true, message: '请选择日期范围' }]}
                  extra="选择要生成数据的日期范围（最多30天）"
                >
                  <RangePicker
                    format="YYYY-MM-DD"
                    placeholder={['开始日期', '结束日期']}
                    style={{ width: '100%' }}
                    disabledDate={(current) => {
                      return current && current > dayjs().endOf('day');
                    }}
                  />
                </Form.Item>

                <Form.Item
                  label="工作模式"
                  name="workPattern"
                  extra="影响每日工作时长、会话数量和时间分布"
                >
                  <Select placeholder="选择工作模式（默认：平衡型工作者）">
                    {Object.entries(workPatterns).map(([key, pattern]) => (
                      <Option key={key} value={key}>
                        <Space>
                          <Tag color={getPatternColor(key)}>{pattern.name}</Tag>
                          <span>{pattern.description}</span>
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  label="任务类别"
                  name="taskCategories"
                  extra="选择要生成的任务类别（不选择则包含所有类别）"
                >
                  <Select
                    mode="multiple"
                    placeholder="选择任务类别"
                    options={getTaskCategoryOptions()}
                  />
                </Form.Item>

                <Form.Item
                  label="预览模式"
                  name="dryRun"
                  valuePropName="checked"
                  extra="开启后只预览生成结果，不保存到数据库"
                >
                  <Switch />
                </Form.Item>

                <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    <PlayCircleOutlined /> 生成数据
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>

          {/* 模式说明 */}
          <TabPane
            tab={
              <span>
                <InfoCircleOutlined />
                模式说明
              </span>
            }
            key="patterns"
          >
            <Row gutter={[16, 16]}>
              {Object.entries(workPatterns).map(([key, pattern]) => (
                <Col xs={24} lg={12} key={key}>
                  <Card size="small">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <Tag color={getPatternColor(key)} style={{ marginRight: 8 }}>
                          {pattern.name}
                        </Tag>
                        <Text strong>{pattern.description}</Text>
                      </div>
                      
                      <div>
                        <Text type="secondary">每日工作时长: </Text>
                        <Text>{pattern.daily_hours.min} - {pattern.daily_hours.max} 小时</Text>
                      </div>
                      
                      <div>
                        <Text type="secondary">会话数量: </Text>
                        <Text>{pattern.session_count.min} - {pattern.session_count.max} 次</Text>
                      </div>
                      
                      <div>
                        <Text type="secondary">单次时长: </Text>
                        <Text>{pattern.session_length.min} - {pattern.session_length.max} 分钟</Text>
                      </div>
                      
                      <div>
                        <Text type="secondary">效率范围: </Text>
                        <Progress
                          percent={pattern.efficiency_range.max * 100}
                          strokeColor={getPatternColor(key)}
                          trailColor="#f0f0f0"
                          showInfo={false}
                          size="small"
                        />
                        <Text style={{ fontSize: 12 }}>
                          {(pattern.efficiency_range.min * 100).toFixed(0)}% - {(pattern.efficiency_range.max * 100).toFixed(0)}%
                        </Text>
                      </div>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </TabPane>

          {/* 数据统计 */}
          <TabPane
            tab={
              <span>
                <BarChartOutlined />
                数据统计
              </span>
            }
            key="stats"
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card title="按模式分布" size="small">
                  {stats?.sessions_by_pattern && Object.keys(stats.sessions_by_pattern).length > 0 ? (
                    <List
                      size="small"
                      dataSource={Object.entries(stats.sessions_by_pattern)}
                      renderItem={([pattern, count]) => (
                        <List.Item>
                          <Space>
                            <Tag color={getPatternColor(pattern)}>{pattern}</Tag>
                            <Text>{count} 次会话</Text>
                          </Space>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Text type="secondary">暂无数据</Text>
                  )}
                </Card>
              </Col>
              
              <Col xs={24} lg={12}>
                <Card 
                  title="每日统计" 
                  size="small"
                  extra={
                    <Button
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => setCleanupModalVisible(true)}
                    >
                      清理数据
                    </Button>
                  }
                >
                  {stats?.daily_breakdown && stats.daily_breakdown.length > 0 ? (
                    <List
                      size="small"
                      dataSource={stats.daily_breakdown.slice(-7)} // 显示最近7天
                      renderItem={(day) => (
                        <List.Item>
                          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                            <Text>{day.date}</Text>
                            <Space>
                              <Text type="secondary">{day.sessions}次</Text>
                              <Text type="secondary">{day.hours.toFixed(1)}h</Text>
                            </Space>
                          </Space>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Text type="secondary">暂无数据</Text>
                  )}
                </Card>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </Spin>

      {/* 清理数据弹窗 */}
      <Modal
        title={
          <Space>
            <DeleteOutlined />
            清理测试数据
          </Space>
        }
        open={cleanupModalVisible}
        onCancel={() => setCleanupModalVisible(false)}
        footer={null}
        width={500}
      >
        <Alert
          message="危险操作"
          description="此操作将永久删除指定天数前的测试数据，请谨慎操作"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Form
          form={cleanupForm}
          layout="vertical"
          onFinish={handleCleanup}
        >
          <Form.Item
            label="清理天数"
            name="olderThanDays"
            rules={[{ required: true, message: '请输入清理天数' }]}
            extra="删除指定天数前创建的测试数据"
          >
            <InputNumber
              min={1}
              max={365}
              placeholder="输入天数"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setCleanupModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" danger htmlType="submit" loading={loading}>
                确认清理
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TestDataGenerator;