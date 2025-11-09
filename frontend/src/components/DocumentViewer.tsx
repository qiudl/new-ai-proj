import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Card, 
  Space, 
  Button, 
  Typography, 
  Descriptions, 
  Tag, 
  message, 
  Spin,
  Tabs,
  Tooltip
} from 'antd';
import { 
  FileOutlined, 
  DownloadOutlined, 
  EditOutlined, 
  HistoryOutlined,
  EyeOutlined,
  ShareAltOutlined,
  PrinterOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import dayjs from 'dayjs';
import SelectableText from './SelectableText';
import 'highlight.js/styles/github.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

export interface DocumentDetail {
  id: number;
  title: string;
  description?: string;
  content: string;
  file_name: string;
  file_type: string;
  file_size: number;
  status: string;
  visibility: string;
  project_id: number;
  task_id: number;
  current_version: number;
  total_versions: number;
  download_count: number;
  checksum: string;
  uploaded_by: {
    id: number;
    username: string;
    avatar?: string;
  };
  updated_by?: {
    id: number;
    username: string;
    avatar?: string;
  };
  created_at: string;
  updated_at: string;
  published_at?: string;
  tags: string[];
  metadata?: Record<string, any>;
}

export interface DocumentViewerProps {
  visible: boolean;
  documentId: number;
  projectId: number;
  taskId: number;
  onClose: () => void;
  onEdit?: (document: DocumentDetail) => void;
  onShowHistory?: (documentId: number) => void;
  onDownload?: (document: DocumentDetail) => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  visible,
  documentId,
  projectId,
  taskId,
  onClose,
  onEdit,
  onShowHistory,
  onDownload
}) => {
  const [docDetail, setDocDetail] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 状态标签颜色映射
  const getStatusTagColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'draft': 'default',
      'published': 'success',
      'archived': 'warning',
      'deleted': 'error'
    };
    return colorMap[status] || 'default';
  };

  // 可见性标签颜色映射
  const getVisibilityTagColor = (visibility: string) => {
    const colorMap: Record<string, string> = {
      'private': 'red',
      'team': 'blue',
      'public': 'green'
    };
    return colorMap[visibility] || 'default';
  };

  // 加载文档详情
  const loadDocumentDetail = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/projects/${projectId}/tasks/${taskId}/documents/${documentId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setDocDetail(result.data);
      } else {
        throw new Error(result.message || '加载失败');
      }
    } catch (error: any) {
      message.error(`加载文档详情失败: ${error.message}`);
      setDocDetail(null);
    } finally {
      setLoading(false);
    }
  };

  // 下载文档
  const handleDownload = async () => {
    if (!docDetail) return;

    try {
      setContentLoading(true);
      const response = await fetch(
        `/api/v1/projects/${projectId}/tasks/${taskId}/documents/${documentId}/download`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 创建下载链接
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = docDetail.file_name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success('文档下载成功');
      onDownload?.(docDetail);
    } catch (error: any) {
      message.error(`下载文档失败: ${error.message}`);
    } finally {
      setContentLoading(false);
    }
  };

  // 分享文档
  const handleShare = async () => {
    if (!docDetail) return;

    try {
      const shareUrl = `${window.location.origin}/documents/share/${documentId}`;
      await navigator.clipboard.writeText(shareUrl);
      message.success('分享链接已复制到剪贴板');
    } catch (error) {
      // 如果浏览器不支持clipboard API，则显示链接
      Modal.info({
        title: '分享链接',
        content: `${window.location.origin}/documents/share/${documentId}`,
        okText: '关闭'
      });
    }
  };

  // 打印文档
  const handlePrint = () => {
    window.print();
  };

  // 渲染文档内容
  const renderContent = () => {
    if (!docDetail) return null;

    switch (docDetail.file_type) {
      case 'markdown':
        return (
          <div
            className="markdown-content"
            onMouseDown={(e) => {
              // 确保文本选择事件不被阻止
              e.stopPropagation();
            }}
            // ✅ FIXED - onSelectStart is not a valid HTML event for div (TS2322)
            // Text selection is already handled by onMouseDown
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              rehypePlugins={[rehypeHighlight, rehypeRaw]}
              components={{
                // 使用SelectableText组件，避免Typography的文本选择问题
                h1: ({children}) => <SelectableText as="h1" level={1}>{children}</SelectableText>,
                h2: ({children}) => <SelectableText as="h2" level={2}>{children}</SelectableText>,
                h3: ({children}) => <SelectableText as="h3" level={3}>{children}</SelectableText>,
                h4: ({children}) => <SelectableText as="h4" level={4}>{children}</SelectableText>,
                h5: ({children}) => <SelectableText as="h5" level={5}>{children}</SelectableText>,
                h6: ({children}) => <SelectableText as="h6" level={6}>{children}</SelectableText>,
                p: ({children}) => <SelectableText as="p">{children}</SelectableText>,
                blockquote: ({children}) => (
                  <div style={{
                    borderLeft: '4px solid #1890ff',
                    paddingLeft: '16px',
                    margin: '16px 0',
                    background: '#f9f9f9',
                    padding: '12px 16px'
                  }}>
                    {children}
                  </div>
                ),
                table: ({children}) => (
                  <div style={{ overflowX: 'auto', margin: '16px 0' }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      border: '1px solid #d9d9d9'
                    }}>
                      {children}
                    </table>
                  </div>
                ),
                th: ({children}) => (
                  <th style={{
                    border: '1px solid #d9d9d9',
                    padding: '8px 12px',
                    backgroundColor: '#fafafa',
                    fontWeight: 600
                  }}>
                    {children}
                  </th>
                ),
                td: ({children}) => (
                  <td style={{
                    border: '1px solid #d9d9d9',
                    padding: '8px 12px'
                  }}>
                    {children}
                  </td>
                )
              }}
            >
              {docDetail.content}
            </ReactMarkdown>
          </div>
        );
      
      case 'html':
        return (
          <div 
            className="html-content"
            dangerouslySetInnerHTML={{ __html: docDetail.content }}
            style={{
              padding: '16px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              background: '#fff'
            }}
          />
        );
      
      case 'json':
        return (
          <pre style={{
            background: '#f6f8fa',
            padding: '16px',
            borderRadius: '6px',
            overflow: 'auto',
            fontSize: '13px',
            lineHeight: '1.45'
          }}>
            {JSON.stringify(JSON.parse(docDetail.content), null, 2)}
          </pre>
        );
      
      case 'text':
      default:
        return (
          <pre style={{
            background: '#f6f8fa',
            padding: '16px',
            borderRadius: '6px',
            overflow: 'auto',
            fontSize: '14px',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {docDetail.content}
          </pre>
        );
    }
  };

  // Modal显示时加载数据
  useEffect(() => {
    if (visible && documentId) {
      loadDocumentDetail();
    }
  }, [visible, documentId]);

  return (
    <Modal
      title={
        <Space>
          <FileOutlined />
          {docDetail?.title || '文档详情'}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width="90%"
      style={{ top: 20 }}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        <Button 
          key="download" 
          icon={<DownloadOutlined />}
          loading={contentLoading}
          onClick={handleDownload}
        >
          下载
        </Button>,
        <Button 
          key="edit" 
          type="primary" 
          icon={<EditOutlined />}
          onClick={() => docDetail && onEdit?.(docDetail)}
        >
          编辑
        </Button>
      ]}
      destroyOnClose
    >
      <Spin spinning={loading}>
        {docDetail && (
          <Tabs defaultActiveKey="content">
            <TabPane 
              tab={
                <span>
                  <EyeOutlined />
                  文档内容
                </span>
              } 
              key="content"
            >
              <div style={{ minHeight: '400px', maxHeight: '70vh', overflowY: 'auto' }}>
                {renderContent()}
              </div>
            </TabPane>
            
            <TabPane 
              tab={
                <span>
                  <FileOutlined />
                  文档信息
                </span>
              }
              key="info"
            >
              <Card>
                <Descriptions column={2} bordered >
                  <Descriptions.Item label="文档标题" span={2}>
                    <Title level={4} style={{ margin: 0 }}>
                      {docDetail.title}
                    </Title>
                  </Descriptions.Item>
                  
                  {docDetail.description && (
                    <Descriptions.Item label="文档描述" span={2}>
                      <Text>{docDetail.description}</Text>
                    </Descriptions.Item>
                  )}
                  
                  <Descriptions.Item label="文件名">
                    {docDetail.file_name}
                  </Descriptions.Item>
                  
                  <Descriptions.Item label="文件类型">
                    <Tag>{docDetail.file_type}</Tag>
                  </Descriptions.Item>
                  
                  <Descriptions.Item label="文件大小">
                    {formatFileSize(docDetail.file_size)}
                  </Descriptions.Item>
                  
                  <Descriptions.Item label="下载次数">
                    {docDetail.download_count}
                  </Descriptions.Item>
                  
                  <Descriptions.Item label="状态">
                    <Tag color={getStatusTagColor(docDetail.status)}>
                      {docDetail.status}
                    </Tag>
                  </Descriptions.Item>
                  
                  <Descriptions.Item label="可见性">
                    <Tag color={getVisibilityTagColor(docDetail.visibility)}>
                      {docDetail.visibility}
                    </Tag>
                  </Descriptions.Item>
                  
                  <Descriptions.Item label="版本信息">
                    <Space>
                      <Text>v{docDetail.current_version}</Text>
                      <Text type="secondary">
                        (共{docDetail.total_versions}版)
                      </Text>
                      <Button 
                        type="link" 
                        
                        icon={<HistoryOutlined />}
                        onClick={() => onShowHistory?.(docDetail.id)}
                      >
                        查看历史
                      </Button>
                    </Space>
                  </Descriptions.Item>
                  
                  <Descriptions.Item label="校验和">
                    <Text code style={{ fontSize: '12px' }}>
                      {docDetail.checksum}
                    </Text>
                  </Descriptions.Item>
                  
                  <Descriptions.Item label="上传者">
                    {docDetail.uploaded_by.username}
                  </Descriptions.Item>
                  
                  <Descriptions.Item label="最后更新者">
                    {docDetail.updated_by?.username || '-'}
                  </Descriptions.Item>
                  
                  <Descriptions.Item label="创建时间">
                    {dayjs(docDetail.created_at).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                  
                  <Descriptions.Item label="更新时间">
                    {dayjs(docDetail.updated_at).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                  
                  {docDetail.published_at && (
                    <Descriptions.Item label="发布时间">
                      {dayjs(docDetail.published_at).format('YYYY-MM-DD HH:mm:ss')}
                    </Descriptions.Item>
                  )}
                  
                  {/* 文档质量检查展示 */}
                  {docDetail.metadata && (docDetail.metadata as any).quality_check && (
                    <Descriptions.Item label="质量检查" span={2}>
                      {(() => {
                        const qc = (docDetail.metadata as any).quality_check || {};
                        const passed = !!qc.passed;
                        const issues: string[] = qc.issues || [];
                        return (
                          <Space direction="vertical" size={4}>
                            <Space>
                              <Text>状态：</Text>
                              {passed ? (
                                <Tag color="green">达标</Tag>
                              ) : (
                                <Tag color="red">需完善</Tag>
                              )}
                            </Space>
                            {!passed && issues.length > 0 && (
                              <div>
                                <Text type="secondary">问题：</Text>
                                <ul style={{ margin: '4px 0 0 16px' }}>
                                  {issues.map((it, idx) => (
                                    <li key={idx}>
                                      <Text type="secondary">{it}</Text>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </Space>
                        );
                      })()}
                    </Descriptions.Item>
                  )}
                  
                  {docDetail.tags.length > 0 && (
                    <Descriptions.Item label="标签" span={2}>
                      <Space wrap>
                        {docDetail.tags.map(tag => (
                          <Tag key={tag}>{tag}</Tag>
                        ))}
                      </Space>
                    </Descriptions.Item>
                  )}
                </Descriptions>
                
                {/* 操作按钮 */}
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <Space>
                    <Tooltip title="分享文档">
                      <Button 
                        icon={<ShareAltOutlined />}
                        onClick={handleShare}
                      >
                        分享
                      </Button>
                    </Tooltip>
                    
                    <Tooltip title="打印文档">
                      <Button 
                        icon={<PrinterOutlined />}
                        onClick={handlePrint}
                      >
                        打印
                      </Button>
                    </Tooltip>
                  </Space>
                </div>
              </Card>
            </TabPane>
          </Tabs>
        )}
      </Spin>
    </Modal>
  );
};

export default DocumentViewer;