import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Checkbox,
  Progress,
  Tabs,
  Badge,
  Tooltip,
  Empty,
} from 'antd';
import {
  RobotOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  CopyOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  DownOutlined,
  UpOutlined,
  FileTextOutlined,
  CodeOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  CheckOutlined,
  SwapOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import aiDescriptionService from '../../services/aiDescriptionService';
import MarkdownRenderer from '../MarkdownRenderer';

const { Title, Text } = Typography;
const { TextArea } = Input;

// ==================== 类型定义 ====================

/**
 * 组件Props接口
 */
export interface UnifiedAIDescriptionModalProps {
  visible: boolean;
  taskId: number;
  taskTitle: string;
  currentDescription?: string;
  onCancel: () => void;
  onApply: (description: string, mode: 'replace' | 'append') => void;
}

/**
 * 生成模式类型
 */
export type GenerationMode = 'smart' | 'quick' | 'custom';

/**
 * 风格选项类型
 */
export type StyleOption = 'brief' | 'detailed' | 'technical';

/**
 * 生成配置接口
 */
export interface GenerationConfig {
  mode: GenerationMode;
  model: string;
  styles: StyleOption[];
  length: 'short' | 'medium' | 'long';
  includeContext: boolean;
  customPrompt?: string;
}

/**
 * 生成结果接口
 */
export interface GenerationResult {
  style: StyleOption;
  styleName: string;
  content: string;
  wordCount: number;
  model: string;
  tokensUsed?: number;
}

/**
 * 生成进度接口
 */
export interface GenerationProgress {
  current: number;
  total: number;
  status: 'idle' | 'generating' | 'completed' | 'error';
  completedStyles: StyleOption[];
  currentStyle?: StyleOption;
}

// ==================== 工具函数 ====================

/**
 * 获取风格名称
 */
const getStyleName = (style: StyleOption): string => {
  const names: Record<StyleOption, string> = {
    brief: '简洁风格',
    detailed: '详细风格',
    technical: '技术风格',
  };
  return names[style];
};

/**
 * 获取风格图标
 */
const getStyleIcon = (style: StyleOption) => {
  const icons: Record<StyleOption, React.ReactNode> = {
    brief: <ThunderboltOutlined style={{ color: '#1890ff' }} />,
    detailed: <FileTextOutlined style={{ color: '#52c41a' }} />,
    technical: <CodeOutlined style={{ color: '#722ed1' }} />,
  };
  return icons[style];
};

// ==================== 主组件 ====================

/**
 * 统一的AI描述生成对话框
 * 整合了快速生成、自定义生成、多方案建议三种模式
 */
const UnifiedAIDescriptionModal: React.FC<UnifiedAIDescriptionModalProps> = ({
  visible,
  taskId,
  taskTitle,
  currentDescription,
  onCancel,
  onApply,
}) => {
  // 表单实例
  const [form] = Form.useForm();

  // ========== 状态管理 ==========

  // 生成模式
  const [mode, setMode] = useState<GenerationMode>('smart');

  // 高级选项展开状态
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  // 生成配置
  const [config, setConfig] = useState<GenerationConfig>({
    mode: 'smart',
    model: 'deepseek',
    styles: ['brief', 'detailed', 'technical'],
    length: 'medium',
    includeContext: true,
  });

  // 生成进度
  const [progress, setProgress] = useState<GenerationProgress>({
    current: 0,
    total: 0,
    status: 'idle',
    completedStyles: [],
  });

  // 生成结果
  const [results, setResults] = useState<GenerationResult[]>([]);

  // 选中的结果索引
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);

  // 应用模式
  const [applyMode, setApplyMode] = useState<'replace' | 'append'>('replace');

  // 用于取消请求的 AbortController
  const abortControllerRef = useRef<AbortController | null>(null);

  // 防止重复请求的标志
  const isGeneratingRef = useRef(false);

  // ========== 初始化逻辑 ==========

  /**
   * 当对话框打开时重置所有状态
   */
  useEffect(() => {
    if (visible) {
      // 重置所有状态
      setMode('smart');
      setAdvancedExpanded(false);
      setConfig({
        mode: 'smart',
        model: 'deepseek',
        styles: ['brief', 'detailed', 'technical'],
        length: 'medium',
        includeContext: true,
      });
      setProgress({
        current: 0,
        total: 0,
        status: 'idle',
        completedStyles: [],
      });
      setResults([]);
      setSelectedResultIndex(0);
      setApplyMode('replace');

      // 重置表单
      form.resetFields();

      // 清理 ref
      isGeneratingRef.current = false;
    }
  }, [visible, form]);

  /**
   * 键盘快捷键支持
   */
  useEffect(() => {
    if (!visible || results.length === 0) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // 左右箭头切换标签
      if (e.key === 'ArrowLeft' && selectedResultIndex > 0) {
        setSelectedResultIndex(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && selectedResultIndex < results.length - 1) {
        setSelectedResultIndex(prev => prev + 1);
      }
      // Ctrl+Enter 应用选中方案
      else if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        handleApplyResult();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [visible, results, selectedResultIndex]);

  // ========== 配置管理 ==========

  /**
   * 更新配置
   */
  const updateConfig = (updates: Partial<GenerationConfig>) => {
    setConfig(prev => ({
      ...prev,
      ...updates,
    }));
  };

  /**
   * 获取生成按钮文本
   */
  const getGenerateButtonText = () => {
    const count = config.styles.length;
    const modeTexts = {
      smart: '开始生成（3个方案）',
      quick: '快速生成',
      custom: `开始生成（${count}个方案）`,
    };
    return modeTexts[mode];
  };

  /**
   * 验证配置
   */
  const validateConfig = (): boolean => {
    if (mode === 'custom' && config.styles.length === 0) {
      message.warning('请至少选择一种生成风格');
      return false;
    }
    return true;
  };

  /**
   * 复制到剪贴板
   */
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('已复制到剪贴板');
    } catch (error) {
      console.error('Copy failed:', error);
      message.error('复制失败，请手动复制');
    }
  };

  /**
   * 应用选中的结果
   */
  const handleApplyResult = () => {
    const selectedResult = results[selectedResultIndex];

    if (!selectedResult) {
      message.warning('请先选择一个方案');
      return;
    }

    // 调用父组件的 onApply 回调
    onApply(selectedResult.content, applyMode);

    message.success(`已应用${selectedResult.styleName}`);
  };

  // ========== 事件处理 ==========

  /**
   * 模式切换处理
   */
  const handleModeChange = (newMode: GenerationMode) => {
    setMode(newMode);

    // 根据模式更新配置
    const modeConfigs: Record<GenerationMode, Partial<GenerationConfig>> = {
      smart: {
        mode: 'smart',
        model: 'deepseek',
        styles: ['brief', 'detailed', 'technical'],
        length: 'medium',
        includeContext: true,
      },
      quick: {
        mode: 'quick',
        model: 'deepseek',
        styles: ['detailed'],
        length: 'medium',
        includeContext: true,
      },
      custom: {
        mode: 'custom',
        // 保持用户当前配置
      },
    };

    if (newMode !== 'custom') {
      setConfig(prev => ({
        ...prev,
        ...modeConfigs[newMode],
      }));
    }

    // 自定义模式自动展开高级选项
    if (newMode === 'custom') {
      setAdvancedExpanded(true);
    }
  };

  /**
   * 开始生成
   */
  const handleGenerate = async () => {
    // 验证配置
    if (!validateConfig()) {
      return;
    }

    // 防止重复请求
    if (isGeneratingRef.current) {
      message.warning('正在生成中，请稍候...');
      return;
    }

    isGeneratingRef.current = true;

    try {
      // 清空之前的结果
      setResults([]);
      setSelectedResultIndex(0);

      // 初始化进度
      const stylesToGenerate = config.styles;
      setProgress({
        current: 0,
        total: stylesToGenerate.length,
        status: 'generating',
        completedStyles: [],
        currentStyle: stylesToGenerate[0],
      });

      // 开始生成
      await generateAllStyles(stylesToGenerate);
    } finally {
      isGeneratingRef.current = false;
    }
  };

  /**
   * 生成所有风格方案
   */
  const generateAllStyles = async (styles: StyleOption[]) => {
    const tempResults: GenerationResult[] = [];
    abortControllerRef.current = new AbortController();

    try {
      // 按顺序生成每个风格
      for (let i = 0; i < styles.length; i++) {
        const style = styles[i];

        // 更新当前生成风格
        setProgress(prev => ({
          ...prev,
          currentStyle: style,
        }));

        try {
          // 调用AI服务生成
          const result = await aiDescriptionService.generateDescription(
            taskId,
            config.model,
            {
              mode: 'replace',
              style,
              length: config.length,
              include_context: config.includeContext,
              custom_prompt: config.customPrompt,
            }
          );

          // 构建结果对象
          const generationResult: GenerationResult = {
            style,
            styleName: getStyleName(style),
            content: result.generated_desc,
            wordCount: result.generated_desc.length,
            model: result.model,
            tokensUsed: result.tokens_used,
          };

          tempResults.push(generationResult);

          // 更新进度
          setProgress(prev => ({
            ...prev,
            current: i + 1,
            completedStyles: [...prev.completedStyles, style],
          }));

          // 实时更新结果（让用户可以立即看到）
          setResults([...tempResults]);

          message.success(`${getStyleName(style)}生成成功`);
        } catch (error) {
          console.error(`Failed to generate ${style}:`, error);
          message.error(`${getStyleName(style)}生成失败`);

          // 继续生成下一个
          setProgress(prev => ({
            ...prev,
            current: i + 1,
          }));
        }
      }

      // 全部完成
      setProgress(prev => ({
        ...prev,
        status: 'completed',
      }));

      if (tempResults.length > 0) {
        message.success(`成功生成 ${tempResults.length} 个方案`);
      } else {
        message.error('所有方案生成失败，请重试');
        setProgress(prev => ({
          ...prev,
          status: 'error',
        }));
      }
    } catch (error) {
      console.error('Generation error:', error);
      message.error('生成过程中出现错误');
      setProgress(prev => ({
        ...prev,
        status: 'error',
      }));
    }
  };

  /**
   * 重新生成单个风格
   */
  const handleRegenerateStyle = async (style: StyleOption) => {
    try {
      setProgress({
        current: 0,
        total: 1,
        status: 'generating',
        completedStyles: [],
        currentStyle: style,
      });

      const result = await aiDescriptionService.generateDescription(
        taskId,
        config.model,
        {
          mode: 'replace',
          style,
          length: config.length,
          include_context: config.includeContext,
          custom_prompt: config.customPrompt,
        }
      );

      // 更新对应风格的结果
      setResults(prev =>
        prev.map(r =>
          r.style === style
            ? {
                style,
                styleName: getStyleName(style),
                content: result.generated_desc,
                wordCount: result.generated_desc.length,
                model: result.model,
                tokensUsed: result.tokens_used,
              }
            : r
        )
      );

      setProgress(prev => ({
        ...prev,
        status: 'completed',
      }));

      message.success(`${getStyleName(style)}重新生成成功`);
    } catch (error) {
      console.error('Regenerate failed:', error);
      message.error(`${getStyleName(style)}重新生成失败`);
      setProgress(prev => ({
        ...prev,
        status: 'error',
      }));
    }
  };

  /**
   * 关闭对话框
   */
  const handleCancel = () => {
    // 如果正在生成，先取消
    if (progress.status === 'generating') {
      handleCancelGeneration();
    }
    onCancel();
  };

  /**
   * 取消生成
   */
  const handleCancelGeneration = () => {
    // 取消请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 重置状态
    setProgress({
      current: 0,
      total: 0,
      status: 'idle',
      completedStyles: [],
    });

    isGeneratingRef.current = false;

    message.info('已取消生成');
  };

  // ========== 渲染方法 ==========

  /**
   * 渲染模式选择器
   */
  const renderModeSelector = () => (
    <Form.Item label="生成方式">
      <Radio.Group
        value={mode}
        onChange={(e) => handleModeChange(e.target.value)}
      >
        <Space direction="vertical">
          <Radio value="smart">
            <Space>
              <BulbOutlined style={{ color: '#52c41a' }} />
              <div>
                <Text strong>智能生成（推荐）</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  自动生成3种风格供对比选择
                </Text>
              </div>
            </Space>
          </Radio>

          <Radio value="quick">
            <Space>
              <ThunderboltOutlined style={{ color: '#1890ff' }} />
              <div>
                <Text strong>快速生成</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  使用默认详细风格快速生成
                </Text>
              </div>
            </Space>
          </Radio>

          <Radio value="custom">
            <Space>
              <SettingOutlined style={{ color: '#722ed1' }} />
              <div>
                <Text strong>自定义生成</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  完全自定义参数和风格
                </Text>
              </div>
            </Space>
          </Radio>
        </Space>
      </Radio.Group>
    </Form.Item>
  );

  /**
   * 渲染高级选项
   */
  const renderAdvancedOptions = () => {
    if (!advancedExpanded) return null;

    return (
      <div style={{ marginTop: 16 }}>
        <Divider orientation="left">高级选项</Divider>

        {/* AI模型选择 */}
        <Form.Item label="AI模型">
          <Select
            value={config.model}
            onChange={(value) => updateConfig({ model: value })}
            disabled={mode !== 'custom'}
          >
            <Select.Option value="deepseek">
              <Space>
                <RobotOutlined />
                DeepSeek
              </Space>
            </Select.Option>
            <Select.Option value="openai">
              <Space>
                <ThunderboltOutlined />
                OpenAI GPT-4
              </Space>
            </Select.Option>
          </Select>
        </Form.Item>

        {/* 风格多选（仅自定义模式） */}
        {mode === 'custom' && (
          <Form.Item label="生成风格（可多选）">
            <Checkbox.Group
              value={config.styles}
              onChange={(values) => updateConfig({ styles: values as StyleOption[] })}
            >
              <Space direction="vertical">
                <Checkbox value="brief">
                  <Space>
                    <ThunderboltOutlined />
                    简洁风格 - 50-150字，突出重点
                  </Space>
                </Checkbox>
                <Checkbox value="detailed">
                  <Space>
                    <FileTextOutlined />
                    详细风格 - 150-300字，全面描述
                  </Space>
                </Checkbox>
                <Checkbox value="technical">
                  <Space>
                    <CodeOutlined />
                    技术风格 - 侧重技术实现和方案
                  </Space>
                </Checkbox>
              </Space>
            </Checkbox.Group>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
              选中 {config.styles.length} 个风格，将生成 {config.styles.length} 个方案
            </Text>
          </Form.Item>
        )}

        {/* 描述长度 */}
        <Form.Item label="描述长度">
          <Radio.Group
            value={config.length}
            onChange={(e) => updateConfig({ length: e.target.value })}
            disabled={mode !== 'custom'}
          >
            <Radio.Button value="short">短 (50-150字)</Radio.Button>
            <Radio.Button value="medium">中 (150-300字)</Radio.Button>
            <Radio.Button value="long">长 (300-600字)</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {/* 上下文开关 */}
        <Form.Item label="包含上下文信息">
          <Switch
            checked={config.includeContext}
            onChange={(checked) => updateConfig({ includeContext: checked })}
            disabled={mode !== 'custom'}
          />
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
            包含项目、任务、子任务等上下文
          </Text>
        </Form.Item>

        {/* 自定义提示词 */}
        {mode === 'custom' && (
          <Form.Item label="自定义提示词">
            <TextArea
              rows={3}
              placeholder="可选：添加特殊要求或约束条件..."
              value={config.customPrompt}
              onChange={(e) => updateConfig({ customPrompt: e.target.value })}
            />
          </Form.Item>
        )}
      </div>
    );
  };

  /**
   * 渲染生成按钮
   */
  const renderGenerateButton = () => (
    <Button
      type="primary"
      size="large"
      icon={<RobotOutlined />}
      onClick={handleGenerate}
      loading={progress.status === 'generating'}
      disabled={progress.status === 'generating'}
      block
      style={{ marginTop: 16 }}
    >
      {progress.status === 'generating'
        ? '生成中...'
        : getGenerateButtonText()}
    </Button>
  );

  /**
   * 渲染配置区
   */
  const renderConfigSection = () => (
    <Form
      form={form}
      layout="vertical"
    >
      {renderModeSelector()}
      {renderAdvancedOptions()}
      {renderGenerateButton()}
    </Form>
  );

  /**
   * 渲染进度显示
   */
  const renderProgress = () => {
    if (progress.status !== 'generating') return null;

    const percentage = Math.round((progress.current / progress.total) * 100);

    return (
      <Card style={{ marginTop: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 顶部加载动画 */}
          <div style={{ textAlign: 'center' }}>
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
              size="large"
            />
            <Title level={4} style={{ marginTop: 16, marginBottom: 0 }}>
              AI 正在生成中...
            </Title>
            <Text type="secondary">
              请稍候，这可能需要几秒钟
            </Text>
          </div>

          {/* 进度条 */}
          <Progress
            percent={percentage}
            status="active"
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />

          {/* 各风格生成状态 */}
          <div>
            <Text strong>生成进度：</Text>
            <div style={{ marginTop: 12 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {config.styles.map((style) => {
                  const isCompleted = progress.completedStyles.includes(style);
                  const isCurrent = progress.currentStyle === style;

                  return (
                    <div
                      key={style}
                      style={{
                        padding: '8px 12px',
                        background: isCurrent ? '#e6f7ff' : 'transparent',
                        borderRadius: 4,
                        transition: 'all 0.3s',
                      }}
                    >
                      <Space>
                        {isCompleted && (
                          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                        )}
                        {isCurrent && !isCompleted && (
                          <LoadingOutlined style={{ color: '#1890ff', fontSize: 16 }} />
                        )}
                        {!isCompleted && !isCurrent && (
                          <ClockCircleOutlined style={{ color: '#8c8c8c', fontSize: 16 }} />
                        )}

                        {getStyleIcon(style)}

                        <Text strong={isCurrent}>
                          {getStyleName(style)}
                        </Text>

                        <Text type="secondary">
                          {isCompleted
                            ? '已完成'
                            : isCurrent
                            ? '生成中...'
                            : '等待中'}
                        </Text>
                      </Space>
                    </div>
                  );
                })}
              </Space>
            </div>
          </div>

          {/* 取消按钮 */}
          <Button
            danger
            block
            onClick={handleCancelGeneration}
          >
            取消生成
          </Button>
        </Space>
      </Card>
    );
  };

  /**
   * 渲染单个结果内容
   */
  const renderResultContent = (result: GenerationResult, index: number) => (
    <div>
      {/* 元数据信息 */}
      <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
        <Space split={<Divider type="vertical" />}>
          <Text type="secondary">
            <RobotOutlined /> 模型: {result.model}
          </Text>
          <Text type="secondary">
            <FileTextOutlined /> 字数: {result.wordCount}
          </Text>
          {result.tokensUsed && (
            <Text type="secondary">
              <ThunderboltOutlined /> Tokens: {result.tokensUsed}
            </Text>
          )}
        </Space>
      </div>

      {/* 内容预览区 */}
      <div
        style={{
          maxHeight: 400,
          overflow: 'auto',
          padding: 16,
          background: '#fff',
          border: '1px solid #d9d9d9',
          borderRadius: 4,
        }}
      >
        <MarkdownRenderer content={result.content} />
      </div>

      {/* 操作按钮 */}
      <div style={{ marginTop: 16 }}>
        <Space>
          <Button
            icon={<CopyOutlined />}
            onClick={() => handleCopy(result.content)}
          >
            复制内容
          </Button>

          <Button
            icon={<ReloadOutlined />}
            onClick={() => handleRegenerateStyle(result.style)}
            loading={
              progress.status === 'generating' &&
              progress.currentStyle === result.style
            }
          >
            重新生成
          </Button>

          <Tooltip title="将此方案设为选中">
            <Button
              type={selectedResultIndex === index ? 'primary' : 'default'}
              icon={<CheckOutlined />}
              onClick={() => setSelectedResultIndex(index)}
            >
              {selectedResultIndex === index ? '已选中' : '选择此方案'}
            </Button>
          </Tooltip>
        </Space>
      </div>
    </div>
  );

  /**
   * 渲染结果标签页
   */
  const renderResultTabs = () => (
    <Tabs
      activeKey={selectedResultIndex.toString()}
      onChange={(key) => setSelectedResultIndex(parseInt(key))}
      type="card"
      items={results.map((result, index) => ({
        key: index.toString(),
        label: (
          <Space>
            {getStyleIcon(result.style)}
            <Text strong>{result.styleName}</Text>
            <Badge
              count={result.wordCount}
              showZero
              style={{ backgroundColor: '#52c41a' }}
            />
          </Space>
        ),
        children: renderResultContent(result, index),
      }))}
    />
  );

  /**
   * 渲染应用模式选择器
   */
  const renderApplyModeSelector = () => {
    if (results.length === 0) return null;

    return (
      <div style={{ marginTop: 16 }}>
        <Form.Item label="应用方式">
          <Radio.Group
            value={applyMode}
            onChange={(e) => setApplyMode(e.target.value)}
          >
            <Space>
              <Radio value="replace">
                <Space>
                  <SwapOutlined />
                  <div>
                    <Text strong>替换</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      完全替换当前描述
                    </Text>
                  </div>
                </Space>
              </Radio>

              <Radio value="append">
                <Space>
                  <PlusOutlined />
                  <div>
                    <Text strong>追加</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      追加到当前描述后
                    </Text>
                  </div>
                </Space>
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        {/* 当前描述预览 */}
        {currentDescription && applyMode === 'append' && (
          <Alert
            message="当前描述"
            description={
              <div style={{ maxHeight: 100, overflow: 'auto' }}>
                <Text>{currentDescription}</Text>
              </div>
            }
            type="info"
            showIcon
            style={{ marginTop: 8 }}
          />
        )}
      </div>
    );
  };

  /**
   * 渲染结果展示
   */
  const renderResults = () => {
    if (results.length === 0 || progress.status === 'generating') {
      return null;
    }

    return (
      <Card
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <Text strong>生成结果（{results.length}个方案）</Text>
          </Space>
        }
        style={{ marginTop: 16 }}
      >
        {renderResultTabs()}
        {renderApplyModeSelector()}
      </Card>
    );
  };

  /**
   * 渲染底部操作区
   */
  const renderFooter = () => {
    const selectedResult = results[selectedResultIndex];

    return (
      <div
        style={{
          marginTop: 24,
          paddingTop: 16,
          borderTop: '1px solid #f0f0f0',
        }}
      >
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button onClick={handleCancel}>
            取消
          </Button>

          <Button
            type="primary"
            size="large"
            icon={<CheckOutlined />}
            onClick={handleApplyResult}
            disabled={results.length === 0}
          >
            应用选中的方案
            {selectedResult && ` (${selectedResult.styleName})`}
          </Button>
        </Space>
      </div>
    );
  };

  // ========== 主渲染 ==========

  return (
    <Modal
      open={visible}
      title={
        <Space>
          <RobotOutlined style={{ color: '#1890ff' }} />
          <span>AI生成任务描述</span>
        </Space>
      }
      width={800}
      footer={null}
      onCancel={handleCancel}
      destroyOnHidden
    >
      {/* 任务信息展示 */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Text strong>任务：</Text>
          <Text>{taskTitle}</Text>
        </Space>
      </div>

      {/* 生成配置区 */}
      <Card
        title="生成配置"
        extra={
          <Button
            type="link"
            onClick={() => setAdvancedExpanded(!advancedExpanded)}
            icon={advancedExpanded ? <UpOutlined /> : <DownOutlined />}
          >
            {advancedExpanded ? '收起' : '展开'}高级选项
          </Button>
        }
      >
        {renderConfigSection()}
      </Card>

      {/* 生成进度/结果区 */}
      {renderProgress()}
      {renderResults()}

      {/* 底部操作区 */}
      {renderFooter()}
    </Modal>
  );
};

export default UnifiedAIDescriptionModal;
