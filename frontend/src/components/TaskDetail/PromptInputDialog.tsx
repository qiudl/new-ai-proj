import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Tag, Alert, Typography, Spin, Card } from 'antd';
import { BulbOutlined, RobotOutlined, ThunderboltOutlined, HistoryOutlined } from '@ant-design/icons';
import { validateCustomPrompt } from '../../services/aiTaskService';
import type { AIModel } from '../../config/aiModels';
import { promptService, PromptRecommendation } from '../../services/promptService';

const { TextArea } = Input;
const { Text } = Typography;

export interface PromptInputDialogProps {
  visible: boolean;
  taskId: number;
  taskTitle: string;
  selectedModel: AIModel;
  onConfirm: (customPrompt: string | null) => void;
  onCancel: () => void;
}

const PromptInputDialog: React.FC<PromptInputDialogProps> = ({
  visible,
  taskId,
  taskTitle,
  selectedModel,
  onConfirm,
  onCancel
}) => {
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [charCount, setCharCount] = useState<number>(0);

  // 智能推荐相关状态
  const [recommendations, setRecommendations] = useState<PromptRecommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // 重置状态并加载推荐
  useEffect(() => {
    if (visible) {
      setCustomPrompt('');
      setValidationError(null);
      setValidationWarning(null);
      setCharCount(0);

      // 加载智能推荐
      if (taskTitle) {
        loadRecommendations();
      }
    } else {
      // 对话框关闭时清空推荐
      setRecommendations([]);
    }
  }, [visible, taskTitle, selectedModel?.key]);

  // 🆕 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!visible) return;

      // Ctrl+Enter 或 Cmd+Enter 提交
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!validationError) {
          handleConfirm();
        }
      }

      // Escape 取消
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, validationError, customPrompt]);

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCustomPrompt(value);
    setCharCount(value.length);

    // 实时验证
    if (value.trim()) {
      const validation = validateCustomPrompt(value);
      if (!validation.valid) {
        setValidationError(validation.error || null);
        setValidationWarning(null);
      } else {
        setValidationError(null);
        setValidationWarning(validation.warning || null);
      }
    } else {
      setValidationError(null);
      setValidationWarning(null);
    }
  };

  // 加载智能推荐
  const loadRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const recs = await promptService.getRecommendations({
        task_description: taskTitle,
        ai_provider: selectedModel.provider || 'claude',
        limit: 3
      });
      setRecommendations(recs);
    } catch (error) {
      console.error('加载智能推荐失败:', error);
      // 静默失败，不影响主要功能
      setRecommendations([]);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // 使用推荐
  const handleUseRecommendation = (recommendation: PromptRecommendation) => {
    setCustomPrompt(recommendation.content);
    setCharCount(recommendation.content.length);

    // 验证推荐内容
    const validation = validateCustomPrompt(recommendation.content);
    if (!validation.valid) {
      setValidationError(validation.error || null);
      setValidationWarning(null);
    } else {
      setValidationError(null);
      setValidationWarning(validation.warning || null);
    }
  };

  // 使用系统默认
  const handleUseDefault = () => {
    onConfirm(null);  // 传递null表示使用系统默认
  };

  // 使用自定义提示词
  const handleConfirm = () => {
    const trimmedPrompt = customPrompt.trim();

    if (trimmedPrompt) {
      // 验证
      const validation = validateCustomPrompt(trimmedPrompt);
      if (!validation.valid) {
        setValidationError(validation.error || '提示词验证失败');
        return;
      }
    }

    // 传递自定义提示词（如果为空则传null）
    onConfirm(trimmedPrompt || null);
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BulbOutlined />
          <span>自定义AI提示词（可选）</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={600}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消 <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>(Esc)</Text>
        </Button>,
        <Button key="default" onClick={handleUseDefault}>
          使用系统默认
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleConfirm}
          disabled={!!validationError}
        >
          生成子任务 <Text style={{ fontSize: 11, marginLeft: 4, opacity: 0.8 }}>(Ctrl+Enter)</Text>
        </Button>
      ]}
    >
      {/* 任务信息 */}
      <div style={{ marginBottom: 16 }}>
        <Tag color="blue" icon={<span>📋</span>}>
          父任务: {taskTitle}
        </Tag>
        <Tag color="green" icon={<RobotOutlined />}>
          AI模型: {selectedModel.label}
        </Tag>
      </div>

  

      {/* 智能推荐区域 */}
      {loadingRecommendations && (
        <div style={{ textAlign: 'center', padding: '20px 0', marginBottom: 16 }}>
          <Spin tip="正在加载智能推荐..." />
        </div>
      )}

      {!loadingRecommendations && recommendations.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 500, marginBottom: 8, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ThunderboltOutlined style={{ color: '#faad14' }} />
            <span>💡 智能推荐</span>
          </div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
            基于您的历史使用和任务描述为您推荐
          </div>

          {recommendations.map((rec, idx) => {
            const isHistory = rec.type === 'history';
            const icon = isHistory ? <HistoryOutlined /> : <BulbOutlined />;

            return (
              <Card
                key={`${rec.type}-${rec.id}`}
                size="small"
                hoverable
                style={{ marginBottom: 8, cursor: 'pointer' }}
                onClick={() => handleUseRecommendation(rec)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {idx === 0 && <span style={{ fontSize: 16 }}>🔥</span>}
                      {icon}
                      <span style={{ fontWeight: 500, fontSize: 13 }}>
                        {rec.content.length > 80
                          ? `${rec.content.substring(0, 80)}...`
                          : rec.content
                        }
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#999', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span>{rec.source}</span>
                      {rec.success_rate > 0 && (
                        <Tag color="green" style={{ margin: 0, fontSize: 11 }}>
                          成功率: {rec.success_rate.toFixed(0)}%
                        </Tag>
                      )}
                      {rec.usage_count > 0 && (
                        <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
                          使用过{rec.usage_count}次
                        </Tag>
                      )}
                      {rec.similarity > 0.7 && (
                        <Tag color="purple" style={{ margin: 0, fontSize: 11 }}>
                          高度匹配
                        </Tag>
                      )}
                    </div>
                  </div>
                  <Button size="small" type="link" style={{ padding: '0 8px' }}>
                    使用
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 输入框 */}
      <div>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>
          📝 自定义提示词（可选）:
        </div>
        <TextArea
          rows={8}
          value={customPrompt}
          onChange={handleInputChange}
          placeholder={`示例：

请将这个任务分解为详细的执行步骤，包括：
1. 前期准备工作
2. 核心开发任务
3. 测试验证环节
4. 部署上线流程

每个步骤需要明确的验收标准和预估工时。`}
          status={validationError ? 'error' : undefined}
          maxLength={2000}
        />

        {/* 字符计数 */}
        <div
          style={{
            marginTop: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            {validationError && (
              <Text type="danger">⚠️ {validationError}</Text>
            )}
            {!validationError && validationWarning && (
              <Text type="warning">💡 {validationWarning}</Text>
            )}
          </div>
          <Text
            type="secondary"
            style={{ fontSize: 12 }}
          >
            {charCount}/2000 字符
          </Text>
        </div>

        {/* 🆕 示例提示词快捷标签 */}
        {customPrompt.length === 0 && (
          <div style={{ marginTop: 12 }}>
            <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>
              💡 快速示例:
            </Text>
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                '请将任务按照前后端分离方式拆分',
                '分解为需求分析、设计、开发、测试等阶段',
                '按照敏捷开发方式拆分为小步快跑的任务',
                '请按模块功能拆分，每个模块独立开发和测试'
              ].map((example, idx) => (
                <Tag
                  key={idx}
                  style={{ cursor: 'pointer', fontSize: 12 }}
                  color="blue"
                  onClick={() => {
                    setCustomPrompt(example);
                    setCharCount(example.length);
                    const validation = validateCustomPrompt(example);
                    if (!validation.valid) {
                      setValidationError(validation.error || null);
                      setValidationWarning(null);
                    } else {
                      setValidationError(null);
                      setValidationWarning(validation.warning || null);
                    }
                  }}
                >
                  {example}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </div>


    </Modal>
  );
};

export default PromptInputDialog;
