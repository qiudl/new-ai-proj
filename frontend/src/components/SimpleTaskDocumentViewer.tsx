/**
 * SimpleTaskDocumentViewer - 轻量级任务文档查看器
 *
 * 设计理念：
 * - 极简设计，只保留核心功能
 * - 快速加载（<1秒）
 * - 使用多层缓存（L1内存 + L2 IndexedDB）
 * - 编辑功能跳转到专门页面
 *
 * 性能目标：
 * - 组件大小：~300行
 * - React Hooks：~10个
 * - 首次加载：<1秒
 * - 缓存加载：<100ms
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  List,
  Button,
  Space,
  Typography,
  Empty,
  Spin,
  Tag,
  Tooltip,
  message,
  Modal,
  Divider
} from 'antd';
import {
  FileTextOutlined,
  EyeOutlined,
  EditOutlined,
  PlusOutlined,
  FileMarkdownOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { documentCacheService } from '../services/documentCacheService';
import api from '../services/api';
import type { DocumentItem } from './UnifiedTaskDocumentArea';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Title, Text, Paragraph } = Typography;

interface SimpleTaskDocumentViewerProps {
  projectId: number;
  taskId: number;
  height?: number | string;
  onDocumentChange?: () => void;
}

const SimpleTaskDocumentViewer: React.FC<SimpleTaskDocumentViewerProps> = ({
  projectId,
  taskId,
  height = 600,
  onDocumentChange
}) => {
  // 状态管理 - 只保留核心状态
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  // 加载文档列表
  const loadDocuments = useCallback(async (force = false) => {
    const startTime = performance.now();

    try {
      setLoading(true);

      // 优先从缓存加载
      if (!force) {
        const cached = await documentCacheService.get(projectId, taskId);
        if (cached && cached.length > 0) {
          const loadTime = performance.now() - startTime;
          console.log(`✅ [SimpleViewer] 从缓存加载文档 (${cached.length}个，耗时${loadTime.toFixed(2)}ms)`);
          setDocuments(cached);
          setLoading(false);
          return;
        }
      }

      console.log(`📡 [SimpleViewer] 从API加载文档...`);

      // 从API加载
      const response = await api.get(`/projects/${projectId}/tasks/${taskId}/documents/all`, {
        params: {
          include_content: false // 列表不需要内容，提高性能
        }
      });

      const result = response.data;

      // API已经合并了所有文档（documents + work_notes + uploaded_files）
      // 注意：当没有文档时，API可能返回 documents: null
      const allDocuments = Array.isArray(result?.documents) ? result.documents : [];

      // 转换为DocumentItem格式
      const docs: DocumentItem[] = allDocuments.map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        content: doc.content || '',
        description: doc.description || '',
        type: doc.type,
        mime_type: doc.mime_type,
        file_size: doc.file_size,
        version: doc.version || 1,
        status: doc.status || 'published',
        visibility: doc.visibility || 'team',
        is_template: doc.is_template || false,
        project_id: doc.project_id || projectId,
        task_id: doc.task_id || taskId,
        owner_id: doc.owner_id || 0,
        created_by: doc.created_by || 0,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        tags: doc.tags || [],
        selected: false,
        sourceTaskId: taskId,
        file_path: doc.file_path,
        can_edit: doc.can_edit !== false,
        can_delete: doc.can_delete !== false,
        can_share: doc.can_share !== false,
        source_type: doc.source_type
      }));

      // 保存到缓存
      await documentCacheService.set(projectId, taskId, docs);

      setDocuments(docs);

      const loadTime = performance.now() - startTime;
      console.log(`✅ [SimpleViewer] 文档加载完成 (${docs.length}个，耗时${loadTime.toFixed(2)}ms)`);
    } catch (error) {
      console.error('❌ [SimpleViewer] 加载文档失败:', error);
      message.error('加载文档失败');
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId]);

  // 预览文档
  const handlePreview = useCallback(async (doc: DocumentItem) => {
    try {
      // 如果没有内容，需要加载完整文档
      if (!doc.content) {
        const response = await api.get(`/projects/${projectId}/tasks/${taskId}/documents/all`, {
          params: {
            include_content: true
          }
        });

        const result = response.data;
        // API已经合并了所有文档
        // 注意：当没有文档时，API可能返回 documents: null
        const allDocs = Array.isArray(result?.documents) ? result.documents : [];

        const fullDoc = allDocs.find((d: any) => d.id === doc.id);
        if (fullDoc) {
          doc.content = fullDoc.content || '暂无内容';
        }
      }

      setSelectedDoc(doc);
      setPreviewVisible(true);
    } catch (error) {
      console.error('预览文档失败:', error);
      message.error('预览文档失败');
    }
  }, [projectId, taskId]);

  // 获取文档图标
  const getDocIcon = (doc: DocumentItem) => {
    if (doc.type === 'markdown') return <FileMarkdownOutlined />;
    if (doc.type === 'pdf') return <FilePdfOutlined />;
    if (doc.type === 'image') return <FileImageOutlined />;
    return <FileOutlined />;
  };

  // 获取文档类型标签
  const getDocTypeTag = (doc: DocumentItem) => {
    if (doc.source_type === 'work_note') return <Tag color="blue">工作笔记</Tag>;
    if (doc.source_type === 'uploaded_file') return <Tag color="green">上传文件</Tag>;
    return <Tag>文档</Tag>;
  };

  // 初始加载
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  return (
    <div className="simple-task-document-viewer" style={{ height }}>
      <Card
        title={
          <Space>
            <FileTextOutlined />
            <span>任务文档</span>
            <Text type="secondary">({documents.length})</Text>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<PlusOutlined />}
              type="primary"
              onClick={() => {
                // 跳转到新建文档页面
                window.location.href = `/projects/${projectId}/tasks/${taskId}/documents/new`;
              }}
            >
              新建文档
            </Button>
          </Space>
        }
        style={{ height: '100%' }}
        bodyStyle={{ height: 'calc(100% - 57px)', overflowY: 'auto' }}
      >
        <Spin spinning={loading}>
          {documents.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无文档"
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  window.location.href = `/projects/${projectId}/tasks/${taskId}/documents/new`;
                }}
              >
                创建第一个文档
              </Button>
            </Empty>
          ) : (
            <List
              itemLayout="horizontal"
              dataSource={documents}
              renderItem={(doc) => (
                <List.Item
                  actions={[
                    <Tooltip title="预览">
                      <Button
                        icon={<EyeOutlined />}
                        onClick={() => handlePreview(doc)}
                      />
                    </Tooltip>,
                    <Tooltip title="编辑">
                      <Button
                        icon={<EditOutlined />}
                        onClick={() => {
                          // 跳转到编辑页面
                          window.location.href = `/projects/${projectId}/documents/${doc.id}/edit`;
                        }}
                      />
                    </Tooltip>
                  ]}
                >
                  <List.Item.Meta
                    avatar={getDocIcon(doc)}
                    title={
                      <Space>
                        <a onClick={() => handlePreview(doc)}>{doc.title}</a>
                        {getDocTypeTag(doc)}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={0}>
                        {doc.description && (
                          <Text type="secondary" ellipsis>
                            {doc.description}
                          </Text>
                        )}
                        <Space size="large">
                          <Text type="secondary">
                            <ClockCircleOutlined /> {dayjs(doc.updated_at).fromNow()}
                          </Text>
                          {doc.file_size && (
                            <Text type="secondary">
                              {(doc.file_size / 1024).toFixed(2)} KB
                            </Text>
                          )}
                        </Space>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Spin>
      </Card>

      {/* 预览模态框 */}
      <Modal
        title={selectedDoc?.title}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>,
          <Button
            key="edit"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              window.location.href = `/projects/${projectId}/documents/${selectedDoc?.id}/edit`;
            }}
          >
            编辑
          </Button>
        ]}
      >
        {selectedDoc && (
          <div>
            {selectedDoc.description && (
              <Paragraph type="secondary">{selectedDoc.description}</Paragraph>
            )}
            <Divider />
            <div
              style={{
                minHeight: 300,
                maxHeight: 500,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap'
              }}
            >
              {selectedDoc.content || '暂无内容'}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SimpleTaskDocumentViewer;
