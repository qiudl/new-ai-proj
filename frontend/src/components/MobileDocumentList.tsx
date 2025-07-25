import React, { useState } from 'react';
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
  Empty
} from 'antd';
import {
  FileOutlined,
  EyeOutlined,
  EditOutlined,
  MoreOutlined,
  StarFilled,
  StarOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { Document } from '../types/document';

const { Text } = Typography;

interface MobileDocumentListProps {
  folderId?: number;
  viewMode?: 'list' | 'grid' | 'compact';
  onViewModeChange?: (mode: 'list' | 'grid' | 'compact') => void;
  onDocumentSelect?: (document: Document) => void;
  onDocumentUpdate?: () => void;
}

const MobileDocumentList: React.FC<MobileDocumentListProps> = ({
  folderId,
  viewMode = 'compact',
  onViewModeChange,
  onDocumentSelect,
  onDocumentUpdate
}) => {
  const [loading, setLoading] = useState(false);
  
  // Mock data for demonstration
  const mockDocuments: Document[] = [
    {
      id: 1,
      folder_id: folderId,
      title: 'API接口设计文档',
      content: '# API接口设计\n\n本文档描述了系统的API接口设计...',
      content_size: 2048,
      type: 'markdown',
      status: 'published',
      description: '详细描述了系统各个模块的API接口设计和调用方式',
      tags: ['API', '接口', '设计'],
      owner_id: 1,
      visibility: 'team',
      version: 2,
      is_template: false,
      is_favorite: true,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-15T14:30:00Z',
      created_by: 1,
      owner_name: 'Admin',
      folder_name: '技术文档'
    },
    {
      id: 2,
      folder_id: folderId,
      title: '项目需求分析报告.pdf',
      content_size: 2048576,
      type: 'pdf',
      status: 'published',
      file_url: '/files/requirement-analysis.pdf',
      file_size: 2048576,
      mime_type: 'application/pdf',
      description: '项目需求分析详细报告',
      tags: ['需求', '分析', '报告'],
      owner_id: 1,
      visibility: 'public',
      version: 1,
      is_template: false,
      is_favorite: false,
      created_at: '2024-01-02T09:00:00Z',
      updated_at: '2024-01-02T09:00:00Z',
      created_by: 1,
      owner_name: 'Admin'
    }
  ];

  const getDocumentIcon = (type: string) => {
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
      dataSource={mockDocuments}
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
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onDocumentSelect?.(document)}
            />,
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
            />
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
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {document.description.length > 50 
                      ? `${document.description.substring(0, 50)}...` 
                      : document.description
                    }
                  </Text>
                )}
                <div style={{ marginTop: 4 }}>
                  <Space wrap size={4}>
                    {document.tags.slice(0, 2).map(tag => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                    {document.tags.length > 2 && (
                      <Tag>+{document.tags.length - 2}</Tag>
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
      {mockDocuments.map(document => (
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
      {/* View Mode Selector */}
      <Card 
        size="small" 
        style={{ marginBottom: 8 }}
        styles={{ body: { padding: '8px 12px' } }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {mockDocuments.length} 个文档
            </Text>
          </Col>
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
    </div>
  );
};

export default MobileDocumentList;