import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Timeline, 
  Button, 
  Typography, 
  Space, 
  Tag, 
  Card, 
  Descriptions,
  message,
  Tooltip,
  Divider
} from 'antd';
import { 
  HistoryOutlined,
  UserOutlined,
  CalendarOutlined,
  EditOutlined,
  ReloadOutlined,
  DiffOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { Document as DocumentType, DocumentVersion } from '../types/document';

const { Title, Text, Paragraph } = Typography;

interface DocumentHistoryProps {
  document: DocumentType;
  visible: boolean;
  onClose: () => void;
  onRestore?: (version: DocumentVersion) => void;
  className?: string;
}

const DocumentHistory: React.FC<DocumentHistoryProps> = ({
  document,
  visible,
  onClose,
  onRestore,
  className
}) => {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersions, setCompareVersions] = useState<[DocumentVersion | null, DocumentVersion | null]>([null, null]);

  // 加载版本历史
  const loadVersionHistory = async () => {
    setLoading(true);
    try {
      // 模拟版本历史数据
      const mockVersions: DocumentVersion[] = [
        {
          id: 1,
          document_id: document.id,
          version: 5,
          title: document.title,
          content: document.content,
          created_at: document.updated_at,
          created_by: document.created_by || 1,
          creator_name: document.creator_name || 'Unknown',
          change_summary: '更新文档内容，添加新的章节'
        },
        {
          id: 2,
          document_id: document.id,
          version: 4,
          title: document.title,
          content: '# 旧版本内容\n\n这是第四个版本的内容...',
          created_at: '2024-01-19T10:30:00Z',
          created_by: document.created_by || 1,
          creator_name: document.creator_name || 'Unknown',
          change_summary: '修复了一些格式问题'
        },
        {
          id: 3,
          document_id: document.id,
          version: 3,
          title: document.title,
          content: '# 更旧版本内容\n\n这是第三个版本的内容...',
          created_at: '2024-01-18T15:45:00Z',
          created_by: 2,
          creator_name: '李编辑',
          change_summary: '添加了图片和表格'
        },
        {
          id: 4,
          document_id: document.id,
          version: 2,
          title: document.title,
          content: '# 初始版本\n\n这是第二个版本的内容...',
          created_at: '2024-01-17T09:20:00Z',
          created_by: document.created_by || 1,
          creator_name: document.creator_name || 'Unknown',
          change_summary: '完善了文档结构'
        },
        {
          id: 5,
          document_id: document.id,
          version: 1,
          title: document.title,
          content: '# 初始版本\n\n这是最初创建的版本。',
          created_at: document.created_at,
          created_by: document.created_by || 1,
          creator_name: document.creator_name || 'Unknown',
          change_summary: '创建文档'
        }
      ];

      setVersions(mockVersions);
    } catch (error) {
      console.error('Failed to load version history:', error);
      message.error('加载版本历史失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadVersionHistory();
    }
  }, [visible]);

  // 处理版本恢复
  const handleRestore = (version: DocumentVersion) => {
    Modal.confirm({
      title: '确认恢复版本',
      content: `确定要恢复到版本 ${version.version} 吗？当前版本将作为新版本保存。`,
      okText: '恢复',
      cancelText: '取消',
      onOk: () => {
        onRestore?.(version);
        message.success(`已恢复到版本 ${version.version}`);
        onClose();
      }
    });
  };

  // 计算内容差异（简单实现）
  const calculateDiff = (oldContent: string, newContent: string) => {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    let added = 0;
    let removed = 0;
    let changed = 0;

    const maxLines = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';
      
      if (oldLine && !newLine) {
        removed++;
      } else if (!oldLine && newLine) {
        added++;
      } else if (oldLine !== newLine) {
        changed++;
      }
    }

    return { added, removed, changed };
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  // 获取版本状态颜色
  const getVersionColor = (version: DocumentVersion, index: number) => {
    if (index === 0) return 'green'; // 最新版本
    if (version.creator_name !== document.creator_name) return 'blue'; // 其他人的版本
    return 'default';
  };

  return (
    <Modal
      title={
        <Space>
          <HistoryOutlined />
          文档版本历史
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
      width={800}
      className={className}
    >
      {/* 文档信息 */}
      <Card size="small" style={{ marginBottom: '16px', backgroundColor: '#f8f9fa' }}>
        <Descriptions size="small" column={3}>
          <Descriptions.Item label="文档标题">{document.title}</Descriptions.Item>
          <Descriptions.Item label="当前版本">v{versions[0]?.version || 1}</Descriptions.Item>
          <Descriptions.Item label="总版本数">{versions.length}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 操作按钮 */}
      <div style={{ marginBottom: '16px' }}>
        <Space>
          <Button
            icon={<DiffOutlined />}
            onClick={() => setCompareMode(!compareMode)}
            type={compareMode ? 'primary' : 'default'}
          >
            {compareMode ? '退出比较' : '版本比较'}
          </Button>
          
          {compareMode && (
            <Text type="secondary">
              选择两个版本进行比较
            </Text>
          )}
        </Space>
      </div>

      {/* 版本时间线 */}
      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        <Timeline>
          {versions.map((version, index) => {
            const isSelected = selectedVersion?.id === version.id;
            const isInCompare = compareVersions.some(v => v?.id === version.id);
            const diff = index < versions.length - 1 
              ? calculateDiff(versions[index + 1].content || '', version.content || '')
              : { added: 0, removed: 0, changed: 0 };

            return (
              <Timeline.Item
                key={version.id}
                color={getVersionColor(version, index)}
                dot={index === 0 ? <EditOutlined /> : <HistoryOutlined />}
              >
                <Card
                                   style={{
                    border: isSelected || isInCompare ? '2px solid #1890ff' : '1px solid #d9d9d9',
                    backgroundColor: isSelected || isInCompare ? '#f0f8ff' : '#fff',
                    cursor: compareMode ? 'pointer' : 'default'
                  }}
                  onClick={() => {
                    if (compareMode) {
                      // 比较模式下的选择逻辑
                      const [first, second] = compareVersions;
                      if (!first) {
                        setCompareVersions([version, null]);
                      } else if (!second && first.id !== version.id) {
                        setCompareVersions([first, version]);
                      } else {
                        setCompareVersions([version, null]);
                      }
                    } else {
                      setSelectedVersion(isSelected ? null : version);
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      {/* 版本信息 */}
                      <div style={{ marginBottom: '8px' }}>
                        <Space>
                          <Tag color={getVersionColor(version, index)}>
                            v{version.version}
                          </Tag>
                          {index === 0 && <Tag color="green">当前版本</Tag>}
                          <Space size={4}>
                            <UserOutlined />
                            <Text strong>{version.creator_name}</Text>
                          </Space>
                          <Space size={4}>
                            <CalendarOutlined />
                            <Text type="secondary">{formatDate(version.created_at)}</Text>
                          </Space>
                        </Space>
                      </div>

                      {/* 变更摘要 */}
                      <div style={{ marginBottom: '8px' }}>
                        <Text>{version.change_summary || '无变更描述'}</Text>
                      </div>

                      {/* 变更统计 */}
                      {index > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                          <Space size="small">
                            {diff.added > 0 && (
                              <Tag color="green">+{diff.added} 行</Tag>
                            )}
                            {diff.removed > 0 && (
                              <Tag color="red">-{diff.removed} 行</Tag>
                            )}
                            {diff.changed > 0 && (
                              <Tag color="orange">~{diff.changed} 行</Tag>
                            )}
                          </Space>
                        </div>
                      )}

                      {/* 选中版本的详细内容 */}
                      {isSelected && !compareMode && (
                        <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                          <Title level={5}>版本内容预览</Title>
                          <Paragraph
                            style={{ 
                              maxHeight: '200px', 
                              overflowY: 'auto',
                              fontSize: '12px',
                              fontFamily: 'monospace',
                              whiteSpace: 'pre-wrap'
                            }}
                          >
                            {(version.content || '').length > 500 
                              ? (version.content || '').substring(0, 500) + '...'
                              : (version.content || '暂无内容')
                            }
                          </Paragraph>
                        </div>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    {!compareMode && (
                      <div style={{ marginLeft: '12px' }}>
                        <Space direction="vertical" size="small">
                          {index > 0 && (
                            <Tooltip title="恢复到此版本">
                              <Button
                                                               icon={<ReloadOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRestore(version);
                                }}
                              >
                                恢复
                              </Button>
                            </Tooltip>
                          )}
                        </Space>
                      </div>
                    )}
                  </div>
                </Card>
              </Timeline.Item>
            );
          })}
        </Timeline>
      </div>

      {/* 版本比较结果 */}
      {compareMode && compareVersions[0] && compareVersions[1] && (
        <Card style={{ marginTop: '16px' }}>
          <Title level={5}>
            版本比较：v{compareVersions[0].version} vs v{compareVersions[1].version}
          </Title>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <Text strong>v{compareVersions[0].version}</Text>
              <div style={{ 
                marginTop: '8px',
                padding: '8px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {compareVersions[0].content}
              </div>
            </div>
            <Divider type="vertical" style={{ height: 'auto' }} />
            <div style={{ flex: 1 }}>
              <Text strong>v{compareVersions[1].version}</Text>
              <div style={{ 
                marginTop: '8px',
                padding: '8px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {compareVersions[1].content}
              </div>
            </div>
          </div>
        </Card>
      )}
    </Modal>
  );
};

export default DocumentHistory;