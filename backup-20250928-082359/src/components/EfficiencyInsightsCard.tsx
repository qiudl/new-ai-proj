import React from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Tag,
  Alert,
  Timeline,
  Divider
} from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  BulbOutlined,
  InfoCircleOutlined,
  TrophyOutlined,
  FireOutlined,
  ClockCircleOutlined,
  RiseOutlined
} from '@ant-design/icons';
import { EfficiencyInsight } from '../types/dailyEfficiency';

const { Title, Text, Paragraph } = Typography;

interface EfficiencyInsightsCardProps {
  insights: Array<EfficiencyInsight & {
    icon: string;
    color: string;
  }>;
}

const EfficiencyInsightsCard: React.FC<EfficiencyInsightsCardProps> = ({
  insights
}) => {

  const getInsightIcon = (iconName: string) => {
    const iconMap = {
      CheckCircleOutlined: <CheckCircleOutlined />,
      WarningOutlined: <WarningOutlined />,
      BulbOutlined: <BulbOutlined />,
      InfoCircleOutlined: <InfoCircleOutlined />,
      TrophyOutlined: <TrophyOutlined />,
      FireOutlined: <FireOutlined />,
      ClockCircleOutlined: <ClockCircleOutlined />,
      RiseOutlined: <RiseOutlined />
    };
    return iconMap[iconName as keyof typeof iconMap] || <InfoCircleOutlined />;
  };

  const getInsightTypeConfig = (type: string) => {
    const configs = {
      positive: {
        status: 'success' as const,
        bgColor: '#f6ffed',
        borderColor: '#52c41a'
      },
      warning: {
        status: 'warning' as const,
        bgColor: '#fffbe6',
        borderColor: '#faad14'
      },
      suggestion: {
        status: 'info' as const,
        bgColor: '#f0f9ff',
        borderColor: '#1890ff'
      },
      info: {
        status: 'info' as const,
        bgColor: '#f9f0ff',
        borderColor: '#722ed1'
      }
    };
    return configs[type as keyof typeof configs] || configs.info;
  };

  const groupedInsights = insights.reduce((acc, insight) => {
    if (!acc[insight.type]) {
      acc[insight.type] = [];
    }
    acc[insight.type].push(insight);
    return acc;
  }, {} as Record<string, typeof insights>);

  if (insights.length === 0) {
    return (
      <Card
        title={
          <Space>
            <BulbOutlined style={{ color: '#1890ff' }} />
            <span>智能洞察</span>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Text type="secondary">暂无智能洞察数据</Text>
        </div>
      </Card>
    );
  }

  return (
    <div>
      {/* 智能洞察概览 */}
      <Card
        title={
          <Space>
            <BulbOutlined style={{ color: '#1890ff' }} />
            <span>智能洞察</span>
            <Tag color="blue" style={{ marginLeft: 8 }}>
              {insights.length}条建议
            </Tag>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          基于您的工作数据，AI分析师为您提供以下个性化洞察和建议
        </Paragraph>

        {/* 按类型分组显示洞察 */}
        <div>
          {Object.entries(groupedInsights).map(([type, typeInsights], typeIndex) => {
            const typeConfig = getInsightTypeConfig(type);
            const typeLabels = {
              positive: '🎯 表现亮点',
              warning: '⚠️ 需要关注',
              suggestion: '💡 优化建议',
              info: '📊 数据分析'
            };

            return (
              <div key={type} style={{ marginBottom: typeIndex === Object.keys(groupedInsights).length - 1 ? 0 : 24 }}>
                <Title level={5} style={{ 
                  color: typeConfig.borderColor, 
                  marginBottom: 12,
                  fontSize: 14
                }}>
                  {typeLabels[type as keyof typeof typeLabels] || type}
                </Title>

                <Timeline
                  items={typeInsights.map((insight, index) => ({
                    dot: (
                      <div style={{
                        backgroundColor: insight.color,
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: 12
                      }}>
                        {getInsightIcon(insight.icon)}
                      </div>
                    ),
                    children: (
                      <div>
                        <div style={{ marginBottom: 4 }}>
                          <Text strong style={{ color: '#262626' }}>
                            {insight.title}
                          </Text>
                          {insight.impact_level && (
                            <Tag 
                              color={insight.impact_level === 'high' ? 'red' : 
                                     insight.impact_level === 'medium' ? 'orange' : 'green'} 
                              style={{ marginLeft: 8, fontSize: 10 }}
                            >
                              {insight.impact_level === 'high' ? '高影响' :
                               insight.impact_level === 'medium' ? '中等' : '轻微'}
                            </Tag>
                          )}
                        </div>
                        <Paragraph 
                          style={{ 
                            margin: 0, 
                            color: '#595959', 
                            fontSize: 13,
                            lineHeight: '1.5'
                          }}
                        >
                          {insight.description}
                        </Paragraph>
                        {insight.suggestion && (
                          <div style={{ marginTop: 8 }}>
                            <Alert
                              message={insight.suggestion}
                              type={typeConfig.status}
                              showIcon={false}
                              style={{
                                fontSize: 12,
                                padding: '6px 12px',
                                backgroundColor: typeConfig.bgColor,
                                border: `1px solid ${typeConfig.borderColor}`,
                                borderRadius: 4
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )
                  }))}
                  style={{ marginTop: 12 }}
                />

                {typeIndex < Object.keys(groupedInsights).length - 1 && (
                  <Divider style={{ margin: '20px 0' }} />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* 行动建议汇总 */}
      {insights.some(insight => insight.suggestion) && (
        <Card
          title={
            <Space>
              <RiseOutlined style={{ color: '#52c41a' }} />
              <span>行动建议汇总</span>
            </Space>
          }
          size="small"
          style={{ marginTop: 16 }}
        >
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              优先级建议（按影响程度排序）
            </Text>
            <div style={{ marginTop: 12 }}>
              {insights
                .filter(insight => insight.suggestion)
                .sort((a, b) => {
                  const impactOrder = { high: 3, medium: 2, low: 1 };
                  return (impactOrder[b.impact_level as keyof typeof impactOrder] || 1) - 
                         (impactOrder[a.impact_level as keyof typeof impactOrder] || 1);
                })
                .slice(0, 3)
                .map((insight, index) => (
                  <div key={index} style={{ 
                    marginBottom: index < 2 ? 12 : 0,
                    padding: '8px 12px',
                    backgroundColor: '#fafafa',
                    borderRadius: 6,
                    borderLeft: `3px solid ${insight.color}`
                  }}>
                    <Row justify="space-between" align="top">
                      <Col span={20}>
                        <Text style={{ fontSize: 12 }}>
                          {insight.suggestion}
                        </Text>
                      </Col>
                      <Col span={4} style={{ textAlign: 'right' }}>
                        <Tag color={insight.color} style={{ fontSize: 10 }}>
                          {index + 1}
                        </Tag>
                      </Col>
                    </Row>
                  </div>
                ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default EfficiencyInsightsCard;