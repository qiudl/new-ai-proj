import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  Radio,
  Switch,
  Input,
  Space,
  Typography,
  Card,
  Divider,
  Alert,
  Spin,
  Button,
  message,
} from 'antd';
import {
  RobotOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  CopyOutlined,
  BulbOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import aiDescriptionService, {
  GenerateDescriptionOptions,
  DescriptionSuggestion,
} from '../../services/aiDescriptionService';
import MarkdownRenderer from '../MarkdownRenderer';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface AIDescriptionModalProps {
  visible: boolean;
  taskId: number;
  taskTitle: string;
  currentDescription?: string;
  mode: 'quick' | 'custom' | 'suggestions';
  onCancel: () => void;
  onApply: (description: string, mode: 'replace' | 'append') => void;
}

/**
 * AI描述生成对话框
 * 支持快速生成、自定义选项生成、多方案建议
 */
const AIDescriptionModal: React.FC<AIDescriptionModalProps> = ({
  visible,
  taskId,
  taskTitle,
  currentDescription,
  mode,
  onCancel,
  onApply,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [generatedDesc, setGeneratedDesc] = useState<string>('');
  const [suggestions, setSuggestions] = useState<DescriptionSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);
  const [applyMode, setApplyMode] = useState<'replace' | 'append'>('replace');

  // 默认选项
  const defaultOptions: Partial<GenerateDescriptionOptions> = {
    mode: 'replace',
    style: 'detailed',
    length: 'medium',
    include_context: true,
    max_tokens: 800,
  };

  useEffect(() => {
    if (visible) {
      form.setFieldsValue(defaultOptions);
      setGeneratedDesc('');
      setSuggestions([]);
      setSelectedSuggestion(null);
      setApplyMode('replace');

      // 快速生成模式：自动生成
      if (mode === 'quick') {
        handleQuickGenerate();
      } else if (mode === 'suggestions') {
        handleGetSuggestions();
      }
    }
  }, [visible, mode]);

  /**
   * 快速生成
   */
  const handleQuickGenerate = async () => {
    setLoading(true);
    try {
      const result = await aiDescriptionService.generateDescription(
        taskId,
        'deepseek',
        defaultOptions
      );
      setGeneratedDesc(result.generated_desc);
      message.success('描述生成成功！');
    } catch (error) {
      console.error('Generate failed:', error);
      message.error('生成失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 自定义生成
   */
  const handleCustomGenerate = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();
      const result = await aiDescriptionService.generateDescription(
        taskId,
        values.model || 'deepseek',
        {
          mode: values.mode,
          style: values.style,
          length: values.length,
          include_context: values.include_context,
          max_tokens: values.max_tokens,
          custom_prompt: values.custom_prompt,
        }
      );
      setGeneratedDesc(result.generated_desc);
      message.success('描述生成成功！');
    } catch (error) {
      console.error('Generate failed:', error);
      message.error('生成失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 获取多方案建议
   */
  const handleGetSuggestions = async () => {
    setLoading(true);
    try {
      const result = await aiDescriptionService.getDescriptionSuggestions(
        taskId,
        'deepseek'
      );
      setSuggestions(result);
      message.success('已生成3种风格的描述建议！');
    } catch (error) {
      console.error('Get suggestions failed:', error);
      message.error('获取建议失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 应用生成的描述
   */
  const handleApply = () => {
    let description = '';

    if (mode === 'suggestions' && selectedSuggestion !== null) {
      description = suggestions[selectedSuggestion].description;
    } else {
      description = generatedDesc;
    }

    if (!description) {
      message.warning('请先生成描述');
      return;
    }

    onApply(description, applyMode);
    onCancel();
  };

  /**
   * 复制到剪贴板
   */
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  };

  /**
   * 渲染快速生成模式
   */
  const renderQuickMode = () => (
    <div>
      <Alert
        message="快速生成"
        description="使用默认参数快速生成详细的任务描述"
        type="info"
        icon={<ThunderboltOutlined />}
        showIcon
        style={{ marginBottom: 16 }}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin
            indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
            tip="AI正在思考中..."
          />
        </div>
      ) : generatedDesc ? (
        <Card
          title={
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <Text strong>生成结果</Text>
            </Space>
          }
          extra={
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(generatedDesc)}
            >
              复制
            </Button>
          }
        >
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            <MarkdownRenderer content={generatedDesc} />
          </div>
        </Card>
      ) : null}
    </div>
  );

  /**
   * 渲染自定义生成模式
   */
  const renderCustomMode = () => (
    <div>
      <Form form={form} layout="vertical">
        <Form.Item label="AI模型" name="model" initialValue="deepseek">
          <Select>
            <Select.Option value="deepseek">DeepSeek</Select.Option>
            <Select.Option value="openai">OpenAI GPT-4</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="生成模式" name="mode" initialValue="replace">
          <Radio.Group>
            <Radio.Button value="replace">替换</Radio.Button>
            <Radio.Button value="append">追加</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item label="描述风格" name="style" initialValue="detailed">
          <Radio.Group>
            <Radio.Button value="brief">简洁</Radio.Button>
            <Radio.Button value="detailed">详细</Radio.Button>
            <Radio.Button value="technical">技术</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item label="描述长度" name="length" initialValue="medium">
          <Radio.Group>
            <Radio.Button value="short">短 (50-150字)</Radio.Button>
            <Radio.Button value="medium">中 (150-300字)</Radio.Button>
            <Radio.Button value="long">长 (300-600字)</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          label="包含上下文"
          name="include_context"
          valuePropName="checked"
          initialValue={true}
        >
          <Switch />
        </Form.Item>

        <Form.Item label="自定义提示词" name="custom_prompt">
          <TextArea
            rows={3}
            placeholder="可选：添加特殊要求或约束条件..."
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            icon={<RobotOutlined />}
            onClick={handleCustomGenerate}
            loading={loading}
            block
          >
            生成描述
          </Button>
        </Form.Item>
      </Form>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin
            indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
            tip="AI正在生成中..."
          />
        </div>
      ) : generatedDesc ? (
        <Card
          title={
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <Text strong>生成结果</Text>
            </Space>
          }
          extra={
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(generatedDesc)}
            >
              复制
            </Button>
          }
        >
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            <MarkdownRenderer content={generatedDesc} />
          </div>
        </Card>
      ) : null}
    </div>
  );

  /**
   * 渲染多方案建议模式
   */
  const renderSuggestionsMode = () => (
    <div>
      <Alert
        message="多方案建议"
        description="生成简洁、详细、技术三种不同风格的描述供您选择"
        type="info"
        icon={<BulbOutlined />}
        showIcon
        style={{ marginBottom: 16 }}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin
            indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
            tip="AI正在生成多个方案..."
          />
        </div>
      ) : suggestions.length > 0 ? (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {suggestions.map((suggestion, index) => (
            <Card
              key={index}
              hoverable
              onClick={() => setSelectedSuggestion(index)}
              style={{
                borderColor:
                  selectedSuggestion === index ? '#1890ff' : undefined,
                borderWidth: selectedSuggestion === index ? 2 : 1,
              }}
              title={
                <Space>
                  {selectedSuggestion === index && (
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  )}
                  <Text strong>{suggestion.name}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ({suggestion.style} · {suggestion.length})
                  </Text>
                </Space>
              }
              extra={
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(suggestion.description);
                  }}
                >
                  复制
                </Button>
              }
            >
              <div style={{ maxHeight: 200, overflow: 'auto' }}>
                <MarkdownRenderer content={suggestion.description} />
              </div>
            </Card>
          ))}
        </Space>
      ) : null}
    </div>
  );

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined style={{ color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0 }}>
            AI生成任务描述
          </Title>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        generatedDesc || selectedSuggestion !== null ? (
          <Space key="apply">
            <Radio.Group
              value={applyMode}
              onChange={(e) => setApplyMode(e.target.value)}
              size="small"
            >
              <Radio.Button value="replace">替换</Radio.Button>
              <Radio.Button value="append">追加</Radio.Button>
            </Radio.Group>
            <Button type="primary" onClick={handleApply}>
              应用到任务
            </Button>
          </Space>
        ) : null,
      ]}
    >
      <div>
        <Paragraph>
          <Text strong>任务标题：</Text>
          {taskTitle}
        </Paragraph>

        {currentDescription && (
          <Alert
            message="当前已有描述"
            description={
              <div style={{ maxHeight: 100, overflow: 'auto' }}>
                {currentDescription.substring(0, 200)}
                {currentDescription.length > 200 ? '...' : ''}
              </div>
            }
            type="warning"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />
        )}

        <Divider />

        {mode === 'quick' && renderQuickMode()}
        {mode === 'custom' && renderCustomMode()}
        {mode === 'suggestions' && renderSuggestionsMode()}
      </div>
    </Modal>
  );
};

export default AIDescriptionModal;
