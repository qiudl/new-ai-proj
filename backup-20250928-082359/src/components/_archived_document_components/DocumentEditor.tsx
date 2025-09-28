import React, { useState, useEffect } from 'react';
import {
  Button,
  Input,
  Card,
  Typography,
  Space,
  message,
  Spin,
  Row,
  Col,
  Tooltip,
  Breadcrumb,
  Divider,
} from 'antd';
import {
  SaveOutlined,
  ArrowLeftOutlined,
  FileTextOutlined,
  DeleteOutlined,
  EyeOutlined,
  EditOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams, Link } from 'react-router-dom';
import unifiedDocumentService from '../services/unifiedDocumentService';
import { Document, DocumentType, DocumentStatus, CreateDocumentRequest } from '../types/document';
import DocumentBreadcrumb from './DocumentBreadcrumb';

const { Title, Text } = Typography;
const { TextArea } = Input;

// 组件属性类型
interface DocumentEditorProps {
  documentId?: number; // 编辑现有文档时传入
  projectId?: number; // 创建新文档时传入
  initialData?: Partial<Document>; // 初始数据
  onSave?: (document: Document) => void; // 保存回调
  onCancel?: () => void; // 取消回调
  onDelete?: (documentId: number) => void; // 删除回调
  readonly?: boolean; // 只读模式
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({
  documentId,
  projectId,
  initialData,
  onSave,
  onCancel,
  onDelete,
  readonly = false,
}) => {
  const navigate = useNavigate();
  const params = useParams();
  
  // 从URL参数获取ID（如果组件属性没有提供）
  const finalDocumentId = documentId || (params.id ? parseInt(params.id) : undefined);
  const finalProjectId = projectId || (params.projectId ? parseInt(params.projectId) : undefined);

  // 状态管理
  const [documentData, setDocumentData] = useState<Document>({
    id: 0,
    project_id: finalProjectId || undefined,
    customer_id: undefined,
    owner_id: 1,
    title: '',
    content: '',
    type: 'markdown' as DocumentType,
    status: 'draft' as DocumentStatus,
    visibility: 'private',
    shared_with: [],
    tags: [],
    version: 1,
    is_template: false,
    created_by: 1,
    created_at: '',
    updated_at: '',
    can_edit: true,
    can_share: true,
    ...initialData,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(!readonly && !finalDocumentId); // 新建文档默认编辑模式
  const [hasChanges, setHasChanges] = useState(false);

  // 获取文档数据
  const fetchDocument = async () => {
    if (!finalDocumentId) return;

    setLoading(true);
    try {
      const data = await unifiedDocumentService.getDocument(finalDocumentId);
      setDocumentData(data);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to fetch document:', error);
      message.error('获取文档失败');
      // 如果获取失败，返回上一页
      handleCancel();
    } finally {
      setLoading(false);
    }
  };

  // 保存文档
  const handleSave = async () => {
    if (!documentData.title.trim()) {
      message.error('请输入文档标题');
      return;
    }

    setSaving(true);
    try {
      const requestData: CreateDocumentRequest = {
        title: documentData.title.trim(),
        content: documentData.content,
        type: documentData.type,
        description: documentData.description,
        tags: documentData.tags,
        visibility: documentData.visibility,
        metadata: {
          project_id: documentData.project_id,
          customer_id: documentData.customer_id,
          shared_with: documentData.shared_with,
        }
      };

      const savedDocument = finalDocumentId 
        ? await unifiedDocumentService.updateDocument(finalDocumentId, requestData)
        : await unifiedDocumentService.createDocument(requestData);

      setDocumentData(savedDocument);
      setHasChanges(false);
      setIsEditing(false);
      
      message.success(finalDocumentId ? '文档更新成功' : '文档创建成功');

      // 调用回调
      if (onSave) {
        onSave(savedDocument);
      } else if (!finalDocumentId) {
        // 新建文档后跳转到编辑页面
        navigate(`/documents/${savedDocument.id}/edit`, { replace: true });
      }
    } catch (error) {
      console.error('Failed to save document:', error);
      message.error('保存文档失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除文档
  const handleDelete = async () => {
    if (!finalDocumentId) return;

    try {
      await unifiedDocumentService.deleteDocument(finalDocumentId);
      message.success('文档删除成功');
      
      if (onDelete) {
        onDelete(finalDocumentId);
      } else {
        // 返回相应的文档列表
        if (documentData.project_id) {
          navigate(`/projects/${documentData.project_id}/documents`);
        } else if (documentData.customer_id) {
          navigate(`/customers/${documentData.customer_id}/documents`);
        } else {
          navigate('/documents');
        }
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
      message.error('删除文档失败');
    }
  };

  // 取消编辑
  const handleCancel = () => {
    if (hasChanges) {
      const modal = require('antd').Modal;
      modal.confirm({
        title: '确认取消',
        content: '您有未保存的更改，确定要取消吗？',
        okText: '确认取消',
        cancelText: '继续编辑',
        onOk: () => {
          if (onCancel) {
            onCancel();
          } else if (finalDocumentId) {
            // 重新获取数据
            fetchDocument();
            setIsEditing(false);
          } else {
            // 新建文档取消，返回上一页
            navigate(-1);
          }
        },
      });
    } else {
      if (onCancel) {
        onCancel();
      } else if (finalDocumentId) {
        setIsEditing(false);
      } else {
        navigate(-1);
      }
    }
  };

  // 处理内容变化
  const handleChange = (field: keyof Document, value: string) => {
    setDocumentData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // 格式化时间
  const formatDateTime = (dateTime?: string) => {
    return dateTime ? new Date(dateTime).toLocaleString('zh-CN') : '';
  };

  // 组件加载
  useEffect(() => {
    if (finalDocumentId) {
      fetchDocument();
    }
  }, [finalDocumentId]);

  // 处理键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          if (isEditing) {
            handleSave();
          }
        }
      }
    };

    globalThis.document.addEventListener('keydown', handleKeyDown);
    return () => globalThis.document.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, handleSave]);

  return (
    <div style={{ padding: '0 24px' }}>
      {/* 面包屑导航 */}
      <DocumentBreadcrumb
        document={finalDocumentId ? documentData : undefined}
        mode={finalDocumentId ? (isEditing ? 'edit' : 'view') : 'new'}
        projectId={documentData.project_id}
        customerId={documentData.customer_id}
        projectName={documentData.project_name}
        customerName={documentData.customer_name}
      />

      <Card>
        <Spin spinning={loading}>
          {/* 头部操作栏 */}
          <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
            <Col>
              <Space>
                <Button 
                  icon={<ArrowLeftOutlined />} 
                  onClick={() => navigate(-1)}
                >
                  返回
                </Button>
                <FileTextOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                <Title level={3} style={{ margin: 0 }}>
                  {finalDocumentId ? '文档详情' : '新建文档'}
                </Title>
              </Space>
            </Col>
            <Col>
              <Space>
                {!readonly && (
                  <>
                    {!isEditing && finalDocumentId && (
                      <Button
                        icon={<EditOutlined />}
                        onClick={() => setIsEditing(true)}
                      >
                        编辑
                      </Button>
                    )}
                    {isEditing && (
                      <>
                        <Button onClick={handleCancel}>
                          取消
                        </Button>
                        <Button
                          type="primary"
                          icon={<SaveOutlined />}
                          loading={saving}
                          onClick={handleSave}
                        >
                          保存 {hasChanges && '(Ctrl+S)'}
                        </Button>
                      </>
                    )}
                    {!isEditing && finalDocumentId && (
                      <Tooltip title="删除文档">
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            const modal = require('antd').Modal;
                            modal.confirm({
                              title: '确认删除',
                              content: `确定要删除文档"${documentData.title}"吗？此操作不可恢复。`,
                              okText: '删除',
                              okType: 'danger',
                              cancelText: '取消',
                              onOk: handleDelete,
                            });
                          }}
                        >
                          删除
                        </Button>
                      </Tooltip>
                    )}
                  </>
                )}
                {readonly && (
                  <Tooltip title="只读模式">
                    <Button icon={<EyeOutlined />} disabled>
                      只读
                    </Button>
                  </Tooltip>
                )}
              </Space>
            </Col>
          </Row>

          {/* 文档信息 */}
          {documentData.created_at && (
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Text type="secondary">创建者：{documentData.creator_name || '未知'}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">创建时间：{formatDateTime(documentData.created_at)}</Text>
              </Col>
              {documentData.updated_at && documentData.updated_at !== documentData.created_at && (
                <Col span={12} style={{ marginTop: 8 }}>
                  <Text type="secondary">更新时间：{formatDateTime(documentData.updated_at)}</Text>
                </Col>
              )}
            </Row>
          )}

          <Divider />

          {/* 文档编辑区域 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <Text strong>文档标题 *</Text>
            </div>
            <Input
              placeholder="请输入文档标题"
              value={documentData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              disabled={!isEditing}
              style={{ marginBottom: 24 }}
              maxLength={255}
              showCount
            />

            <div style={{ marginBottom: 16 }}>
              <Text strong>文档内容</Text>
            </div>
            <TextArea
              placeholder="请输入文档内容..."
              value={documentData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              disabled={!isEditing}
              rows={20}
              style={{ 
                fontFamily: 'monospace',
                fontSize: '14px',
                lineHeight: '1.6',
              }}
              showCount
            />
          </div>

          {/* 底部保存提示 */}
          {isEditing && hasChanges && (
            <div style={{ 
              position: 'fixed', 
              bottom: 24, 
              right: 24, 
              background: '#fff', 
              padding: '8px 16px',
              border: '1px solid #d9d9d9',
              borderRadius: 6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}>
              <Space>
                <Text type="warning">有未保存的更改</Text>
                <Button  onClick={handleCancel}>取消</Button>
                <Button 
                  type="primary" 
                   
                  loading={saving}
                  onClick={handleSave}
                >
                  保存
                </Button>
              </Space>
            </div>
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default DocumentEditor;