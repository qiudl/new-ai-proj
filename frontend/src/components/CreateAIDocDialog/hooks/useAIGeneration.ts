import { useCallback } from 'react';
import { message } from 'antd';
import api from '../../../services/api';
import { GenerateDocumentResponse, AIConfig, DocumentTemplateType } from '../types';
import { API_TIMEOUT } from '../constants';

/**
 * AI文档生成Hook
 */
export const useAIGeneration = () => {
  /**
   * 生成文档
   */
  const generateDocument = useCallback(
    async (
      taskId: number,
      aiConfig: AIConfig,
      templateType: DocumentTemplateType
    ): Promise<GenerateDocumentResponse> => {
      try {
        const response = await api.post<{
          success: boolean;
          data: GenerateDocumentResponse;
          message: string;
        }>(
          `/tasks/${taskId}/generate-document`,
          {
            ai_config_id: aiConfig.id,
            template_type: templateType,
          },
          {
            timeout: API_TIMEOUT.generate,
          }
        );

        if (!response.data.success) {
          throw new Error(response.data.message || 'AI生成失败');
        }

        return response.data.data;
      } catch (error: any) {
        console.error('AI生成文档失败:', error);

        // 处理不同类型的错误
        if (error.code === 'ECONNABORTED') {
          throw new Error('AI生成超时，请稍后重试');
        }

        if (error.response?.data?.error) {
          const errorData = error.response.data.error;
          throw new Error(errorData.message || 'AI生成失败');
        }

        throw new Error(error.message || '生成文档时发生未知错误');
      }
    },
    []
  );

  /**
   * 带错误处理的生成函数
   */
  const generateWithErrorHandling = useCallback(
    async (
      taskId: number,
      aiConfig: AIConfig,
      templateType: DocumentTemplateType,
      onSuccess: (response: GenerateDocumentResponse) => void,
      onError: (error: string) => void
    ) => {
      try {
        const response = await generateDocument(taskId, aiConfig, templateType);
        message.success(`文档生成成功 (${response.word_count}字, 耗时${response.generation_time_ms}ms)`);
        onSuccess(response);
      } catch (error: any) {
        const errorMessage = error.message || 'AI生成失败';
        message.error(errorMessage);
        onError(errorMessage);
      }
    },
    [generateDocument]
  );

  return {
    generateDocument,
    generateWithErrorHandling,
  };
};
