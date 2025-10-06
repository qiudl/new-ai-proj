import React, { useEffect, useRef } from 'react';
import { Modal, Button, Alert } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import {
  CreateAIDocDialogProps,
  GenerationStep,
  StepValidation,
} from './types';
import { useDialogState } from './hooks/useDialogState';
import { useAIGeneration } from './hooks/useAIGeneration';
import { useDocumentSave } from './hooks/useDocumentSave';
import StepIndicator from './components/StepIndicator';
import LoadingOverlay from './components/LoadingOverlay';
import { DIALOG_CONFIG } from './constants';

// 这些组件将在后续任务中实现
const AIModelSelector = React.lazy(() => import('./steps/AIModelSelector'));
const DocumentPreview = React.lazy(() => import('./steps/DocumentPreview'));
const MarkdownEditor = React.lazy(() => import('./steps/MarkdownEditor'));

/**
 * 创建AI文档对话框
 */
const CreateAIDocDialog: React.FC<CreateAIDocDialogProps> = ({
  open,
  task,
  onClose,
  onSuccess,
}) => {
  const {
    state,
    setCurrentStep,
    setSelectedAIConfig,
    setSelectedTemplate,
    setGeneratedContent,
    setEditedContent,
    setIsGenerating,
    setIsSaving,
    setError,
    resetState,
  } = useDialogState();

  const { generateWithErrorHandling } = useAIGeneration();
  const { saveWithErrorHandling } = useDocumentSave();

  // 保存生成的文档ID
  const documentIdRef = useRef<number | null>(null);

  // 对话框打开时重置状态
  useEffect(() => {
    if (open) {
      resetState();
      documentIdRef.current = null;
    }
  }, [open, resetState]);

  /**
   * 验证当前步骤
   */
  const validateStep = (step: GenerationStep): StepValidation => {
    switch (step) {
      case GenerationStep.SELECT_MODEL:
        if (!state.selectedAIConfig) {
          return { valid: false, message: '请选择AI模型' };
        }
        if (!state.selectedTemplate) {
          return { valid: false, message: '请选择文档模板' };
        }
        return { valid: true };

      case GenerationStep.PREVIEW:
        if (!state.generatedContent) {
          return { valid: false, message: '文档尚未生成' };
        }
        return { valid: true };

      case GenerationStep.EDIT:
        if (!state.editedContent.trim()) {
          return { valid: false, message: '文档内容不能为空' };
        }
        return { valid: true };

      default:
        return { valid: false };
    }
  };

  /**
   * 处理下一步
   */
  const handleNext = async () => {
    const validation = validateStep(state.currentStep);
    if (!validation.valid) {
      setError(validation.message || '验证失败');
      return;
    }

    setError(null);

    // 步骤1: 选择模型 -> 生成文档并跳转到预览
    if (state.currentStep === GenerationStep.SELECT_MODEL) {
      if (!state.selectedAIConfig || !state.selectedTemplate) {
        return;
      }

      setIsGenerating(true);
      await generateWithErrorHandling(
        task.id,
        state.selectedAIConfig,
        state.selectedTemplate,
        (response) => {
          setGeneratedContent(response.content);
          documentIdRef.current = response.document_id;
          setIsGenerating(false);
          setCurrentStep(GenerationStep.PREVIEW);
        },
        (error) => {
          setError(error);
          setIsGenerating(false);
        }
      );
    }
    // 步骤2: 预览文档 -> 编辑
    else if (state.currentStep === GenerationStep.PREVIEW) {
      setCurrentStep(GenerationStep.EDIT);
    }
  };

  /**
   * 处理返回
   */
  const handleBack = () => {
    setError(null);
    if (state.currentStep === GenerationStep.PREVIEW) {
      setCurrentStep(GenerationStep.SELECT_MODEL);
    } else if (state.currentStep === GenerationStep.EDIT) {
      setCurrentStep(GenerationStep.PREVIEW);
    }
  };

  /**
   * 处理完成 (保存文档)
   */
  const handleFinish = async () => {
    const validation = validateStep(state.currentStep);
    if (!validation.valid) {
      setError(validation.message || '验证失败');
      return;
    }

    if (!documentIdRef.current) {
      setError('文档ID不存在');
      return;
    }

    setIsSaving(true);
    await saveWithErrorHandling(
      documentIdRef.current,
      state.editedContent,
      () => {
        setIsSaving(false);
        onSuccess?.(documentIdRef.current!);
        onClose();
      },
      (error) => {
        setError(error);
        setIsSaving(false);
      }
    );
  };

  /**
   * 处理关闭
   */
  const handleClose = () => {
    if (state.isGenerating || state.isSaving) {
      return; // 正在处理时不允许关闭
    }
    onClose();
  };

  /**
   * 渲染当前步骤内容
   */
  const renderStepContent = () => {
    switch (state.currentStep) {
      case GenerationStep.SELECT_MODEL:
        return (
          <React.Suspense fallback={<LoadingOverlay visible tip="加载中..." />}>
            <AIModelSelector
              selectedAIConfig={state.selectedAIConfig}
              selectedTemplate={state.selectedTemplate}
              onAIConfigChange={setSelectedAIConfig}
              onTemplateChange={setSelectedTemplate}
            />
          </React.Suspense>
        );

      case GenerationStep.PREVIEW:
        return (
          <React.Suspense fallback={<LoadingOverlay visible tip="加载中..." />}>
            <DocumentPreview content={state.generatedContent} />
          </React.Suspense>
        );

      case GenerationStep.EDIT:
        return (
          <React.Suspense fallback={<LoadingOverlay visible tip="加载中..." />}>
            <MarkdownEditor
              content={state.editedContent}
              onChange={setEditedContent}
            />
          </React.Suspense>
        );

      default:
        return null;
    }
  };

  /**
   * 渲染底部按钮
   */
  const renderFooter = () => {
    const buttons = [];

    // 取消按钮
    buttons.push(
      <Button key="cancel" onClick={handleClose} disabled={state.isGenerating || state.isSaving}>
        取消
      </Button>
    );

    // 返回按钮 (步骤2和3)
    if (state.currentStep > GenerationStep.SELECT_MODEL) {
      buttons.push(
        <Button
          key="back"
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
          disabled={state.isGenerating || state.isSaving}
        >
          返回
        </Button>
      );
    }

    // 下一步/生成按钮 (步骤1和2)
    if (state.currentStep < GenerationStep.EDIT) {
      const buttonText = state.currentStep === GenerationStep.SELECT_MODEL ? '生成文档' : '下一步';
      buttons.push(
        <Button
          key="next"
          type="primary"
          onClick={handleNext}
          loading={state.isGenerating}
          disabled={state.isSaving}
        >
          {buttonText}
        </Button>
      );
    }

    // 完成/保存按钮 (步骤3)
    if (state.currentStep === GenerationStep.EDIT) {
      buttons.push(
        <Button
          key="finish"
          type="primary"
          onClick={handleFinish}
          loading={state.isSaving}
          disabled={state.isGenerating}
        >
          保存文档
        </Button>
      );
    }

    return buttons;
  };

  return (
    <Modal
      title={`为任务 "${task.title}" 创建AI文档`}
      open={open}
      onCancel={handleClose}
      footer={renderFooter()}
      width={DIALOG_CONFIG.width}
      maskClosable={false}
      keyboard={!state.isGenerating && !state.isSaving}
      destroyOnClose
    >
      <div style={{ minHeight: DIALOG_CONFIG.minHeight, position: 'relative' }}>
        {/* 步骤指示器 */}
        <StepIndicator current={state.currentStep} />

        {/* 错误提示 */}
        {state.error && (
          <Alert
            message={state.error}
            type="error"
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 步骤内容 */}
        <div style={{ minHeight: 400 }}>
          {renderStepContent()}
        </div>

        {/* 加载遮罩 */}
        <LoadingOverlay
          visible={state.isGenerating}
          tip="AI正在生成文档，请稍候..."
        />
        <LoadingOverlay
          visible={state.isSaving}
          tip="正在保存文档..."
        />
      </div>
    </Modal>
  );
};

export default CreateAIDocDialog;
