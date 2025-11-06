/**
 * 需求评审对话框组件
 * Requirement Review Modal Component
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  message,
  Radio,
  InputNumber,
  Select,
  Space,
  Alert,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
} from '@ant-design/icons';
import {
  Requirement,
  ReviewRequirementRequest,
  RequirementComplexity,
  REQUIREMENT_COMPLEXITY_CONFIG,
} from '../types/requirement';
import { useResponsive, getResponsiveModalWidth } from '../hooks/useResponsive';

const { TextArea } = Input;
const { Option } = Select;

/**
 * 评审操作类型配置
 */
const REVIEW_ACTION_CONFIG = {
  approve: {
    label: '通过',
    color: 'success',
    icon: <CheckCircleOutlined />,
    description: '需求满足要求，可以进入开发阶段',
  },
  reject: {
    label: '拒绝',
    color: 'error',
    icon: <CloseCircleOutlined />,
    description: '需求不符合要求，需要重新提交',
  },
  need_more_info: {
    label: '需要补充',
    color: 'warning',
    icon: <EditOutlined />,
    description: '需求需要补充更多信息',
  },
};

export interface RequirementReviewModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  requirement: Requirement | null;
  loading?: boolean;
  onSubmit: (reviewData: ReviewRequirementRequest) => Promise<void>;
}

/**
 * 需求评审对话框组件
 */
