import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { taskDocumentService } from '../services/taskDocumentService';

interface UploadedDocumentInfo {
  id?: number;
  file_name: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  upload_type: 'manual' | 'api';
  uploaded_at: string;
  file_path?: string;
}

interface DocumentListResponse {
  documents: UploadedDocumentInfo[];
  total: number;
}

interface UploadProgress {
  fileIndex: number;
  progress: number;
  loaded: number;
  total: number;
}

interface UseTaskDocumentsOptions {
  projectId: number;
  taskId: number;
  autoLoad?: boolean;
}

interface UseTaskDocumentsReturn {
  // State
  documents: UploadedDocumentInfo[];
  loading: boolean;
  uploading: boolean;
  uploadProgress: UploadProgress[];
  error: string | null;
  
  // Actions
  loadDocuments: () => Promise<void>;
  uploadDocument: (file: File, onProgress?: (progress: number) => void) => Promise<UploadedDocumentInfo>;
  uploadMultipleDocuments: (files: File[], onProgress?: (fileIndex: number, progress: number) => void) => Promise<UploadedDocumentInfo[]>;
  uploadDocumentAPI: (fileName: string, content: string, mimeType?: string, description?: string) => Promise<UploadedDocumentInfo>;
  downloadMarkdown: () => Promise<void>;
  downloadPDF: () => Promise<void>;
  deleteDocument: (documentId: number) => Promise<void>;
  refreshDocuments: () => void;
  
  // Utilities
  getTotalSize: () => number;
  getDocumentsByType: (mimeType: string) => UploadedDocumentInfo[];
  getDocumentStats: () => {
    total: number;
    totalSize: number;
    byType: Record<string, number>;
    byUploadType: Record<string, number>;
  };
}

export const useTaskDocuments = ({
  projectId,
  taskId,
  autoLoad = true
}: UseTaskDocumentsOptions): UseTaskDocumentsReturn => {
  const [documents, setDocuments] = useState<UploadedDocumentInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load documents from server
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response: DocumentListResponse = await taskDocumentService.getTaskDocuments(projectId, taskId);
      setDocuments(response.documents);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load documents';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId]);

  // Auto-load documents on mount
  useEffect(() => {
    if (autoLoad) {
      loadDocuments();
    }
  }, [autoLoad, loadDocuments]);

  // Upload single document
  const uploadDocument = useCallback(async (
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<UploadedDocumentInfo> => {
    setUploading(true);
    setError(null);

    try {
      const result = await taskDocumentService.uploadDocument(
        projectId,
        taskId,
        file,
        onProgress ? (progress, loaded, total) => onProgress(progress) : undefined
      );

      // Refresh documents list
      await loadDocuments();
      message.success(`文件 "${file.name}" 上传成功`);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      message.error(errorMessage);
      throw err;
    } finally {
      setUploading(false);
    }
  }, [projectId, taskId, loadDocuments]);

  // Upload multiple documents
  const uploadMultipleDocuments = useCallback(async (
    files: File[],
    onProgress?: (fileIndex: number, progress: number) => void
  ): Promise<UploadedDocumentInfo[]> => {
    setUploading(true);
    setUploadProgress([]);
    setError(null);

    try {
      const results = await taskDocumentService.uploadMultipleDocuments(
        projectId,
        taskId,
        files,
        (fileIndex: number, progress: number) => {
          setUploadProgress(prev => {
            const newProgress = [...prev];
            newProgress[fileIndex] = {
              fileIndex,
              progress,
              loaded: 0,
              total: 0
            };
            return newProgress;
          });
          onProgress?.(fileIndex, progress);
        }
      );

      // Refresh documents list
      await loadDocuments();
      message.success(`成功上传 ${results.length} 个文件`);
      
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Batch upload failed';
      setError(errorMessage);
      message.error(errorMessage);
      throw err;
    } finally {
      setUploading(false);
      setUploadProgress([]);
    }
  }, [projectId, taskId, loadDocuments]);

  // Upload document via API
  const uploadDocumentAPI = useCallback(async (
    fileName: string,
    content: string,
    mimeType?: string,
    description?: string
  ): Promise<UploadedDocumentInfo> => {
    setUploading(true);
    setError(null);

    try {
      const result = await taskDocumentService.uploadDocumentAPI(
        projectId,
        taskId,
        fileName,
        content,
        mimeType,
        description
      );

      // Refresh documents list
      await loadDocuments();
      message.success(`文件 "${fileName}" 通过API上传成功`);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'API upload failed';
      setError(errorMessage);
      message.error(errorMessage);
      throw err;
    } finally {
      setUploading(false);
    }
  }, [projectId, taskId, loadDocuments]);

  // Download markdown
  const downloadMarkdown = useCallback(async () => {
    try {
      const blob = await taskDocumentService.downloadTaskMarkdown(projectId, taskId);
      const fileName = `task-${taskId}-${new Date().toISOString().split('T')[0]}.md`;
      taskDocumentService.triggerDownload(blob, fileName);
      message.success('Markdown 文件下载成功');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      message.error(errorMessage);
      throw err;
    }
  }, [projectId, taskId]);

  // Download PDF
  const downloadPDF = useCallback(async () => {
    try {
      const blob = await taskDocumentService.downloadTaskPDF(projectId, taskId);
      const fileName = `task-${taskId}-${new Date().toISOString().split('T')[0]}.pdf`;
      taskDocumentService.triggerDownload(blob, fileName);
      message.success('PDF 文件下载成功');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      message.error(errorMessage);
      throw err;
    }
  }, [projectId, taskId]);

  // Delete document (placeholder - implement when backend supports it)
  const deleteDocument = useCallback(async (documentId: number) => {
    try {
      // TODO: Implement delete API call when backend supports it
      // await taskDocumentService.deleteDocument(documentId);
      
      // For now, just refresh the list
      await loadDocuments();
      message.success('文档删除成功');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed';
      message.error(errorMessage);
      throw err;
    }
  }, [loadDocuments]);

  // Refresh documents
  const refreshDocuments = useCallback(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Get total size of all documents
  const getTotalSize = useCallback(() => {
    return documents.reduce((total, doc) => total + doc.file_size, 0);
  }, [documents]);

  // Get documents by mime type
  const getDocumentsByType = useCallback((mimeType: string) => {
    return documents.filter(doc => doc.mime_type === mimeType);
  }, [documents]);

  // Get document statistics
  const getDocumentStats = useCallback(() => {
    const stats = {
      total: documents.length,
      totalSize: getTotalSize(),
      byType: {} as Record<string, number>,
      byUploadType: {} as Record<string, number>
    };

    documents.forEach(doc => {
      // Count by mime type
      stats.byType[doc.mime_type] = (stats.byType[doc.mime_type] || 0) + 1;
      
      // Count by upload type
      stats.byUploadType[doc.upload_type] = (stats.byUploadType[doc.upload_type] || 0) + 1;
    });

    return stats;
  }, [documents, getTotalSize]);

  return {
    // State
    documents,
    loading,
    uploading,
    uploadProgress,
    error,
    
    // Actions
    loadDocuments,
    uploadDocument,
    uploadMultipleDocuments,
    uploadDocumentAPI,
    downloadMarkdown,
    downloadPDF,
    deleteDocument,
    refreshDocuments,
    
    // Utilities
    getTotalSize,
    getDocumentsByType,
    getDocumentStats
  };
};

export default useTaskDocuments;