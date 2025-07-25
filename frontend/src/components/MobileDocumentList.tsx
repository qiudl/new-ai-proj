import React, { useState, useEffect } from 'react';
import {
  List,
  Card,
  Space,
  Tag,
  Button,
  Avatar,
  Typography,
  Row,
  Col,
  Radio,
  Empty,
  message,
  Dropdown,
  Modal,
  Form,
  Input,
  Select
} from 'antd';
import {
  FileOutlined,
  EyeOutlined,
  EditOutlined,
  MoreOutlined,
  StarFilled,
  StarOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  DownloadOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { Document } from '../types/document';
import { simpleDocumentService, SimpleDocument } from '../services/simpleDocumentService';
import dayjs from 'dayjs';

const { Text } = Typography;

interface MobileDocumentListProps {
  folderId?: number;
  viewMode?: 'list' | 'grid' | 'compact';
  onViewModeChange?: (mode: 'list' | 'grid' | 'compact') => void;
  onDocumentSelect?: (document: Document) => void;
  onDocumentUpdate?: () => void;
}

// 文档类型配置
const DOCUMENT_TYPES = {
  markdown: { label: 'Markdown', color: 'blue', icon: '📝' },
  text: { label: 'Text', color: 'default', icon: '📄' },
  pdf: { label: 'PDF', color: 'red', icon: '📋' },
  word: { label: 'Word', color: 'blue', icon: '📘' },
  image: { label: 'Image', color: 'orange', icon: '🖼️' }
};

// 文档状态配置
const DOCUMENT_STATUS = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'success' },
  archived: { label: '已归档', color: 'warning' }
};