const RequirementReviewModal: React.FC<RequirementReviewModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  requirement,
  loading = false,
  onSubmit,
}) => {
  const [form] = Form.useForm();
  const responsive = useResponsive();
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | 'need_more_info'>('approve');

  useEffect(() => {
    if (visible && requirement) {
      // Reset form when modal opens
      form.resetFields();
      setSelectedAction('approve');

      // Pre-fill with existing review data if any
      if (requirement.review_comment || requirement.review_score) {
        form.setFieldsValue({
          comment: requirement.review_comment,
          score: requirement.review_score,
          estimated_hours: requirement.estimated_hours,
          estimated_cost: requirement.estimated_cost,
          complexity: requirement.complexity,
        });
      }
    }
  }, [visible, requirement, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const reviewData: ReviewRequirementRequest = {
        action: selectedAction,
        comment: values.comment,
        score: values.score,
        estimated_hours: values.estimated_hours,
        estimated_cost: values.estimated_cost,
        complexity: values.complexity,
      };

      await onSubmit(reviewData);
      message.success(REVIEW_ACTION_CONFIG[selectedAction].label + '成功');
      onSuccess();
    } catch (error: any) {
      if (error instanceof Error && !error.message.includes('async-validator')) {
        message.error(error.message || '评审失败，请重试');
      }
    }
  };

  const actionConfig = REVIEW_ACTION_CONFIG[selectedAction];

  return (
    <Modal
      title="需求评审"
      open={visible}
      onCancel={onCancel}
      width={getResponsiveModalWidth(700, responsive)}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
          icon={actionConfig.icon}
          danger={selectedAction === 'reject'}
        >
          {actionConfig.label}
        </Button>,
      ]}
      destroyOnClose
    >
      {requirement && (
        <div style={{ marginBottom: '16px' }}>
          <Alert
            message={
              <div>
                <strong>需求编号:</strong> {requirement.display_id}
              </div>
            }
            description={
              <div>
                <strong>需求标题:</strong> {requirement.title}
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          action: 'approve',
          score: 7,
        }}
      >
        {/* 评审结果 */}
        <Form.Item
          label="评审结果"
          required
          style={{ marginBottom: '16px' }}
        >
          <Radio.Group
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            buttonStyle="solid"
            size="large"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio.Button
                value="approve"
                style={{
                  width: '100%',
                  height: 'auto',
                  padding: '12px',
                  borderColor: selectedAction === 'approve' ? '#52c41a' : undefined,
                  backgroundColor: selectedAction === 'approve' ? '#f6ffed' : undefined,
                }}
              >
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '18px' }} />
                  <div>
                    <div style={{ fontWeight: 500 }}>通过</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      需求满足要求，可以进入开发阶段
                    </div>
                  </div>
                </Space>
              </Radio.Button>

              <Radio.Button
                value="need_more_info"
                style={{
                  width: '100%',
                  height: 'auto',
                  padding: '12px',
                  borderColor: selectedAction === 'need_more_info' ? '#faad14' : undefined,
                  backgroundColor: selectedAction === 'need_more_info' ? '#fffbe6' : undefined,
                }}
              >
                <Space>
                  <EditOutlined style={{ color: '#faad14', fontSize: '18px' }} />
                  <div>
                    <div style={{ fontWeight: 500 }}>需要补充</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      需求需要补充更多信息
                    </div>
                  </div>
                </Space>
              </Radio.Button>

              <Radio.Button
                value="reject"
                style={{
                  width: '100%',
                  height: 'auto',
                  padding: '12px',
                  borderColor: selectedAction === 'reject' ? '#ff4d4f' : undefined,
                  backgroundColor: selectedAction === 'reject' ? '#fff2f0' : undefined,
                }}
              >
                <Space>
                  <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: '18px' }} />
                  <div>
                    <div style={{ fontWeight: 500 }}>拒绝</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      需求不符合要求，需要重新提交
                    </div>
                  </div>
                </Space>
              </Radio.Button>
            </Space>
          </Radio.Group>
        </Form.Item>

        {/* 评审意见 */}
        <Form.Item
          name="comment"
          label="评审意见"
          rules={[
            { required: true, message: '请输入评审意见' },
            { min: 10, message: '评审意见至少10个字符' },
            { max: 1000, message: '评审意见不能超过1000个字符' },
          ]}
        >
          <TextArea
            placeholder={
              selectedAction === 'approve'
                ? '请说明需求的优点和可以改进的地方...'
                : selectedAction === 'reject'
                ? '请详细说明拒绝的原因...'
                : '请说明需要补充哪些信息...'
            }
            rows={4}
            showCount
            maxLength={1000}
          />
        </Form.Item>

        {/* 评审评分 (仅通过时显示) */}
        {selectedAction === 'approve' && (
          <Form.Item
            name="score"
            label="评审评分"
            tooltip="对需求质量进行1-10分的评分"
            rules={[
              { required: true, message: '请输入评审评分' },
              { type: 'number', min: 1, max: 10, message: '评分范围为1-10分' },
            ]}
          >
            <InputNumber
              min={1}
              max={10}
              precision={0}
              style={{ width: '100%' }}
              placeholder="请输入1-10分"
              addonAfter="分"
            />
          </Form.Item>
        )}

        {/* 复杂度评估 (仅通过时显示) */}
        {selectedAction === 'approve' && (
          <Form.Item
            name="complexity"
            label="复杂度评估"
            tooltip="评估需求的实现复杂度"
          >
            <Select placeholder="请选择复杂度" allowClear>
              {Object.entries(REQUIREMENT_COMPLEXITY_CONFIG).map(([key, config]) => (
                <Option key={key} value={key}>
                  {config.icon} {config.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* 预估工时和成本 (仅通过时显示) */}
        {selectedAction === 'approve' && (
          <Space size="large" style={{ width: '100%', marginBottom: '16px' }}>
            <Form.Item
              name="estimated_hours"
              label="预估工时 (小时)"
              tooltip="预估完成此需求所需的工时"
              style={{ marginBottom: 0, flex: 1 }}
            >
              <InputNumber
                min={0}
                precision={1}
                style={{ width: '100%' }}
                placeholder="请输入预估工时"
                addonAfter="小时"
              />
            </Form.Item>

            <Form.Item
              name="estimated_cost"
              label="预估成本 (元)"
              tooltip="预估完成此需求所需的成本"
              style={{ marginBottom: 0, flex: 1 }}
            >
              <InputNumber
                min={0}
                precision={2}
                style={{ width: '100%' }}
                placeholder="请输入预估成本"
                addonAfter="元"
              />
            </Form.Item>
          </Space>
        )}

        {/* 提示信息 */}
        <Alert
          message={
            <div>
              <strong>提示：</strong>
              {selectedAction === 'approve' && ' 通过后，需求可以转换为任务并进入开发阶段'}
              {selectedAction === 'reject' && ' 拒绝后，需求将被标记为已拒绝状态'}
              {selectedAction === 'need_more_info' && ' 需求将被标记为待补充状态，提交人需要补充更多信息'}
            </div>
          }
          type={
            selectedAction === 'approve'
              ? 'success'
              : selectedAction === 'reject'
              ? 'error'
              : 'warning'
          }
          showIcon
        />
      </Form>
    </Modal>
  );
};

export default RequirementReviewModal;
