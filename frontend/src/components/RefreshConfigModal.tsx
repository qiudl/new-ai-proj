import React, { useState } from 'react';
import {
  Modal,
  Form,
  Select,
  Switch,
  InputNumber,
  Button,
  Space,
  Alert,
  Divider,
  Typography,
  Row,
  Col,
  Card,
  Statistic,
  Tag,
  Tooltip
} from 'antd';
import {
  SettingOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { 
  useRefreshConfig, 
  REFRESH_INTERVALS, 
  getIntervalLabel, 
  validateRefreshConfig,
  RefreshConfig 
} from '../contexts/RefreshConfigContext';
import { globalRefreshErrorHandler } from '../utils/RefreshErrorHandler';

const { Title, Text } = Typography;
const { Option } = Select;

interface RefreshConfigModalProps {
  visible: boolean;
  onCancel: () => void;
}

export const RefreshConfigModal: React.FC<RefreshConfigModalProps> = ({
  visible,
  onCancel
}) => {
  const { config, updateConfig, resetConfig } = useRefreshConfig();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // 获取错误统计
  const errorStats = globalRefreshErrorHandler.getErrorStats();

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      // 验证配置
      const errors = validateRefreshConfig(values);
      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }
      
      setValidationErrors([]);
      updateConfig(values);
      onCancel();
    } catch (error) {
      console.error('Form validation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    Modal.confirm({
      title: '重置配置',
      content: '确定要重置为默认配置吗？此操作不可恢复。',
      onOk: () => {
        resetConfig();
        form.resetFields();
        setValidationErrors([]);
      }
    });
  };

  const intervalOptions = Object.entries(REFRESH_INTERVALS).map(([key, value]) => ({
    label: getIntervalLabel(value),
    value: value
  }));

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          刷新配置设置
        </Space>
      }
      visible={visible}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="reset" onClick={handleReset}>
          重置默认
        </Button>,
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
          保存配置
        </Button>
      ]}
    >
      <Row gutter={[24, 16]}>
        {/* 统计信息 */}
        <Col span={24}>
          <Card size="small" title="刷新统计">
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="总错误数"
                  value={errorStats.total}
                  prefix={<ExclamationCircleOutlined />}
                  valueStyle={{ color: errorStats.total > 0 ? '#ff4d4f' : '#52c41a' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="网络错误"
                  value={errorStats.byType.network_error || 0}
                  prefix={<WarningOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="超时错误"
                  value={errorStats.byType.timeout_error || 0}
                  prefix={<WarningOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="最近错误"
                  value={errorStats.recent.length}
                  prefix={<InfoCircleOutlined />}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 配置表单 */}
        <Col span={24}>
          <Form
            form={form}
            layout="vertical"
            initialValues={config}
            scrollToFirstError
          >
            <Title level={5}>刷新间隔设置</Title>
            
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  label="默认刷新间隔"
                  name="defaultInterval"
                  tooltip="全局默认的刷新间隔时间"
                >
                  <Select>
                    {intervalOptions.map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              
              <Col span={8}>
                <Form.Item
                  label="完成情况刷新间隔"
                  name="completionStatsInterval"
                  tooltip="任务完成情况统计的刷新间隔"
                >
                  <Select>
                    {intervalOptions.map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              
              <Col span={8}>
                <Form.Item
                  label="子任务树刷新间隔"
                  name="taskTreeInterval"
                  tooltip="子任务树的刷新间隔"
                >
                  <Select>
                    {intervalOptions.map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider />
            
            <Title level={5}>高级设置</Title>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="页面可见性检测"
                  name="enableVisibilityDetection"
                  valuePropName="checked"
                  tooltip="当页面不可见时暂停刷新"
                >
                  <Switch />
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item
                  label="错误通知"
                  name="enableErrorNotifications"
                  valuePropName="checked"
                  tooltip="是否显示刷新错误通知"
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  label="最大重试次数"
                  name="maxRetries"
                  tooltip="刷新失败时的最大重试次数"
                  rules={[
                    { type: 'number', min: 0, max: 10, message: '重试次数应在0-10之间' }
                  ]}
                >
                  <InputNumber min={0} max={10} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              
              <Col span={8}>
                <Form.Item
                  label="重试间隔(秒)"
                  name="retryInterval"
                  tooltip="失败后重试的间隔时间"
                  rules={[
                    { type: 'number', min: 1, max: 60, message: '重试间隔应在1-60秒之间' }
                  ]}
                >
                  <InputNumber 
                    min={1} 
                    max={60} 
                    step={1}
                    formatter={value => `${value}秒`}
                    parser={value => Math.min(60, Math.max(1, Number(value?.replace('秒', '') || 1))) as any}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              
              <Col span={8}>
                <Form.Item
                  label="错误通知时长(秒)"
                  name="errorNotificationDuration"
                  tooltip="错误通知的显示时长"
                  rules={[
                    { type: 'number', min: 1, max: 30, message: '通知时长应在1-30秒之间' }
                  ]}
                >
                  <InputNumber 
                    min={1} 
                    max={30} 
                    step={1}
                    formatter={value => `${value}秒`}
                    parser={value => Math.min(30, Math.max(1, Number(value?.replace('秒', '') || 1))) as any}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Form.Item
              label="调试日志"
              name="enableDebugLogs"
              valuePropName="checked"
              tooltip="在控制台显示详细的调试信息"
            >
              <Switch />
            </Form.Item>
          </Form>
        </Col>

        {/* 验证错误 */}
        {validationErrors.length > 0 && (
          <Col span={24}>
            <Alert
              type="error"
              message="配置验证失败"
              description={
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              }
              closable
              onClose={() => setValidationErrors([])}
            />
          </Col>
        )}

        {/* 配置建议 */}
        <Col span={24}>
          <Alert
            type="info"
            message="配置建议"
            description={
              <Space direction="vertical" size="small">
                <Text>• 对于实时性要求高的页面，建议使用15-30秒的刷新间隔</Text>
                <Text>• 启用页面可见性检测可以节省资源</Text>
                <Text>• 适当的重试机制可以提高系统可靠性</Text>
                <Text>• 开发环境可启用调试日志，生产环境建议关闭</Text>
              </Space>
            }
            showIcon
          />
        </Col>
      </Row>
    </Modal>
  );
};

// 刷新配置快捷按钮
export const RefreshConfigButton: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const { config } = useRefreshConfig();
  const errorStats = globalRefreshErrorHandler.getErrorStats();

  return (
    <>
      <Tooltip title="刷新配置">
        <Button
          type="text"
          size="small"
          icon={<SettingOutlined />}
          onClick={() => setModalVisible(true)}
          style={{ 
            position: 'relative',
            color: '#8c8c8c'
          }}
        >
          {errorStats.total > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                width: 6,
                height: 6,
                backgroundColor: '#ff4d4f',
                borderRadius: '50%',
                fontSize: 0
              }}
            />
          )}
        </Button>
      </Tooltip>
      
      <RefreshConfigModal
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
      />
    </>
  );
};
