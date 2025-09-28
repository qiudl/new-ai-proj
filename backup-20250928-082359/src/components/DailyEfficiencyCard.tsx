import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Progress,
  Tag,
  Space,
  Statistic,
  Badge,
  Tooltip,
  Divider,
  Button
} from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  FireOutlined,
  EyeOutlined,
  RiseOutlined,
  FallOutlined,
  MinusOutlined,
  CalculatorOutlined
} from '@ant-design/icons';
import { ProcessedDayData } from '../types/dailyEfficiency';
import EfficiencyCalculationModal from './EfficiencyCalculationModal';

const { Title, Text } = Typography;

interface DailyEfficiencyCardProps {
  dayData: ProcessedDayData;
  dayLabel: string;
  isToday?: boolean;
  comparisonBase?: ProcessedDayData;
  showComparison?: boolean;
}

const DailyEfficiencyCard: React.FC<DailyEfficiencyCardProps> = ({
  dayData,
  dayLabel,
  isToday = false,
  comparisonBase,
  showComparison = false
}) => {
  const [showCalculationModal, setShowCalculationModal] = useState(false);
  
  // 获取效率等级的颜色和文本
  const getEfficiencyLevelConfig = (level: string) => {
    const configs = {
      excellent: { color: '#52c41a', text: '优秀', bgColor: '#f6ffed' },
      good: { color: '#1890ff', text: '良好', bgColor: '#f0f9ff' },
      average: { color: '#faad14', text: '一般', bgColor: '#fffbe6' },
      needs_improvement: { color: '#f5222d', text: '待改进', bgColor: '#fff2f0' }
    };
    return configs[level as keyof typeof configs] || configs.average;
  };

  // 获取工作节奏的配置
  const getWorkRhythmConfig = (rhythm: string) => {
    const configs = {
      focused: { color: '#722ed1', text: '专注型', icon: '🎯' },
      balanced: { color: '#13c2c2', text: '平衡型', icon: '⚖️' },
      scattered: { color: '#fa8c16', text: '分散型', icon: '🔄' },
      inactive: { color: '#bfbfbf', text: '休息中', icon: '😴' }
    };
    return configs[rhythm as keyof typeof configs] || configs.balanced;
  };

  // 计算对比变化
  const getChangeIndicator = (current: number, base: number) => {
    if (!showComparison || !comparisonBase) return null;
    
    const change = ((current - base) / (base || 1)) * 100;
    if (Math.abs(change) < 1) {
      return <MinusOutlined style={{ color: '#bfbfbf' }} />;
    }
    
    return change > 0 ? (
      <RiseOutlined style={{ color: '#52c41a' }} />
    ) : (
      <FallOutlined style={{ color: '#f5222d' }} />
    );
  };

  const efficiencyConfig = getEfficiencyLevelConfig(dayData.efficiency_level);
  const rhythmConfig = getWorkRhythmConfig(dayData.work_rhythm);

  return (
    <Card
      style={{
        height: '100%',
        borderRadius: 12,
        ...(isToday ? {
          borderColor: '#1890ff',
          borderWidth: 2,
          boxShadow: '0 4px 12px rgba(24, 144, 255, 0.15)'
        } : {})
      }}
      styles={{
        body: { padding: '20px' }
      }}
    >
      {/* 卡片头部 */}
      <div style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0, color: isToday ? '#1890ff' : '#262626' }}>
              {dayLabel}
              {isToday && <Badge dot style={{ marginLeft: 8 }} />}
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {dayData.date}
            </Text>
          </Col>
          <Col>
            <Tag
              color={efficiencyConfig.color}
              style={{
                borderRadius: 8,
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 500
              }}
            >
              {efficiencyConfig.text}
            </Tag>
          </Col>
        </Row>
      </div>

      {/* 效率指数 */}
      <div style={{ marginBottom: 20 }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
          <Col>
            <Text strong>效率指数</Text>
          </Col>
          <Col>
            <Space>
              {showComparison && comparisonBase && getChangeIndicator(
                dayData.efficiency_index,
                comparisonBase.efficiency_index
              )}
              <Tooltip title="点击查看计算详情">
                <Button
                  type="text"
                  size="small"
                  icon={<CalculatorOutlined />}
                  onClick={() => setShowCalculationModal(true)}
                  style={{
                    padding: '4px 8px',
                    height: 'auto',
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: efficiencyConfig.color,
                    border: `1px dashed ${efficiencyConfig.color}`,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  {dayData.efficiency_index.toFixed(1)}
                </Button>
              </Tooltip>
            </Space>
          </Col>
        </Row>
        <Progress
          percent={dayData.efficiency_index}
          strokeColor={{
            '0%': efficiencyConfig.color,
            '100%': efficiencyConfig.color,
          }}
          trailColor={efficiencyConfig.bgColor}
          strokeWidth={8}
          showInfo={false}
          style={{ marginBottom: 4 }}
        />
        <Text type="secondary" style={{ fontSize: 11 }}>
          综合评分 (0-100)
        </Text>
      </div>

      {/* 关键指标 */}
      <Row gutter={[16, 12]} style={{ marginBottom: 20 }}>
        <Col span={12}>
          <Statistic
            title={
              <Space>
                <ClockCircleOutlined />
                <span>工作时长</span>
                {showComparison && comparisonBase && getChangeIndicator(
                  dayData.total_hours,
                  comparisonBase.total_hours
                )}
              </Space>
            }
            value={dayData.total_hours}
            precision={1}
            suffix="小时"
            valueStyle={{ fontSize: 16, color: '#1890ff' }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title={
              <Space>
                <CheckCircleOutlined />
                <span>完成任务</span>
                {showComparison && comparisonBase && getChangeIndicator(
                  dayData.completed_tasks,
                  comparisonBase.completed_tasks
                )}
              </Space>
            }
            value={dayData.completed_tasks}
            suffix="个"
            valueStyle={{ fontSize: 16, color: '#52c41a' }}
          />
        </Col>
      </Row>

      <Row gutter={[16, 12]} style={{ marginBottom: 20 }}>
        <Col span={12}>
          <Statistic
            title={
              <Space>
                <FireOutlined />
                <span>专注会话</span>
              </Space>
            }
            value={dayData.timer_sessions}
            suffix="次"
            valueStyle={{ fontSize: 14, color: '#fa8c16' }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title={
              <Space>
                <EyeOutlined />
                <span>平均专注</span>
              </Space>
            }
            value={Math.round(dayData.avg_session_duration / 60)}
            suffix="分钟"
            valueStyle={{ fontSize: 14, color: '#722ed1' }}
          />
        </Col>
      </Row>

      <Divider style={{ margin: '16px 0' }} />

      {/* 工作节奏和顶级任务 */}
      <div style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
          <Col>
            <Text strong>工作节奏</Text>
          </Col>
          <Col>
            <Tag
              color={rhythmConfig.color}
              style={{
                borderRadius: 6,
                fontSize: 11,
                padding: '2px 8px'
              }}
            >
              {rhythmConfig.icon} {rhythmConfig.text}
            </Tag>
          </Col>
        </Row>
      </div>

      {/* 顶级任务 */}
      {dayData.top_task_title && (
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            主要任务
          </Text>
          <Tooltip title={dayData.top_task_title}>
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: '#fafafa',
                borderRadius: 6,
                marginTop: 4,
                border: '1px solid #f0f0f0'
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  display: 'block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {dayData.top_task_title}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {dayData.top_task_hours.toFixed(1)} 小时
              </Text>
            </div>
          </Tooltip>
        </div>
      )}

      {/* 无数据状态 */}
      {dayData.total_hours === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '20px 0',
            color: '#bfbfbf'
          }}
        >
          <Text type="secondary">暂无工作记录</Text>
        </div>
      )}

      {/* 效率指数计算详情弹窗 */}
      <EfficiencyCalculationModal
        visible={showCalculationModal}
        onClose={() => setShowCalculationModal(false)}
        calculationDetails={dayData.calculation_details}
        efficiencyIndex={dayData.efficiency_index}
        dayLabel={dayLabel}
        date={dayData.date}
      />
      
    </Card>
  );
};

export default DailyEfficiencyCard;