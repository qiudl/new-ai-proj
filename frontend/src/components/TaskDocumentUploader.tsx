import React, { useState, useCallback } from 'react';
import {
  Upload,
  Button,
  Progress,
  Alert,
  Typography,
  Space,
  List,
  Card,
  Tag,
  message,
  Modal,
  Input,
  Divider,
  Popconfirm,
  Tooltip,
  Image
} from 'antd';
import {
  InboxOutlined,
  CloudUploadOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileMarkdownOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd/es/upload';
import { documentService as taskDocumentService } from '../services/unifiedDocumentService';

const { Text, Title } = Typography;
const { Dragger } = Upload;
const { TextArea } = Input;

interface TaskDocumentUploaderProps {
  projectId: number;
  taskId: number;
  onUploadSuccess?: () => void;
  onUploadError?: (error: string) => void;
}

interface UploadProgress {
  fileIndex: number;
  fileName: string;
  progress: number;
  loaded: number;
  total: number;
  speed?: number; // 上传速度 (bytes/second)
  eta?: number; // 预计剩余时间 (seconds)
  status: 'uploading' | 'success' | 'error' | 'paused';
  error?: string;
}

interface UploadedDocumentInfo {
  id?: number;
  file_name: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  upload_type: 'manual' | 'api';
  uploaded_at: string;
  file_path?: string;
  content?: string; // 用于预览
}

const TaskDocumentUploader: React.FC<TaskDocumentUploaderProps> = ({
  projectId,
  taskId,
  onUploadSuccess,
  onUploadError
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocumentInfo[]>([]);
  const [apiUploadVisible, setApiUploadVisible] = useState(false);
  const [apiFileName, setApiFileName] = useState('');
  const [apiContent, setApiContent] = useState('');
  const [apiUploading, setApiUploading] = useState(false);
  
  // 预览相关状态
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleteConfirmLoading, setDeleteConfirmLoading] = useState<Record<number, boolean>>({});
  
  // 上传统计
  const [uploadStats, setUploadStats] = useState({
    totalFiles: 0,
    completedFiles: 0,
    totalBytes: 0,
    uploadedBytes: 0,
    startTime: 0,
    averageSpeed: 0,
  });

  // Load existing documents
  const loadDocuments = useCallback(async () => {
    try {
      // getTaskDocuments returns array directly, not { documents: [] }
      const documents = await taskDocumentService.getTaskDocuments(projectId, taskId);
      setUploadedDocuments(documents || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
      setUploadedDocuments([]); // Set empty array on error
    }
  }, [projectId, taskId]);

  React.useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Handle file selection
  const handleChange: UploadProps['onChange'] = (info) => {
    setFileList(info.fileList);
  };

  // Validate file before adding to list
  const beforeUpload = (file: File) => {
    const allowedTypes = ['text/markdown', 'application/pdf', 'text/plain'];
    const allowedExtensions = ['.md', '.pdf', '.txt'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    // Check file size
    if (file.size > maxSize) {
      message.error({
        content: `文件 "${file.name}" 大小超过限制（${taskDocumentService.formatFileSize(file.size)} > 10MB）`,
        duration: 5,
      });
      return Upload.LIST_IGNORE;
    }

    // Check if file is empty
    if (file.size === 0) {
      message.warning({
        content: `文件 "${file.name}" 为空文件，无法上传`,
        duration: 3,
      });
      return Upload.LIST_IGNORE;
    }

    // Check file extension
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(extension)) {
      message.error({
        content: `文件 "${file.name}" 格式不支持，仅支持: ${allowedExtensions.join(', ')}`,
        duration: 5,
      });
      return Upload.LIST_IGNORE;
    }

    // Check for duplicate file names
    const isDuplicate = fileList.some(existingFile => 
      existingFile.name === file.name && existingFile.size === file.size
    );
    if (isDuplicate) {
      message.warning({
        content: `文件 "${file.name}" 已在上传列表中`,
        duration: 3,
      });
      return Upload.LIST_IGNORE;
    }

    // Check for suspicious file names
    const suspiciousPatterns = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js'];
    const hasSuspiciousContent = suspiciousPatterns.some(pattern => 
      file.name.toLowerCase().includes(pattern)
    );
    if (hasSuspiciousContent) {
      message.error({
        content: `文件 "${file.name}" 包含可疑内容，不允许上传`,
        duration: 5,
      });
      return Upload.LIST_IGNORE;
    }

    return false; // Prevent auto upload
  };

  // Handle manual upload
  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning({
        content: '请先选择要上传的文件',
        duration: 3,
      });
      return;
    }

    // 最终验证所有文件
    const validFiles = fileList.filter(file => file.originFileObj);
    if (validFiles.length === 0) {
      message.error({
        content: '没有有效的文件可以上传',
        duration: 3,
      });
      return;
    }

    setUploading(true);
    setUploadProgress([]);
    let successCount = 0;
    let errorCount = 0;
    const errorDetails: string[] = [];

    // 初始化上传统计
    const totalBytes = validFiles.reduce((sum, file) => sum + (file.originFileObj?.size || 0), 0);
    setUploadStats({
      totalFiles: validFiles.length,
      completedFiles: 0,
      totalBytes,
      uploadedBytes: 0,
      startTime: Date.now(),
      averageSpeed: 0,
    });

    // 初始化进度追踪
    const initialProgress: UploadProgress[] = validFiles.map((file, index) => ({
      fileIndex: index,
      fileName: file.name,
      progress: 0,
      loaded: 0,
      total: file.originFileObj?.size || 0,
      status: 'uploading' as const,
      speed: 0,
      eta: 0,
    }));
    setUploadProgress(initialProgress);

    try {
      // ✅ FIXED - Upload multiple files using Promise.all with uploadTaskDocument (TS2554)
      const files = validFiles.map(f => f.originFileObj as File);
      const results = await Promise.all(
        files.map((file, fileIndex) =>
          taskDocumentService.uploadTaskDocument(projectId, taskId, file, {
            onProgress: (progress: number, loaded?: number, total?: number) => {
          const currentTime = Date.now();
          
          setUploadProgress(prev => {
            const newProgress = [...prev];
            const oldProgress = newProgress[fileIndex];
            
            if (oldProgress) {
              const timeDiff = (currentTime - uploadStats.startTime) / 1000; // seconds
              const speed = loaded && timeDiff > 0 ? loaded / timeDiff : 0;
              const eta = speed > 0 && total ? (total - (loaded || 0)) / speed : 0;
              
              newProgress[fileIndex] = {
                ...oldProgress,
                progress,
                loaded: loaded || 0,
                total: total || oldProgress.total,
                speed,
                eta,
                status: progress >= 100 ? 'success' : 'uploading',
              };
            }
            
            return newProgress;
          });

          // 更新总体统计
          setUploadStats(prev => {
            const totalUploaded = prev.uploadedBytes + (loaded || 0) - (prev.uploadedBytes / prev.totalFiles * fileIndex);
            const timeDiff = (currentTime - prev.startTime) / 1000;
            const avgSpeed = timeDiff > 0 ? totalUploaded / timeDiff : 0;
            
            return {
              ...prev,
              uploadedBytes: totalUploaded,
              averageSpeed: avgSpeed,
            };
          });
            }
          })
        )
      );

      successCount = results.length;
      
      if (successCount === validFiles.length) {
        message.success({
          content: `成功上传 ${successCount} 个文件`,
          duration: 3,
        });
      } else {
        errorCount = validFiles.length - successCount;
        message.warning({
          content: `部分上传成功：${successCount} 个成功，${errorCount} 个失败`,
          duration: 5,
        });
      }

      setFileList([]);
      loadDocuments();
      onUploadSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      
      // 提取更详细的错误信息
      if (error instanceof Error && error.message.includes('网络')) {
        message.error({
          content: '网络连接失败，请检查网络后重试',
          duration: 5,
        });
      } else if (error instanceof Error && error.message.includes('权限')) {
        message.error({
          content: '上传权限不足，请联系管理员',
          duration: 5,
        });
      } else if (error instanceof Error && error.message.includes('空间')) {
        message.error({
          content: '存储空间不足，无法上传文件',
          duration: 5,
        });
      } else {
        message.error({
          content: `上传失败: ${errorMessage}`,
          duration: 5,
        });
      }
      
      onUploadError?.(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress([]);
    }
  };

  // Handle API upload
  const handleApiUpload = async () => {
    if (!apiFileName.trim() || !apiContent.trim()) {
      message.warning('请填写文件名和内容');
      return;
    }

    setApiUploading(true);

    try {
      // ✅ FIXED - Convert content to blob and upload using uploadTaskDocument (TS2554)
      const mimeType = taskDocumentService.getMimeTypeFromFileName(apiFileName);
      const blob = new Blob([apiContent], { type: mimeType });
      const file = new File([blob], apiFileName, { type: mimeType });

      await taskDocumentService.uploadTaskDocument(
        projectId,
        taskId,
        file
      );

      message.success('API上传成功');
      setApiUploadVisible(false);
      setApiFileName('');
      setApiContent('');
      loadDocuments();
      onUploadSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'API上传失败';
      message.error(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setApiUploading(false);
    }
  };

  // Handle download
  const handleDownload = async (format: 'md' | 'pdf') => {
    try {
      let blob: Blob;
      let fileName: string;

      if (format === 'md') {
        blob = await taskDocumentService.downloadTaskMarkdown(projectId, taskId);
        fileName = `task-${taskId}-${new Date().toISOString().split('T')[0]}.md`;
      } else {
        blob = await taskDocumentService.downloadTaskPDF(projectId, taskId);
        fileName = `task-${taskId}-${new Date().toISOString().split('T')[0]}.pdf`;
      }

      taskDocumentService.triggerDownload(blob, fileName);
      message.success(`${format.toUpperCase()} 文件下载成功`);
    } catch (error) {
      message.error(`下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // Handle document preview
  const handlePreview = async (doc: UploadedDocumentInfo) => {
    if (doc.mime_type === 'application/pdf') {
      message.info('PDF 文件暂不支持预览，请下载查看');
      return;
    }

    setPreviewLoading(true);
    setPreviewVisible(true);
    setPreviewTitle(doc.original_name);

    try {
      // 如果已经有内容缓存，直接使用
      if (doc.content) {
        setPreviewContent(doc.content);
        return;
      }

      // ✅ FIXED - getDocumentContent takes 1 parameter (documentId), not 3 (TS2554)
      const content = await taskDocumentService.getDocumentContent(doc.id!);
      setPreviewContent(content);
      
      // 缓存内容到文档对象中
      setUploadedDocuments(prev => 
        prev.map(d => d.id === doc.id ? { ...d, content } : d)
      );
    } catch (error) {
      message.error(`预览失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setPreviewVisible(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Handle document deletion
  const handleDelete = async (doc: UploadedDocumentInfo) => {
    if (!doc.id) {
      message.error('无法删除此文档');
      return;
    }

    setDeleteConfirmLoading(prev => ({ ...prev, [doc.id!]: true }));

    try {
      // ✅ FIXED - deleteDocument takes 1 parameter (documentId), not 3 (TS2554)
      await taskDocumentService.deleteDocument(doc.id);
      message.success('文档删除成功');
      loadDocuments(); // 重新加载文档列表
    } catch (error) {
      message.error(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setDeleteConfirmLoading(prev => ({ ...prev, [doc.id!]: false }));
    }
  };

  // Get file icon
  const getFileIcon = (mimeType: string) => {
    switch (mimeType) {
      case 'text/markdown':
        return <FileMarkdownOutlined style={{ color: '#1890ff' }} />;
      case 'application/pdf':
        return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
      case 'text/plain':
        return <FileTextOutlined style={{ color: '#52c41a' }} />;
      default:
        return <FileTextOutlined />;
    }
  };

  return (
    <div className="task-document-uploader">
      <Title level={4}>任务文档管理</Title>
      
      {/* Upload Section */}
      <Card title="文档上传" className="mb-4">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Manual Upload */}
          <div>
            <Text strong>手工上传</Text>
            <Dragger
              multiple
              fileList={fileList}
              onChange={handleChange}
              beforeUpload={beforeUpload}
              accept=".md,.pdf,.txt"
              disabled={uploading}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持单个或批量上传。仅支持 .md, .pdf, .txt 格式，单文件最大 10MB
              </p>
            </Dragger>

            {uploadProgress.length > 0 && (
              <div className="mt-2">
                {/* 总体进度 */}
                <div className="mb-3 p-3 bg-gray-50 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <Text strong>总体进度</Text>
                    <Space>
                      <Text type="secondary">
                        {uploadStats.completedFiles}/{uploadStats.totalFiles} 文件
                      </Text>
                      <Text type="secondary">
                        {taskDocumentService.formatFileSize(uploadStats.averageSpeed)}/s
                      </Text>
                    </Space>
                  </div>
                  <Progress
                    percent={Math.round((uploadStats.completedFiles / uploadStats.totalFiles) * 100)}
                    
                    status="active"
                  />
                </div>

                {/* 单个文件进度 */}
                {uploadProgress.map((progress, index) => (
                  <div key={index} className="mb-2">
                    <div className="flex justify-between items-center mb-1">
<Text className="flex-1 truncate">
                        {progress.fileName}
                      </Text>
                      <Space >
                        {progress.status === 'uploading' && progress.speed && (
<Text type="secondary">
                            {taskDocumentService.formatFileSize(progress.speed)}/s
                          </Text>
                        )}
                        {progress.status === 'uploading' && progress.eta && progress.eta > 0 && (
<Text type="secondary">
                            剩余 {Math.ceil(progress.eta)}s
                          </Text>
                        )}
                        <Text type="secondary">
                          {progress.progress}%
                        </Text>
                        {progress.status === 'success' && (
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        )}
                        {progress.status === 'error' && (
                          <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                        )}
                      </Space>
                    </div>
                    <Progress
                      percent={progress.progress}
                      
                      status={
                        progress.status === 'success' ? 'success' : 
                        progress.status === 'error' ? 'exception' : 'active'
                      }
                      showInfo={false}
                    />
                    {progress.status === 'error' && progress.error && (
<Text type="secondary" className="block mt-1">
                        {progress.error}
                      </Text>
                    )}
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>
                        {taskDocumentService.formatFileSize(progress.loaded)} / {taskDocumentService.formatFileSize(progress.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3">
              <Space>
                <Button
                  type="primary"
                  onClick={handleUpload}
                  disabled={fileList.length === 0}
                  loading={uploading}
                  icon={<CloudUploadOutlined />}
                >
                  {uploading ? '上传中...' : '开始上传'}
                </Button>
                {fileList.length > 0 && !uploading && (
                  <Button
                    onClick={() => setFileList([])}
                    icon={<DeleteOutlined />}
                  >
                    清空列表
                  </Button>
                )}
                {uploading && (
                  <Button
                    onClick={() => {
                      // TODO: 实现暂停功能
                      message.info('暂停功能开发中');
                    }}
                    icon={<LoadingOutlined />}
                  >
                    暂停上传
                  </Button>
                )}
              </Space>
              
              {/* 文件列表预览 */}
              {fileList.length > 0 && !uploading && (
                <div className="mt-3 p-3 bg-gray-50 rounded">
                  <Text strong className="block mb-2">
                    待上传文件 ({fileList.length} 个，总大小: {taskDocumentService.formatFileSize(
                      fileList.reduce((sum, file) => sum + (file.originFileObj?.size || 0), 0)
                    )})
                  </Text>
                  <div className="max-h-32 overflow-y-auto">
                    {fileList.map((file, index) => (
                      <div key={index} className="flex justify-between items-center py-1">
                        <div className="flex items-center space-x-2">
                          {getFileIcon(taskDocumentService.getMimeTypeFromFileName(file.name))}
<Text className="truncate max-w-xs">
                            {file.name}
                          </Text>
                        </div>
                        <div className="flex items-center space-x-2">
<Text type="secondary">
                            {taskDocumentService.formatFileSize(file.originFileObj?.size || 0)}
                          </Text>
                          <Button
                            type="text"
                            
                            icon={<DeleteOutlined />}
                            onClick={() => {
                              setFileList(prev => prev.filter((_, i) => i !== index));
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Divider />

          {/* API Upload */}
          <div>
            <Space>
              <Text strong>API上传</Text>
              <Button 
                onClick={() => setApiUploadVisible(true)}
                icon={<CloudUploadOutlined />}
              >
                通过API上传
              </Button>
            </Space>
          </div>

          <Divider />

          {/* Download Section */}
          <div>
            <Text strong>文档导出</Text>
            <div className="mt-2">
              <Space>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownload('md')}
                >
                  下载 Markdown
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownload('pdf')}
                >
                  下载 PDF
                </Button>
              </Space>
            </div>
          </div>
        </Space>
      </Card>

      {/* Uploaded Documents List */}
      <Card title="已上传文档" className="mb-4">
        {uploadedDocuments.length === 0 ? (
          <Alert message="暂无上传文档" type="info" showIcon />
        ) : (
          <List
            dataSource={uploadedDocuments}
            renderItem={(doc) => (
              <List.Item
                actions={[
                  <Tooltip key="preview" title="预览文档">
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      onClick={() => handlePreview(doc)}
                      disabled={doc.mime_type === 'application/pdf'}
                    >
                      预览
                    </Button>
                  </Tooltip>,
                  <Tooltip key="download" title="下载文档">
                    <Button
                      type="text"
                      icon={<DownloadOutlined />}
                      onClick={async () => {
                        if (doc.id) {
                          try {
                            // ✅ FIXED - downloadFile takes 1 parameter (documentId), returns Blob (TS2554)
                            const blob = await taskDocumentService.downloadFile(doc.id);
                            taskDocumentService.triggerDownload(blob, doc.original_name || doc.file_name);
                          } catch (error) {
                            message.error('下载失败');
                          }
                        } else {
                          message.warning('文档ID不可用');
                        }
                      }}
                    >
                      下载
                    </Button>
                  </Tooltip>,
                  <Popconfirm
                    key="delete"
                    title="确认删除"
                    description="确定要删除这个文档吗？删除后无法恢复。"
                    onConfirm={() => handleDelete(doc)}
                    okText="确定"
                    cancelText="取消"
                    okButtonProps={{ loading: deleteConfirmLoading[doc.id!] }}
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      loading={deleteConfirmLoading[doc.id!]}
                    >
                      删除
                    </Button>
                  </Popconfirm>
                ]}
              >
                <List.Item.Meta
                  avatar={getFileIcon(doc.mime_type)}
                  title={
                    <Space>
                      <Text strong>{doc.original_name}</Text>
                      <Tag color={doc.upload_type === 'manual' ? 'blue' : 'green'}>
                        {doc.upload_type === 'manual' ? '手工上传' : 'API上传'}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" >
                      <Text type="secondary">
                        大小: {taskDocumentService.formatFileSize(doc.file_size)} | 
                        类型: {doc.mime_type} | 
                        时间: {new Date(doc.uploaded_at).toLocaleString()}
                      </Text>
                      {doc.file_path && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          路径: {doc.file_path}
                        </Text>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* API Upload Modal */}
      <Modal
        title="API上传文档"
        open={apiUploadVisible}
        onOk={handleApiUpload}
        onCancel={() => setApiUploadVisible(false)}
        confirmLoading={apiUploading}
        width={600}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>文件名 *</Text>
            <Input
              placeholder="例如: document.md"
              value={apiFileName}
              onChange={(e) => setApiFileName(e.target.value)}
              addonAfter={
                <Text type="secondary">
                  {apiFileName ? taskDocumentService.getMimeTypeFromFileName(apiFileName) : ''}
                </Text>
              }
            />
          </div>
          <div>
            <Text strong>文件内容 *</Text>
            <TextArea
              rows={10}
              placeholder="请输入文件内容..."
              value={apiContent}
              onChange={(e) => setApiContent(e.target.value)}
            />
          </div>
          <Alert
            message="支持的格式"
            description="支持 .md (Markdown), .pdf, .txt 格式文件，内容将以文本形式上传"
            type="info"
            showIcon
          />
        </Space>
      </Modal>

      {/* Document Preview Modal */}
      <Modal
        title={`预览文档: ${previewTitle}`}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
        className="document-preview-modal"
      >
        {previewLoading ? (
          <div className="flex justify-center items-center py-8">
            <Space>
              <LoadingOutlined />
              <Text>加载文档内容中...</Text>
            </Space>
          </div>
        ) : (
          <div className="document-preview-content">
            {previewContent.includes('```') || previewContent.includes('#') ? (
              // Markdown 格式预览
              <div className="bg-gray-50 p-4 rounded border">
                <pre 
                  className="whitespace-pre-wrap font-mono text-sm"
                  style={{ maxHeight: '500px', overflow: 'auto' }}
                >
                  {previewContent}
                </pre>
              </div>
            ) : (
              // 纯文本预览
              <div className="bg-white p-4 border rounded">
                <Text style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {previewContent}
                </Text>
              </div>
            )}
            
            {/* 预览统计信息 */}
            <div className="mt-4 pt-4 border-t">
              <Space split={<Divider type="vertical" />}>
<Text type="secondary">
                  字符数: {previewContent.length}
                </Text>
<Text type="secondary">
                  行数: {previewContent.split('\n').length}
                </Text>
                <Text type="secondary">
                  字数: {previewContent.replace(/\s+/g, '').length}
                </Text>
              </Space>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TaskDocumentUploader;