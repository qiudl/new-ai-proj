import React from 'react';
import { Card, Alert, Space, Typography, List, Tag } from 'antd';
import {
  BulbOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  FireOutlined,
  ClockCircleOutlined,
  TrophyOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface Recommendation {
  type: 'success' | 'info' | 'warning' | 'error';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: string;
}

interface SmartRecommendationsProps {
  data: {
    total_count: number;
    completed_count: number;
    in_progress_count: number;
    pending_count: number;
    overdue_count: number;
    timeEfficiency: number;
    completion_rate: number;
    priority_stats: {
      high: number;
      medium: number;
      low: number;
    };
  };
}

const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({ data }) => {

  // 生成智能建议
  const generateRecommendations = (): Recommendation[] => {
    const recommendations: Recommendation[] = [];

    // 1. 逾期任务警告（高优先级）
    if (data.overdue_count > 0) {
      recommendations.push({
        type: 'error',
        priority: 'high',
        title: `⚠️ 紧急：${data.overdue_count} 个逾期任务需要处理`,
        description: '逾期任务会影响项目进度和团队协作，建议立即处理或重新规划时间',
        icon: <WarningOutlined style={{ color: '#ff4d4f' }} />,
        action: '立即查看逾期任务'
      });
    }

    // 2. 时间效率优化建议
    if (data.timeEfficiency < 60) {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        title: '⏱️ 时间效率较低，需要优化',
        description: `当前时间效率为${Math.round(data.timeEfficiency)}%，建议重新评估任务复杂度，提高时间预估准确性，或分解大任务为小任务`,
        icon: <ClockCircleOutlined style={{ color: '#faad14' }} />,
        action: '优化时间预估'
      });
    } else if (data.timeEfficiency >= 60 && data.timeEfficiency < 80) {
      recommendations.push({
        type: 'info',
        priority: 'medium',
        title: '⏱️ 时间效率良好，可以继续优化',
        description: `当前时间效率为${Math.round(data.timeEfficiency)}%，表现不错！可以通过更精确的时间预估和任务优先级管理进一步提升`,
        icon: <ClockCircleOutlined style={{ color: '#1890ff' }} />,
        action: '查看时间分析'
      });
    }

    // 3. 高优先级任务提醒
    if (data.priority_stats.high > 0 && data.priority_stats.high >= data.total_count * 0.3) {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        title: `🔥 ${data.priority_stats.high} 个高优先级任务待处理`,
        description: '高优先级任务占比超过30%，建议优先完成这些任务，避免关键事项被延误',
        icon: <FireOutlined style={{ color: '#ff4d4f' }} />,
        action: '查看高优先级任务'
      });
    }

    // 4. 待办任务提醒
    if (data.pending_count > 0 && data.pending_count >= data.total_count * 0.5) {
      recommendations.push({
        type: 'info',
        priority: 'medium',
        title: `📋 ${data.pending_count} 个任务尚未开始`,
        description: '超过一半的任务还未开始执行，建议尽快启动这些任务，避免今日积压',
        icon: <InfoCircleOutlined style={{ color: '#1890ff' }} />,
        action: '开始执行任务'
      });
    }

    // 5. 工作量平衡建议
    if (data.total_count > 15) {
      recommendations.push({
        type: 'info',
        priority: 'low',
        title: '📊 今日任务量较多',
        description: `当前有${data.total_count}个任务，工作量较大。建议评估任务优先级，考虑将部分低优先级任务延期或委派`,
        icon: <InfoCircleOutlined style={{ color: '#1890ff' }} />,
        action: '优化任务列表'
      });
    }

    // 6. 表现鼓励（高完成率 + 高时间效率）
    if (data.completion_rate >= 70 && data.timeEfficiency >= 80) {
      recommendations.push({
        type: 'success',
        priority: 'low',
        title: '🎉 工作效率优秀！',
        description: `完成率${Math.round(data.completion_rate)}%，时间效率${Math.round(data.timeEfficiency)}%，您的时间管理和任务执行能力都很出色，继续保持！`,
        icon: <TrophyOutlined style={{ color: '#52c41a' }} />,
        action: null
      });
    } else if (data.completion_rate >= 50) {
      recommendations.push({
        type: 'success',
        priority: 'low',
        title: '👍 进展良好',
        description: `当前完成率${Math.round(data.completion_rate)}%，表现不错！继续保持专注，相信您能完成更多任务`,
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
        action: null
      });
    }

    // 7. 零任务提示
    if (data.total_count === 0) {
      recommendations.push({
        type: 'info',
        priority: 'low',
        title: '✨ 今日暂无任务',
        description: '您今天还没有安排任务，可以规划一下今日的工作内容，或者休息一下',
        icon: <BulbOutlined style={{ color: '#1890ff' }} />,
        action: '创建新任务'
      });
    }

    // 按优先级排序：high > medium > low
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  };

  const recommendations = generateRecommendations();

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'blue';
      default:
        return 'default';
    }
  };

  return (
    <Card
      title={
        <Space>
          <BulbOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
          <span>💡 智能建议</span>
        </Space>
      }
      bordered={false}
      style={{ height: '100%' }}
      extra={
        <Tag color="blue" style={{ marginRight: 0 }}>
          {recommendations.length} 条建议
        </Tag>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 说明 */}
        <Alert
          message="基于今日任务数据的智能分析"
          description="系统根据您的任务状态、时间效率和优先级分布，为您提供个性化的工作建议"
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: '8px' }}
        />

        {/* 建议列表 */}
        {recommendations.length > 0 ? (
          <List
            dataSource={recommendations}
            renderItem={(item) => (
              <List.Item style={{ padding: '12px 0', border: 'none' }}>
                <Alert
                  message={
                    <Space>
                      {item.title}
                      <Tag color={getPriorityColor(item.priority)} style={{ marginLeft: '8px' }}>
                        {item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'}
                      </Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <Text>{item.description}</Text>
                      {item.action && (
                        <div style={{ marginTop: '8px' }}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            💡 推荐操作: {item.action}
                          </Text>
                        </div>
                      )}
                    </div>
                  }
                  type={item.type}
                  showIcon
                  icon={item.icon}
                  style={{ width: '100%' }}
                />
              </List.Item>
            )}
          />
        ) : (
          <Alert
            message="暂无建议"
            description="当前数据良好，暂时没有需要特别关注的事项"
            type="success"
            showIcon
          />
        )}

        {/* 提示信息 */}
        <div
          style={{
            padding: '12px',
            background: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: '6px',
            marginTop: '16px'
          }}
        >
          <Space direction="vertical" size={4}>
            <Text style={{ fontSize: '12px', color: '#389e0d', fontWeight: 500 }}>
              💡 智能建议说明
            </Text>
            <Text style={{ fontSize: '12px', color: '#52c41a' }}>
              • 建议会根据您的实时任务数据动态更新
            </Text>
            <Text style={{ fontSize: '12px', color: '#52c41a' }}>
              • 高优先级建议建议优先处理
            </Text>
            <Text style={{ fontSize: '12px', color: '#52c41a' }}>
              • 您可以根据实际情况灵活调整执行策略
            </Text>
          </Space>
        </div>
      </Space>
    </Card>
  );
};

export default SmartRecommendations;
