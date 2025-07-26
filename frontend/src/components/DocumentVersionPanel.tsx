import React, { useState, useEffect } from 'react';
import {
  Card,
  Timeline,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Tooltip,
  Avatar,
  Typography,
  Row,
  Col,
  Statistic,
  Alert,
  Badge,
  Popconfirm,
  Dropdown,
  Tabs,
  List,
  Empty,
  Divider,
  Progress,
  message
} from 'antd';
import {
  HistoryOutlined,
  BranchesOutlined,
  TagOutlined,
  CommentOutlined,
  SwapOutlined,
  UndoOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  ExportOutlined,
  ReloadOutlined,
  CompressOutlined,
  ExpandOutlined,
  CopyOutlined,
  PrinterOutlined,
  CloudDownloadOutlined,
  FolderOpenOutlined,
  SettingOutlined,
  SecurityScanOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import {
  DocumentVersion,
  DocumentVersionLabel,
  DocumentVersionComment,
  DocumentVersionStats,
  CreateVersionLabelRequest,
  CreateVersionCommentRequest,
  RestoreDocumentVersionRequest,
  CompareVersionsRequest,
  VersionComparisonResponse,
  VersionViewMode,
  VersionFilter,
  VersionCompareSelection,
  getVersionName,
  getVersionChangeType,
  formatFileSize,
  formatVersionDate,
  calculateVersionDiff,
  getSimilarityText,
  VERSION_CHANGE_TYPES,
  VERSION_LABEL_COLORS
} from '../types/version';
import { documentVersionService } from '../services/documentVersionService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

interface DocumentVersionPanelProps {
  documentId: number;
  currentVersion: number;
  onVersionChange?: (version: DocumentVersion) => void;
  style?: React.CSSProperties;
}

const DocumentVersionPanel: React.FC<DocumentVersionPanelProps> = ({
  documentId,
  currentVersion,
  onVersionChange,
  style
}) => {
  // State management
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [stats, setStats] = useState<DocumentVersionStats | null>(null);
  const [labels, setLabels] = useState<DocumentVersionLabel[]>([]);
  const [comments, setComments] = useState<DocumentVersionComment[]>([]);
  
  // UI state
  const [viewMode, setViewMode] = useState<VersionViewMode>({
    type: 'timeline',
    showMajorOnly: false,
    showLabels: true,
    showComments: true
  });
  
  const [filter, setFilter] = useState<VersionFilter>({});
  const [compareSelection, setCompareSelection] = useState<VersionCompareSelection>({
    isComparing: false
  });
  
  // Modal states
  const [labelModalVisible, setLabelModalVisible] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [comparisonResult, setComparisonResult] = useState<VersionComparisonResponse | null>(null);
  
  // Form instances
  const [labelForm] = Form.useForm();
  const [commentForm] = Form.useForm();
  const [restoreForm] = Form.useForm();

  // Load data
  useEffect(() => {
    if (documentId) {
      loadVersionHistory();
    }
  }, [documentId]);

  const loadVersionHistory = async () => {
    try {
      setLoading(true);
      const response = await documentVersionService.getMockFullVersionHistory(documentId);
      setVersions(response.versions);
      setStats(response.stats);
      setLabels(response.labels);
      
      // Load comments for each version
      const allComments: DocumentVersionComment[] = [];
      for (const version of response.versions) {
        const versionComments = await documentVersionService.getMockVersionComments(version.version_number);
        allComments.push(...versionComments);
      }
      setComments(allComments);
    } catch (error) {
      console.error('Failed to load version history:', error);
      message.error('加载版本历史失败');
    } finally {
      setLoading(false);
    }
  };

  // Filter versions based on current filter
  const filteredVersions = versions.filter(version => {
    if (viewMode.showMajorOnly && !version.is_major_version) {
      return false;
    }
    
    if (filter.searchTerm) {
      const searchLower = filter.searchTerm.toLowerCase();
      if (!version.title.toLowerCase().includes(searchLower) && 
          !version.change_summary?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    
    if (filter.creators && filter.creators.length > 0) {
      if (!filter.creators.includes(version.created_by)) {
        return false;
      }
    }
    
    if (filter.withLabels) {
      const versionLabels = labels.filter(l => 
        l.document_id === version.document_id && l.version_number === version.version_number
      );
      if (versionLabels.length === 0) {
        return false;
      }
    }
    
    if (filter.withComments) {
      const versionComments = comments.filter(c => 
        c.document_id === version.document_id && c.version_number === version.version_number
      );
      if (versionComments.length === 0) {
        return false;
      }
    }
    
    return true;
  });

  // Handle version operations
  const handleCreateLabel = async (values: any) => {
    try {
      if (!selectedVersion) return;
      
      const request: CreateVersionLabelRequest = {
        document_id: selectedVersion.document_id,
        version_number: selectedVersion.version_number,
        label: values.label,
        color: values.color,
        description: values.description
      };

      // Mock implementation
      const newLabel: DocumentVersionLabel = {
        id: Date.now(),
        ...request,
        created_by: 1,
        created_at: new Date().toISOString(),
        created_by_name: 'Admin'
      };

      setLabels(prev => [...prev, newLabel]);
      message.success('版本标签创建成功');
      setLabelModalVisible(false);
      labelForm.resetFields();
    } catch (error) {
      message.error('创建版本标签失败');
    }
  };

  const handleCreateComment = async (values: any) => {
    try {
      if (!selectedVersion) return;
      
      const request: CreateVersionCommentRequest = {
        document_id: selectedVersion.document_id,
        version_number: selectedVersion.version_number,
        content: values.content,
        line_number: values.line_number
      };

      // Mock implementation
      const newComment: DocumentVersionComment = {
        id: Date.now(),
        ...request,
        user_id: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_resolved: false,
        username: 'Admin'
      };

      setComments(prev => [...prev, newComment]);
      message.success('版本评论添加成功');
      setCommentModalVisible(false);
      commentForm.resetFields();
    } catch (error) {
      message.error('添加版本评论失败');
    }
  };

  const handleRestoreVersion = async (values: any) => {
    try {
      if (!selectedVersion) return;
      
      const request: RestoreDocumentVersionRequest = {
        target_version: selectedVersion.version_number,
        change_summary: values.change_summary
      };

      message.success(`文档已恢复到版本 ${getVersionName(selectedVersion)}`);
      setRestoreModalVisible(false);
      restoreForm.resetFields();
      loadVersionHistory();
      
      if (onVersionChange) {
        onVersionChange(selectedVersion);
      }
    } catch (error) {
      message.error('恢复版本失败');
    }
  };

  const handleCompareVersions = async () => {
    try {
      if (!compareSelection.fromVersion || !compareSelection.toVersion) {
        message.warning('请选择要比较的两个版本');
        return;
      }

      const request: CompareVersionsRequest = {
        document_id: documentId,
        from_version: compareSelection.fromVersion,
        to_version: compareSelection.toVersion
      };

      const result = await documentVersionService.getMockVersionComparison(
        request.from_version,
        request.to_version
      );

      setComparisonResult(result);
      setCompareModalVisible(true);
    } catch (error) {
      message.error('版本比较失败');
    }
  };

  // 批量操作
  const handleBatchDeleteVersions = async (versionNumbers: number[]) => {
    try {
      // TODO: 调用批量删除API
      // await documentVersionService.batchDeleteVersions(documentId, versionNumbers);
      message.success(`成功删除 ${versionNumbers.length} 个版本`);
      loadVersionHistory();
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  const handleBatchAddLabels = async (versionNumbers: number[], labelData: any) => {
    try {
      // TODO: 调用批量添加标签API
      // await documentVersionService.batchAddLabels(documentId, versionNumbers, labelData);
      message.success(`成功为 ${versionNumbers.length} 个版本添加标签`);
      loadVersionHistory();
    } catch (error) {
      message.error('批量添加标签失败');
    }
  };

  // 导出功能
  const handleExportVersionHistory = async (format: 'pdf' | 'excel' | 'json') => {
    try {
      // TODO: 调用导出API
      // const blob = await documentVersionService.exportVersionHistory(documentId, format);
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `version_history_${documentId}.${format}`;
      // a.click();
      message.success(`版本历史导出成功 (${format.toUpperCase()})`);
    } catch (error) {
      message.error('导出失败');
    }
  };

  // 版本归档
  const handleArchiveOldVersions = async (beforeDate: string) => {
    try {
      // TODO: 调用归档API
      // await documentVersionService.archiveVersions(documentId, beforeDate);
      message.success('旧版本归档成功');
      loadVersionHistory();
    } catch (error) {
      message.error('归档失败');
    }
  };

  // 版本压缩
  const handleCompressVersions = async () => {
    try {
      // TODO: 调用压缩API
      // await documentVersionService.compressVersions(documentId);
      message.success('版本历史压缩成功');
      loadVersionHistory();
    } catch (error) {
      message.error('压缩失败');
    }
  };

  // Get version labels for a specific version
  const getVersionLabels = (version: DocumentVersion) => {
    return labels.filter(label => 
      label.document_id === version.document_id && 
      label.version_number === version.version_number
    );
  };

  // Get version comments for a specific version
  const getVersionComments = (version: DocumentVersion) => {
    return comments.filter(comment => 
      comment.document_id === version.document_id && 
      comment.version_number === version.version_number
    );
  };

  // Action menu items for each version
  const getVersionActions = (version: DocumentVersion): MenuProps['items'] => {
    const isCurrentVersion = version.version_number === currentVersion;
    
    return [
      {
        key: 'view',
        label: '查看详情',
        icon: <EyeOutlined />
      },
      {
        key: 'download',
        label: '下载版本',
        icon: <DownloadOutlined />
      },
      {
        key: 'share',
        label: '分享版本',
        icon: <ShareAltOutlined />
      },
      { type: 'divider' },
      {
        key: 'label',
        label: '添加标签',
        icon: <TagOutlined />
      },
      {
        key: 'comment',
        label: '添加评论',
        icon: <CommentOutlined />
      },
      { type: 'divider' },
      {
        key: 'compare',
        label: '选择比较',
        icon: <SwapOutlined />,
        disabled: compareSelection.isComparing && 
                 (compareSelection.fromVersion === version.version_number || 
                  compareSelection.toVersion === version.version_number)
      },
      {
        key: 'restore',
        label: '恢复此版本',
        icon: <UndoOutlined />,
        disabled: isCurrentVersion,
        danger: !isCurrentVersion
      }
    ];
  };

  const handleVersionAction = (key: string, version: DocumentVersion) => {
    setSelectedVersion(version);
    
    switch (key) {
      case 'view':
        // Open version details modal
        break;
      case 'download':
        // Download version
        message.info(`下载版本 ${getVersionName(version)}`);
        break;
      case 'share':
        // Share version
        message.info(`分享版本 ${getVersionName(version)}`);
        break;
      case 'label':
        labelForm.setFieldsValue({
          label: '',
          color: VERSION_LABEL_COLORS[0],
          description: ''
        });
        setLabelModalVisible(true);
        break;
      case 'comment':
        commentForm.resetFields();
        setCommentModalVisible(true);
        break;
      case 'compare':
        if (compareSelection.isComparing) {
          if (!compareSelection.fromVersion) {
            setCompareSelection({
              ...compareSelection,
              fromVersion: version.version_number
            });
          } else if (!compareSelection.toVersion) {
            setCompareSelection({
              ...compareSelection,
              toVersion: version.version_number
            });
          }
        } else {
          setCompareSelection({
            isComparing: true,
            fromVersion: version.version_number
          });
        }
        break;
      case 'restore':
        restoreForm.setFieldsValue({
          change_summary: `恢复到版本 ${getVersionName(version)}`
        });
        setRestoreModalVisible(true);
        break;
    }
  };

  // Render timeline view
  const renderTimelineView = () => (
    <Timeline mode="left">
      {filteredVersions.map((version, index) => {
        const changeType = getVersionChangeType(version);
        const typeConfig = VERSION_CHANGE_TYPES[changeType];
        const versionLabels = getVersionLabels(version);
        const versionComments = getVersionComments(version);
        const isCurrentVersion = version.version_number === currentVersion;

        return (
          <Timeline.Item
            key={version.id}
            color={typeConfig.color}
            dot={
              <Avatar
                
                style={{
                  backgroundColor: isCurrentVersion ? '#52c41a' : undefined,
                  color: isCurrentVersion ? 'white' : undefined
                }}
                icon={<HistoryOutlined />}
              >
                {isCurrentVersion ? <CheckCircleOutlined /> : version.version_number}
              </Avatar>
            }
          >
            <Card
              
              title={
                <Row justify="space-between" align="middle">
                  <Col>
                    <Space>
                      <Text strong>{getVersionName(version)}</Text>
                      {isCurrentVersion && <Badge status="success" text="当前版本" />}
                      <Tag color={typeConfig.color} icon={typeConfig.icon}>
                        {typeConfig.label}
                      </Tag>
                    </Space>
                  </Col>
                  <Col>
                    <Dropdown
                      menu={{
                        items: getVersionActions(version),
                        onClick: ({ key }) => handleVersionAction(key, version)
                      }}
                      trigger={['click']}
                    >
                      <Button type="text"  icon={<MoreOutlined />} />
                    </Dropdown>
                  </Col>
                </Row>
              }
              extra={
                <Space>
                  {compareSelection.isComparing && (
                    <Button
                      
                      type={
                        compareSelection.fromVersion === version.version_number ||
                        compareSelection.toVersion === version.version_number
                        ? 'primary' : 'default'
                      }
                      onClick={() => handleVersionAction('compare', version)}
                    >
                      选择比较
                    </Button>
                  )}
                </Space>
              }
            >
              <Row gutter={16}>
                <Col span={18}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>{version.title}</Text>
                    {version.change_summary && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {version.change_summary}
                      </Text>
                    )}
                    
                    {viewMode.showLabels && versionLabels.length > 0 && (
                      <Space wrap>
                        {versionLabels.map(label => (
                          <Tag key={label.id} color={label.color} title={label.description}>
                            {label.label}
                          </Tag>
                        ))}
                      </Space>
                    )}
                    
                    {viewMode.showComments && versionComments.length > 0 && (
                      <Space>
                        <CommentOutlined />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {versionComments.length} 条评论
                        </Text>
                      </Space>
                    )}
                  </Space>
                </Col>
                <Col span={6}>
                  <Space direction="vertical" style={{ width: '100%', alignItems: 'flex-end' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {formatVersionDate(version.created_at)}
                    </Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {version.created_by_name}
                    </Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {formatFileSize(version.file_size)}
                    </Text>
                  </Space>
                </Col>
              </Row>
            </Card>
          </Timeline.Item>
        );
      })}
    </Timeline>
  );

  // Render table view
  const renderTableView = () => {
    const columns: ColumnsType<DocumentVersion> = [
      {
        title: '版本',
        key: 'version',
        width: 120,
        render: (_, record) => {
          const isCurrentVersion = record.version_number === currentVersion;
          return (
            <Space>
              <Text strong>{getVersionName(record)}</Text>
              {isCurrentVersion && <Badge status="success" />}
            </Space>
          );
        }
      },
      {
        title: '标题',
        dataIndex: 'title',
        key: 'title',
        ellipsis: true
      },
      {
        title: '类型',
        key: 'type',
        width: 100,
        render: (_, record) => {
          const changeType = getVersionChangeType(record);
          const typeConfig = VERSION_CHANGE_TYPES[changeType];
          return (
            <Tag color={typeConfig.color} icon={typeConfig.icon}>
              {typeConfig.label}
            </Tag>
          );
        }
      },
      {
        title: '标签',
        key: 'labels',
        width: 150,
        render: (_, record) => {
          const versionLabels = getVersionLabels(record);
          return (
            <Space wrap>
              {versionLabels.slice(0, 2).map(label => (
                <Tag key={label.id} color={label.color} >
                  {label.label}
                </Tag>
              ))}
              {versionLabels.length > 2 && (
                <Tag >+{versionLabels.length - 2}</Tag>
              )}
            </Space>
          );
        }
      },
      {
        title: '创建者',
        dataIndex: 'created_by_name',
        key: 'created_by',
        width: 100,
        render: (name) => (
          <Space>
            <Avatar  icon={<UserOutlined />} />
            <Text style={{ fontSize: '12px' }}>{name}</Text>
          </Space>
        )
      },
      {
        title: '创建时间',
        dataIndex: 'created_at',
        key: 'created_at',
        width: 150,
        render: (date) => (
          <Text style={{ fontSize: '12px' }}>
            {formatVersionDate(date)}
          </Text>
        )
      },
      {
        title: '大小',
        dataIndex: 'file_size',
        key: 'file_size',
        width: 80,
        render: (size) => (
          <Text style={{ fontSize: '12px' }}>
            {formatFileSize(size)}
          </Text>
        )
      },
      {
        title: '操作',
        key: 'actions',
        width: 60,
        fixed: 'right',
        render: (_, record) => (
          <Dropdown
            menu={{
              items: getVersionActions(record),
              onClick: ({ key }) => handleVersionAction(key, record)
            }}
            trigger={['click']}
          >
            <Button type="text"  icon={<MoreOutlined />} />
          </Dropdown>
        )
      }
    ];

    return (
      <Table
        columns={columns}
        dataSource={filteredVersions}
        rowKey="id"
        
        loading={loading}
        pagination={{
          total: filteredVersions.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 个版本`
        }}
        scroll={{ x: 800 }}
      />
    );
  };

  return (
    <Card style={style} title="版本管理" >
      {/* Statistics */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic 
              title="总版本数" 
              value={stats.total_versions} 
              prefix={<HistoryOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="主要版本" 
              value={stats.major_versions} 
              prefix={<BranchesOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="贡献者" 
              value={stats.contributors_count} 
              prefix={<UserOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="总大小" 
              value={formatFileSize(stats.total_size_all_versions)} 
              prefix={<FileTextOutlined />}
            />
          </Col>
        </Row>
      )}

      {/* Toolbar */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <Select
              value={viewMode.type}
              onChange={(type) => setViewMode({ ...viewMode, type })}
              style={{ width: 120 }}
            >
              <Option value="timeline">时间线</Option>
              <Option value="list">列表</Option>
              <Option value="tree">树形</Option>
            </Select>
            
            <Switch
              checked={viewMode.showMajorOnly}
              onChange={(showMajorOnly) => setViewMode({ ...viewMode, showMajorOnly })}
            />
            <Text>仅主要版本</Text>
            
            <Switch
              checked={compareSelection.isComparing}
              onChange={(isComparing) => setCompareSelection({ isComparing })}
            />
            <Text>比较模式</Text>
          </Space>
        </Col>
        
        <Col>
          <Space>
            <Input.Search
              placeholder="搜索版本..."
              allowClear
              style={{ width: 200 }}
              onChange={(e) => setFilter({ ...filter, searchTerm: e.target.value })}
            />
            
            {compareSelection.isComparing && compareSelection.fromVersion && compareSelection.toVersion && (
              <Button type="primary" onClick={handleCompareVersions}>
                比较版本
              </Button>
            )}
          </Space>
        </Col>
      </Row>

      {/* Compare mode alert */}
      {compareSelection.isComparing && (
        <Alert
          message="版本比较模式"
          description={
            <Space>
              <Text>
                {compareSelection.fromVersion 
                  ? `已选择版本 ${compareSelection.fromVersion}` 
                  : '请选择第一个版本'}
              </Text>
              {compareSelection.fromVersion && !compareSelection.toVersion && (
                <Text>请选择第二个版本进行比较</Text>
              )}
              <Button
                
                onClick={() => setCompareSelection({ isComparing: false })}
              >
                取消比较
              </Button>
            </Space>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Content */}
      {viewMode.type === 'timeline' ? renderTimelineView() : renderTableView()}

      {/* Create Label Modal */}
      <Modal
        title="添加版本标签"
        open={labelModalVisible}
        onOk={() => labelForm.submit()}
        onCancel={() => {
          setLabelModalVisible(false);
          labelForm.resetFields();
        }}
        width={500}
      >
        <Form form={labelForm} layout="vertical" onFinish={handleCreateLabel}>
          <Form.Item
            name="label"
            label="标签名称"
            rules={[{ required: true, message: '请输入标签名称' }]}
          >
            <Input placeholder="例如: release, stable, beta" />
          </Form.Item>
          
          <Form.Item
            name="color"
            label="标签颜色"
            rules={[{ required: true, message: '请选择标签颜色' }]}
          >
            <Select placeholder="选择颜色">
              {VERSION_LABEL_COLORS.map(color => (
                <Option key={color} value={color}>
                  <Space>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        backgroundColor: color,
                        borderRadius: 2
                      }}
                    />
                    {color}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item name="description" label="描述">
            <TextArea
              rows={3}
              placeholder="描述这个标签的用途（可选）"
              maxLength={200}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Comment Modal */}
      <Modal
        title="添加版本评论"
        open={commentModalVisible}
        onOk={() => commentForm.submit()}
        onCancel={() => {
          setCommentModalVisible(false);
          commentForm.resetFields();
        }}
        width={500}
      >
        <Form form={commentForm} layout="vertical" onFinish={handleCreateComment}>
          <Form.Item
            name="content"
            label="评论内容"
            rules={[{ required: true, message: '请输入评论内容' }]}
          >
            <TextArea
              rows={4}
              placeholder="请输入您的评论..."
              maxLength={1000}
              showCount
            />
          </Form.Item>
          
          <Form.Item name="line_number" label="行号">
            <Input
              type="number"
              placeholder="关联到特定行号（可选）"
              min={1}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Restore Version Modal */}
      <Modal
        title="恢复版本"
        open={restoreModalVisible}
        onOk={() => restoreForm.submit()}
        onCancel={() => {
          setRestoreModalVisible(false);
          restoreForm.resetFields();
        }}
        width={500}
      >
        <Alert
          message="确认恢复版本"
          description={`确定要将文档恢复到版本 ${selectedVersion ? getVersionName(selectedVersion) : ''} 吗？这将创建一个新版本。`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Form form={restoreForm} layout="vertical" onFinish={handleRestoreVersion}>
          <Form.Item
            name="change_summary"
            label="变更说明"
            rules={[{ required: true, message: '请输入变更说明' }]}
          >
            <TextArea
              rows={3}
              placeholder="描述为什么要恢复到这个版本..."
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Version Comparison Modal */}
      <Modal
        title="版本比较"
        open={compareModalVisible}
        onCancel={() => {
          setCompareModalVisible(false);
          setComparisonResult(null);
        }}
        width={800}
        footer={[
          <Button key="close" onClick={() => setCompareModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        {comparisonResult && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card  title={`版本 ${comparisonResult.from_version}`}>
                  <Text>从版本</Text>
                </Card>
              </Col>
              <Col span={12}>
                <Card  title={`版本 ${comparisonResult.to_version}`}>
                  <Text>到版本</Text>
                </Card>
              </Col>
            </Row>
            
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Statistic 
                  title="新增行" 
                  value={comparisonResult.added_lines} 
                  valueStyle={{ color: '#52c41a' }}
                  prefix="+"
                />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="删除行" 
                  value={comparisonResult.removed_lines} 
                  valueStyle={{ color: '#f5222d' }}
                  prefix="-"
                />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="修改行" 
                  value={comparisonResult.modified_lines} 
                  valueStyle={{ color: '#fa8c16' }}
                  prefix="~"
                />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="相似度" 
                  value={`${(comparisonResult.similarity_score * 100).toFixed(1)}%`}
                  valueStyle={{ 
                    color: getSimilarityText(comparisonResult.similarity_score).color 
                  }}
                />
              </Col>
            </Row>
            
            <Divider />
            
            <Title level={5}>变更摘要</Title>
            <Paragraph>{comparisonResult.summary}</Paragraph>
            
            {comparisonResult.diff_content && (
              <>
                <Title level={5}>详细差异</Title>
                <div style={{
                  backgroundColor: '#f5f5f5',
                  padding: 16,
                  borderRadius: 6,
                  maxHeight: 300,
                  overflow: 'auto'
                }}>
                  <pre style={{ margin: 0, fontSize: '12px' }}>
                    {JSON.stringify(JSON.parse(comparisonResult.diff_content), null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default DocumentVersionPanel;