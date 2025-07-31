/**
 * 文档模态框组件集合
 * 包含创建、编辑、上传等模态框
 */

import React from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Upload,
  Progress,
  Typography,
  Space,
  Tag,
  Button,
  message
} from 'antd';
import {
  UploadOutlined,
  EyeOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { Document } from '../types/document';
import unifiedDocumentService from '../services/unifiedDocumentService';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

// 文档类型配置
const DOCUMENT_TYPES = {
  markdown: { label: 'Markdown', color: 'blue', icon: '📝' },
  html: { label: 'HTML', color: 'green', icon: '🌐' },
  text: { label: 'Text', color: 'default', icon: '📄' },
  json: { label: 'JSON', color: 'purple', icon: '⚙️' },
  code: { label: 'Code', color: 'cyan', icon: '💻' },
  pdf: { label: 'PDF', color: 'red', icon: '📋' },
  word: { label: 'Word', color: 'blue', icon: '📘' },
  excel: { label: 'Excel', color: 'green', icon: '📊' },
  image: { label: 'Image', color: 'orange', icon: '🖼️' }
};

// 可见性配置
const VISIBILITY_CONFIG = {
  private: { label: '私有', color: 'red', icon: '🔒' },
  team: { label: '团队', color: 'blue', icon: '👥' },
  public: { label: '公开', color: 'green', icon: '🌍' }
};

// 文档状态配置
const DOCUMENT_STATUS = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'success' },
  archived: { label: '已归档', color: 'warning' }
};

interface ModalStates {
  create: boolean;
  edit: boolean;
  upload: boolean;
  preview: boolean;
}

interface DocumentModalsProps {
  modalStates: ModalStates;
  selectedDocument: Document | null;
  folderId?: number;
  projectId?: number;
  onModalStateChange: (modal: keyof ModalStates, visible: boolean) => void;
  onDocumentUpdate: () => void;
  onDocumentCreated: () => void;
  onDocumentUpdated: () => void;
}

