import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import { documentService } from '../services/unifiedDocumentService';
import {
  performanceMonitor,
  useOptimizedMemo,
  useOptimizedCallback,
  useMemoryMonitor,
  useDebouncedCallback
} from '../utils/performanceOptimization';
import {
  NetworkErrorHandler,
  ProgressFeedback,
  SuccessFeedback,
  safeAsyncOperation
} from '../utils/errorTypes';

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
  
  // Performance monitoring
  useMemoryMonitor('useTaskDocuments');
  const lastLoadTime = useRef<number>(0);
  const uploadQueue = useRef<File[]>([]);

  // Optimized load documents with performance tracking
  const loadDocuments = useOptimizedCallback(async () => {
    // Prevent frequent reloads
    const now = Date.now();
    if (now - lastLoadTime.current < 1000) {
      return; // Debounce rapid calls
    }
    lastLoadTime.current = now;
    
    setLoading(true);
    setError(null);
    
    try {
      const stopTimer = performanceMonitor.startTimer('load_documents');
      const response: DocumentListResponse = await documentService.getTaskDocuments(projectId, taskId);
      setDocuments(response.documents);
      stopTimer();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load documents';
      setError(errorMessage);
      NetworkErrorHandler.handleError(err, 'Failed to load documents', {
        componentName: 'useTaskDocuments',
        showDetailed: true
      });
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

  // Optimized upload single document with enhanced progress tracking
  const uploadDocument = useOptimizedCallback(async (
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<UploadedDocumentInfo> => {
    setUploading(true);
    setError(null);

    try {
      const stopTimer = performanceMonitor.startTimer('upload_document');
      
      // Enhanced progress tracking with smoother updates
      const smoothProgress = (progress: number, loaded: number, total: number) => {
        // Smooth progress updates to prevent UI jank
        requestAnimationFrame(() => {
          onProgress?.(progress);
        });
      };
      
      const result = await documentService.uploadDocument(
        projectId,
        taskId,
        file,
        smoothProgress
      );

      stopTimer();
      
      // Optimized refresh - only if successful
      await loadDocuments();
      SuccessFeedback.show(
        `文件 "${file.name}" 上传成功`,
        {
          showStats: true,
          context: {
            fileSize: file.size,
            duration: Date.now()
          }
        }
      );
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      NetworkErrorHandler.handleError(err, 'Upload failed', {
        componentName: 'useTaskDocuments',
        showDetailed: true
      });
      throw err;
    } finally {
      setUploading(false);
    }
  }, [projectId, taskId, loadDocuments]);

  // Optimized multiple documents upload with enhanced progress and error recovery
  const uploadMultipleDocuments = useOptimizedCallback(async (
    files: File[],
    onProgress?: (fileIndex: number, progress: number) => void
  ): Promise<UploadedDocumentInfo[]> => {
    setUploading(true);
    setUploadProgress([]);
    setError(null);
    
    // Initialize progress tracking for all files
    const initialProgress = files.map((_, index) => ({
      fileIndex: index,
      progress: 0,
      loaded: 0,
      total: 0
    }));
    setUploadProgress(initialProgress);

    try {
      const stopTimer = performanceMonitor.startTimer('upload_multiple_documents');
      
      const results = await documentService.uploadMultipleDocuments(
        projectId,
        taskId,
        files,
        (fileIndex: number, progress: number) => {
          // Optimized progress update with RAF for smooth UI
          requestAnimationFrame(() => {
            setUploadProgress(prev => {
              const newProgress = [...prev];
              if (newProgress[fileIndex]) {
                newProgress[fileIndex] = {
                  ...newProgress[fileIndex],
                  progress
                };
              }
              return newProgress;
            });
            onProgress?.(fileIndex, progress);
          });
        }
      );

      stopTimer();
      
      // Optimized refresh
      await loadDocuments();
      
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      SuccessFeedback.show(
        `成功上传 ${results.length} 个文件`,
        {
          type: 'notification',
          showStats: true,
          context: {
            fileCount: results.length,
            totalSize,
            duration: Date.now()
          }
        }
      );
      
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Batch upload failed';
      setError(errorMessage);
      NetworkErrorHandler.handleError(err, 'Batch upload failed', {
        componentName: 'useTaskDocuments',
        showDetailed: true
      });
      throw err;
    } finally {
      setUploading(false);
      setUploadProgress([]);
    }
  }, [projectId, taskId, loadDocuments]);

  // Optimized API upload with enhanced validation and monitoring
  const uploadDocumentAPI = useOptimizedCallback(async (
    fileName: string,
    content: string,
    mimeType?: string,
    description?: string
  ): Promise<UploadedDocumentInfo> => {
    setUploading(true);
    setError(null);

    try {
      const stopTimer = performanceMonitor.startTimer('upload_document_api');
      
      const result = await documentService.uploadDocumentAPI(
        projectId,
        taskId,
        fileName,
        content,
        mimeType,
        description
      );

      stopTimer();
      
      // Smart refresh only if needed
      await loadDocuments();
      SuccessFeedback.show(
        `文件 "${fileName}" 通过API上传成功`,
        {
          showStats: true,
          context: {
            contentSize: content.length,
            duration: Date.now()
          }
        }
      );
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'API upload failed';
      setError(errorMessage);
      NetworkErrorHandler.handleError(err, 'API upload failed', {
        componentName: 'useTaskDocuments',
        showDetailed: true
      });
      throw err;
    } finally {
      setUploading(false);
    }
  }, [projectId, taskId, loadDocuments]);

  // Optimized markdown download with progress tracking
  const downloadMarkdown = useOptimizedCallback(async () => {
    try {
      const stopTimer = performanceMonitor.startTimer('download_markdown');
      
      const blob = await documentService.downloadTaskMarkdown(projectId, taskId);
      const fileName = `task-${taskId}-${new Date().toISOString().split('T')[0]}.md`;
      documentService.triggerDownload(blob, fileName);
      
      stopTimer();
      SuccessFeedback.show(
        `Markdown 文件下载成功`,
        {
          showStats: true,
          context: {
            fileSize: blob.size
          }
        }
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      NetworkErrorHandler.handleError(err, 'Markdown download failed', {
        componentName: 'useTaskDocuments',
        showDetailed: false
      });
      throw err;
    }
  }, [projectId, taskId]);

  // Optimized PDF download with progress tracking
  const downloadPDF = useOptimizedCallback(async () => {
    try {
      const stopTimer = performanceMonitor.startTimer('download_pdf');
      
      const blob = await documentService.downloadTaskPDF(projectId, taskId);
      const fileName = `task-${taskId}-${new Date().toISOString().split('T')[0]}.pdf`;
      documentService.triggerDownload(blob, fileName);
      
      stopTimer();
      SuccessFeedback.show(
        `PDF 文件下载成功`,
        {
          showStats: true,
          context: {
            fileSize: blob.size
          }
        }
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      NetworkErrorHandler.handleError(err, 'PDF download failed', {
        componentName: 'useTaskDocuments',
        showDetailed: false
      });
      throw err;
    }
  }, [projectId, taskId]);

  // Delete document (placeholder - implement when backend supports it)
  const deleteDocument = useCallback(async (documentId: number) => {
    try {
      // TODO: Implement delete API call when backend supports it
      // await documentService.deleteDocument(documentId);

      // For now, just refresh the list
      await loadDocuments();
      message.success('文档删除成功');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed';
      message.error(errorMessage);
      throw err;
    }
  }, [loadDocuments]);

  // Debounced refresh to prevent excessive API calls
  const refreshDocuments = useDebouncedCallback(
    () => {
      loadDocuments();
    },
    300, // 300ms debounce
    [loadDocuments]
  );

  // Optimized utility functions with memoization
  const getTotalSize = useOptimizedMemo(
    () => documents.reduce((total, doc) => total + doc.file_size, 0),
    [documents],
    'totalSize'
  );

  const getDocumentsByType = useOptimizedCallback((mimeType: string) => {
    return documents.filter(doc => doc.mime_type === mimeType);
  }, [documents], 'documentsByType');

  const getDocumentStats = useOptimizedMemo(() => {
    const stats = {
      total: documents.length,
      totalSize: getTotalSize,
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
  }, [documents, getTotalSize], 'documentStats');

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
    
    // Utilities - now optimized
    getTotalSize: () => getTotalSize,
    getDocumentsByType,
    getDocumentStats: () => getDocumentStats
  };
};

export default useTaskDocuments;