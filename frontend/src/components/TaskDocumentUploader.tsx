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
  Divider
} from 'antd';
import {
  InboxOutlined,
  CloudUploadOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileMarkdownOutlined,
  DeleteOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd/es/upload';
import { taskDocumentService } from '../services/taskDocumentService';

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
  progress: number;
  loaded: number;
  total: number;
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

  // Load existing documents
  const loadDocuments = useCallback(async () => {
    try {
      const response = await taskDocumentService.getTaskDocuments(projectId, taskId);
      setUploadedDocuments(response.documents);
    } catch (error) {
      console.error('Failed to load documents:', error);
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
      message.error(`文件大小不能超过 10MB`);
      return Upload.LIST_IGNORE;
    }

    // Check file extension
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(extension)) {
      message.error(`不支持的文件格式，仅支持: ${allowedExtensions.join(', ')}`);
      return Upload.LIST_IGNORE;
    }

    return false; // Prevent auto upload
  };

  // Handle manual upload
  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('请先选择要上传的文件');
      return;
    }

    setUploading(true);
    setUploadProgress([]);

    try {
      const results = await taskDocumentService.uploadMultipleDocuments(
        projectId,
        taskId,
        fileList.map(f => f.originFileObj as File),
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
        }
      );

      message.success(`成功上传 ${results.length} 个文件`);
      setFileList([]);
      loadDocuments();
      onUploadSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      message.error(errorMessage);
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
      // Convert content to base64
      const base64Content = btoa(unescape(encodeURIComponent(apiContent)));
      
      await taskDocumentService.uploadDocumentAPI(
        projectId,
        taskId,
        apiFileName,
        base64Content,
        taskDocumentService.getMimeTypeFromFileName(apiFileName),
        'API上传的文档'
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
                {uploadProgress.map((progress, index) => (
                  <Progress
                    key={index}
                    percent={progress.progress}
                    size="small"
                    status={progress.progress === 100 ? 'success' : 'active'}
                    format={(percent) => `文件 ${index + 1}: ${percent}%`}
                  />
                ))}
              </div>
            )}

            <div className="mt-3">
              <Button
                type="primary"
                onClick={handleUpload}
                disabled={fileList.length === 0}
                loading={uploading}
                icon={<CloudUploadOutlined />}
              >
                {uploading ? '上传中...' : '开始上传'}
              </Button>
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
                  <Button
                    key="delete"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      // TODO: Implement delete functionality
                      message.info('删除功能开发中');
                    }}
                  >
                    删除
                  </Button>
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
                    <Space direction="vertical" size="small">
                      <Text type="secondary">
                        大小: {taskDocumentService.formatFileSize(doc.file_size)} | 
                        类型: {doc.mime_type} | 
                        时间: {new Date(doc.uploaded_at).toLocaleString()}
                      </Text>
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
    </div>
  );
};

export default TaskDocumentUploader;