import React, { useState } from 'react';
import {
  Upload,
  Modal,
  Progress,
  Card,
  List,
  Button,
  Typography,
  Space,
  Tag,
  message,
  Row,
  Col,
  Form,
  Input,
  Select,
  Checkbox
} from 'antd';
import {
  InboxOutlined,
  FileOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';

const { Dragger } = Upload;
const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface DocumentUploadProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess?: (uploadedFiles: UploadedFile[]) => void;
  folderId?: number;
  maxFileSize?: number; // MB
  acceptedTypes?: string[];
  multiple?: boolean;
}

interface UploadedFile {
  uid: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'done' | 'error';
  progress: number;
  url?: string;
  documentId?: number;
  error?: string;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  visible,
  onCancel,
  onSuccess,
  folderId,
  maxFileSize = 100, // 100MB default
  acceptedTypes = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.md', '.jpg', '.jpeg', '.png', '.gif', '.zip', '.rar'
  ],
  multiple = true
}) => {
  const [fileList, setFileList] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm();

  // File validation
  const validateFile = (file: File): boolean => {
    // Check file size
    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB > maxFileSize) {
      message.error(`文件 "${file.name}" 大小超过 ${maxFileSize}MB 限制`);
      return false;
    }

    // Check file type
    const fileName = file.name.toLowerCase();
    const isValidType = acceptedTypes.some(type => 
      fileName.endsWith(type.toLowerCase())
    );
    
    if (!isValidType) {
      message.error(`文件 "${file.name}" 类型不支持，支持的类型：${acceptedTypes.join(', ')}`);
      return false;
    }

    return true;
  };

  // Handle file selection
  const handleFileSelect: UploadProps['customRequest'] = ({ file, onProgress, onSuccess, onError }) => {
    const uploadFile = file as File;
    
    if (!validateFile(uploadFile)) {
      onError && onError(new Error('File validation failed'));
      return;
    }

    const uploadedFile: UploadedFile = {
      uid: uploadFile.name + Date.now(),
      name: uploadFile.name,
      size: uploadFile.size,
      type: uploadFile.type || 'application/octet-stream',
      status: 'uploading',
      progress: 0
    };

    setFileList(prev => [...prev, uploadedFile]);

    // Simulate upload progress
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress > 90) {
        progress = 90;
      }
      
      setFileList(prev => prev.map(f => 
        f.uid === uploadedFile.uid 
          ? { ...f, progress }
          : f
      ));
      
      onProgress && onProgress({ percent: progress });
    }, 200);

    // Simulate actual upload (replace with real API call)
    setTimeout(() => {
      clearInterval(progressInterval);
      
      // Simulate success/failure
      const isSuccess = Math.random() > 0.1; // 90% success rate
      
      if (isSuccess) {
        const finalFile: UploadedFile = {
          ...uploadedFile,
          status: 'done',
          progress: 100,
          documentId: Math.floor(Math.random() * 1000) + 1,
          url: `http://example.com/documents/${uploadedFile.uid}`
        };
        
        setFileList(prev => prev.map(f => 
          f.uid === uploadedFile.uid ? finalFile : f
        ));
        
        onSuccess && onSuccess('Upload successful');
      } else {
        const errorFile: UploadedFile = {
          ...uploadedFile,
          status: 'error',
          progress: 0,
          error: '上传失败，请重试'
        };
        
        setFileList(prev => prev.map(f => 
          f.uid === uploadedFile.uid ? errorFile : f
        ));
        
        onError && onError(new Error('Upload failed'));
      }
    }, 2000 + Math.random() * 3000); // 2-5 seconds
  };

  // Remove file from list
  const handleRemoveFile = (uid: string) => {
    setFileList(prev => prev.filter(f => f.uid !== uid));
  };

  // Retry failed upload
  const handleRetryUpload = (file: UploadedFile) => {
    setFileList(prev => prev.map(f => 
      f.uid === file.uid 
        ? { ...f, status: 'uploading' as const, progress: 0, error: undefined }
        : f
    ));
    
    // Retry upload logic (same as above)
    setTimeout(() => {
      const isSuccess = Math.random() > 0.2; // 80% success rate on retry
      
      if (isSuccess) {
        setFileList(prev => prev.map(f => 
          f.uid === file.uid 
            ? { ...f, status: 'done' as const, progress: 100, documentId: Math.floor(Math.random() * 1000) + 1 }
            : f
        ));
      } else {
        setFileList(prev => prev.map(f => 
          f.uid === file.uid 
            ? { ...f, status: 'error' as const, progress: 0, error: '重试失败，请检查网络连接' }
            : f
        ));
      }
    }, 1500);
  };

  // Handle modal OK
  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const successfulFiles = fileList.filter(f => f.status === 'done');
      
      if (successfulFiles.length === 0) {
        message.warning('请至少上传一个文件');
        return;
      }

      setUploading(true);
      
      // Apply metadata to all uploaded files
      // TODO: Call API to update document metadata
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      message.success(`成功上传 ${successfulFiles.length} 个文件`);
      onSuccess?.(successfulFiles);
      handleCancel();
    } catch (error) {
      console.error('Failed to process uploads:', error);
      message.error('处理上传文件失败');
    } finally {
      setUploading(false);
    }
  };

  // Handle modal cancel
  const handleCancel = () => {
    setFileList([]);
    form.resetFields();
    onCancel();
  };

  // Get file status icon
  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'done':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'uploading':
        return <ExclamationCircleOutlined style={{ color: '#1890ff' }} />;
      default:
        return <FileOutlined />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Upload props
  const uploadProps: UploadProps = {
    multiple,
    customRequest: handleFileSelect,
    showUploadList: false,
    accept: acceptedTypes.join(','),
    disabled: uploading
  };

  const hasUploadingFiles = fileList.some(f => f.status === 'uploading');
  const successfulFiles = fileList.filter(f => f.status === 'done');

  return (
    <Modal
      title="文档上传"
      open={visible}
      onCancel={handleCancel}
      onOk={handleOk}
      width={800}
      confirmLoading={uploading}
      okText="完成上传"
      cancelText="取消"
      okButtonProps={{ 
        disabled: hasUploadingFiles || successfulFiles.length === 0 
      }}
      destroyOnHidden
    >
      <Row gutter={16} style={{ minHeight: '400px' }}>
        {/* Upload Area */}
        <Col span={12}>
          <Card title="选择文件"  style={{ height: '100%' }}>
            <Dragger 
              {...uploadProps}
              style={{ minHeight: '200px' }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">
                点击或拖拽文件到此区域上传
              </p>
              <p className="ant-upload-hint">
                支持单个或批量上传，最大 {maxFileSize}MB
                <br />
                支持格式：{acceptedTypes.join(', ')}
              </p>
            </Dragger>
            
            <div style={{ marginTop: 16, fontSize: '12px', color: '#666' }}>
              <div>• 文件大小限制：{maxFileSize}MB</div>
              <div>• 支持多文件同时上传</div>
              <div>• 自动检测文件类型</div>
            </div>
          </Card>
        </Col>

        {/* File List and Metadata */}
        <Col span={12}>
          <Card title={`上传列表 (${fileList.length})`}  style={{ height: '100%' }}>
            <List
              
              dataSource={fileList}
              style={{ maxHeight: '200px', overflowY: 'auto' }}
              renderItem={(file) => (
                <List.Item
                  key={file.uid}
                  actions={[
                    file.status === 'error' && (
                      <Button 
                         
                        type="link" 
                        onClick={() => handleRetryUpload(file)}
                      >
                        重试
                      </Button>
                    ),
                    <Button 
                       
                      type="link" 
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveFile(file.uid)}
                    />
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={getStatusIcon(file.status)}
                    title={
                      <div>
                        <Text ellipsis style={{ maxWidth: '150px' }}>{file.name}</Text>
                        <Tag  color={
                          file.status === 'done' ? 'success' : 
                          file.status === 'error' ? 'error' : 'processing'
                        }>
                          {file.status === 'uploading' ? '上传中' : 
                           file.status === 'done' ? '完成' : '失败'}
                        </Tag>
                      </div>
                    }
                    description={
                      <div>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {formatFileSize(file.size)}
                        </Text>
                        {file.status === 'uploading' && (
                          <Progress 
                            percent={Math.round(file.progress)} 
                             
                            showInfo={false}
                            style={{ marginTop: 4 }}
                          />
                        )}
                        {file.error && (
                          <Text type="danger" style={{ fontSize: '11px', display: 'block' }}>
                            {file.error}
                          </Text>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: '暂无文件' }}
            />

            {/* Metadata Form */}
            {successfulFiles.length > 0 && (
              <>
                <div style={{ margin: '16px 0 8px', fontWeight: 500 }}>
                  文档信息设置
                </div>
                <Form 
                  form={form} 
                  layout="vertical" 
                  
                  initialValues={{
                    visibility: 'team',
                    status: 'published'
                  }}
                >
                  <Form.Item name="description" label="描述">
                    <TextArea 
                      placeholder="为上传的文档添加描述..."
                      rows={2}
                      maxLength={200}
                      showCount
                    />
                  </Form.Item>
                  
                  <Row gutter={8}>
                    <Col span={12}>
                      <Form.Item name="status" label="状态">
                        <Select >
                          <Option value="draft">草稿</Option>
                          <Option value="published">已发布</Option>
                          <Option value="archived">已归档</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="visibility" label="可见性">
                        <Select >
                          <Option value="private">私有</Option>
                          <Option value="team">团队</Option>
                          <Option value="public">公开</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item name="tags" label="标签">
                    <Select
                      mode="tags"
                      
                      placeholder="添加标签..."
                      tokenSeparators={[',']}
                    />
                  </Form.Item>
                  
                  <Form.Item name="is_template" valuePropName="checked">
                    <Checkbox>设为文档模板</Checkbox>
                  </Form.Item>
                </Form>
              </>
            )}
          </Card>
        </Col>
      </Row>
    </Modal>
  );
};

export default DocumentUpload;