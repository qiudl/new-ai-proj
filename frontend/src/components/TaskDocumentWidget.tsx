import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Badge,
  Tooltip,
  Dropdown,
  Typography,
  Upload,
  message
} from 'antd';
import type { MenuProps } from 'antd';
import {
  FileTextOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  PlusOutlined,
  MoreOutlined,
  SyncOutlined
} from '@ant-design/icons';
import TaskDocumentManager from './TaskDocumentManager';
import { useTaskDocuments } from '../hooks/useTaskDocuments';

const { Text } = Typography;

interface TaskDocumentWidgetProps {
  projectId: number;
  taskId: number;
  compact?: boolean; // Display mode: compact for task cards, full for task detail
  showTitle?: boolean;
}

const TaskDocumentWidget: React.FC<TaskDocumentWidgetProps> = ({
  projectId,
  taskId,
  compact = false,
  showTitle = true
}) => {
  const [managerVisible, setManagerVisible] = useState(false);
  const {
    documents,
    loading,
    uploading,
    uploadDocument,
    downloadMarkdown,
    downloadPDF,
    refreshDocuments,
    getDocumentStats
  } = useTaskDocuments({ projectId, taskId });

  const stats = getDocumentStats();

  // Handle quick upload
  const handleQuickUpload = async (file: File) => {
    try {
      await uploadDocument(file);
      return false; // Prevent default upload behavior
    } catch (error) {
      return false;
    }
  };

  // More actions menu
  const moreActions: MenuProps['items'] = [
    {
      key: 'refresh',
      label: '刷新文档列表',
      icon: <SyncOutlined />,
      onClick: refreshDocuments
    },
    {
      key: 'manager',
      label: '打开文档管理器',
      icon: <FileTextOutlined />,
      onClick: () => setManagerVisible(true)
    },
    {
      type: 'divider'
    },
    {
      key: 'download-md',
      label: '导出 Markdown',
      icon: <DownloadOutlined />,
      onClick: downloadMarkdown
    },
    {
      key: 'download-pdf',
      label: '导出 PDF',
      icon: <DownloadOutlined />,
      onClick: downloadPDF
    }
  ];

  // Compact mode for task cards
  if (compact) {
    return (
      <>
        <Space size="small">
          <Badge count={stats.total} size="small" color="#1890ff">
            <Tooltip title={`${stats.total} 个文档，${stats.totalSize > 0 ? `总大小 ${Math.round(stats.totalSize / 1024)}KB` : '无文档'}`}>
              <Button
                type="text"
                icon={<FileTextOutlined />}
                size="small"
                onClick={() => setManagerVisible(true)}
                loading={loading}
              >
                文档
              </Button>
            </Tooltip>
          </Badge>
          
          <Upload
            accept=".md,.pdf,.txt"
            showUploadList={false}
            beforeUpload={handleQuickUpload}
            disabled={uploading}
          >
            <Tooltip title="快速上传文档">
              <Button
                type="text"
                icon={<PlusOutlined />}
                size="small"
                loading={uploading}
              />
            </Tooltip>
          </Upload>

          <Dropdown menu={{ items: moreActions }} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} size="small" />
          </Dropdown>
        </Space>

        <TaskDocumentManager
          projectId={projectId}
          taskId={taskId}
          visible={managerVisible}
          onClose={() => setManagerVisible(false)}
          mode="modal"
        />
      </>
    );
  }

  // Full mode for task detail pages
  return (
    <>
      <Card
        title={showTitle ? (
          <Space>
            <FileTextOutlined />
            <span>任务文档</span>
            <Badge count={stats.total} size="small" color="#1890ff" />
          </Space>
        ) : null}
        size="small"
        extra={
          <Space>
            <Tooltip title="刷新">
              <Button
                type="text"
                icon={<SyncOutlined />}
                onClick={refreshDocuments}
                loading={loading}
                size="small"
              />
            </Tooltip>
            
            <Upload
              accept=".md,.pdf,.txt"
              showUploadList={false}
              beforeUpload={handleQuickUpload}
              disabled={uploading}
            >
              <Tooltip title="快速上传">
                <Button
                  type="text"
                  icon={<CloudUploadOutlined />}
                  loading={uploading}
                  size="small"
                />
              </Tooltip>
            </Upload>

            <Dropdown menu={{ items: moreActions }} trigger={['click']}>
              <Button type="text" icon={<MoreOutlined />} size="small" />
            </Dropdown>
          </Space>
        }
        bodyStyle={{ padding: '12px 16px' }}
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {stats.total === 0 ? (
            <Text type="secondary">暂无上传文档</Text>
          ) : (
            <Space split="|" size="small">
              <Text type="secondary">
                {stats.total} 个文档
              </Text>
              <Text type="secondary">
                {stats.totalSize > 0 && `总大小 ${Math.round(stats.totalSize / 1024)}KB`}
              </Text>
              {stats.byType['text/markdown'] && (
                <Text type="secondary">
                  MD: {stats.byType['text/markdown']}
                </Text>
              )}
              {stats.byType['application/pdf'] && (
                <Text type="secondary">
                  PDF: {stats.byType['application/pdf']}
                </Text>
              )}
              {stats.byType['text/plain'] && (
                <Text type="secondary">
                  TXT: {stats.byType['text/plain']}
                </Text>
              )}
            </Space>
          )}
          
          <Space size="small">
            <Button
              size="small"
              onClick={() => setManagerVisible(true)}
              icon={<FileTextOutlined />}
            >
              管理文档
            </Button>
            
            {stats.total > 0 && (
              <>
                <Button
                  size="small"
                  onClick={downloadMarkdown}
                  icon={<DownloadOutlined />}
                >
                  导出 MD
                </Button>
                <Button
                  size="small"
                  onClick={downloadPDF}
                  icon={<DownloadOutlined />}
                >
                  导出 PDF
                </Button>
              </>
            )}
          </Space>
        </Space>
      </Card>

      <TaskDocumentManager
        projectId={projectId}
        taskId={taskId}
        visible={managerVisible}
        onClose={() => setManagerVisible(false)}
        mode="modal"
      />
    </>
  );
};

export default TaskDocumentWidget;