import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Timeline, 
  Card, 
  Space, 
  Button, 
  Tag, 
  Tooltip, 
  message, 
  Descriptions,
  Typography,
  Popconfirm,
  Badge
} from 'antd';
import { 
  HistoryOutlined, 
  DownloadOutlined, 
  RestoreOutlined, 
  DiffOutlined,
  UserOutlined,
  CalendarOutlined,
  FileOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text, Paragraph } = Typography;

export interface DocumentVersion {
  id: number;
  document_id: number;
  version_number: number;
  file_name: string;
  file_size: number;
  file_type: string;
  checksum: string;
  change_summary?: string;
  storage_path: string;
  created_by: {
    id: number;
    username: string;
    avatar?: string;
  };
  created_at: string;
  is_current: boolean;
}

export interface DocumentVersionHistoryProps {
  visible: boolean;
  documentId: number;
  projectId: number;
  taskId: number;
  currentVersion: number;
  onClose: () => void;
  onVersionRestore?: (versionId: number) => void;
  onVersionDelete?: (versionId: number) => void;
}

const DocumentVersionHistory: React.FC<DocumentVersionHistoryProps> = ({
  visible,
  documentId,
  projectId,
  taskId,
  currentVersion,
  onClose,
  onVersionRestore,
  onVersionDelete
}) => {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [compareVersions, setCompareVersions] = useState<{from: number, to: number}>({from: 0, to: 0});

  // 加载版本历史
  const loadVersionHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/projects/${projectId}/tasks/${taskId}/documents/${documentId}/versions`,
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
        setVersions(result.data || []);
      } else {
        throw new Error(result.message || '加载失败');
      }
    } catch (error: any) {
      message.error(`加载版本历史失败: ${error.message}`);
      setVersions([]);
    } finally {
      setLoading(false);
    }
  };

  // 下载指定版本
  const handleDownloadVersion = async (version: DocumentVersion) => {
    try {
      const response = await fetch(
        `/api/v1/projects/${projectId}/tasks/${taskId}/documents/${documentId}/versions/${version.id}/download`,
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
      const link = document.createElement('a');
      link.href = url;
      link.download = `${version.file_name}_v${version.version_number}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success(`版本 ${version.version_number} 下载成功`);
    } catch (error: any) {
      message.error(`下载版本失败: ${error.message}`);
    }
  };

  // 恢复到指定版本
  const handleRestoreVersion = async (version: DocumentVersion) => {
    try {
      const response = await fetch(
        `/api/v1/projects/${projectId}/tasks/${taskId}/documents/${documentId}/versions/${version.id}/restore`,
        {
          method: 'POST',
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
        message.success(`已恢复到版本 ${version.version_number}`);
        loadVersionHistory(); // 重新加载版本历史
        onVersionRestore?.(version.id);
      } else {
        throw new Error(result.message || '恢复失败');
      }
    } catch (error: any) {
      message.error(`恢复版本失败: ${error.message}`);
    }
  };

  // 删除指定版本
  const handleDeleteVersion = async (version: DocumentVersion) => {
    try {
      const response = await fetch(
        `/api/v1/projects/${projectId}/tasks/${taskId}/documents/${documentId}/versions/${version.id}`,
        {
          method: 'DELETE',
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
        message.success(`版本 ${version.version_number} 删除成功`);
        loadVersionHistory(); // 重新加载版本历史
        onVersionDelete?.(version.id);
      } else {
        throw new Error(result.message || '删除失败');
      }
    } catch (error: any) {
      message.error(`删除版本失败: ${error.message}`);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 生成版本时间线项
  const generateTimelineItems = () => {
    return versions.map((version, index) => {
      const isLatest = version.is_current;
      const sizeDiff = index < versions.length - 1 ? 
        version.file_size - versions[index + 1].file_size : 0;

      return {
        key: version.id,
        color: isLatest ? '#52c41a' : '#1890ff',
        dot: isLatest ? <Badge status="success" /> : undefined,
        children: (
          <Card 
            size="small" 
            style={{ 
              marginBottom: 8,
              border: isLatest ? '2px solid #52c41a' : '1px solid #d9d9d9'
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {/* 版本头部信息 */}
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space>
                  <Tag color={isLatest ? 'success' : 'blue'}>
                    v{version.version_number}
                    {isLatest && ' (当前)'}
                  </Tag>
                  <Space size="small">
                    <UserOutlined style={{ color: '#999' }} />
                    <Text type="secondary">{version.created_by.username}</Text>
                  </Space>
                  <Space size="small">
                    <CalendarOutlined style={{ color: '#999' }} />
                    <Tooltip title={dayjs(version.created_at).format('YYYY-MM-DD HH:mm:ss')}>
                      <Text type="secondary">
                        {dayjs(version.created_at).fromNow()}
                      </Text>
                    </Tooltip>
                  </Space>
                </Space>
                
                <Space size="small">
                  <Tooltip title="下载此版本">
                    <Button 
                      type="text" 
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownloadVersion(version)}
                    />
                  </Tooltip>
                  
                  {!isLatest && (
                    <Popconfirm
                      title="恢复版本"
                      description={`确定要恢复到版本 ${version.version_number} 吗？`}
                      onConfirm={() => handleRestoreVersion(version)}
                      okText="确认"
                      cancelText="取消"
                    >
                      <Tooltip title="恢复到此版本">
                        <Button 
                          type="text" 
                          size="small"
                          icon={<RestoreOutlined />}
                        />
                      </Tooltip>
                    </Popconfirm>
                  )}
                  
                  {versions.length > 1 && !isLatest && (
                    <Popconfirm
                      title="删除版本"
                      description={`确定要删除版本 ${version.version_number} 吗？此操作不可恢复。`}
                      onConfirm={() => handleDeleteVersion(version)}
                      okText="确认"
                      cancelText="取消"
                      okType="danger"
                    >
                      <Tooltip title="删除此版本">
                        <Button 
                          type="text" 
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                        />
                      </Tooltip>
                    </Popconfirm>
                  )}
                </Space>
              </Space>

              {/* 版本详情 */}
              <Descriptions size="small" column={2}>
                <Descriptions.Item label="文件名">
                  <Space>
                    <FileOutlined />
                    {version.file_name}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="文件大小">
                  <Space>
                    {formatFileSize(version.file_size)}
                    {sizeDiff !== 0 && (
                      <Tag color={sizeDiff > 0 ? 'red' : 'green'} size="small">
                        {sizeDiff > 0 ? '+' : ''}{formatFileSize(Math.abs(sizeDiff))}
                      </Tag>
                    )}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="文件类型">
                  <Tag>{version.file_type}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="校验和">
                  <Text code style={{ fontSize: '12px' }}>
                    {version.checksum.substring(0, 8)}...
                  </Text>
                </Descriptions.Item>
              </Descriptions>

              {/* 变更摘要 */}
              {version.change_summary && (
                <div>
                  <Text strong style={{ fontSize: '12px' }}>变更摘要：</Text>
                  <Paragraph 
                    style={{ 
                      margin: '4px 0 0 0', 
                      fontSize: '12px',
                      color: '#666'
                    }}
                  >
                    {version.change_summary}
                  </Paragraph>
                </div>
              )}
            </Space>
          </Card>
        )
      };
    });
  };

  // Modal显示时加载数据
  useEffect(() => {
    if (visible && documentId) {
      loadVersionHistory();
    }
  }, [visible, documentId]);

  return (
    <Modal
      title={
        <Space>
          <HistoryOutlined />
          版本历史 ({versions.length} 个版本)
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
      destroyOnClose
    >
      <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
        {versions.length > 0 ? (
          <Timeline
            mode="left"
            items={generateTimelineItems()}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Text type="secondary">暂无版本历史</Text>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DocumentVersionHistory;