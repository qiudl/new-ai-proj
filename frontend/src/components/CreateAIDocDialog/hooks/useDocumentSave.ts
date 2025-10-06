import { useCallback } from 'react';
import { message } from 'antd';
import aiDocumentService from '../../../services/aiDocumentService';
import { API_TIMEOUT } from '../constants';

/**
 * 保存参数
 */
export interface SaveDocumentParams {
  taskId: number;
  title: string;
  content: string;
  projectId?: number;
}

/**
 * 文档保存Hook
 */
export const useDocumentSave = () => {
  /**
   * 保存文档
   */
  const saveDocument = useCallback(
    async (params: SaveDocumentParams): Promise<number> => {
      try {
        const response = await aiDocumentService.saveDocument({
          task_id: params.taskId,
          title: params.title,
          content: params.content,
          project_id: params.projectId,
        });

        return response.document_id;
      } catch (error: any) {
        console.error('保存文档失败:', error);

        if (error.code === 'ECONNABORTED') {
          throw new Error('保存超时，请稍后重试');
        }

        throw new Error(error.message || '保存文档时发生未知错误');
      }
    },
    []
  );

  /**
   * 带错误处理的保存函数
   */
  const saveWithErrorHandling = useCallback(
    async (
      params: SaveDocumentParams,
      onSuccess: (documentId: number) => void,
      onError: (error: string) => void
    ) => {
      try {
        const documentId = await saveDocument(params);
        message.success('文档保存成功');
        onSuccess(documentId);
      } catch (error: any) {
        const errorMessage = error.message || '文档保存失败';
        message.error(errorMessage);
        onError(errorMessage);
      }
    },
    [saveDocument]
  );

  return {
    saveDocument,
    saveWithErrorHandling,
  };
};
