import React, { useState, useEffect, useCallback } from 'react';
import { Button, message, Spin, Space, Modal, List, Typography, Tabs, Card } from 'antd';
import { 
  SaveOutlined, 
  HistoryOutlined, 
  EyeOutlined, 
  EditOutlined,
  FileTextOutlined,
  GitlabOutlined,
  InboxOutlined
} from '@ant-design/icons';
import { taskDocumentFileService, TaskDocumentContent, GitCommit, DocumentDiff } from '../services/taskDocumentFileService';
import MarkdownEditor from './MarkdownEditor';
import MarkdownRenderer from './MarkdownRenderer';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface TaskDocumentFileEditorProps {
  taskId: number;
  projectId?: number; // 如果为空则表示个人任务
  readOnly?: boolean;
  onContentChange?: (content: string) => void;
}

export const TaskDocumentFileEditor: React.FC<TaskDocumentFileEditorProps> = ({
  taskId,
  projectId,
  readOnly = false,
  onContentChange
}) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [history, setHistory] = useState<GitCommit[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [selectedCommits, setSelectedCommits] = useState<string[]>([]);
  const [diff, setDiff] = useState<DocumentDiff | null>(null);

  const isPersonalTask = projectId === undefined;

  // 加载文档内容
  const loadDocument = useCallback(async () => {
    try {
      setLoading(true);
      let doc: TaskDocumentContent;
      
      if (isPersonalTask) {
        doc = await taskDocumentFileService.getPersonalTaskDocument(taskId);
      } else {
        doc = await taskDocumentFileService.getTaskDocument(taskId, projectId!);
      }
      
      setContent(doc.content);
      setHasChanges(false);
    } catch (error: Error | unknown) {
      console.error('Failed to load document:', error);
      const status = (error as any)?.response?.status;
      if (status === 404) {
        message.info('文档不存在，将创建新文档');
        // 如果是项目任务，尝试自动创建文档
        if (!isPersonalTask) {
          try {
            await taskDocumentFileService.createTaskDocument(taskId, projectId!);
            message.success('文档创建成功');
            await loadDocument(); // 重新加载
            return;
          } catch (createError) {
            console.error('Failed to create document:', createError);
          }
        }
        setContent(getDefaultContent());
      } else {
        message.error('加载文档失败');
      }
    } finally {
      setLoading(false);
    }
  }, [taskId, projectId, isPersonalTask]);

  // 保存文档
  const saveDocument = async () => {
    try {
      setSaving(true);
      
      if (isPersonalTask) {
        await taskDocumentFileService.updatePersonalTaskDocument(taskId, content);
      } else {
        await taskDocumentFileService.updateTaskDocument(taskId, projectId!, content);
      }
      
      setHasChanges(false);
      message.success('文档保存成功');
    } catch (error) {
      console.error('Failed to save document:', error);
      message.error('保存文档失败');
    } finally {
      setSaving(false);
    }
  };

  // 处理内容变更
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(true);
    onContentChange?.(newContent);
  };

  // 加载版本历史
  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      let historyData;
      
      if (isPersonalTask) {
        historyData = await taskDocumentFileService.getPersonalTaskDocumentHistory(taskId);
      } else {
        historyData = await taskDocumentFileService.getTaskDocumentHistory(taskId, projectId!);
      }
      
      setHistory(historyData.history);
    } catch (error) {
      console.error('Failed to load history:', error);
      message.error('加载版本历史失败');
    } finally {
      setHistoryLoading(false);
    }
  };

  // 比较版本
  const compareVersions = async (fromHash: string, toHash: string) => {
    try {
      let diffData: DocumentDiff;
      
      if (isPersonalTask) {
        diffData = await taskDocumentFileService.comparePersonalTaskDocumentVersions(taskId, fromHash, toHash);
      } else {
        diffData = await taskDocumentFileService.compareTaskDocumentVersions(taskId, projectId!, fromHash, toHash);
      }
      
      setDiff(diffData);
      setCompareModalVisible(true);
    } catch (error) {
      console.error('Failed to compare versions:', error);
      message.error('版本比较失败');
    }
  };

  // 归档文档
  const archiveDocument = async () => {
    if (isPersonalTask) {
      message.info('个人任务文档暂不支持归档');
      return;
    }

    Modal.confirm({
      title: '确认归档',
      content: '归档后的文档将移动到归档目录，确定要归档吗？',
      onOk: async () => {
        try {
          await taskDocumentFileService.archiveTaskDocument(taskId, projectId!);
          message.success('文档归档成功');
        } catch (error) {
          console.error('Failed to archive document:', error);
          message.error('文档归档失败');
        }
      },
    });
  };

  // 获取默认文档内容
  const getDefaultContent = () => {
    const now = new Date().toISOString();
    
    if (isPersonalTask) {
      return `---
task_id: ${taskId}
title: "个人任务文档"
category: "personal"
status: "active"
created_date: "${now}"
updated_date: "${now}"
---

# 个人任务文档

## 🎯 个人目标
请在这里描述个人目标...

## 📋 任务内容
请在这里描述任务内容...

## 📝 工作日志
请在这里记录工作进展...

---
*个人任务 | 最后更新: ${now}*`;
    } else {
      return `---
task_id: ${taskId}
project_id: ${projectId}
title: "项目任务文档"
status: "todo"
created_date: "${now}"
updated_date: "${now}"
---

# 项目任务文档

## 📋 任务概述
请在这里描述任务概述...

## 🎯 目标
- [ ] 目标1
- [ ] 目标2
- [ ] 目标3

## 📝 详细描述
请在这里添加详细描述...

---
*最后更新: ${now}*`;
    }
  };

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          if (hasChanges && !readOnly) {
            saveDocument();
          }
        }
        if (e.key === 'p') {
          e.preventDefault();
          setPreviewMode(!previewMode);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, readOnly, previewMode]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>加载文档中...</div>
      </div>
    );
  }

  return (
    <div className="task-document-file-editor">
      {/* 工具栏 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Button
              icon={<EditOutlined />}
              type={!previewMode ? 'primary' : 'default'}
              onClick={() => setPreviewMode(false)}
              size="small"
            >
              编辑
            </Button>
            <Button
              icon={<EyeOutlined />}
              type={previewMode ? 'primary' : 'default'}
              onClick={() => setPreviewMode(true)}
              size="small"
            >
              预览
            </Button>
            <Button
              icon={<HistoryOutlined />}
              onClick={() => {
                setHistoryVisible(true);
                loadHistory();
              }}
              size="small"
            >
              版本历史
            </Button>
            {!isPersonalTask && (
              <Button
                icon={<InboxOutlined />}
                onClick={archiveDocument}
                size="small"
              >
                归档
              </Button>
            )}
          </Space>

          <Space>
            {hasChanges && (
              <Text type="warning" style={{ fontSize: '12px' }}>
                <FileTextOutlined /> 有未保存的更改
              </Text>
            )}
            {!readOnly && (
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                disabled={!hasChanges}
                onClick={saveDocument}
                size="small"
              >
                保存 (Ctrl+S)
              </Button>
            )}
          </Space>
        </div>
      </Card>

      {/* 文档内容 */}
      <div style={{ minHeight: '600px', border: '1px solid #d9d9d9', borderRadius: '6px' }}>
        {previewMode ? (
          <div style={{ padding: '24px' }}>
            <MarkdownRenderer content={content} />
          </div>
        ) : (
          <MarkdownEditor
            value={content}
            onChange={handleContentChange}
            readOnly={readOnly}
            height={600}
            placeholder="请输入文档内容..."
          />
        )}
      </div>

      {/* 版本历史对话框 */}
      <Modal
        title={
          <span>
            <GitlabOutlined /> 版本历史
          </span>
        }
        open={historyVisible}
        onCancel={() => setHistoryVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setHistoryVisible(false)}>
            关闭
          </Button>,
          <Button
            key="compare"
            type="primary"
            disabled={selectedCommits.length !== 2}
            onClick={() => {
              if (selectedCommits.length === 2) {
                compareVersions(selectedCommits[1], selectedCommits[0]);
              }
            }}
          >
            比较选中版本
          </Button>,
        ]}
      >
        <Spin spinning={historyLoading}>
          <List
            dataSource={history}
            renderItem={(commit) => (
              <List.Item
                style={{ 
                  cursor: 'pointer',
                  backgroundColor: selectedCommits.includes(commit.hash) ? '#f0f8ff' : 'transparent'
                }}
                onClick={() => {
                  const newSelected = [...selectedCommits];
                  const index = newSelected.indexOf(commit.hash);
                  if (index > -1) {
                    newSelected.splice(index, 1);
                  } else if (newSelected.length < 2) {
                    newSelected.push(commit.hash);
                  } else {
                    newSelected[1] = commit.hash;
                  }
                  setSelectedCommits(newSelected);
                }}
              >
                <List.Item.Meta
                  title={
                    <div>
                      <Text strong>{commit.message}</Text>
                      <Text type="secondary" style={{ marginLeft: '8px', fontSize: '12px' }}>
                        {commit.hash.substring(0, 8)}
                      </Text>
                    </div>
                  }
                  description={
                    <div>
                      <Text type="secondary">{commit.author}</Text>
                      <Text type="secondary" style={{ marginLeft: '8px' }}>
                        {new Date(commit.date).toLocaleString()}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Spin>
      </Modal>

      {/* 版本比较对话框 */}
      <Modal
        title="版本比较"
        open={compareModalVisible}
        onCancel={() => setCompareModalVisible(false)}
        width={1000}
        footer={[
          <Button key="close" onClick={() => setCompareModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {diff && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <Text>
                比较从 <Text code>{diff.fromHash.substring(0, 8)}</Text> 到{' '}
                <Text code>{diff.toHash.substring(0, 8)}</Text>
              </Text>
            </div>
            <pre
              style={{
                backgroundColor: '#f5f5f5',
                padding: '16px',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '500px',
                fontSize: '12px',
                fontFamily: 'Monaco, Consolas, monospace',
              }}
            >
              {diff.diff}
            </pre>
          </div>
        )}
      </Modal>
      
      {/* 提示信息 */}
      {!readOnly && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
          快捷键：Ctrl+S 保存，Ctrl+P 切换预览
        </div>
      )}
    </div>
  );
};