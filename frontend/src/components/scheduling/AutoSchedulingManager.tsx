import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Space,
  Select,
  Form,
  InputNumber,
  Switch,
  DatePicker,
  Alert,
  Modal,
  Table,
  Tag,
  Tooltip,
  Progress,
  Statistic,
  Row,
  Col,
  Typography,
  Timeline,
  message,
  Spin,
  Tabs
} from 'antd';
import {
  PlayCircleOutlined,
  SettingOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
  FlagOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import { Task } from '../../types/task';
import { Project } from '../../types/project';
import SchedulingService, {
  SchedulingResult,
  SchedulingConfig,
  ScheduleTask,
  SchedulingWarning,
  SchedulingStatistics
} from '../../services/schedulingService';

const { Option } = Select;
const { Text, Title } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

interface AutoSchedulingManagerProps {
  project: Project;
  tasks: Task[];
  onScheduleComplete?: (result: SchedulingResult) => void;
  onTaskUpdate?: (tasks: Task[]) => void;
}

const AutoSchedulingManager: React.FC<AutoSchedulingManagerProps> = ({
  project,
  tasks,
  onScheduleComplete,
  onTaskUpdate
}) => {
  // 状态管理
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [schedulingResult, setSchedulingResult] = useState<SchedulingResult | null>(null);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [optimizeModalVisible, setOptimizeModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('config');

  // 调度配置
  const [config, setConfig] = useState<Partial<SchedulingConfig>>({
    algorithm: 'CPM',
    considerResources: false,
    optimizeFor: 'TIME',
    bufferPercentage: 10,
    workingDaysOnly: true,
    workingHoursPerDay: 8,
    holidayDates: [],
    maxIterations: 100,
    toleranceLevel: 0.01
  });

  const schedulingService = SchedulingService.getInstance();

  // 执行自动调度
  const handleSchedule = async () => {
    setLoading(true);
    try {
      const result = await schedulingService.scheduleProject(project.id, tasks, config);
      setSchedulingResult(result);
      onScheduleComplete?.(result);
      message.success('自动调度完成');
      setActiveTab('result');
    } catch (error) {
      message.error('调度失败: ' + (error instanceof Error ? error.message : '未知错误'));
      console.error('调度失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 优化调度结果
  const handleOptimize = async (optimization: 'TIME' | 'COST' | 'RESOURCE') => {
    if (!schedulingResult) return;

    setLoading(true);
    try {
      const optimizedResult = await schedulingService.optimizeSchedule(schedulingResult, optimization);
      setSchedulingResult(optimizedResult);
      message.success(`${optimization === 'TIME' ? '时间' : optimization === 'COST' ? '成本' : '资源'}优化完成`);
    } catch (error) {
      message.error('优化失败');
      console.error('优化失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 应用调度结果到任务
  const handleApplySchedule = async () => {
    if (!schedulingResult) return;

    Modal.confirm({
      title: '应用调度结果',
      content: '这将更新所有任务的开始和结束时间，是否继续？',
      onOk: () => {
        const updatedTasks = tasks.map(task => {
          const scheduleTask = schedulingResult.tasks.find(st => st.id === task.id);
          if (scheduleTask) {
            return {
              ...task,
              start_date: scheduleTask.earliestStart?.toISOString(),
              due_date: scheduleTask.earliestFinish?.toISOString(),
              estimated_hours: (scheduleTask.calculatedDuration || 1) * 8
            };
          }
          return task;
        });
        
        onTaskUpdate?.(updatedTasks);
        message.success('调度结果已应用到任务');
      }
    });
  };

  // 导出调度结果
  const handleExport = async (format: 'JSON' | 'CSV' | 'PDF') => {
    if (!schedulingResult) return;

    try {
      const blob = await schedulingService.exportScheduleResult(schedulingResult, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}-调度结果.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
      console.error('导出失败:', error);
    }
  };

  // 配置表单提交
  const handleConfigSubmit = (values: any) => {
    const newConfig: Partial<SchedulingConfig> = {
      ...values,
      holidayDates: values.holidayDates?.map((date: Dayjs) => date.toDate()) || []
    };
    setConfig(newConfig);
    setConfigModalVisible(false);
    message.success('配置已更新');
  };

  // 任务表格列配置
  const taskColumns: ColumnsType<ScheduleTask> = [
    {
      title: '任务',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
      render: (title: string, record: ScheduleTask) => (
        <Space>
          <Text strong={record.isCritical}>{title}</Text>
          {record.isCritical && <Tag color="red">关键</Tag>}
        </Space>
      )
    },
    {
      title: '工期',
      dataIndex: 'calculatedDuration',
      key: 'duration',
      width: 80,
      render: (duration: number) => `${duration}天`
    },
    {
      title: '最早开始',
      dataIndex: 'earliestStart',
      key: 'earliestStart',
      width: 120,
      render: (date: Date) => date ? dayjs(date).format('MM-DD HH:mm') : '-'
    },
    {
      title: '最早完成',
      dataIndex: 'earliestFinish',
      key: 'earliestFinish',
      width: 120,
      render: (date: Date) => date ? dayjs(date).format('MM-DD HH:mm') : '-'
    },
    {
      title: '最晚开始',
      dataIndex: 'latestStart',
      key: 'latestStart',
      width: 120,
      render: (date: Date) => date ? dayjs(date).format('MM-DD HH:mm') : '-'
    },
    {
      title: '最晚完成',
      dataIndex: 'latestFinish',
      key: 'latestFinish',
      width: 120,
      render: (date: Date) => date ? dayjs(date).format('MM-DD HH:mm') : '-'
    },
    {
      title: '总浮动',
      dataIndex: 'totalFloat',
      key: 'totalFloat',
      width: 100,
      render: (float: number) => (
        <Tag color={float === 0 ? 'red' : float <= 2 ? 'orange' : 'green'}>
          {float.toFixed(1)}天
        </Tag>
      ),
      sorter: (a, b) => (a.totalFloat || 0) - (b.totalFloat || 0)
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig = {
          todo: { color: 'blue', text: '待开始' },
          in_progress: { color: 'orange', text: '进行中' },
          completed: { color: 'green', text: '已完成' },
          cancelled: { color: 'red', text: '已取消' }
        };
        const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    }
  ];

  // 警告表格列配置
  const warningColumns: ColumnsType<SchedulingWarning> = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => {
        const typeConfig = {
          RESOURCE_CONFLICT: { color: 'orange', text: '资源冲突' },
          CIRCULAR_DEPENDENCY: { color: 'red', text: '循环依赖' },
          UNREALISTIC_DURATION: { color: 'yellow', text: '工期不合理' },
          CONSTRAINT_VIOLATION: { color: 'purple', text: '约束违反' }
        };
        const config = typeConfig[type as keyof typeof typeConfig] || { color: 'default', text: type };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => {
        const colors = { HIGH: 'red', MEDIUM: 'orange', LOW: 'green' };
        return <Tag color={colors[severity as keyof typeof colors]}>{severity}</Tag>;
      }
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true
    },
    {
      title: '建议',
      dataIndex: 'suggestion',
      key: 'suggestion',
      ellipsis: true,
      render: (suggestion: string) => suggestion || '-'
    }
  ];

  return (
    <div>
      <Card
        title={
          <Space>
            <ThunderboltOutlined />
            <span>智能任务调度</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setConfigModalVisible(true)}
            >
              调度配置
            </Button>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleSchedule}
              loading={loading}
              disabled={tasks.length === 0}
            >
              执行调度
            </Button>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* 调度配置 */}
          <TabPane tab="调度配置" key="config">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Alert
                  message="智能调度算法"
                  description="基于关键路径法(CPM)、计划评审技术(PERT)等算法，自动计算任务的最优开始和结束时间，识别关键路径，优化项目工期。"
                  type="info"
                  showIcon
                />
              </Col>
              
              <Col span={8}>
                <Card size="small" title="调度算法">
                  <Select
                    value={config.algorithm}
                    onChange={(value) => setConfig({ ...config, algorithm: value })}
                    style={{ width: '100%' }}
                  >
                    <Option value="CPM">关键路径法 (CPM)</Option>
                    <Option value="PERT">计划评审技术 (PERT)</Option>
                    <Option value="PDM">优先图解法 (PDM)</Option>
                  </Select>
                </Card>
              </Col>
              
              <Col span={8}>
                <Card size="small" title="优化目标">
                  <Select
                    value={config.optimizeFor}
                    onChange={(value) => setConfig({ ...config, optimizeFor: value })}
                    style={{ width: '100%' }}
                  >
                    <Option value="TIME">时间优先</Option>
                    <Option value="COST">成本优先</Option>
                    <Option value="RESOURCE">资源平衡</Option>
                  </Select>
                </Card>
              </Col>
              
              <Col span={8}>
                <Card size="small" title="缓冲时间">
                  <InputNumber
                    value={config.bufferPercentage}
                    onChange={(value) => setConfig({ ...config, bufferPercentage: value || 10 })}
                    min={0}
                    max={50}
                    style={{ width: '100%' }}
                    formatter={value => `${value}%`}
                    parser={(value) => Number(value!.replace('%', ''))}
                  />
                </Card>
              </Col>
              
              <Col span={12}>
                <Card size="small" title="工作日设置">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Switch
                      checked={config.workingDaysOnly}
                      onChange={(checked) => setConfig({ ...config, workingDaysOnly: checked })}
                      checkedChildren="仅工作日"
                      unCheckedChildren="包含周末"
                    />
                    <div>
                      <Text>每日工作时间: </Text>
                      <InputNumber
                        value={config.workingHoursPerDay}
                        onChange={(value) => setConfig({ ...config, workingHoursPerDay: value || 8 })}
                        min={1}
                        max={24}
                        style={{ width: 80 }}
                      />
                      <Text> 小时</Text>
                    </div>
                  </Space>
                </Card>
              </Col>
              
              <Col span={12}>
                <Card size="small" title="高级设置">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Switch
                      checked={config.considerResources}
                      onChange={(checked) => setConfig({ ...config, considerResources: checked })}
                      checkedChildren="考虑资源约束"
                      unCheckedChildren="忽略资源约束"
                    />
                    <div>
                      <Text>最大迭代次数: </Text>
                      <InputNumber
                        value={config.maxIterations}
                        onChange={(value) => setConfig({ ...config, maxIterations: value || 100 })}
                        min={10}
                        max={1000}
                        style={{ width: 100 }}
                      />
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* 调度结果 */}
          <TabPane tab="调度结果" key="result" disabled={!schedulingResult}>
            {schedulingResult && (
              <div>
                {/* 概要统计 */}
                <Row gutter={16} style={{ marginBottom: 24 }}>
                  <Col span={6}>
                    <Statistic
                      title="项目工期"
                      value={schedulingResult.projectDuration}
                      suffix="天"
                      prefix={<ClockCircleOutlined />}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="关键任务"
                      value={schedulingResult.criticalPath.length}
                      suffix={`/ ${schedulingResult.tasks.length}`}
                      prefix={<FlagOutlined />}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="总浮动时间"
                      value={schedulingResult.totalFloat.toFixed(1)}
                      suffix="天"
                      prefix={<InfoCircleOutlined />}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="完成日期"
                      value={dayjs(schedulingResult.projectEndDate).format('YYYY-MM-DD')}
                      prefix={<CheckCircleOutlined />}
                    />
                  </Col>
                </Row>

                {/* 操作按钮 */}
                <Space style={{ marginBottom: 16 }}>
                  <Button
                    type="primary"
                    onClick={handleApplySchedule}
                    icon={<CheckCircleOutlined />}
                  >
                    应用调度结果
                  </Button>
                  <Button
                    onClick={() => handleOptimize('TIME')}
                    loading={loading}
                  >
                    时间优化
                  </Button>
                  <Button
                    onClick={() => handleOptimize('COST')}
                    loading={loading}
                  >
                    成本优化
                  </Button>
                  <Button
                    onClick={() => handleOptimize('RESOURCE')}
                    loading={loading}
                  >
                    资源优化
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => handleExport('CSV')}
                  >
                    导出CSV
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => handleExport('JSON')}
                  >
                    导出JSON
                  </Button>
                </Space>

                {/* 任务详情表格 */}
                <Table
                  columns={taskColumns}
                  dataSource={schedulingResult.tasks}
                  rowKey="id"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => `显示 ${range[0]}-${range[1]} 条记录，共 ${total} 条`
                  }}
                  scroll={{ x: 1000 }}
                  size="small"
                />
              </div>
            )}
          </TabPane>

          {/* 关键路径 */}
          <TabPane tab="关键路径" key="critical" disabled={!schedulingResult}>
            {schedulingResult && (
              <div>
                <Alert
                  message="关键路径分析"
                  description={`识别出 ${schedulingResult.criticalPath.length} 个关键任务，这些任务的延迟将直接影响项目完成时间。`}
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                
                <Timeline>
                  {schedulingResult.criticalPath.map((task, index) => (
                    <Timeline.Item
                      key={task.id}
                      color="red"
                      dot={<FlagOutlined style={{ color: '#ff4d4f' }} />}
                    >
                      <div>
                        <Text strong>{task.title}</Text>
                        <div style={{ marginTop: 4 }}>
                          <Space>
                            <Tag color="blue">工期: {task.calculatedDuration}天</Tag>
                            <Tag color="green">
                              {task.earliestStart ? dayjs(task.earliestStart).format('MM-DD') : '-'} 
                              ~ 
                              {task.earliestFinish ? dayjs(task.earliestFinish).format('MM-DD') : '-'}
                            </Tag>
                            <Tag color="red">浮动: {task.totalFloat?.toFixed(1)}天</Tag>
                          </Space>
                        </div>
                        {task.description && (
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">{task.description}</Text>
                          </div>
                        )}
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </div>
            )}
          </TabPane>

          {/* 警告和建议 */}
          <TabPane 
            tab={
              <Space>
                <span>警告</span>
                {schedulingResult && schedulingResult.warnings.length > 0 && (
                  <Tag color="orange">{schedulingResult.warnings.length}</Tag>
                )}
              </Space>
            } 
            key="warnings" 
            disabled={!schedulingResult}
          >
            {schedulingResult && (
              <div>
                {schedulingResult.warnings.length === 0 ? (
                  <Alert
                    message="没有发现调度警告"
                    description="当前调度结果没有发现任何问题或冲突。"
                    type="success"
                    showIcon
                  />
                ) : (
                  <div>
                    <Alert
                      message={`发现 ${schedulingResult.warnings.length} 个调度警告`}
                      description="请仔细检查以下警告并采取相应措施。"
                      type="warning"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    
                    <Table
                      columns={warningColumns}
                      dataSource={schedulingResult.warnings}
                      rowKey={(record, index) => index}
                      pagination={false}
                      size="small"
                    />
                  </div>
                )}
              </div>
            )}
          </TabPane>

          {/* 统计分析 */}
          <TabPane tab="统计分析" key="statistics" disabled={!schedulingResult}>
            {schedulingResult && schedulingResult.statistics && (
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card title="浮动时间分布" size="small">
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>零浮动 (关键任务)</Text>
                        <Text strong>{schedulingResult.statistics.floatDistribution.zeroFloat}</Text>
                      </div>
                      <Progress 
                        percent={Math.round(schedulingResult.statistics.floatDistribution.zeroFloat / schedulingResult.statistics.totalTasks * 100)}
                        strokeColor="#ff4d4f"
                        size="small"
                      />
                    </div>
                    
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>低浮动 (1-2天)</Text>
                        <Text strong>{schedulingResult.statistics.floatDistribution.lowFloat}</Text>
                      </div>
                      <Progress 
                        percent={Math.round(schedulingResult.statistics.floatDistribution.lowFloat / schedulingResult.statistics.totalTasks * 100)}
                        strokeColor="#fa8c16"
                        size="small"
                      />
                    </div>
                    
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>中浮动 (3-7天)</Text>
                        <Text strong>{schedulingResult.statistics.floatDistribution.mediumFloat}</Text>
                      </div>
                      <Progress 
                        percent={Math.round(schedulingResult.statistics.floatDistribution.mediumFloat / schedulingResult.statistics.totalTasks * 100)}
                        strokeColor="#52c41a"
                        size="small"
                      />
                    </div>
                    
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>高浮动 (7天以上)</Text>
                        <Text strong>{schedulingResult.statistics.floatDistribution.highFloat}</Text>
                      </div>
                      <Progress 
                        percent={Math.round(schedulingResult.statistics.floatDistribution.highFloat / schedulingResult.statistics.totalTasks * 100)}
                        strokeColor="#1890ff"
                        size="small"
                      />
                    </div>
                  </Card>
                </Col>
                
                <Col span={12}>
                  <Card title="调度质量评估" size="small">
                    <Statistic
                      title="约束满足度"
                      value={schedulingResult.statistics.constraintSatisfaction * 100}
                      suffix="%"
                      precision={1}
                      valueStyle={{ color: schedulingResult.statistics.constraintSatisfaction >= 0.9 ? '#3f8600' : '#cf1322' }}
                      prefix={<BarChartOutlined />}
                    />
                    
                    <div style={{ marginTop: 16 }}>
                      <Progress
                        percent={Math.round(schedulingResult.statistics.constraintSatisfaction * 100)}
                        strokeColor={schedulingResult.statistics.constraintSatisfaction >= 0.9 ? '#52c41a' : '#ff4d4f'}
                      />
                    </div>
                    
                    <div style={{ marginTop: 16 }}>
                      <Text type="secondary">
                        调度算法: {schedulingResult.schedulingAlgorithm}
                      </Text>
                    </div>
                  </Card>
                </Col>
              </Row>
            )}
          </TabPane>
        </Tabs>
      </Card>

      {/* 高级配置模态框 */}
      <Modal
        title="高级调度配置"
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleConfigSubmit}
          initialValues={{
            ...config,
            holidayDates: config.holidayDates?.map(date => dayjs(date))
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="algorithm" label="调度算法">
                <Select>
                  <Option value="CPM">关键路径法 (CPM)</Option>
                  <Option value="PERT">计划评审技术 (PERT)</Option>
                  <Option value="PDM">优先图解法 (PDM)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="optimizeFor" label="优化目标">
                <Select>
                  <Option value="TIME">时间优先</Option>
                  <Option value="COST">成本优先</Option>
                  <Option value="RESOURCE">资源平衡</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="bufferPercentage" label="缓冲时间百分比">
                <InputNumber
                  min={0}
                  max={50}
                  formatter={value => `${value}%`}
                  parser={(value) => Math.min(50, Math.max(0, Number(value!.replace('%', '')))) as 0 | 50}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="workingHoursPerDay" label="每日工作小时">
                <InputNumber min={1} max={24} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="maxIterations" label="最大迭代次数">
                <InputNumber min={10} max={1000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="toleranceLevel" label="容差水平">
                <InputNumber
                  min={0.001}
                  max={1}
                  step={0.001}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="workingDaysOnly" valuePropName="checked">
            <Switch checkedChildren="仅工作日" unCheckedChildren="包含周末" />
          </Form.Item>

          <Form.Item name="considerResources" valuePropName="checked">
            <Switch checkedChildren="考虑资源约束" unCheckedChildren="忽略资源约束" />
          </Form.Item>

          <Form.Item name="holidayDates" label="假期日期">
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setConfigModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                保存配置
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default AutoSchedulingManager;