import React, { useState } from 'react';
import { Button, message, Modal, Space, Tag, Card, Typography, Row, Col } from 'antd';
import { RobotOutlined, ThunderboltOutlined, CheckCircleOutlined } from '@ant-design/icons';
import aiCompanyService, { AICompanyInfo } from '../../services/aiCompanyService';

const { Text, Title } = Typography;

interface AIQuickFillButtonProps {
  companyName: string;
  onFillComplete: (data: AICompanyInfo) => void;
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
}

const AIQuickFillButton: React.FC<AIQuickFillButtonProps> = ({
  companyName,
  onFillComplete,
  disabled = false,
  size = 'middle',
  type = 'primary'
}) => {
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [aiResult, setAiResult] = useState<AICompanyInfo | null>(null);

  const handleQuickFill = async () => {
    if (!companyName?.trim()) {
      message.warning('请先输入企业名称');
      return;
    }

    setLoading(true);
    try {
      // 检查AI配置
      const status = await aiCompanyService.getAIStatus();
      if (!status.hasConfig) {
        Modal.info({
          title: '需要配置AI',
          content: '使用AI智能填充功能需要先配置AI API。请联系系统管理员进行配置。',
          okText: '我知道了'
        });
        return;
      }

      // 调用AI搜索
      const result = await aiCompanyService.searchCompanyInfo(companyName);
      
      if (result.success && result.data) {
        setAiResult(result.data);
        setModalVisible(true);
        
        // 显示成本信息（如果有）
        if (result.cost && result.cost > 0) {
          console.log(`AI调用成本: ${result.cost.toFixed(4)} 元`);
        }
      } else {
        message.error(result.message || 'AI搜索失败，请稍后重试');
      }
    } catch (error) {
      console.error('AI搜索失败:', error);
      message.error('AI搜索服务暂时不可用，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmFill = () => {
    if (aiResult) {
      onFillComplete(aiResult);
      setModalVisible(false);
      message.success(`AI信息已填充，可信度: ${(aiResult.confidence * 100).toFixed(0)}%`);
    }
  };

  const renderConfidenceTag = (confidence: number) => {
    if (confidence >= 0.8) {
      return <Tag color="success">高置信度 {(confidence * 100).toFixed(0)}%</Tag>;
    } else if (confidence >= 0.6) {
      return <Tag color="processing">中置信度 {(confidence * 100).toFixed(0)}%</Tag>;
    } else {
      return <Tag color="warning">低置信度 {(confidence * 100).toFixed(0)}%</Tag>;
    }
  };

  return (
    <>
      <Button
        type={type}
        size={size}
        icon={<RobotOutlined />}
        onClick={handleQuickFill}
        loading={loading}
        disabled={disabled || !companyName?.trim()}
      >
        AI一键填充
      </Button>

      <Modal
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#1890ff' }} />
            AI智能填充预览
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleConfirmFill}
        okText="确认填充"
        cancelText="取消"
        width={700}
      >
        {aiResult && (
          <Card size="small">
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Title level={5} style={{ margin: 0 }}>
                  {aiResult.companyName}
                </Title>
                {renderConfidenceTag(aiResult.confidence)}
              </Space>
            </div>

            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Text type="secondary">企业类型：</Text>
                <Text>{aiResult.companyType === 'limited_company' ? '有限责任公司' : 
                       aiResult.companyType === 'joint_stock' ? '股份有限公司' : 
                       aiResult.companyType || '未知'}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">所属行业：</Text>
                <Text>{aiResult.industry || '未知'}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">法定代表人：</Text>
                <Text>{aiResult.legalRepresentative || '未知'}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">企业规模：</Text>
                <Text>{aiResult.companySize === 'startup' ? '初创公司' :
                       aiResult.companySize === 'small' ? '小型企业' :
                       aiResult.companySize === 'medium' ? '中型企业' :
                       aiResult.companySize === 'large' ? '大型企业' : '超大型企业'}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">员工人数：</Text>
                <Text>{aiResult.employeeCount ? `约${aiResult.employeeCount}人` : '未知'}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">联系电话：</Text>
                <Text>{aiResult.mainPhone || '未知'}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">联系邮箱：</Text>
                <Text>{aiResult.mainEmail || '未知'}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">官方网站：</Text>
                <Text>{aiResult.website || '未知'}</Text>
              </Col>
              <Col span={24}>
                <Text type="secondary">地址：</Text>
                <Text>{aiResult.address ? `${aiResult.province} ${aiResult.city} ${aiResult.address}` : '未知'}</Text>
              </Col>
            </Row>

            <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f6ffed', borderRadius: 4 }}>
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  数据来源: {aiResult.source} | 提供商: {aiResult.usedProvider?.toUpperCase() || 'AI'}
                </Text>
              </Space>
            </div>
          </Card>
        )}
      </Modal>
    </>
  );
};

export default AIQuickFillButton;