const MobileDocumentList: React.FC<MobileDocumentListProps> = ({
  folderId,
  viewMode = 'compact',
  onViewModeChange,
  onDocumentSelect,
  onDocumentUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<SimpleDocument[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();

  // 加载文档列表
  useEffect(() => {
    loadDocuments();
  }, [folderId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await simpleDocumentService.getDocuments(folderId);
      setDocuments(docs);
    } catch (error: any) {
      console.error('加载文档失败:', error);
      message.error('加载文档失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理创建文档
  const handleCreateDocument = async (values: any) => {
    try {
      const request = {
        folder_id: folderId,
        title: values.title,
        content: values.content,
        type: values.type,
        status: values.status || 'draft',
        description: values.description,
        tags: values.tags || [],
        visibility: values.visibility || 'team',
        is_template: values.is_template || false,
        project_id: values.project_id,
        customer_id: values.customer_id,
        category: values.category
      };

      await simpleDocumentService.createDocument(request);
      
      message.success('文档创建成功');
      setCreateModalVisible(false);
      createForm.resetFields();
      onDocumentUpdate?.();
      
      // 重新加载文档列表
      loadDocuments();
    } catch (error: any) {
      console.error('创建文档失败:', error);
      message.error(error.message || '创建文档失败');
    }
  };

  // 处理删除文档
  const handleDeleteDocument = async (documentId: number) => {
    try {
      await simpleDocumentService.deleteDocument(documentId);
      message.success('文档删除成功');
      loadDocuments();
      onDocumentUpdate?.();
    } catch (error: any) {
      console.error('删除文档失败:', error);
      message.error(error.message || '删除文档失败');
    }
  };

  const getDocumentIcon = (type: string) => {
    return DOCUMENT_TYPES[type as keyof typeof DOCUMENT_TYPES]?.icon || '📄';
  };

  const renderDocumentActions = (document: SimpleDocument) => {
    const moreActions = [
      {
        key: 'view',
        label: '详细查看',
        icon: <EyeOutlined />,
        onClick: () => {
          window.open(`/documents/view/${document.id}`, '_blank');
        }
      },
      {
        key: 'edit',
        label: '编辑',
        icon: <EditOutlined />,
        onClick: () => {
          window.open(`/documents/edit/${document.id}`, '_blank');
        }
      },
      {
        key: 'download',
        label: '下载',
        icon: <DownloadOutlined />,
        onClick: () => {
          // TODO: 实现下载功能
          message.info('下载功能即将上线');
        }
      },
      {
        type: 'divider' as const
      },
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => {
          Modal.confirm({
            title: '确认删除',
            content: `确定要删除文档"${document.title}"吗？`,
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: () => handleDeleteDocument(document.id)
          });
        }
      }
    ];

    return (
      <Space size="small">
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => onDocumentSelect?.(document as any)}
        >
          查看
        </Button>
        <Dropdown
          menu={{ items: moreActions }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button
            type="text"
            size="small"
            icon={<MoreOutlined />}
          >
            更多
          </Button>
        </Dropdown>
      </Space>
    );
  };

  const getDocumentIcon_old = (type: string) => {
    const icons = {
      markdown: '📝',
      text: '📄',
      pdf: '📋',
      word: '📘',
      excel: '📊',
      image: '🖼️'
    };
    return icons[type as keyof typeof icons] || '📄';
  };

  const renderCompactView = () => (
    <List
      loading={loading}
      dataSource={documents}
      renderItem={(document) => (
        <List.Item
          style={{
            padding: '12px 16px',
            backgroundColor: '#fff',
            marginBottom: 8,
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
          actions={[
            renderDocumentActions(document)
          ]}
        >
          <List.Item.Meta
            avatar={
              <div style={{ fontSize: '20px' }}>
                {getDocumentIcon(document.type)}
              </div>
            }
            title={
              <Space>
                <Text strong style={{ fontSize: '14px' }}>
                  {document.title}
                </Text>
                {document.is_favorite && (
                  <StarFilled style={{ color: '#faad14', fontSize: '12px' }} />
                )}
              </Space>
            }
            description={
              <div>
                {document.description && (
                  <div style={{ marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {document.description.length > 50 
                        ? `${document.description.substring(0, 50)}...` 
                        : document.description
                      }
                    </Text>
                  </div>
                )}
                <div style={{ marginBottom: 4 }}>
                  <Space wrap size={4}>
                    {document.project_name && (
                      <Tag color="blue" style={{ fontSize: '11px' }}>
                        项目: {document.project_name}
                      </Tag>
                    )}
                    {document.customer_name && (
                      <Tag color="green" style={{ fontSize: '11px' }}>
                        客户: {document.customer_name}
                      </Tag>
                    )}
                    {document.category && (
                      <Tag color="purple" style={{ fontSize: '11px' }}>
                        {document.category}
                      </Tag>
                    )}
                  </Space>
                </div>
                <div>
                  <Space wrap size={4}>
                    {document.tags.slice(0, 2).map(tag => (
                      <Tag key={tag} style={{ fontSize: '11px' }}>#{tag}</Tag>
                    ))}
                    {document.tags.length > 2 && (
                      <Tag style={{ fontSize: '11px' }}>+{document.tags.length - 2}</Tag>
                    )}
                  </Space>
                </div>
              </div>
            }
          />
        </List.Item>
      )}
      locale={{ emptyText: <Empty description="暂无文档" /> }}
    />
  );

  const renderGridView = () => (
    <Row gutter={[8, 8]}>
      {documents.map(document => (
        <Col span={12} key={document.id}>
          <Card
            size="small"
            hoverable
            style={{ height: 140 }}
            styles={{ body: { padding: 12 } }}
            onClick={() => onDocumentSelect?.(document)}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: 8 }}>
                {getDocumentIcon(document.type)}
              </div>
              <Text strong style={{ fontSize: '13px' }}>
                {document.title.length > 15 
                  ? `${document.title.substring(0, 15)}...` 
                  : document.title
                }
              </Text>
              {document.is_favorite && (
                <div style={{ marginTop: 4 }}>
                  <StarFilled style={{ color: '#faad14', fontSize: '12px' }} />
                </div>
              )}
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );

  return (
    <div>
      {/* Create Button */}
      <Card 
        size="small" 
        style={{ marginBottom: 8 }}
        styles={{ body: { padding: '8px 12px' } }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              新建文档
            </Button>
          </Col>
          <Col>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {documents.length} 个文档
            </Text>
          </Col>
        </Row>
      </Card>

      {/* View Mode Selector */}
      <Card 
        size="small" 
        style={{ marginBottom: 8 }}
        styles={{ body: { padding: '8px 12px' } }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Radio.Group
              value={viewMode}
              onChange={(e) => onViewModeChange?.(e.target.value)}
              size="small"
            >
              <Radio.Button value="compact">列表</Radio.Button>
              <Radio.Button value="grid">网格</Radio.Button>
            </Radio.Group>
          </Col>
        </Row>
      </Card>

      {/* Document List */}
      {viewMode === 'grid' ? renderGridView() : renderCompactView()}

      {/* Create Document Modal */}
      <Modal
        title="新建文档"
        open={createModalVisible}
        onOk={() => createForm.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        width="90%"
        style={{ top: 20 }}
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
                <Select.Option key={key} value={key}>
                  <Space>
                    <span>{config.icon}</span>
                    {config.label}
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="description"
            label="文档描述"
          >
            <Input.TextArea
              rows={2}
              placeholder="请输入文档描述（可选）"
              maxLength={100}
              showCount
            />
          </Form.Item>
          
          <Form.Item
            name="project_id"
            label="关联项目"
          >
            <Select placeholder="选择项目（可选）" allowClear>
              <Select.Option value={1}>演示项目A</Select.Option>
              <Select.Option value={2}>演示项目B</Select.Option>
              <Select.Option value={3}>演示项目C</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="customer_id"
            label="关联客户"
          >
            <Select placeholder="选择客户（可选）" allowClear>
              <Select.Option value={1}>客户甲</Select.Option>
              <Select.Option value={2}>客户乙</Select.Option>
              <Select.Option value={3}>客户丙</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="category"
            label="文档分类"
          >
            <Select placeholder="选择文档分类（可选）" allowClear>
              <Select.Option value="contract">合同文档</Select.Option>
              <Select.Option value="requirement">需求文档</Select.Option>
              <Select.Option value="design">设计文档</Select.Option>
              <Select.Option value="technical">技术文档</Select.Option>
              <Select.Option value="report">报告文档</Select.Option>
              <Select.Option value="other">其他</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MobileDocumentList;