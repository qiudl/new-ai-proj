import { useState, useCallback } from 'react';
import { DialogState, GenerationStep, AIConfig, DocumentTemplateType } from '../types';

/**
 * 对话框状态管理Hook
 */
export const useDialogState = () => {
  const [state, setState] = useState<DialogState>({
    currentStep: GenerationStep.SELECT_MODEL,
    selectedAIConfig: null,
    selectedTemplate: null,
    generatedContent: '',
    editedContent: '',
    isGenerating: false,
    isSaving: false,
    error: null,
  });

  // 设置当前步骤
  const setCurrentStep = useCallback((step: GenerationStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  // 设置选中的AI配置
  const setSelectedAIConfig = useCallback((config: AIConfig | null) => {
    setState((prev) => ({ ...prev, selectedAIConfig: config }));
  }, []);

  // 设置选中的模板
  const setSelectedTemplate = useCallback((template: DocumentTemplateType | null) => {
    setState((prev) => ({ ...prev, selectedTemplate: template }));
  }, []);

  // 设置生成的内容
  const setGeneratedContent = useCallback((content: string) => {
    setState((prev) => ({
      ...prev,
      generatedContent: content,
      editedContent: content, // 同时更新编辑内容
    }));
  }, []);

  // 设置编辑后的内容
  const setEditedContent = useCallback((content: string) => {
    setState((prev) => ({ ...prev, editedContent: content }));
  }, []);

  // 设置生成中状态
  const setIsGenerating = useCallback((isGenerating: boolean) => {
    setState((prev) => ({ ...prev, isGenerating }));
  }, []);

  // 设置保存中状态
  const setIsSaving = useCallback((isSaving: boolean) => {
    setState((prev) => ({ ...prev, isSaving }));
  }, []);

  // 设置错误
  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  // 重置状态
  const resetState = useCallback(() => {
    setState({
      currentStep: GenerationStep.SELECT_MODEL,
      selectedAIConfig: null,
      selectedTemplate: null,
      generatedContent: '',
      editedContent: '',
      isGenerating: false,
      isSaving: false,
      error: null,
    });
  }, []);

  return {
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
  };
};
