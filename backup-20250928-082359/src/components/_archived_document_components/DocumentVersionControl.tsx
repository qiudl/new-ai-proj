/**
 * 文档版本控制组件
 * 提供文档版本历史、比较、回滚等功能
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Timeline,
  Button,
  Modal,
  Space,
  Typography,
  Tag,
  Avatar,
  Tooltip,
  Popconfirm,
  Divider,
  Row,
  Col,
  Statistic,
  Select,
  Input,
  Tabs,
  Alert,
  List,
  Badge,
  message,
  Spin
} from 'antd';
import {
  HistoryOutlined,
  UserOutlined,
  ClockCircleOutlined,
  RollbackOutlined,
  EyeOutlined,
  DiffOutlined,
  BranchesOutlined,
  TagOutlined,
  SaveOutlined,
  RestOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { Document } from '../types/document';
import { documentVersionService } from '../services/documentVersionService';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;

// 版本信息接口
export interface DocumentVersion {
  id: string;
  documentId: number;
  version: string;
  title: string;
  content: string;
  summary: string;
  createdBy: string;
  createdByName: string;
  createdByAvatar?: string;
  createdAt: string;
  size: number;
  changeType: 'create' | 'update' | 'major' | 'minor' | 'patch';
  tags: string[];
  isCurrent: boolean;
  parentVersion?: string;
  metadata?: {
    wordCount: number;
    characterCount: number;
    linesAdded: number;
    linesDeleted: number;
    changesCount: number;
  };
}

// 版本比较结果
export interface VersionDiff {
  added: Array<{ line: number; content: string }>;
  removed: Array<{ line: number; content: string }>;
  modified: Array<{ line: number; old: string; new: string }>;
  summary: {
    linesAdded: number;
    linesRemoved: number;
    linesModified: number;
    totalChanges: number;
  };
}

interface DocumentVersionControlProps {
  document: Document;
  visible: boolean;
  onClose: () => void;
  onVersionRestore?: (version: DocumentVersion) => void;
  onVersionUpdate?: () => void;
}

const DocumentVersionControl: React.FC<DocumentVersionControlProps> = ({
  document,
  visible,
  onClose,
  onVersionRestore,
  onVersionUpdate
}) => {
  // 状态管理
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersions, setCompareVersions] = useState<{
    source: DocumentVersion | null;
    target: DocumentVersion | null;
  }>({ source: null, target: null });
  
  // 模态框状态
  const [previewVisible, setPreviewVisible] = useState(false);
  const [diffVisible, setDiffVisible] = useState(false);
  const [createVersionVisible, setCreateVersionVisible] = useState(false);
  
  // 版本比较结果
  const [versionDiff, setVersionDiff] = useState<VersionDiff | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  // 加载版本历史
  useEffect(() => {
    if (visible && document.id) {
      loadVersionHistory();
    }
  }, [visible, document.id]);

  const loadVersionHistory = async () => {
    try {
      setLoading(true);
      const response = await documentVersionService.getVersionHistory(document.id);
      setVersions(response.versions);
    } catch (error) {
      console.error('加载版本历史失败:', error);
      message.error('加载版本历史失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建新版本
  const handleCreateVersion = async (values: {
    summary: string;
    changeType: string;
    tags: string[];
  }) => {
    try {
      // Mock createVersion implementation since method doesn't exist yet
      const newVersion = {
        id: `v${Date.now()}`,
        summary: values.summary,
        changeType: values.changeType,
        tags: values.tags,
        created_at: new Date().toISOString()
      };
      
      message.success('版本创建成功');
      setCreateVersionVisible(false);
      await loadVersionHistory();
      onVersionUpdate?.();
    } catch (error) {
      console.error('创建版本失败:', error);
      message.error('创建版本失败');
    }
  };

  // 版本回滚
  const handleVersionRestore = async (version: DocumentVersion) => {
    try {
      await documentVersionService.restoreVersion(document.id, version.id);
      message.success(`已回滚到版本 ${version.version}`);
      await loadVersionHistory();
      onVersionRestore?.(version);
    } catch (error) {
      console.error('版本回滚失败:', error);
      message.error('版本回滚失败');
    }
  };

  // 版本比较
  const handleVersionCompare = async (sourceVersion: DocumentVersion, targetVersion: DocumentVersion) => {
    try {
      setDiffLoading(true);
      const diff = await documentVersionService.compareVersions(
        document.id,
        sourceVersion.id,
        targetVersion.id
      );
      setVersionDiff(diff);
      setDiffVisible(true);
    } catch (error) {
      console.error('版本比较失败:', error);
      message.error('版本比较失败');
    } finally {
      setDiffLoading(false);
    }
  };

  // 计算版本统计
  const versionStats = useMemo(() => {
    if (versions.length === 0) return null;

    const currentVersion = versions.find(v => v.isCurrent);
    const totalVersions = versions.length;
    const contributors = Array.from(new Set(versions.map(v => v.createdByName)));
    const lastUpdate = versions[0]?.createdAt;

    return {
      currentVersion: currentVersion?.version || 'Unknown',
      totalVersions,
      contributors: contributors.length,
      lastUpdate
    };
  }, [versions]);

  // 渲染版本类型标签
  const renderChangeTypeTag = (changeType: string) => {
    const typeConfig = {
      create: { color: 'green', text: '创建' },
      major: { color: 'red', text: '重大更新' },
      minor: { color: 'orange', text: '次要更新' },
      patch: { color: 'blue', text: '补丁' },
      update: { color: 'default', text: '更新' }
    };
    
    const config = typeConfig[changeType as keyof typeof typeConfig] || typeConfig.update;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 渲染版本时间线
  const renderVersionTimeline = () => (
    <Timeline>
      {versions.map((version, index) => (
        <Timeline.Item
          key={version.id}
          dot={
            version.isCurrent ? (
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
            ) : (
              <ClockCircleOutlined style={{ color: '#1890ff' }} />
            )
          }
          color={version.isCurrent ? 'green' : 'blue'}
        >
          <Card  style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <Space direction="vertical"  style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text strong>版本 {version.version}</Text>
                    {version.isCurrent && <Badge status="success" text="当前版本" />}
                    {renderChangeTypeTag(version.changeType)}
                  </div>
                  
                  <Text>{version.summary}</Text>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Space >
                      <Avatar  src={version.createdByAvatar} icon={<UserOutlined />} />
                      <Text type="secondary">{version.createdByName}</Text>
                    </Space>
                    <Text type="secondary">
                      {new Date(version.createdAt).toLocaleString()}
                    </Text>
                    {version.metadata && (
                      <Text type="secondary">
                        {version.metadata.wordCount} 字
                      </Text>
                    )}
                  </div>
                  
                  {version.tags.length > 0 && (
                    <Space wrap>
                      {version.tags.map(tag => (
                        <Tag key={tag} icon={<TagOutlined />}>
                          {tag}
                        </Tag>
                      ))}
                    </Space>
                  )}
                </Space>
              </div>
              
              <Space direction="vertical" >
                <Button
                  
                  icon={<EyeOutlined />}
                  onClick={() => {
                    setSelectedVersion(version);
                    setPreviewVisible(true);
                  }}
                >
                  预览
                </Button>
                
                {!version.isCurrent && (
                  <Popconfirm
                    title="确定要回滚到此版本吗？"
                    description="这将创建一个新的版本，当前版本不会丢失。"
                    onConfirm={() => handleVersionRestore(version)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button
                      
                      icon={<RollbackOutlined />}
                      type="dashed"
                    >
                      回滚
                    </Button>
                  </Popconfirm>
                )}
                
                {index < versions.length - 1 && (
                  <Button
                    
                    icon={<DiffOutlined />}
                    onClick={() => handleVersionCompare(versions[index + 1], version)}
                    loading={diffLoading}
                  >
                    比较
                  </Button>
                )}
              </Space>
            </div>
          </Card>
        </Timeline.Item>
      ))}
    </Timeline>
  );

  // 渲染版本预览
  const renderVersionPreview = () => (
    <Modal
      title={`版本预览 - ${selectedVersion?.version}`}
      open={previewVisible}
      onCancel={() => setPreviewVisible(false)}
      width={800}
      footer={[
        <Button key="close" onClick={() => setPreviewVisible(false)}>
          关闭
        </Button>,
        selectedVersion && !selectedVersion.isCurrent && (
          <Popconfirm
            key="restore"
            title="确定要回滚到此版本吗？"
            onConfirm={() => {
              if (selectedVersion) {
                handleVersionRestore(selectedVersion);
                setPreviewVisible(false);
              }
            }}
            okText="确定"
            cancelText="取消"
          >
            <Button type="primary" icon={<RollbackOutlined />}>
              回滚到此版本
            </Button>
          </Popconfirm>
        )
      ]}
    >
      {selectedVersion && (
        <div>
          <Card  style={{ marginBottom: 16 }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic title="版本号" value={selectedVersion.version} />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="创建时间" 
                  value={new Date(selectedVersion.createdAt).toLocaleString()} 
                />
              </Col>
              <Col span={12}>
                <Statistic title="创建者" value={selectedVersion.createdByName} />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="文件大小" 
                  value={`${(selectedVersion.size / 1024).toFixed(2)} KB`} 
                />
              </Col>
            </Row>
          </Card>
          
          <Divider>内容预览</Divider>
          
          <div style={{ 
            background: '#f5f5f5', 
            padding: '16px', 
            borderRadius: '6px',
            maxHeight: '400px',
            overflow: 'auto'
          }}>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              wordBreak: 'break-word',
              margin: 0,
              fontFamily: 'monospace'
            }}>
              {selectedVersion.content}
            </pre>
          </div>
        </div>
      )}
    </Modal>
  );

  // 渲染版本比较结果
  const renderVersionDiff = () => (
    <Modal
      title="版本比较"
      open={diffVisible}
      onCancel={() => setDiffVisible(false)}
      width={1000}
      footer={[
        <Button key="close" onClick={() => setDiffVisible(false)}>
          关闭
        </Button>
      ]}
    >
      {versionDiff && (
        <div>
          <Card  style={{ marginBottom: 16 }}>
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <Statistic 
                  title="新增行数" 
                  value={versionDiff.summary.linesAdded} 
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="删除行数" 
                  value={versionDiff.summary.linesRemoved} 
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="修改行数" 
                  value={versionDiff.summary.linesModified}
                  valueStyle={{ color: '#d46b08' }}
                />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="总变更" 
                  value={versionDiff.summary.totalChanges}
                />
              </Col>
            </Row>
          </Card>

          <Tabs defaultActiveKey="unified">
            <TabPane tab="统一视图" key="unified">
              <div style={{ 
                background: '#f5f5f5', 
                padding: '16px', 
                borderRadius: '6px',
                maxHeight: '500px',
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: '13px'
              }}>
                {/* 新增内容 */}
                {versionDiff.added.map(change => (
                  <div key={`add-${change.line}`} style={{ 
                    background: '#f6ffed', 
                    color: '#389e0d',
                    padding: '2px 8px',
                    borderLeft: '3px solid #52c41a'
                  }}>
                    +{change.line}: {change.content}
                  </div>
                ))}
                
                {/* 删除内容 */}
                {versionDiff.removed.map(change => (
                  <div key={`remove-${change.line}`} style={{ 
                    background: '#fff2f0', 
                    color: '#cf1322',
                    padding: '2px 8px',
                    borderLeft: '3px solid #ff4d4f'
                  }}>
                    -{change.line}: {change.content}
                  </div>
                ))}
                
                {/* 修改内容 */}
                {versionDiff.modified.map(change => (
                  <div key={`modify-${change.line}`}>
                    <div style={{ 
                      background: '#fff2f0', 
                      color: '#cf1322',
                      padding: '2px 8px',
                      borderLeft: '3px solid #ff4d4f'
                    }}>
                      -{change.line}: {change.old}
                    </div>
                    <div style={{ 
                      background: '#f6ffed', 
                      color: '#389e0d',
                      padding: '2px 8px',
                      borderLeft: '3px solid #52c41a'
                    }}>
                      +{change.line}: {change.new}
                    </div>
                  </div>
                ))}
              </div>
            </TabPane>
            
            <TabPane tab="并排视图" key="sidebyside">
              <Row gutter={16}>
                <Col span={12}>
                  <Title level={5}>旧版本</Title>
                  <div style={{ 
                    background: '#fff2f0', 
                    padding: '16px', 
                    borderRadius: '6px',
                    height: '500px',
                    overflow: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '13px'
                  }}>
                    {/* 旧版本内容展示 */}
                    <Text>旧版本内容...</Text>
                  </div>
                </Col>
                <Col span={12}>
                  <Title level={5}>新版本</Title>
                  <div style={{ 
                    background: '#f6ffed', 
                    padding: '16px', 
                    borderRadius: '6px',
                    height: '500px',
                    overflow: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '13px'
                  }}>
                    {/* 新版本内容展示 */}
                    <Text>新版本内容...</Text>
                  </div>
                </Col>
              </Row>
            </TabPane>
          </Tabs>
        </div>
      )}
    </Modal>
  );

  return (
    <>
      <Modal
        title={
          <Space>
            <HistoryOutlined />
            文档版本历史 - {document.title}
          </Space>
        }
        open={visible}
        onCancel={onClose}
        width={900}
        footer={[
          <Button key="close" onClick={onClose}>
            关闭
          </Button>,
          <Button
            key="create"
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => setCreateVersionVisible(true)}
          >
            创建版本
          </Button>
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          {versionStats && (
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6}>
                <Statistic
                  title="当前版本"
                  value={versionStats.currentVersion}
                  prefix={<BranchesOutlined />}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="总版本数"
                  value={versionStats.totalVersions}
                  prefix={<FileTextOutlined />}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="参与人数"
                  value={versionStats.contributors}
                  prefix={<UserOutlined />}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="最后更新"
                  value={new Date(versionStats.lastUpdate).toLocaleDateString()}
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
            </Row>
          )}
        </div>

        <Divider />

        <Spin spinning={loading}>
          {versions.length > 0 ? (
            renderVersionTimeline()
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">加载版本历史中...</Text>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">暂无版本历史</Text>
              </div>
            </div>
          )}
        </Spin>
      </Modal>

      {/* 版本预览模态框 */}
      {renderVersionPreview()}

      {/* 版本比较模态框 */}
      {renderVersionDiff()}

      {/* 创建版本模态框 */}
      <Modal
        title="创建新版本"
        open={createVersionVisible}
        onCancel={() => setCreateVersionVisible(false)}
        onOk={() => {
          // 这里应该有表单提交逻辑
          message.success('版本创建功能演示 - 需要集成表单组件');
          setCreateVersionVisible(false);
        }}
      >
        <Alert
          message="版本创建"
          description="此功能用于创建文档的新版本快照，记录重要的修改节点。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>版本摘要</Text>
            <TextArea
              placeholder="描述此版本的主要变更..."
              rows={3}
              style={{ marginTop: 8 }}
            />
          </div>
          
          <div>
            <Text strong>变更类型</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              placeholder="选择变更类型"
              defaultValue="minor"
            >
              <Select.Option value="major">重大更新</Select.Option>
              <Select.Option value="minor">次要更新</Select.Option>
              <Select.Option value="patch">补丁修复</Select.Option>
            </Select>
          </div>
        </Space>
      </Modal>
    </>
  );
};

export default DocumentVersionControl;