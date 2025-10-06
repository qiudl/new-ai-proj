import { useCallback } from 'react';
import { message } from 'antd';
import api from '../../../services/api';
import { API_TIMEOUT } from '../constants';

/**
 * 文档保存Hook
 */
export const useDocumentSave = () => {
  /**
   * 保存文档 (更新已生成的文档内容)
   */
  const saveDocument = useCallback(
    async (documentId: number, content: string): Promise<void> => {
      try {
        const response = await api.put<{
          success: boolean;
          message: string;
        }>(
          `/documents/${documentId}`,
          {
            content,
          },
          {
            timeout: API_TIMEOUT.save,
          }
        );

        if (!response.data.success) {
          throw new Error(response.data.message || '文档保存失败');
        }
      } catch (error: any) {
        console.error('保存文档失败:', error);

        if (error.code === 'ECONNABORTED') {
          throw new Error('保存超时，请稍后重试');
        }

        if (error.response?.data?.message) {
          throw new Error(error.response.data.message);
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
      documentId: number,
      content: string,
      onSuccess: () => void,
      onError: (error: string) => void
    ) => {
      try {
        await saveDocument(documentId, content);
        message.success('文档保存成功');
        onSuccess();
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
