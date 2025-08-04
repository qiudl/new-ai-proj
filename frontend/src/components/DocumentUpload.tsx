import React, { useState, useCallback } from 'react';
import { Upload, Button, Form, Input, Select, message, Progress, Card, Space, Typography } from 'antd';
import { InboxOutlined, FileOutlined, CloudUploadOutlined } from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';

const { Dragger } = Upload;
const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

export interface DocumentUploadRequest {
  title: string;
  description?: string;
  file?: File;
  content?: string;
  fileType?: string;
  status?: string;
  visibility?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface DocumentUploadProps {
  projectId: number;
  taskId: number;
  uploadMode?: 'manual' | 'api';
  onUploadSuccess?: (document: any) => void;
  onUploadError?: (error: any) => void;
  className?: string;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  projectId,
  taskId,
  uploadMode = 'manual',
  onUploadSuccess,
  onUploadError,
  className
}) => {
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 支持的文件类型
  const supportedFileTypes = [
    { value: 'markdown', label: 'Markdown (.md)', accept: '.md' },
    { value: 'pdf', label: 'PDF (.pdf)', accept: '.pdf' },
    { value: 'text', label: 'Text (.txt)', accept: '.txt' },
    { value: 'html', label: 'HTML (.html)', accept: '.html' },
    { value: 'json', label: 'JSON (.json)', accept: '.json' },
    { value: 'xml', label: 'XML (.xml)', accept: '.xml' }
  ];

  // 可见性选项
  const visibilityOptions = [
    { value: 'private', label: '私有 - 仅自己可见' },
    { value: 'team', label: '团队 - 团队成员可见' },
    { value: 'public', label: '公开 - 所有人可见' }
  ];

  // 状态选项
  const statusOptions = [
    { value: 'draft', label: '草稿' },
    { value: 'review', label: '待审核' },
    { value: 'published', label: '已发布' }
  ];

  // 文件上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    fileList,
    accept: supportedFileTypes.map(type => type.accept).join(','),
    beforeUpload: (file) => {
      // 文件大小验证 (50MB)
      const isLt50M = file.size / 1024 / 1024 < 50;
      if (!isLt50M) {
        message.error('文件大小不能超过 50MB');
        return false;
      }

      // 文件类型验证
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const supportedExtensions = supportedFileTypes.map(type => 
        type.accept.replace('.', '')
      );
      
      if (!fileExtension || !supportedExtensions.includes(fileExtension)) {
        message.error('不支持的文件类型');
        return false;
      }

      setFileList([file]);
      
      // 自动设置标题和文件类型
      if (!form.getFieldValue('title')) {
        const fileName = file.name.replace(/\.[^/.]+$/, '');
        form.setFieldsValue({ title: fileName });
      }

      const fileType = supportedFileTypes.find(type => 
        type.accept === `.${fileExtension}`
      )?.value;
      if (fileType) {
        form.setFieldsValue({ fileType });
      }

      return false; // 阻止自动上传
    },
    onRemove: () => {
      setFileList([]);
    },
    onChange: (info) => {
      // 可以在这里处理文件列表变化
    }
  };

  // 手工上传处理
  const handleManualUpload = async (values: any) => {
    if (!fileList.length) {
      message.error('请选择要上传的文件');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileList[0].originFileObj as File);
    formData.append('title', values.title);
    
    if (values.description) formData.append('description', values.description);
    if (values.status) formData.append('status', values.status);
    if (values.visibility) formData.append('visibility', values.visibility);
    if (values.tags) formData.append('tags', values.tags.join(','));
    if (values.metadata) formData.append('metadata', JSON.stringify(values.metadata));

    try {
      setUploading(true);
      setUploadProgress(0);

      const response = await fetch(
        `/api/v1/projects/${projectId}/tasks/${taskId}/documents/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        message.success('文档上传成功');
        form.resetFields();
        setFileList([]);
        onUploadSuccess?.(result.data);
      } else {
        throw new Error(result.message || '上传失败');
      }
    } catch (error: any) {
      message.error(`上传失败: ${error.message}`);
      onUploadError?.(error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // API上传处理
  const handleAPIUpload = async (values: any) => {
    if (!values.content) {
      message.error('请输入文档内容');
      return;
    }

    const requestBody = {
      title: values.title,
      content: values.content,
      file_type: values.fileType,
      project_id: projectId,
      task_id: taskId,
      description: values.description,
      status: values.status || 'draft',
      visibility: values.visibility || 'team',
      tags: values.tags || [],
      metadata: values.metadata || {}
    };

    try {
      setUploading(true);

      const response = await fetch('/api/v1/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        message.success('文档创建成功');
        form.resetFields();
        onUploadSuccess?.(result.data);
      } else {
        throw new Error(result.message || '创建失败');
      }
    } catch (error: any) {
      message.error(`创建失败: ${error.message}`);
      onUploadError?.(error);
    } finally {
      setUploading(false);
    }
  };

  const onFinish = (values: any) => {
    if (uploadMode === 'manual') {
      handleManualUpload(values);
    } else {
      handleAPIUpload(values);
    }
  };

  return (
    <Card className={className} title={
      <Space>
        <CloudUploadOutlined />
        <Title level={4} style={{ margin: 0 }}>
          {uploadMode === 'manual' ? '文档上传' : 'API文档创建'}
        </Title>
      </Space>
    }>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          status: 'draft',
          visibility: 'team',
          fileType: 'markdown'
        }}
      >
        {/* 文档标题 */}
        <Form.Item
          name="title"
          label="文档标题"
          rules={[{ required: true, message: '请输入文档标题' }]}
        >
          <Input placeholder="请输入文档标题" />
        </Form.Item>

        {/* 文档描述 */}
        <Form.Item
          name="description"
          label="文档描述"
        >
          <TextArea 
            rows={3} 
            placeholder="请输入文档描述（可选）" 
            maxLength={500}
            showCount
          />
        </Form.Item>

        {/* 文件上传 (仅手工模式) */}
        {uploadMode === 'manual' && (
          <Form.Item label="选择文件">
            <Dragger {...uploadProps} style={{ marginBottom: 16 }}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持单个文件上传，最大支持 50MB
                <br />
                支持格式: Markdown, PDF, Text, HTML, JSON, XML
              </p>
            </Dragger>
          </Form.Item>
        )}

        {/* 文档内容 (仅API模式) */}
        {uploadMode === 'api' && (
          <Form.Item
            name="content"
            label="文档内容"
            rules={[{ required: true, message: '请输入文档内容' }]}
          >
            <TextArea 
              rows={12} 
              placeholder="请输入文档内容" 
              maxLength={10485760} // 10MB
            />
          </Form.Item>
        )}

        {/* 文件类型 */}
        <Form.Item
          name="fileType"
          label="文件类型"
          rules={[{ required: true, message: '请选择文件类型' }]}
        >
          <Select placeholder="请选择文件类型">
            {supportedFileTypes.map(type => (
              <Option key={type.value} value={type.value}>
                {type.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="其他设置">
          <Space direction="vertical" style={{ width: '100%' }}>
            {/* 状态 */}
            <Form.Item
              name="status"
              label="状态"
              style={{ marginBottom: 8 }}
            >
              <Select placeholder="请选择状态">
                {statusOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* 可见性 */}
            <Form.Item
              name="visibility"
              label="可见性"
              style={{ marginBottom: 8 }}
            >
              <Select placeholder="请选择可见性">
                {visibilityOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* 标签 */}
            <Form.Item
              name="tags"
              label="标签"
              style={{ marginBottom: 0 }}
            >
              <Select
                mode="tags"
                placeholder="输入标签并回车"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Space>
        </Form.Item>

        {/* 上传进度 */}
        {uploading && uploadProgress > 0 && (
          <Progress percent={uploadProgress} status="active" />
        )}

        {/* 提交按钮 */}
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={uploading}
            size="large"
            icon={uploadMode === 'manual' ? <FileOutlined /> : <CloudUploadOutlined />}
          >
            {uploading 
              ? (uploadMode === 'manual' ? '上传中...' : '创建中...') 
              : (uploadMode === 'manual' ? '上传文档' : '创建文档')
            }
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default DocumentUpload;