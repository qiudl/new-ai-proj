import { useCallback } from 'react';
import { message } from 'antd';
import aiDocumentService, {
  DocumentType,
  DocumentGenOptions,
  GenerateDocumentResponse as ServiceResponse,
} from '../../../services/aiDocumentService';
import { GenerateDocumentResponse, AIConfig, DocumentTemplateType } from '../types';
import { API_TIMEOUT } from '../constants';

/**
 * 模板类型到文档类型的映射
 */
const templateToDocType: Record<DocumentTemplateType, DocumentType> = {
  technical_design: 'design',
  bug_report: 'design',
  feature_spec: 'requirements',
  user_story: 'requirements',
  test_plan: 'test_plan',
  api_documentation: 'api_doc',
  project_plan: 'design',
  meeting_notes: 'design',
};

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
        // 映射模板类型到文档类型
        const documentType = templateToDocType[templateType] || 'design';

        // 构建请求
        const response = await aiDocumentService.generateDocument({
          task_id: taskId,
          model: aiConfig.model,
          document_type: documentType,
          options: {
            include_subtasks: true,
            include_code_examples: false,
            language: 'zh',
          },
        });

        // 转换响应格式以匹配前端类型
        const adaptedResponse: GenerateDocumentResponse = {
          content: response.document.content,
          document_id: 0, // 将在保存时获取
          generation_time_ms: 0, // 后端未返回此字段，可选添加
          ai_model: response.model_used,
          word_count: response.document.metadata.word_count,
        };

        return adaptedResponse;
      } catch (error: any) {
        console.error('AI生成文档失败:', error);

        // 处理不同类型的错误
        if (error.code === 'ECONNABORTED') {
          throw new Error('AI生成超时，请稍后重试');
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
        message.success(`文档生成成功 (${response.word_count}字)`);
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
