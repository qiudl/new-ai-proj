import React from 'react';
import { Card, Alert, Space, Statistic, Row, Col } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import type { ValidationTestResponse } from '../../types/aiConfig';

interface ValidationPanelProps {
  validating: boolean;
  result: ValidationTestResponse | null;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  validating,
  result
}) => {
  /**
   * 渲染验证状态
   */
  const renderValidationStatus = () => {
    if (validating) {
      return (
        <Alert
          message="验证测试中..."
          description="正在连接AI服务并测试配置,请稍候"
          type="info"
          icon={<LoadingOutlined spin />}
          showIcon
        />
      );
    }

    if (!result) {
      return (
        <Alert
          message="等待验证"
          description='点击"保存并验证"按钮开始测试配置'
          type="info"
          icon={<ClockCircleOutlined />}
          showIcon
        />
      );
    }

    if (result.success) {
      return (
        <Alert
          message="验证成功"
          description={
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                配置验证通过,AI服务响应正常
              </div>
              {result.conversation && (
                <Row gutter={16} style={{ marginTop: 8 }}>
                  <Col span={8}>
                    <Statistic
                      title="响应时间"
                      value={result.responseTime}
                      suffix="ms"
                      valueStyle={{ fontSize: '16px' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="模型"
                      value={result.conversation.model}
                      valueStyle={{ fontSize: '14px' }}
                    />
                  </Col>
                  {result.conversation.usage && (
                    <Col span={8}>
                      <Statistic
                        title="总Token"
                        value={result.conversation.usage.totalTokens}
                        valueStyle={{ fontSize: '16px' }}
                      />
                    </Col>
                  )}
                </Row>
              )}
            </Space>
          }
          type="success"
          icon={<CheckCircleOutlined />}
          showIcon
        />
      );
    }

    return (
      <Alert
        message="验证失败"
        description={result.error || '未知错误'}
        type="error"
        icon={<CloseCircleOutlined />}
        showIcon
      />
    );
  };

  return (
    <Card
      title="验证状态"
      size="small"
      style={{ marginTop: 16 }}
    >
      {renderValidationStatus()}
    </Card>
  );
};