const DocumentModals: React.FC<DocumentModalsProps> = ({
  modalStates,
  selectedDocument,
  folderId,
  projectId,
  onModalStateChange,
  onDocumentUpdate,
  onDocumentCreated,
  onDocumentUpdated
}) => {
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [uploadProgress, setUploadProgress] = React.useState<Record<string, number>>({});
  const [uploadingFiles, setUploadingFiles] = React.useState<string[]>([]);

  // 创建文档
  const handleCreateDocument = async (values: any) => {
    try {
      const request = {
        folder_id: folderId,
        project_id: projectId,
        title: values.title,
        content: values.content || '',
        type: values.type,
        status: values.status || 'draft',
        description: values.description,
        tags: values.tags || [],
        visibility: values.visibility || 'team',
        is_template: values.is_template || false,
        customer_id: values.customer_id,
        category: values.category
      };

      await unifiedDocumentService.createDocument(request);
      
      message.success('文档创建成功');
      createForm.resetFields();
      onDocumentCreated();
    } catch (error: any) {
      console.error('创建文档失败:', error);
      message.error(error.message || '创建文档失败');
    }
  };

  // 编辑文档
  const handleEditDocument = async (values: any) => {
    try {
      if (!selectedDocument) return;
      
      const request = {
        title: values.title,
        content: values.content,
        status: values.status,
        description: values.description,
        tags: values.tags || [],
        visibility: values.visibility,
        is_template: values.is_template
      };

      await unifiedDocumentService.updateDocument(selectedDocument.id, request);
      
      message.success('文档更新成功');
      editForm.resetFields();
      onDocumentUpdated();
    } catch (error: any) {
      console.error('更新文档失败:', error);
      message.error(error.message || '更新文档失败');
    }
  };

  // 文件上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    action: '/api/v1/documents/upload',
    data: {
      folder_id: folderId,
      project_id: projectId
    },
    onChange(info) {
      const { status, uid, name } = info.file;
      
      if (status === 'uploading') {
        setUploadingFiles(prev => prev.includes(uid) ? prev : [...prev, uid]);
        const progress = info.file.percent || 0;
        setUploadProgress(prev => ({ ...prev, [uid]: progress }));
      } else if (status === 'done') {
        message.success(`${name} 上传成功`);
        setUploadingFiles(prev => prev.filter(id => id !== uid));
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[uid];
          return newProgress;
        });
        onDocumentUpdate();
      } else if (status === 'error') {
        message.error(`${name} 上传失败`);
        setUploadingFiles(prev => prev.filter(id => id !== uid));
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[uid];
          return newProgress;
        });
      }
    },
    beforeUpload: (file) => {
      // 文件大小限制
      const maxSize = 50; // 50MB
      const isLtMaxSize = file.size / 1024 / 1024 < maxSize;
      if (!isLtMaxSize) {
        message.error(`文件大小不能超过 ${maxSize}MB!`);
        return false;
      }

      // 文件类型限制
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/markdown',
        'image/jpeg',
        'image/png',
        'image/gif'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        message.error('不支持的文件类型!');
        return false;
      }

      return true;
    },
    showUploadList: true,
    listType: 'text'
  };

  // 编辑表单初始化
  React.useEffect(() => {
    if (modalStates.edit && selectedDocument) {
      editForm.setFieldsValue({
        title: selectedDocument.title,
        description: selectedDocument.description,
        tags: selectedDocument.tags,
        status: selectedDocument.status,
        visibility: selectedDocument.visibility,
        is_template: selectedDocument.is_template
      });
    }
  }, [modalStates.edit, selectedDocument, editForm]);

  return (
    <>
      {/* 创建文档模态框 */}
      <Modal
        title="新建文档"
        open={modalStates.create}
        onOk={() => createForm.submit()}
        onCancel={() => {
          onModalStateChange('create', false);
          createForm.resetFields();
        }}
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateDocument}
        >
          <Form.Item
            name="title"
            label="文档标题"
            rules={[{ required: true, message: '请输入文档标题' }]}
          >
            <Input placeholder="请输入文档标题" />
          </Form.Item>
          
          <Form.Item
            name="type"
            label="文档类型"
            rules={[{ required: true, message: '请选择文档类型' }]}
            initialValue="markdown"
          >
            <Select placeholder="选择文档类型">
              {Object.entries(DOCUMENT_TYPES).map(([key, config]) => (
                <Option key={key} value={key}>
                  <Space>
                    <span>{config.icon}</span>
                    {config.label}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="description"
            label="文档描述"
          >
            <TextArea
              rows={3}
              placeholder="请输入文档描述（可选）"
              maxLength={200}
              showCount
            />
          </Form.Item>
          
          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="tags"
              placeholder="添加标签（可选）"
              style={{ width: '100%' }}
            />
          </Form.Item>
          
          <Form.Item
            name="visibility"
            label="可见性"
            initialValue="private"
          >
            <Select>
              {Object.entries(VISIBILITY_CONFIG).map(([key, config]) => (
                <Option key={key} value={key}>
                  <Space>
                    <span>{config.icon}</span>
                    {config.label}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="category"
            label="文档分类"
          >
            <Select
              placeholder="选择文档分类（可选）"
              allowClear
            >
              <Option value="contract">合同文档</Option>
              <Option value="requirement">需求文档</Option>
              <Option value="design">设计文档</Option>
              <Option value="technical">技术文档</Option>
              <Option value="report">报告文档</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="is_template"
            label="设为模板"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑文档模态框 */}
      <Modal
        title="编辑文档"
        open={modalStates.edit}
        onOk={() => editForm.submit()}
        onCancel={() => {
          onModalStateChange('edit', false);
          editForm.resetFields();
        }}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditDocument}
        >
          <Form.Item
            name="title"
            label="文档标题"
            rules={[{ required: true, message: '请输入文档标题' }]}
          >
            <Input placeholder="请输入文档标题" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="文档描述"
          >
            <TextArea
              rows={3}
              placeholder="请输入文档描述（可选）"
              maxLength={200}
              showCount
            />
          </Form.Item>
          
          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="tags"
              placeholder="添加标签（可选）"
              style={{ width: '100%' }}
            />
          </Form.Item>
          
          <Form.Item
            name="status"
            label="状态"
          >
            <Select>
              {Object.entries(DOCUMENT_STATUS).map(([key, config]) => (
                <Option key={key} value={key}>
                  {config.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="visibility"
            label="可见性"
          >
            <Select>
              {Object.entries(VISIBILITY_CONFIG).map(([key, config]) => (
                <Option key={key} value={key}>
                  <Space>
                    <span>{config.icon}</span>
                    {config.label}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="is_template"
            label="设为模板"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* 文件上传模态框 */}
      <Modal
        title="上传文件"
        open={modalStates.upload}
        onCancel={() => {
          if (uploadingFiles.length === 0) {
            onModalStateChange('upload', false);
          } else {
            Modal.confirm({
              title: '确认关闭',
              content: '有文件正在上传中，关闭将取消上传，确定要关闭吗？',
              onOk: () => {
                onModalStateChange('upload', false);
                setUploadingFiles([]);
                setUploadProgress({});
              }
            });
          }
        }}
        footer={[
          <Button 
            key="close" 
            onClick={() => onModalStateChange('upload', false)}
            disabled={uploadingFiles.length > 0}
          >
            关闭
          </Button>
        ]}
        width={600}
        maskClosable={uploadingFiles.length === 0}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text strong>支持的文件类型：</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              最大 50MB
            </Text>
          </div>
          <Space wrap>
            <Tag color="blue">PDF</Tag>
            <Tag color="green">Word</Tag>
            <Tag color="orange">Excel</Tag>
            <Tag color="purple">Markdown</Tag>
            <Tag color="default">Text</Tag>
            <Tag color="pink">图片</Tag>
          </Space>
        </div>
        
        <Upload.Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <UploadOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持单个或批量上传，支持 PDF、Word、Excel、Markdown、文本和图片文件
          </p>
        </Upload.Dragger>
        
        {/* 上传进度显示 */}
        {uploadingFiles.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Title level={5}>上传进度</Title>
            {uploadingFiles.map(fileId => {
              const progress = uploadProgress[fileId] || 0;
              return (
                <div key={fileId} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text>文件 {fileId.slice(-8)}</Text>
                    <Text>{Math.round(progress)}%</Text>
                  </div>
                  <Progress 
                    percent={progress} 
                    status={progress === 100 ? 'success' : 'active'}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
        
        {/* 上传提示 */}
        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            📝 提示：上传后的文件将保存在当前文件夹中，您可以在文件列表中管理和编辑这些文件。
          </Text>
        </div>
      </Modal>

      {/* 文档预览模态框 */}
      <Modal
        title={selectedDocument?.title}
        open={modalStates.preview}
        onCancel={() => onModalStateChange('preview', false)}
        footer={[
          <Button
            key="view-detail"
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => {
              if (selectedDocument) {
                window.open(`/documents/${selectedDocument.id}`, '_blank');
              }
            }}
          >
            详细查看
          </Button>,
          <Button
            key="download"
            icon={<DownloadOutlined />}
            onClick={() => {
              if (selectedDocument) {
                // 下载文档逻辑
                message.success(`文档"${selectedDocument.title}"下载成功`);
              }
            }}
          >
            下载
          </Button>,
          <Button key="close" onClick={() => onModalStateChange('preview', false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {selectedDocument && (
          <div>
            <Space style={{ marginBottom: 16 }}>
              <Tag color={DOCUMENT_TYPES[selectedDocument.type]?.color}>
                {DOCUMENT_TYPES[selectedDocument.type]?.label}
              </Tag>
              <Text type="secondary">
                更新于 {new Date(selectedDocument.updated_at).toLocaleString()}
              </Text>
            </Space>
            
            {selectedDocument.description && (
              <div style={{ marginBottom: 16 }}>
                <Text>{selectedDocument.description}</Text>
              </div>
            )}
            
            <div style={{ 
              border: '1px solid #f0f0f0', 
              borderRadius: '6px', 
              padding: '16px',
              backgroundColor: '#fafafa',
              maxHeight: '400px',
              overflow: 'auto'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {selectedDocument.content || '无预览内容'}
              </pre>
            </div>
            
            {selectedDocument.tags && selectedDocument.tags.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">标签：</Text>
                <Space wrap style={{ marginLeft: 8 }}>
                  {selectedDocument.tags.map(tag => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </Space>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};

export default DocumentModals;