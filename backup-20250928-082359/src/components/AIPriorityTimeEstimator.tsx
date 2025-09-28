/**
 * AI Priority and Time Estimator Component
 * 
 * This component provides a user interface for AI-generated priority and time estimation
 * suggestions, allowing users to accept, reject, or modify the suggestions.
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Collapse,
  Progress,
  Alert,
  Spin,
  Badge,
  Tag,
  Tooltip,
  Row,
  Col,
  Divider,
  List,
  InputNumber,
  Select,
  Timeline
} from 'antd';
import {
  RobotOutlined,
  ClockCircleOutlined,
  FlagOutlined,
  CheckOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  ReloadOutlined,
  BulbOutlined
} from '@ant-design/icons';

import { Task } from '../types/task';
import {
  aiPriorityEstimator,
  ComprehensiveAnalysisResult,
  PriorityFactor,
  TimeBreakdown
} from '../services/aiPriorityEstimator';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

interface AIPriorityTimeEstimatorProps {
  task: Task;
  allTasks: Task[];
  onPriorityUpdate: (priority: 'low' | 'medium' | 'high') => void;
  onTimeUpdate: (estimatedHours: number) => void;
  currentPriority?: 'low' | 'medium' | 'high';
  currentEstimatedHours?: number;
  disabled?: boolean;
}

const PRIORITY_COLORS = {
  low: 'green',
  medium: 'orange',
  high: 'red'
};

const PRIORITY_LABELS = {
  low: '低优先级',
  medium: '中优先级',
  high: '高优先级'
};

const FACTOR_IMPACT_ICONS = {
  increase: { icon: <ThunderboltOutlined />, color: '#ff4d4f' },
  decrease: { icon: <InfoCircleOutlined />, color: '#52c41a' },
  neutral: { icon: <InfoCircleOutlined />, color: '#faad14' }
};

export const AIPriorityTimeEstimator: React.FC<AIPriorityTimeEstimatorProps> = ({
  task,
  allTasks,
  onPriorityUpdate,
  onTimeUpdate,
  currentPriority,
  currentEstimatedHours,
  disabled = false
}) => {
  const [analysisResult, setAnalysisResult] = useState<ComprehensiveAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [manualPriority, setManualPriority] = useState<'low' | 'medium' | 'high' | undefined>(currentPriority);
  const [manualHours, setManualHours] = useState<number | undefined>(currentEstimatedHours);

  // 执行AI分析
  const runAnalysis = async () => {
    setLoading(true);
    try {
      // 设置任务上下文
      aiPriorityEstimator.setTaskContext(allTasks);
      
      // 执行综合分析
      const result = await aiPriorityEstimator.analyzeTask(task);
      setAnalysisResult(result);
      
      // 更新手动值为AI建议值（如果当前为空）
      if (!manualPriority) {
        setManualPriority(result.priority.suggestedPriority);
      }
      if (!manualHours) {
        setManualHours(result.timeEstimation.estimatedHours);
      }
      
    } catch (error) {
      console.error('AI优先级和工时分析失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 应用AI建议的优先级
  const applyAIPriority = () => {
    if (analysisResult) {
      setManualPriority(analysisResult.priority.suggestedPriority);
      onPriorityUpdate(analysisResult.priority.suggestedPriority);
    }
  };

  // 应用AI建议的工时
  const applyAITime = () => {
    if (analysisResult) {
      setManualHours(analysisResult.timeEstimation.estimatedHours);
      onTimeUpdate(analysisResult.timeEstimation.estimatedHours);
    }
  };

  // 应用手动调整的值
  const applyManualValues = () => {
    if (manualPriority) {
      onPriorityUpdate(manualPriority);
    }
    if (manualHours) {
      onTimeUpdate(manualHours);
    }
  };

  // 获取置信度颜色
  const getConfidenceColor = (confidence: number): 'success' | 'normal' | 'exception' => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'normal';
    return 'exception';
  };

  // 渲染优先级因素
  const renderPriorityFactors = (factors: PriorityFactor[]) => {
    const groupedFactors = {
      increase: factors.filter(f => f.impact === 'increase'),
      decrease: factors.filter(f => f.impact === 'decrease'),
      neutral: factors.filter(f => f.impact === 'neutral')
    };

    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        {Object.entries(groupedFactors).map(([impact, factorList]) => {
          if (factorList.length === 0) return null;
          
          const { icon, color } = FACTOR_IMPACT_ICONS[impact as keyof typeof FACTOR_IMPACT_ICONS];
          
          return (
            <div key={impact}>
              <Text strong style={{ color }}>
                {icon} {impact === 'increase' ? '提升因素' : impact === 'decrease' ? '降低因素' : '中性因素'}
              </Text>
              <List
                
                dataSource={factorList}
                renderItem={(factor) => (
                  <List.Item>
                    <Space>
                      <Progress
                        type="circle"
                        size={20}
                        percent={Math.round(factor.weight * 100)}
                        showInfo={false}
                        strokeColor={color}
                      />
                      <Text>{factor.description}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          );
        })}
      </Space>
    );
  };

  // 渲染工时分解
  const renderTimeBreakdown = (breakdown: TimeBreakdown[]) => {
    return (
      <Timeline>
        {breakdown.map((phase, index) => (
          <Timeline.Item
            key={index}
            dot={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
          >
            <Space direction="vertical" >
              <Space>
                <Text strong>{phase.phase}</Text>
                <Tag color="blue">{phase.hours}h ({phase.percentage}%)</Tag>
              </Space>
              <Text type="secondary">{phase.description}</Text>
            </Space>
          </Timeline.Item>
        ))}
      </Timeline>
    );
  };

  // 组件初始化时自动运行分析
  useEffect(() => {
    if (task && allTasks.length > 0 && !disabled) {
      runAnalysis();
    }
  }, [task.id, allTasks.length, disabled]);

  if (disabled) {
    return null;
  }

  return (
    <Card
      title={
        <Space>
          <RobotOutlined style={{ color: '#1890ff' }} />
          <span>AI 优先级与工时分析</span>
          {analysisResult && (
            <Badge 
              count={`${Math.round(analysisResult.overallConfidence * 100)}%`}
              style={{ backgroundColor: '#52c41a' }}
            />
          )}
        </Space>
      }
      extra={
        <Space>
          <Button 
            type="primary" 
             
            onClick={runAnalysis} 
            loading={loading}
            icon={<ReloadOutlined />}
          >
            重新分析
          </Button>
          {analysisResult && (
            <Button 
              type="default" 
               
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? '隐藏详情' : '查看详情'}
            </Button>
          )}
        </Space>
      }
    >
      {loading && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin size="large" />
          <Paragraph style={{ marginTop: 16 }}>
            正在进行AI智能分析...
          </Paragraph>
        </div>
      )}

      {analysisResult && !loading && (
        <>
          {/* 分析概览 */}
          <Row gutter={24} style={{ marginBottom: 24 }}>
            <Col span={12}>
              <Card  title="优先级分析" extra={<FlagOutlined />}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    <Tag 
                      color={PRIORITY_COLORS[analysisResult.priority.suggestedPriority]}
                      style={{ fontSize: '14px', padding: '4px 8px' }}
                    >
                      {PRIORITY_LABELS[analysisResult.priority.suggestedPriority]}
                    </Tag>
                    <Progress
                      type="circle"
                      size={40}
                      percent={Math.round(analysisResult.priority.confidence * 100)}
                      status={getConfidenceColor(analysisResult.priority.confidence)}
                    />
                  </Space>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {analysisResult.priority.reasoning}
                  </Text>
                  <Button 
                    type="primary" 
                     
                    icon={<CheckOutlined />}
                    onClick={applyAIPriority}
                  >
                    采用AI建议
                  </Button>
                </Space>
              </Card>
            </Col>
            
            <Col span={12}>
              <Card  title="工时预估" extra={<ClockCircleOutlined />}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
                      {analysisResult.timeEstimation.estimatedHours}h
                    </Text>
                    <Progress
                      type="circle"
                      size={40}
                      percent={Math.round(analysisResult.timeEstimation.confidence * 100)}
                      status={getConfidenceColor(analysisResult.timeEstimation.confidence)}
                    />
                  </Space>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {analysisResult.timeEstimation.reasoning}
                  </Text>
                  <Button 
                    type="primary" 
                     
                    icon={<CheckOutlined />}
                    onClick={applyAITime}
                  >
                    采用AI建议
                  </Button>
                </Space>
              </Card>
            </Col>
          </Row>

          {/* 手动调整区域 */}
          <Card  title="手动调整" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Space direction="vertical" >
                  <Text strong>优先级</Text>
                  <Select
                    value={manualPriority}
                    onChange={setManualPriority}
                    style={{ width: '100%' }}
                  >
                    <Option value="low">
                      <Tag color="green">低优先级</Tag>
                    </Option>
                    <Option value="medium">
                      <Tag color="orange">中优先级</Tag>
                    </Option>
                    <Option value="high">
                      <Tag color="red">高优先级</Tag>
                    </Option>
                  </Select>
                </Space>
              </Col>
              <Col span={8}>
                <Space direction="vertical" >
                  <Text strong>预估工时 (小时)</Text>
                  <InputNumber
                    value={manualHours}
                    onChange={(v) => setManualHours(typeof v === 'number' ? v : undefined)}
                    min={0.1}
                    max={200}
                    step={0.5}
                    style={{ width: '100%' }}
                    placeholder="输入工时"
                  />
                </Space>
              </Col>
              <Col span={8}>
                <Space direction="vertical" >
                  <Text strong>应用设置</Text>
                  <Button 
                    type="primary" 
                    onClick={applyManualValues}
                    disabled={!manualPriority || !manualHours}
                    block
                  >
                    应用手动设置
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* AI建议列表 */}
          {analysisResult.recommendations.length > 0 && (
            <Alert
              message="AI建议"
              description={
                <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                  {analysisResult.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              }
              type="info"
              showIcon
              icon={<BulbOutlined />}
              style={{ marginBottom: 16 }}
            />
          )}

          {/* 详细分析 */}
          {showDetails && (
            <Collapse>
              <Panel header="优先级分析详情" key="priority-details">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Title level={5}>影响因素分析</Title>
                    {renderPriorityFactors(analysisResult.priority.factors)}
                  </div>
                </Space>
              </Panel>
              
              <Panel header="工时预估详情" key="time-details">
                <Row gutter={24}>
                  <Col span={12}>
                    <Title level={5}>工时分解</Title>
                    {renderTimeBreakdown(analysisResult.timeEstimation.breakdown)}
                  </Col>
                  <Col span={12}>
                    <Title level={5}>相似任务参考</Title>
                    {analysisResult.timeEstimation.similarTasks.length > 0 ? (
                      <List
                        
                        dataSource={analysisResult.timeEstimation.similarTasks}
                        renderItem={(similarTask) => (
                          <List.Item>
                            <List.Item.Meta
                              title={
                                <Space>
                                  <span>#{similarTask.taskId} {similarTask.title}</span>
                                  <Badge 
                                    count={`${Math.round(similarTask.similarity * 100)}%`}
                                    style={{ backgroundColor: '#1890ff' }}
                                  />
                                </Space>
                              }
                              description={
                                <Space>
                                  {similarTask.estimatedHours && (
                                    <Text type="secondary">
                                      预估: {similarTask.estimatedHours}h
                                    </Text>
                                  )}
                                  {similarTask.actualHours && (
                                    <Text type="secondary">
                                      实际: {similarTask.actualHours.toFixed(1)}h
                                    </Text>
                                  )}
                                  {similarTask.priority && (
                                    <Tag color={PRIORITY_COLORS[similarTask.priority as keyof typeof PRIORITY_COLORS]}>
                                      {PRIORITY_LABELS[similarTask.priority as keyof typeof PRIORITY_LABELS]}
                                    </Tag>
                                  )}
                                </Space>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Text type="secondary">未找到相似任务参考</Text>
                    )}
                  </Col>
                </Row>
              </Panel>
            </Collapse>
          )}
        </>
      )}

      {!analysisResult && !loading && (
        <Alert
          message="AI分析尚未运行"
          description="点击重新分析按钮开始AI优先级和工时分析。"
          type="info"
          showIcon
        />
      )}
    </Card>
  );
};

export default AIPriorityTimeEstimator;