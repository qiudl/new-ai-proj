/**
 * AI Dependency Analyzer Component
 * 
 * This component provides a user interface for displaying AI-generated dependency suggestions
 * and allows users to accept, reject, or modify the suggestions.
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  List,
  Tag,
  Progress,
  Space,
  Typography,
  Collapse,
  Checkbox,
  Tooltip,
  Alert,
  Spin,
  Badge
} from 'antd';
import {
  RobotOutlined,
  CheckOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  BulbOutlined,
  LinkOutlined
} from '@ant-design/icons';

import { Task } from '../types/task';
import {
  aiDependencyAnalyzer,
  DependencyAnalysisResult,
  DependencySuggestion
} from '../services/aiDependencyAnalyzer';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface AIDependencyAnalyzerProps {
  task: Task;
  allTasks: Task[];
  onDependenciesUpdate: (dependencies: number[]) => void;
  currentDependencies?: number[];
}

interface SuggestionState {
  [key: number]: 'pending' | 'accepted' | 'rejected';
}

export const AIDependencyAnalyzer: React.FC<AIDependencyAnalyzerProps> = ({
  task,
  allTasks,
  onDependenciesUpdate,
  currentDependencies = []
}) => {
  const [analysisResult, setAnalysisResult] = useState<DependencyAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggestionStates, setSuggestionStates] = useState<SuggestionState>({});
  const [showDetails, setShowDetails] = useState(false);

  // 执行AI分析
  const runAnalysis = async () => {
    setLoading(true);
    try {
      // 设置任务上下文
      aiDependencyAnalyzer.setTaskContext(allTasks);
      
      // 执行分析
      const result = await aiDependencyAnalyzer.analyzeDependencies(task);
      setAnalysisResult(result);
      
      // 初始化建议状态
      const initialStates: SuggestionState = {};
      result.suggestedDependencies.forEach(suggestion => {
        // 如果已存在依赖关系，标记为已接受
        if (currentDependencies.includes(suggestion.targetTaskId)) {
          initialStates[suggestion.targetTaskId] = 'accepted';
        } else {
          initialStates[suggestion.targetTaskId] = 'pending';
        }
      });
      setSuggestionStates(initialStates);
      
    } catch (error) {
      console.error('AI依赖分析失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理建议状态变更
  const handleSuggestionStateChange = (taskId: number, state: 'accepted' | 'rejected') => {
    setSuggestionStates(prev => ({
      ...prev,
      [taskId]: state
    }));
  };

  // 应用选中的依赖关系
  const applySelectedDependencies = () => {
    const acceptedDependencies = Object.entries(suggestionStates)
      .filter(([_, state]) => state === 'accepted')
      .map(([taskId, _]) => parseInt(taskId));
    
    // 合并现有依赖和新接受的依赖
    const allDependencies = Array.from(new Set([
      ...currentDependencies,
      ...acceptedDependencies
    ]));
    
    onDependenciesUpdate(allDependencies);
  };

  // 获取置信度颜色
  const getConfidenceColor = (confidence: number): 'success' | 'normal' | 'exception' => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'normal';
    return 'exception';
  };

  // 获取建议类型图标
  const getSuggestionTypeIcon = (type: DependencySuggestion['type']) => {
    switch (type) {
      case 'reference': return <LinkOutlined />;
      case 'keyword': return <BulbOutlined />;
      case 'semantic': return <InfoCircleOutlined />;
      case 'sequential': return <CheckOutlined />;
      default: return <InfoCircleOutlined />;
    }
  };

  // 组件初始化时自动运行分析
  useEffect(() => {
    if (task && allTasks.length > 0) {
      runAnalysis();
    }
  }, [task.id, allTasks.length]);

  const acceptedCount = Object.values(suggestionStates).filter(state => state === 'accepted').length;
  const rejectedCount = Object.values(suggestionStates).filter(state => state === 'rejected').length;

  return (
    <Card
      title={
        <Space>
          <RobotOutlined style={{ color: '#1890ff' }} />
          <span>AI 依赖关系分析</span>
          {analysisResult && (
            <Badge 
              count={analysisResult.suggestedDependencies.length} 
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
            icon={<RobotOutlined />}
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
      style={{ marginBottom: 16 }}
    >
      {loading && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin size="large" />
          <Paragraph style={{ marginTop: 16 }}>
            正在分析任务依赖关系...
          </Paragraph>
        </div>
      )}

      {analysisResult && !loading && (
        <>
          {/* 分析概览 */}
          <div style={{ marginBottom: 16 }}>
            <Space size="large">
              <div>
                <Text strong>整体置信度</Text>
                <br />
                <Progress 
                  percent={Math.round(analysisResult.confidence * 100)} 
                  
                  status={getConfidenceColor(analysisResult.confidence)}
                />
              </div>
              <div>
                <Text strong>发现建议</Text>
                <br />
                <Text>{analysisResult.suggestedDependencies.length} 个</Text>
              </div>
              <div>
                <Text strong>已接受</Text>
                <br />
                <Text style={{ color: '#52c41a' }}>{acceptedCount} 个</Text>
              </div>
              <div>
                <Text strong>已拒绝</Text>
                <br />
                <Text style={{ color: '#ff4d4f' }}>{rejectedCount} 个</Text>
              </div>
            </Space>
          </div>

          {/* 依赖建议列表 */}
          {analysisResult.suggestedDependencies.length > 0 ? (
            <>
              <Title level={5}>依赖建议</Title>
              <List
                dataSource={analysisResult.suggestedDependencies}
                renderItem={(suggestion) => (
                  <List.Item
                    actions={[
                      <Checkbox
                        checked={suggestionStates[suggestion.targetTaskId] === 'accepted'}
                        onChange={(e) => 
                          handleSuggestionStateChange(
                            suggestion.targetTaskId, 
                            e.target.checked ? 'accepted' : 'rejected'
                          )
                        }
                      >
                        接受
                      </Checkbox>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={getSuggestionTypeIcon(suggestion.type)}
                      title={
                        <Space>
                          <span>任务 #{suggestion.targetTaskId}: {suggestion.targetTaskTitle}</span>
                          <Tag color={getConfidenceColor(suggestion.confidence)}>
                            置信度 {Math.round(suggestion.confidence * 100)}%
                          </Tag>
                          <Tag>{suggestion.type}</Tag>
                        </Space>
                      }
                      description={suggestion.reason}
                    />
                  </List.Item>
                )}
              />

              {/* 应用按钮 */}
              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <Button 
                  type="primary" 
                  onClick={applySelectedDependencies}
                  disabled={acceptedCount === 0}
                >
                  应用选中的依赖关系 ({acceptedCount})
                </Button>
              </div>
            </>
          ) : (
            <Alert
              message="未发现依赖关系"
              description="AI分析未找到明确的依赖关系指示。您可以手动添加依赖关系。"
              type="info"
              showIcon
            />
          )}

          {/* 详细分析信息 */}
          {showDetails && (
            <Collapse style={{ marginTop: 16 }}>
              <Panel header="分析详情" key="details">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text strong>检测到的关键词:</Text>
                    <div style={{ marginTop: 8 }}>
                      {analysisResult.analysis.keywordsFound.length > 0 ? (
                        analysisResult.analysis.keywordsFound.map(keyword => (
                          <Tag key={keyword} color="blue">{keyword}</Tag>
                        ))
                      ) : (
                        <Text type="secondary">未检测到依赖关键词</Text>
                      )}
                    </div>
                  </div>

                  <div>
                    <Text strong>匹配的任务:</Text>
                    <div style={{ marginTop: 8 }}>
                      {analysisResult.analysis.matchingTasks.length > 0 ? (
                        <List
                          
                          dataSource={analysisResult.analysis.matchingTasks}
                          renderItem={(match) => (
                            <List.Item>
                              <Space>
                                <span>#{match.taskId} {match.taskTitle}</span>
                                <Tag>{match.matchType}</Tag>
                                <Tag color="geekblue">
                                  {Math.round(match.matchScore * 100)}%
                                </Tag>
                                <Text type="secondary">{match.matchedText}</Text>
                              </Space>
                            </List.Item>
                          )}
                        />
                      ) : (
                        <Text type="secondary">未找到匹配的任务</Text>
                      )}
                    </div>
                  </div>

                  <div>
                    <Text strong>分析推理:</Text>
                    <Paragraph style={{ marginTop: 8 }}>
                      {analysisResult.analysis.reasoning}
                    </Paragraph>
                  </div>
                </Space>
              </Panel>
            </Collapse>
          )}
        </>
      )}

      {!analysisResult && !loading && (
        <Alert
          message="AI分析尚未运行"
          description="点击重新分析按钮开始AI依赖关系分析。"
          type="info"
          showIcon
        />
      )}
    </Card>
  );
};

export default AIDependencyAnalyzer;