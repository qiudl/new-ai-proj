/**
 * AI Tags Generator Component
 * 
 * This component provides a user interface for AI-generated tag suggestions
 * and allows users to accept, reject, or modify the suggestions.
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Tag,
  Space,
  Typography,
  Collapse,
  Checkbox,
  Input,
  Progress,
  Alert,
  Spin,
  Badge,
  Tooltip,
  Divider
} from 'antd';
import {
  RobotOutlined,
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  BulbOutlined,
  CodeOutlined,
  ToolOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';

import { Task } from '../types/task';
import {
  aiTagsGenerator,
  TagsGenerationResult,
  TagSuggestion
} from '../services/aiTagsGenerator';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface AITagsGeneratorProps {
  task: Task;
  allTasks: Task[];
  onTagsUpdate: (tags: string[]) => void;
  currentTags?: string[];
  disabled?: boolean;
}

interface TagState {
  [key: string]: 'pending' | 'accepted' | 'rejected';
}

const TAG_TYPE_ICONS = {
  keyword: <BulbOutlined />,
  tech_stack: <CodeOutlined />,
  business_domain: <ToolOutlined />,
  contextual: <InfoCircleOutlined />,
  semantic: <ThunderboltOutlined />
};

const TAG_TYPE_COLORS = {
  keyword: 'blue',
  tech_stack: 'green',
  business_domain: 'orange',
  contextual: 'purple',
  semantic: 'cyan'
};

export const AITagsGenerator: React.FC<AITagsGeneratorProps> = ({
  task,
  allTasks,
  onTagsUpdate,
  currentTags = [],
  disabled = false
}) => {
  const [generationResult, setGenerationResult] = useState<TagsGenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [tagStates, setTagStates] = useState<TagState>({});
  const [showDetails, setShowDetails] = useState(false);
  const [customTag, setCustomTag] = useState('');

  // 执行AI标签生成
  const runGeneration = async () => {
    setLoading(true);
    try {
      // 设置任务上下文
      aiTagsGenerator.setTaskContext(allTasks);
      
      // 执行标签生成
      const result = await aiTagsGenerator.generateTags(task);
      setGenerationResult(result);
      
      // 初始化标签状态
      const initialStates: TagState = {};
      result.suggestedTags.forEach(suggestion => {
        // 如果标签已存在，标记为已接受
        if (currentTags.includes(suggestion.tag)) {
          initialStates[suggestion.tag] = 'accepted';
        } else {
          initialStates[suggestion.tag] = 'pending';
        }
      });
      setTagStates(initialStates);
      
    } catch (error) {
      console.error('AI标签生成失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理标签状态变更
  const handleTagStateChange = (tag: string, state: 'accepted' | 'rejected') => {
    setTagStates(prev => ({
      ...prev,
      [tag]: state
    }));
  };

  // 添加自定义标签
  const addCustomTag = () => {
    if (customTag.trim() && !currentTags.includes(customTag.trim())) {
      const newTags = [...currentTags, customTag.trim()];
      onTagsUpdate(newTags);
      setCustomTag('');
    }
  };

  // 移除标签
  const removeTag = (tag: string) => {
    const newTags = currentTags.filter(t => t !== tag);
    onTagsUpdate(newTags);
    
    // 同时更新标签状态
    setTagStates(prev => ({
      ...prev,
      [tag]: 'rejected'
    }));
  };

  // 应用选中的标签
  const applySelectedTags = () => {
    const acceptedTags = Object.entries(tagStates)
      .filter(([_, state]) => state === 'accepted')
      .map(([tag, _]) => tag);
    
    // 合并现有标签和新接受的标签
    const allTags = Array.from(new Set([
      ...currentTags,
      ...acceptedTags
    ]));
    
    onTagsUpdate(allTags);
  };

  // 获取置信度颜色
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  // 获取标签类型显示名称
  const getTagTypeDisplayName = (type: TagSuggestion['type']): string => {
    const names = {
      keyword: '关键词',
      tech_stack: '技术栈',
      business_domain: '业务领域',
      contextual: '上下文',
      semantic: '语义相关'
    };
    return names[type] || type;
  };

  // 组件初始化时自动运行生成
  useEffect(() => {
    if (task && allTasks.length > 0 && !disabled) {
      runGeneration();
    }
  }, [task.id, allTasks.length, disabled]);

  const acceptedCount = Object.values(tagStates).filter(state => state === 'accepted').length;
  const rejectedCount = Object.values(tagStates).filter(state => state === 'rejected').length;

  if (disabled) {
    return null;
  }

  return (
    <Card
      title={
        <Space>
          <RobotOutlined style={{ color: '#1890ff' }} />
          <span>AI 标签生成</span>
          {generationResult && (
            <Badge 
              count={generationResult.suggestedTags.length} 
              style={{ backgroundColor: '#52c41a' }}
            />
          )}
        </Space>
      }
      extra={
        <Space>
          <Button 
            type="primary" 
            size="small" 
            onClick={runGeneration} 
            loading={loading}
            icon={<ReloadOutlined />}
          >
            重新生成
          </Button>
          {generationResult && (
            <Button 
              type="default" 
              size="small" 
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
            正在智能生成标签...
          </Paragraph>
        </div>
      )}

      {/* 当前标签展示 */}
      <div style={{ marginBottom: 16 }}>
        <Title level={5}>当前标签</Title>
        <Space wrap>
          {currentTags.map(tag => (
            <Tag
              key={tag}
              closable
              onClose={() => removeTag(tag)}
              color="blue"
            >
              {tag}
            </Tag>
          ))}
          {currentTags.length === 0 && (
            <Text type="secondary">暂无标签</Text>
          )}
        </Space>
      </div>

      {/* 添加自定义标签 */}
      <div style={{ marginBottom: 16 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="输入自定义标签"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onPressEnter={addCustomTag}
          />
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={addCustomTag}
            disabled={!customTag.trim()}
          >
            添加
          </Button>
        </Space.Compact>
      </div>

      <Divider />

      {generationResult && !loading && (
        <>
          {/* 生成概览 */}
          <div style={{ marginBottom: 16 }}>
            <Space size="large">
              <div>
                <Text strong>生成置信度</Text>
                <br />
                <Progress 
                  percent={Math.round(generationResult.confidence * 100)} 
                  size="small"
                  status={getConfidenceColor(generationResult.confidence)}
                />
              </div>
              <div>
                <Text strong>建议标签</Text>
                <br />
                <Text>{generationResult.suggestedTags.length} 个</Text>
              </div>
              <div>
                <Text strong>已选中</Text>
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

          {/* 标签建议 */}
          {generationResult.suggestedTags.length > 0 ? (
            <>
              <Title level={5}>AI 标签建议</Title>
              <Space wrap style={{ marginBottom: 16 }}>
                {generationResult.suggestedTags.map((suggestion) => (
                  <Tooltip
                    key={suggestion.tag}
                    title={
                      <div>
                        <div><strong>类型:</strong> {getTagTypeDisplayName(suggestion.type)}</div>
                        <div><strong>置信度:</strong> {Math.round(suggestion.confidence * 100)}%</div>
                        <div><strong>原因:</strong> {suggestion.reason}</div>
                        {suggestion.frequency && suggestion.frequency > 0 && (
                          <div><strong>出现频率:</strong> {suggestion.frequency}次</div>
                        )}
                      </div>
                    }
                  >
                    <Tag
                      icon={TAG_TYPE_ICONS[suggestion.type]}
                      color={
                        tagStates[suggestion.tag] === 'accepted' 
                          ? 'green' 
                          : tagStates[suggestion.tag] === 'rejected'
                          ? 'red'
                          : TAG_TYPE_COLORS[suggestion.type]
                      }
                      style={{ 
                        cursor: 'pointer',
                        marginBottom: 8,
                        opacity: tagStates[suggestion.tag] === 'rejected' ? 0.5 : 1
                      }}
                      onClick={() => {
                        const currentState = tagStates[suggestion.tag];
                        const newState = currentState === 'accepted' ? 'rejected' : 'accepted';
                        handleTagStateChange(suggestion.tag, newState);
                      }}
                    >
                      <Space size="small">
                        <span>{suggestion.tag}</span>
                        <Badge 
                          count={Math.round(suggestion.confidence * 100)} 
                          style={{ 
                            backgroundColor: getConfidenceColor(suggestion.confidence) === 'success' ? '#52c41a' : '#faad14',
                            fontSize: '10px'
                          }}
                        />
                        {tagStates[suggestion.tag] === 'accepted' && (
                          <span style={{ color: '#52c41a' }}>✓</span>
                        )}
                      </Space>
                    </Tag>
                  </Tooltip>
                ))}
              </Space>

              {/* 应用按钮 */}
              <div style={{ textAlign: 'right', marginBottom: 16 }}>
                <Button 
                  type="primary" 
                  onClick={applySelectedTags}
                  disabled={acceptedCount === 0}
                >
                  应用选中标签 ({acceptedCount})
                </Button>
              </div>
            </>
          ) : (
            <Alert
              message="未生成标签建议"
              description="AI分析未找到合适的标签建议。您可以手动添加标签。"
              type="info"
              showIcon
            />
          )}

          {/* 详细分析信息 */}
          {showDetails && (
            <Collapse>
              <Panel header="生成详情" key="details">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text strong>提取的关键词:</Text>
                    <div style={{ marginTop: 8 }}>
                      {generationResult.analysis.extractedKeywords.length > 0 ? (
                        generationResult.analysis.extractedKeywords.map(keyword => (
                          <Tag key={keyword.keyword} color="blue">
                            {keyword.keyword} ({keyword.score.toFixed(3)})
                          </Tag>
                        ))
                      ) : (
                        <Text type="secondary">未提取到有效关键词</Text>
                      )}
                    </div>
                  </div>

                  <div>
                    <Text strong>技术栈标签:</Text>
                    <div style={{ marginTop: 8 }}>
                      {generationResult.analysis.techStackTags.length > 0 ? (
                        generationResult.analysis.techStackTags.map(tag => (
                          <Tag key={tag} color="green" icon={<CodeOutlined />}>
                            {tag}
                          </Tag>
                        ))
                      ) : (
                        <Text type="secondary">未识别到技术栈</Text>
                      )}
                    </div>
                  </div>

                  <div>
                    <Text strong>业务领域标签:</Text>
                    <div style={{ marginTop: 8 }}>
                      {generationResult.analysis.businessDomainTags.length > 0 ? (
                        generationResult.analysis.businessDomainTags.map(tag => (
                          <Tag key={tag} color="orange" icon={<ToolOutlined />}>
                            {tag}
                          </Tag>
                        ))
                      ) : (
                        <Text type="secondary">未分类业务领域</Text>
                      )}
                    </div>
                  </div>

                  <div>
                    <Text strong>上下文标签:</Text>
                    <div style={{ marginTop: 8 }}>
                      {generationResult.analysis.contextualTags.length > 0 ? (
                        generationResult.analysis.contextualTags.map(tag => (
                          <Tag key={tag} color="purple" icon={<InfoCircleOutlined />}>
                            {tag}
                          </Tag>
                        ))
                      ) : (
                        <Text type="secondary">未找到上下文相关标签</Text>
                      )}
                    </div>
                  </div>

                  <div>
                    <Text strong>生成推理:</Text>
                    <Paragraph style={{ marginTop: 8 }}>
                      {generationResult.analysis.reasoning}
                    </Paragraph>
                  </div>
                </Space>
              </Panel>
            </Collapse>
          )}
        </>
      )}

      {!generationResult && !loading && (
        <Alert
          message="AI标签生成尚未运行"
          description="点击"重新生成"按钮开始AI标签生成。"
          type="info"
          showIcon
        />
      )}
    </Card>
  );
};

export default AITagsGenerator;