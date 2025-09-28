import React from 'react';
import {
  Modal,
  Row,
  Col,
  Card,
  Typography,
  Progress,
  Space,
  Tag,
  Divider,
  List,
  Tooltip,
  Alert,
  Statistic
} from 'antd';
import {
  InfoCircleOutlined,
  BulbOutlined,
  CalculatorOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  HeartOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { EfficiencyCalculationDetails, ScoreDetail, WeightDetails } from '../types/dailyEfficiency';

const { Title, Text, Paragraph } = Typography;

interface EfficiencyCalculationModalProps {
  visible: boolean;
  onClose: () => void;
  calculationDetails: EfficiencyCalculationDetails | null;
  efficiencyIndex: number;
  dayLabel: string;
  date: string;
}

const EfficiencyCalculationModal: React.FC<EfficiencyCalculationModalProps> = ({
  visible,
  onClose,
  calculationDetails,
  efficiencyIndex,
  dayLabel,
  date
}) => {
  if (!calculationDetails) {
    return (
      <Modal
        title="效率指数计算详情"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={600}
      >
        <Alert
          message="暂无计算详情"
          description="该日期的效率指数计算详情暂时不可用"
          type="info"
          showIcon
        />
      </Modal>
    );
  }

  // 获取得分颜色
  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return '#52c41a';
    if (percentage >= 60) return '#1890ff';
    if (percentage >= 40) return '#faad14';
    return '#f5222d';
  };

  // 得分组件
  const ScoreCard: React.FC<{
    title: string;
    icon: React.ReactNode;
    scoreDetail: any;
    color: string;
  }> = ({ title, icon, scoreDetail, color }) => (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Row align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Space>
            {icon}
            <Text strong>{title}</Text>
          </Space>
        </Col>
      </Row>
      
      <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
        <Col>
          <Text type="secondary">得分</Text>
        </Col>
        <Col>
          <Text strong style={{ color, fontSize: 16 }}>
            {scoreDetail.score} / {scoreDetail.max_score}
          </Text>
        </Col>
      </Row>
      
      <Progress
        percent={(scoreDetail.score / scoreDetail.max_score) * 100}
        strokeColor={color}
        trailColor="#f0f0f0"
        showInfo={false}
        size="small"
        style={{ marginBottom: 8 }}
      />
      
      <Text type="secondary" style={{ fontSize: 12 }}>
        {scoreDetail.description}
      </Text>
      
      {/* 详细因子 */}
      {scoreDetail.factors && Object.keys(scoreDetail.factors).length > 0 && (
        <div style={{ marginTop: 12, padding: 8, backgroundColor: '#fafafa', borderRadius: 6 }}>
          <Text style={{ fontSize: 11, color: '#666' }}>详细因子：</Text>
          {Object.entries(scoreDetail.factors).map(([key, value]) => (
            <div key={key} style={{ fontSize: 11, color: '#888' }}>
              {key}: {typeof value === 'number' ? value.toFixed(2) : String(value)}
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  return (
    <Modal
      title={
        <Space>
          <CalculatorOutlined />
          <span>效率指数计算详情</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      style={{ top: 20 }}
      styles={{
        body: { maxHeight: '70vh', overflowY: 'auto' }
      }}
    >
      {/* 头部概览 */}
      <Card style={{ marginBottom: 20, backgroundColor: '#f6ffed' }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space direction="vertical" size={0}>
              <Text strong style={{ fontSize: 16 }}>{dayLabel}</Text>
              <Text type="secondary">{date}</Text>
            </Space>
          </Col>
          <Col>
            <Statistic
              title="综合效率指数"
              value={efficiencyIndex}
              precision={1}
              suffix="/ 100"
              valueStyle={{ 
                color: getScoreColor(efficiencyIndex, 100),
                fontSize: 28,
                fontWeight: 'bold'
              }}
            />
          </Col>
        </Row>
      </Card>

      {/* 算法版本信息 */}
      <Alert
        message="算法版本 2.1"
        description="采用多维度评分体系，结合动态权重调整，提供更精确的效率评估"
        type="info"
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 20 }}
      />

      {/* 评分详情 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4}>
          <TrophyOutlined /> 评分详情
        </Title>
        
        <Row gutter={[16, 0]}>
          <Col xs={24} lg={12}>
            <ScoreCard
              title="基础得分 (0-30分)"
              icon={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
              scoreDetail={calculationDetails.base_score}
              color={getScoreColor(calculationDetails.base_score.score, calculationDetails.base_score.max_score)}
            />
            
            <ScoreCard
              title="任务效率 (0-25分)"
              icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              scoreDetail={calculationDetails.task_efficiency}
              color={getScoreColor(calculationDetails.task_efficiency.score, calculationDetails.task_efficiency.max_score)}
            />
          </Col>
          
          <Col xs={24} lg={12}>
            <ScoreCard
              title="时间效率 (0-25分)"
              icon={<ClockCircleOutlined style={{ color: '#722ed1' }} />}
              scoreDetail={calculationDetails.time_efficiency}
              color={getScoreColor(calculationDetails.time_efficiency.score, calculationDetails.time_efficiency.max_score)}
            />
            
            <ScoreCard
              title="质量因子 (0-20分)"
              icon={<HeartOutlined style={{ color: '#fa8c16' }} />}
              scoreDetail={calculationDetails.quality_factor}
              color={getScoreColor(calculationDetails.quality_factor.score, calculationDetails.quality_factor.max_score)}
            />
          </Col>
        </Row>
      </div>

      {/* 动态权重 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4}>
          <SettingOutlined /> 动态权重调整
        </Title>
        
        <Card size="small">
          <Row gutter={[16, 8]}>
            <Col span={6}>
              <Text type="secondary">基础权重</Text>
              <br />
              <Text strong>{calculationDetails.dynamic_weights.base.toFixed(2)}</Text>
            </Col>
            <Col span={6}>
              <Text type="secondary">时间权重</Text>
              <br />
              <Text strong>{calculationDetails.dynamic_weights.time.toFixed(2)}</Text>
            </Col>
            <Col span={6}>
              <Text type="secondary">任务权重</Text>
              <br />
              <Text strong>{calculationDetails.dynamic_weights.task.toFixed(2)}</Text>
            </Col>
            <Col span={6}>
              <Text type="secondary">质量权重</Text>
              <br />
              <Text strong>{calculationDetails.dynamic_weights.quality.toFixed(2)}</Text>
            </Col>
          </Row>
          
          <Divider style={{ margin: '12px 0' }} />
          
          <div style={{ padding: 8, backgroundColor: '#f9f9f9', borderRadius: 4 }}>
            <Text style={{ fontSize: 12, color: '#666' }}>
              <InfoCircleOutlined style={{ marginRight: 4 }} />
              权重调整原因: {calculationDetails.dynamic_weights.reason}
            </Text>
          </div>
        </Card>
      </div>

      {/* 改进建议 */}
      {calculationDetails.suggestions && calculationDetails.suggestions.length > 0 && (
        <div>
          <Title level={4}>
            <BulbOutlined /> 改进建议
          </Title>
          
          <List
            size="small"
            dataSource={calculationDetails.suggestions}
            renderItem={(suggestion, index) => (
              <List.Item>
                <Text>
                  <Tag color="blue" style={{ marginRight: 8 }}>
                    {index + 1}
                  </Tag>
                  {suggestion}
                </Text>
              </List.Item>
            )}
            style={{
              backgroundColor: '#fffbe6',
              padding: 16,
              borderRadius: 8,
              border: '1px solid #ffe58f'
            }}
          />
        </div>
      )}
    </Modal>
  );
};

export default EfficiencyCalculationModal;