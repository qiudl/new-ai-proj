// SmartSuggestionsPanel - 智能建议面板
// 任务#243: 前端通用组件开发 - 智能建议UI界面
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  List,
  Tag,
  Button,
  Progress,
  Typography,
  Space,
  Badge,
  Avatar,
  Tooltip,
  Skeleton,
  Empty,
  Rate,
  Modal,
  Divider,
  Alert,
  notification,
  Input
} from 'antd';
import {
  BulbOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  StarOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  FilterOutlined
} from '@ant-design/icons';
import type { TimerSuggestion } from '../types/timer';

const { Title, Text, Paragraph } = Typography;

interface SmartSuggestionsPanelProps {
  suggestions: TimerSuggestion[];
  loading?: boolean;
  onSuggestionSelect: (suggestion: TimerSuggestion) => void;
  onRefresh?: () => void;
  onFeedback?: (suggestionId: number, rating: number, feedback?: string) => void;
  compact?: boolean;
  showConfidence?: boolean;
  showReasoning?: boolean;
  maxSuggestions?: number;
}

export const SmartSuggestionsPanel: React.FC<SmartSuggestionsPanelProps> = ({
  suggestions,
  loading = false,
  onSuggestionSelect,
  onRefresh,
  onFeedback,
  compact = false,
  showConfidence = true,
  showReasoning = false,
  maxSuggestions = 5
}) => {
  const [selectedSuggestion, setSelectedSuggestion] = useState<TimerSuggestion | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');

  // 按置信度和适用性排序建议
  const sortedSuggestions = suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxSuggestions);

  const handleSuggestionClick = (suggestion: TimerSuggestion) => {
    if (compact) {
      onSuggestionSelect(suggestion);
    } else {
      setSelectedSuggestion(suggestion);
      showDetailsModal(suggestion);
    }
  };

  const showDetailsModal = (suggestion: TimerSuggestion) => {
    Modal.confirm({
      title: (
        <Space>
          <BulbOutlined style={{ color: '#1890ff' }} />
          智能建议详情
        </Space>
      ),
      content: (
        <div style={{ padding: '16px 0' }}>
          <Title level={4}>{suggestion.title}</Title>
          
          <Space wrap style={{ marginBottom: 16 }}>
            <Tag color="blue">{suggestion.category}</Tag>
            <Tag color="green">
              <ClockCircleOutlined /> {suggestion.estimated_minutes} 分钟
            </Tag>
            {suggestion.priority && (
              <Tag color={getPriorityColor(suggestion.priority)}>
                {getPriorityText(suggestion.priority)}
              </Tag>
            )}
          </Space>

          {showConfidence && (
            <div style={{ marginBottom: 16 }}>
              <Text strong>推荐置信度：</Text>
              <Progress
                percent={Math.round(suggestion.confidence * 100)}
                
                format={percent => `${percent}%`}
                strokeColor={getConfidenceColor(suggestion.confidence)}
              />
            </div>
          )}

          {showReasoning && suggestion.reasoning.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Text strong>推荐理由：</Text>
              <List
                
                dataSource={suggestion.reasoning}
                renderItem={reason => (
                  <List.Item>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                    {reason}
                  </List.Item>
                )}
              />
            </div>
          )}

          {suggestion.tags.length > 0 && (
            <div>
              <Text strong>相关标签：</Text>
              <div style={{ marginTop: 8 }}>
                {suggestion.tags.map(tag => (
                  <Tag key={tag} style={{ marginBottom: 4 }}>
                    {tag}
                  </Tag>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
      okText: '开始此任务',
      cancelText: '取消',
      width: 500,
      onOk: () => {
        onSuggestionSelect(suggestion);
        notification.success({
          message: '已选择建议',
          description: `开始计时: ${suggestion.title}`
        });
      },
      footer: (_, { OkBtn, CancelBtn }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            
            icon={<StarOutlined />}
            onClick={() => {
              setSelectedSuggestion(suggestion);
              setShowFeedbackModal(true);
            }}
          >
            评价建议
          </Button>
          <Space>
            <CancelBtn />
            <OkBtn />
          </Space>
        </div>
      )
    });
  };

  const handleFeedbackSubmit = () => {
    if (selectedSuggestion && onFeedback) {
      onFeedback(selectedSuggestion.id, feedbackRating, feedbackText);
      notification.success({
        message: '反馈已提交',
        description: '感谢您的反馈，这将帮助我们改进推荐算法'
      });
      setShowFeedbackModal(false);
      setFeedbackRating(0);
      setFeedbackText('');
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return '#ff4d4f';
      case 'medium': return '#faad14';
      case 'low': return '#52c41a';
      default: return '#d9d9d9';
    }
  };

  const getPriorityText = (priority: string): string => {
    switch (priority) {
      case 'high': return '高优先级';
      case 'medium': return '中优先级';
      case 'low': return '低优先级';
      default: return '普通';
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#52c41a';
    if (confidence >= 0.6) return '#faad14';
    return '#ff4d4f';
  };

  const getConfidenceText = (confidence: number): string => {
    if (confidence >= 0.9) return '非常推荐';
    if (confidence >= 0.8) return '强烈推荐';
    if (confidence >= 0.7) return '推荐';
    if (confidence >= 0.6) return '一般推荐';
    return '可以考虑';
  };

  const renderSuggestionItem = (suggestion: TimerSuggestion, index: number) => (
    <List.Item
      key={suggestion.id}
      style={{
        cursor: 'pointer',
        padding: compact ? '8px 12px' : '12px 16px',
        borderRadius: 6,
        marginBottom: 8,
        background: '#fafafa',
        border: '1px solid #f0f0f0',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#e6f7ff';
        e.currentTarget.style.borderColor = '#1890ff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#fafafa';
        e.currentTarget.style.borderColor = '#f0f0f0';
      }}
      onClick={() => handleSuggestionClick(suggestion)}
    >
      <List.Item.Meta
        avatar={
          <Badge count={index + 1}  color="#1890ff">
            <Avatar
              icon={<BulbOutlined />}
              style={{
                backgroundColor: getConfidenceColor(suggestion.confidence),
                color: 'white'
              }}
            />
          </Badge>
        }
        title={
          <Space>
            <Text strong>{suggestion.title}</Text>
            {showConfidence && (
              <Tooltip title={`置信度: ${Math.round(suggestion.confidence * 100)}%`}>
<Tag color={getConfidenceColor(suggestion.confidence)}>
                  {getConfidenceText(suggestion.confidence)}
                </Tag>
              </Tooltip>
            )}
          </Space>
        }
        description={
          <Space wrap>
<Tag color="blue">
              <ClockCircleOutlined /> {suggestion.estimated_minutes}分钟
            </Tag>
<Tag color="cyan">
              {suggestion.category}
            </Tag>
            {suggestion.priority && (
<Tag color={getPriorityColor(suggestion.priority)}>
                {getPriorityText(suggestion.priority)}
              </Tag>
            )}
          </Space>
        }
      />
      
      {!compact && (
        <div style={{ marginTop: 8 }}>
          <Progress
            percent={Math.round(suggestion.confidence * 100)}
            
            showInfo={false}
            strokeColor={getConfidenceColor(suggestion.confidence)}
          />
        </div>
      )}
    </List.Item>
  );

  if (loading) {
    return (
      <Card
        title={
          <Space>
            <RobotOutlined spin />
            AI正在分析...
          </Space>
        }
        size={compact ? 'small' : 'default'}
      >
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    );
  }

  if (sortedSuggestions.length === 0) {
    return (
      <Card
        title={
          <Space>
            <BulbOutlined />
            智能建议
          </Space>
        }
        size={compact ? 'small' : 'default'}
        extra={
          onRefresh && (
            <Button
              type="text"
              
              icon={<ReloadOutlined />}
              onClick={onRefresh}
            >
              刷新
            </Button>
          )
        }
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无智能建议"
          style={{ margin: '20px 0' }}
        >
          <Button type="primary" icon={<ReloadOutlined />} onClick={onRefresh}>
            重新获取建议
          </Button>
        </Empty>
      </Card>
    );
  }

  return (
    <>
      <Card
        title={
          <Space>
            <RobotOutlined style={{ color: '#1890ff' }} />
            智能建议
            <Badge count={sortedSuggestions.length} color="#52c41a" />
          </Space>
        }
        size={compact ? 'small' : 'default'}
        extra={
          <Space>
            {!compact && (
              <Tooltip title="基于您的工作模式和历史数据生成">
                <QuestionCircleOutlined style={{ color: '#8c8c8c' }} />
              </Tooltip>
            )}
            {onRefresh && (
              <Button
                type="text"
                
                icon={<ReloadOutlined />}
                onClick={onRefresh}
                loading={loading}
              >
                刷新
              </Button>
            )}
          </Space>
        }
      >
        {!compact && (
          <Alert
            message="AI智能推荐"
            description="基于您的工作习惯、时间模式和历史数据，为您推荐最适合当前时间的任务"
            type="info"
            showIcon
            icon={<ThunderboltOutlined />}
            style={{ marginBottom: 16 }}
            closable
          />
        )}

        <List
          dataSource={sortedSuggestions}
          renderItem={renderSuggestionItem}
          split={false}
        />

        {!compact && suggestions.length > maxSuggestions && (
          <Divider>
            <Text type="secondary">
              显示前 {maxSuggestions} 个建议，共 {suggestions.length} 个
            </Text>
          </Divider>
        )}
      </Card>

      {/* 反馈模态框 */}
      <Modal
        title="评价智能建议"
        open={showFeedbackModal}
        onOk={handleFeedbackSubmit}
        onCancel={() => setShowFeedbackModal(false)}
        okText="提交反馈"
        cancelText="取消"
        okButtonProps={{ disabled: feedbackRating === 0 }}
      >
        {selectedSuggestion && (
          <div>
            <Paragraph>
              请对建议 <Text strong>"{selectedSuggestion.title}"</Text> 进行评价：
            </Paragraph>
            
            <div style={{ marginBottom: 16 }}>
              <Text strong>推荐质量评分：</Text>
              <div style={{ marginTop: 8 }}>
                <Rate
                  value={feedbackRating}
                  onChange={setFeedbackRating}
                  character={<StarOutlined />}
                />
                <Text style={{ marginLeft: 8 }}>
                  {feedbackRating === 0 && '请选择评分'}
                  {feedbackRating === 1 && '很差'}
                  {feedbackRating === 2 && '较差'}
                  {feedbackRating === 3 && '一般'}
                  {feedbackRating === 4 && '很好'}
                  {feedbackRating === 5 && '非常好'}
                </Text>
              </div>
            </div>

            <div>
              <Text strong>额外反馈（可选）：</Text>
              <Input.TextArea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="请分享您对这个建议的想法，这将帮助我们改进推荐算法..."
                rows={3}
                style={{ marginTop: 8 }}
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default SmartSuggestionsPanel;