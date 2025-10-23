import { useCallback, useState } from 'react';
import { message } from 'antd';
import { useDocumentContext } from '../contexts/DocumentContext';
import { Document } from '../types/document';
import { errorLogger } from '../utils/ErrorLogger';

/**
 * 增强的文档操作 Hook
 * 
 * 提供常用的文档操作方法，包括：
 * - 文档状态管理
 * - 批量操作
 * - 文件上传/下载
 * - 版本控制
 * - 智能分类
 */
export const useDocumentOperations = () => {
  const { state, actions } = useDocumentContext();
  const [operationLoading, setOperationLoading] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // 设置操作加载状态
  const setLoading = useCallback((operation: string, loading: boolean) => {
    setOperationLoading(prev => ({ ...prev, [operation]: loading }));
  }, []);

  // 设置上传进度
  const setProgress = useCallback((fileId: string, progress: number) => {
    setUploadProgress(prev => ({ ...prev, [fileId]: progress }));
  }, []);

  // 发布文档
  const publishDocument = useCallback(async (documentId: number) => {
    setLoading(`publish-${documentId}`, true);
    
    try {
      await actions.updateDocument(documentId, { status: 'published' });
      message.success('文档已发布');
      
      errorLogger.info('document', 'useDocumentOperations: 文档发布成功', {
        documentId
      });
    } catch (error) {
      message.error('文档发布失败');
    } finally {
      setLoading(`publish-${documentId}`, false);
    }
  }, [actions, setLoading]);

  // 保存为草稿
  const saveDraft = useCallback(async (documentId: number) => {
    setLoading(`draft-${documentId}`, true);
    
    try {
      await actions.updateDocument(documentId, { status: 'draft' });
      message.success('已保存为草稿');
      
      errorLogger.info('document', 'useDocumentOperations: 保存草稿成功', {
        documentId
      });
    } catch (error) {
      message.error('保存草稿失败');
    } finally {
      setLoading(`draft-${documentId}`, false);
    }
  }, [actions, setLoading]);

  // 归档文档
  const archiveDocument = useCallback(async (documentId: number) => {
    setLoading(`archive-${documentId}`, true);
    
    try {
      await actions.updateDocument(documentId, { status: 'archived' });
      message.success('文档已归档');
      
      errorLogger.info('document', 'useDocumentOperations: 文档归档成功', {
        documentId
      });
    } catch (error) {
      message.error('文档归档失败');
    } finally {
      setLoading(`archive-${documentId}`, false);
    }
  }, [actions, setLoading]);

  // 复制文档
  const duplicateDocument = useCallback(async (documentId: number, modifications?: Partial<Document>) => {
    const document = state.documents.find(d => d.id === documentId);
    if (!document) return;

    setLoading(`duplicate-${documentId}`, true);
    
    try {
      const newDocumentData = {
        title: `${document.title} (副本)`,
        content: document.content,
        type: document.type,
        visibility: document.visibility,
        project_id: document.project_id,
        task_id: document.task_id,
        status: 'draft',
        ...modifications
      };

      const newDocument = await actions.createDocument(newDocumentData);
      message.success(`文档已复制: ${newDocument.title}`);
      
      errorLogger.info('document', 'useDocumentOperations: 文档复制成功', {
        originalDocumentId: documentId,
        newDocumentId: newDocument.id
      });
      
      return newDocument;
    } catch (error) {
      message.error('文档复制失败');
    } finally {
      setLoading(`duplicate-${documentId}`, false);
    }
  }, [state.documents, actions, setLoading]);

  // 移动文档到其他项目
  const moveDocumentToProject = useCallback(async (documentId: number, projectId: number) => {
    setLoading(`move-${documentId}`, true);
    
    try {
      await actions.updateDocument(documentId, { project_id: projectId });
      message.success('文档已移动到新项目');
      
      errorLogger.info('document', 'useDocumentOperations: 文档移动成功', {
        documentId,
        projectId
      });
    } catch (error) {
      message.error('文档移动失败');
    } finally {
      setLoading(`move-${documentId}`, false);
    }
  }, [actions, setLoading]);

  // 关联文档到任务
  const linkDocumentToTask = useCallback(async (documentId: number, taskId: number | null) => {
    setLoading(`link-${documentId}`, true);
    
    try {
      await actions.updateDocument(documentId, { task_id: taskId });
      message.success(taskId ? '文档已关联到任务' : '文档任务关联已移除');
      
      errorLogger.info('document', 'useDocumentOperations: 文档任务关联成功', {
        documentId,
        taskId
      });
    } catch (error) {
      message.error('文档关联失败');
    } finally {
      setLoading(`link-${documentId}`, false);
    }
  }, [actions, setLoading]);

  // 设置文档可见性
  const setDocumentVisibility = useCallback(async (documentId: number, visibility: string) => {
    setLoading(`visibility-${documentId}`, true);
    
    try {
      await actions.updateDocument(documentId, { visibility });
      message.success(`文档可见性已设置为: ${visibility}`);
      
      errorLogger.info('document', 'useDocumentOperations: 可见性设置成功', {
        documentId,
        visibility
      });
    } catch (error) {
      message.error('可见性设置失败');
    } finally {
      setLoading(`visibility-${documentId}`, false);
    }
  }, [actions, setLoading]);

  // 批量状态更新
  const batchUpdateStatus = useCallback(async (documentIds: number[], status: string) => {
    setLoading('batch-status', true);
    
    try {
      await Promise.all(
        documentIds.map(id => actions.updateDocument(id, { status }))
      );
      message.success(`已将 ${documentIds.length} 个文档状态更新为: ${status}`);
      
      errorLogger.info('document', 'useDocumentOperations: 批量状态更新成功', {
        documentIds,
        status,
        count: documentIds.length
      });
    } catch (error) {
      message.error('批量状态更新失败');
    } finally {
      setLoading('batch-status', false);
    }
  }, [actions, setLoading]);

  // 批量可见性更新
  const batchUpdateVisibility = useCallback(async (documentIds: number[], visibility: string) => {
    setLoading('batch-visibility', true);
    
    try {
      await Promise.all(
        documentIds.map(id => actions.updateDocument(id, { visibility }))
      );
      message.success(`已将 ${documentIds.length} 个文档可见性设置为: ${visibility}`);
      
      errorLogger.info('document', 'useDocumentOperations: 批量可见性更新成功', {
        documentIds,
        visibility,
        count: documentIds.length
      });
    } catch (error) {
      message.error('批量可见性更新失败');
    } finally {
      setLoading('batch-visibility', false);
    }
  }, [actions, setLoading]);

  // 批量删除
  const batchDeleteDocuments = useCallback(async (documentIds: number[]) => {
    setLoading('batch-delete', true);
    
    try {
      await Promise.all(documentIds.map(id => actions.deleteDocument(id)));
      message.success(`已删除 ${documentIds.length} 个文档`);
      
      errorLogger.info('document', 'useDocumentOperations: 批量删除成功', {
        documentIds,
        count: documentIds.length
      });
    } catch (error) {
      message.error('批量删除失败');
    } finally {
      setLoading('batch-delete', false);
    }
  }, [actions, setLoading]);

  // 添加文档标签
  const addDocumentTag = useCallback(async (documentId: number, tag: string) => {
    const document = state.documents.find(d => d.id === documentId);
    if (!document) return;

    const currentTags = document.tags || [];
    if (currentTags.includes(tag)) {
      message.warning('标签已存在');
      return;
    }

    setLoading(`tag-${documentId}`, true);
    
    try {
      const newTags = [...currentTags, tag];
      await actions.updateDocument(documentId, { tags: newTags });
      message.success(`已添加标签: ${tag}`);
      
      errorLogger.info('document', 'useDocumentOperations: 标签添加成功', {
        documentId,
        tag
      });
    } catch (error) {
      message.error('标签添加失败');
    } finally {
      setLoading(`tag-${documentId}`, false);
    }
  }, [state.documents, actions, setLoading]);

  // 移除文档标签
  const removeDocumentTag = useCallback(async (documentId: number, tag: string) => {
    const document = state.documents.find(d => d.id === documentId);
    if (!document) return;

    const currentTags = document.tags || [];
    const newTags = currentTags.filter(t => t !== tag);

    setLoading(`tag-${documentId}`, true);
    
    try {
      await actions.updateDocument(documentId, { tags: newTags });
      message.success(`已移除标签: ${tag}`);
      
      errorLogger.info('document', 'useDocumentOperations: 标签移除成功', {
        documentId,
        tag
      });
    } catch (error) {
      message.error('标签移除失败');
    } finally {
      setLoading(`tag-${documentId}`, false);
    }
  }, [state.documents, actions, setLoading]);

  // 生成文档摘要
  const generateDocumentSummary = useCallback(async (documentId: number) => {
    const document = state.documents.find(d => d.id === documentId);
    if (!document || !document.content) return;

    setLoading(`summary-${documentId}`, true);
    
    try {
      // 简单的摘要生成逻辑（实际项目中可能会调用AI服务）
      const content = document.content;
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
      const summary = sentences.slice(0, 3).join('. ') + (sentences.length > 3 ? '...' : '');
      
      await actions.updateDocument(documentId, { 
        description: summary || '暂无摘要'
      });
      
      message.success('文档摘要已生成');
      
      errorLogger.info('document', 'useDocumentOperations: 摘要生成成功', {
        documentId,
        summaryLength: summary.length
      });
    } catch (error) {
      message.error('摘要生成失败');
    } finally {
      setLoading(`summary-${documentId}`, false);
    }
  }, [state.documents, actions, setLoading]);

  // 获取文档智能推荐
  const getDocumentRecommendations = useCallback((documentId: number) => {
    const document = state.documents.find(d => d.id === documentId);
    if (!document) return [];

    const recommendations = [];

    // 基于状态的推荐
    if (document.status === 'draft') {
      recommendations.push({
        type: 'publish',
        title: '发布文档',
        description: '文档内容完整，建议发布',
        priority: 'high'
      });
    }

    // 基于内容的推荐
    if (!document.description || document.description.length < 20) {
      recommendations.push({
        type: 'description',
        title: '添加描述',
        description: '为文档添加详细描述',
        priority: 'medium'
      });
    }

    // 基于标签的推荐
    if (!document.tags || document.tags.length === 0) {
      recommendations.push({
        type: 'tags',
        title: '添加标签',
        description: '为文档添加相关标签便于分类',
        priority: 'medium'
      });
    }

    // 基于关联的推荐
    if (!document.task_id) {
      recommendations.push({
        type: 'link',
        title: '关联任务',
        description: '将文档关联到相关任务',
        priority: 'medium'
      });
    }

    // 基于可见性的推荐
    if (document.visibility === 'private' && document.status === 'published') {
      recommendations.push({
        type: 'visibility',
        title: '调整可见性',
        description: '已发布文档建议设置为团队或公开可见',
        priority: 'low'
      });
    }

    return recommendations;
  }, [state.documents]);

  // 智能分类建议
  const suggestDocumentCategory = useCallback((documentId: number) => {
    const document = state.documents.find(d => d.id === documentId);
    if (!document) return null;

    const content = document.content?.toLowerCase() || '';
    const title = document.title.toLowerCase();

    // 基于关键词的简单分类
    if (content.includes('api') || content.includes('接口') || title.includes('api')) {
      return '技术文档';
    }
    if (content.includes('会议') || content.includes('meeting') || title.includes('会议')) {
      return '会议记录';
    }
    if (content.includes('需求') || content.includes('requirement') || title.includes('需求')) {
      return '需求文档';
    }
    if (content.includes('设计') || content.includes('design') || title.includes('设计')) {
      return '设计文档';
    }
    if (content.includes('测试') || content.includes('test') || title.includes('测试')) {
      return '测试文档';
    }

    return '常规文档';
  }, [state.documents]);

  return {
    // 基本操作
    publishDocument,
    saveDraft,
    archiveDocument,
    duplicateDocument,
    moveDocumentToProject,
    linkDocumentToTask,
    setDocumentVisibility,
    
    // 标签操作
    addDocumentTag,
    removeDocumentTag,
    
    // 批量操作
    batchUpdateStatus,
    batchUpdateVisibility,
    batchDeleteDocuments,
    
    // 智能功能
    generateDocumentSummary,
    getDocumentRecommendations,
    suggestDocumentCategory,
    
    // 状态管理
    operationLoading,
    uploadProgress,
    isLoading: (operation: string) => operationLoading[operation] || false,
    getUploadProgress: (fileId: string) => uploadProgress[fileId] || 0
  };
};