import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Upload,
  Input,
  message,
  Tooltip,
  Popconfirm,
  Badge,
  Typography,
  Row,
  Col,
  Statistic,
  Dropdown,
  Timeline,
  Descriptions,
  Progress,
  Alert
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  HistoryOutlined,
  UploadOutlined,
  DownloadOutlined,
  RollbackOutlined,
  DeleteOutlined,
  DiffOutlined,
  FileTextOutlined,
  UserOutlined,
  CalendarOutlined,
  TagOutlined,
  FileOutlined,
  EyeOutlined,
  MoreOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { documentService } from '../services/unifiedDocumentService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// 版本信息接口
interface DocumentVersion {
  id: number;
  document_id: number;
  version_number: number;
  title: string;
  content?: string;
  file_url?: string;
  file_size: number;
  mime_type?: string;
  change_summary?: string;
  created_by: number;
  created_at: string;
  is_major_version: boolean;
  tags: string[];
  metadata: Record<string, any>;
  
  // 扩展字段
  document_title?: string;
  created_by_name?: string;
  created_by_email?: string;
  is_current?: boolean;
}

// 版本历史响应
interface VersionHistoryResponse {
  document_id: number;
  document_title: string;
  versions: DocumentVersion[];
  stats: {
    total_versions: number;
    major_versions: number;
    current_version: number;
    first_version_date: string;
    latest_version_date: string;
    contributors_count: number;
  };
  labels?: any[];
  branches?: any[];
}

// 版本比较结果
interface VersionComparison {
  version1: DocumentVersion;
  version2: DocumentVersion;
  size_diff: number;
  content_changed: boolean;
  summary: string;
}

// ✅ FIXED - Added document property (TS2322)
interface DocumentVersionControlProps {
  documentId?: number;
  document?: any; // Document object can be passed directly
  visible: boolean;
  onClose: () => void;
  mode?: 'modal' | 'embedded';
  title?: string;
}

const DocumentVersionControl: React.FC<DocumentVersionControlProps> = ({
  documentId,
  visible,
  onClose,
  mode = 'modal',
  title = '版本控制'
}) => {
  // 状态管理
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [compareVisible, setCompareVisible] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [stats, setStats] = useState<any>({});
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);

  // 表单状态
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    changesSummary: '',
    file: null as File | null
  });

  // 加载版本历史
  const loadVersionHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/documents/${documentId}/versions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        const historyData: VersionHistoryResponse = data.data;
        setVersions(historyData.versions);
        setStats(historyData.stats);
      } else {
        message.error('加载版本历史失败');
      }
    } catch (error) {
      console.error('加载版本历史失败:', error);
      message.error('加载版本历史失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && documentId) {
      loadVersionHistory();
    }
  }, [visible, documentId]);

  // 创建新版本
  const handleCreateVersion = async () => {
    if (!uploadForm.file || !uploadForm.changesSummary) {
      message.error('请选择文件并填写变更摘要');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadForm.file);
    formData.append('title', uploadForm.title);
    formData.append('description', uploadForm.description);
    formData.append('changes_summary', uploadForm.changesSummary);

    try {
      const response = await fetch(`/api/v1/documents/${documentId}/versions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        message.success('版本创建成功');
        setUploadVisible(false);
        setUploadForm({ title: '', description: '', changesSummary: '', file: null });
        loadVersionHistory();
      } else {
        message.error(data.message || '版本创建失败');
      }
    } catch (error) {
      console.error('创建版本失败:', error);
      message.error('创建版本失败');
    }
  };

  // 恢复版本
  const handleRestoreVersion = async (versionNumber: number) => {
    try {
      const response = await fetch(`/api/v1/documents/${documentId}/versions/${versionNumber}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        message.success('版本恢复成功');
        loadVersionHistory();
      } else {
        message.error(data.message || '版本恢复失败');
      }
    } catch (error) {
      console.error('恢复版本失败:', error);
      message.error('恢复版本失败');
    }
  };

  // 删除版本
  const handleDeleteVersion = async (versionNumber: number) => {
    try {
      const response = await fetch(`/api/v1/documents/${documentId}/versions/${versionNumber}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        message.success('版本删除成功');
        loadVersionHistory();
      } else {
        message.error(data.message || '版本删除失败');
      }
    } catch (error) {
      console.error('删除版本失败:', error);
      message.error('删除版本失败');
    }
  };

  // 下载版本
  const handleDownloadVersion = (versionNumber: number) => {
    const url = `/api/v1/documents/${documentId}/versions/${versionNumber}/download`;
    const token = localStorage.getItem('token');
    
    const link = document.createElement('a');
    link.href = `${url}?token=${token}`;
    link.download = `document-v${versionNumber}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 比较版本
  const handleCompareVersions = async () => {
    if (selectedVersions.length !== 2) {
      message.error('请选择两个版本进行比较');
      return;
    }

    try {
      const [v1, v2] = selectedVersions.sort((a, b) => a - b);
      const response = await fetch(
        `/api/v1/documents/${documentId}/versions/compare?from_version=${v1}&to_version=${v2}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setComparison(data.data);
        setCompareVisible(true);
      } else {
        message.error(data.message || '版本比较失败');
      }
    } catch (error) {
      console.error('版本比较失败:', error);
      message.error('版本比较失败');
    }
  };

  // 查看版本详情
  const handleViewVersion = (version: DocumentVersion) => {
    setSelectedVersion(version);
    setDetailVisible(true);
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 获取版本类型标签
  const getVersionTypeTag = (version: DocumentVersion) => {
    if (version.is_current) {
      return <Tag color="green">当前版本</Tag>;
    }
    if (version.is_major_version) {
      return <Tag color="blue">主要版本</Tag>;
    }
    return <Tag color="default">次要版本</Tag>;
  };

  // 表格列定义
  const columns: ColumnsType<DocumentVersion> = [
    {
      title: '版本',
      dataIndex: 'version_number',
      key: 'version_number',
      width: 80,
      render: (version: number, record: DocumentVersion) => (
        <Space direction="vertical" >
          <Text strong>v{version}</Text>
          {getVersionTypeTag(record)}
        </Space>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: DocumentVersion) => (
        <Space direction="vertical" >
          <Text strong>{title}</Text>
          {record.change_summary && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.change_summary}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '大小',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      render: (size: number) => <Text type="secondary">{formatFileSize(size)}</Text>,
    },
    {
      title: '创建者',
      dataIndex: 'created_by_name',
      key: 'created_by_name',
      width: 120,
      render: (name: string) => (
        <Space>
          <UserOutlined />
          <Text>{name || '未知'}</Text>
        </Space>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => (
        <Text type="secondary">
          {new Date(date).toLocaleString('zh-CN')}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record: DocumentVersion) => {
        const items = [
          {
            key: 'view',
            label: '查看详情',
            icon: <EyeOutlined />,
            onClick: () => handleViewVersion(record)
          },
          {
            key: 'download',
            label: '下载',
            icon: <DownloadOutlined />,
            onClick: () => handleDownloadVersion(record.version_number)
          }
        ];

        if (!record.is_current) {
          items.push({
            key: 'restore',
            label: '恢复',
            icon: <RollbackOutlined />,
            onClick: () => handleRestoreVersion(record.version_number)
          });
          items.push({
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            onClick: () => handleDeleteVersion(record.version_number)
          });
        }

        return (
          <Space>
            <Button
              type="text"
              icon={<EyeOutlined />}
              
              onClick={() => handleViewVersion(record)}
            />
            <Button
              type="text"
              icon={<DownloadOutlined />}
              
              onClick={() => handleDownloadVersion(record.version_number)}
            />
            {!record.is_current && (
              <>
                <Popconfirm
                  title="确定要恢复到此版本吗？"
                  onConfirm={() => handleRestoreVersion(record.version_number)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button
                    type="text"
                    icon={<RollbackOutlined />}
                    
                  />
                </Popconfirm>
                <Popconfirm
                  title="确定要删除此版本吗？"
                  onConfirm={() => handleDeleteVersion(record.version_number)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    
                    danger
                  />
                </Popconfirm>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  // 表格选择配置
  const rowSelection: any = {
    selectedRowKeys: selectedVersions,
    onChange: (selectedRowKeys) => {
      setSelectedVersions(selectedRowKeys as number[]);
    },
    onSelect: (record, selected) => {
      if (selected) {
        setSelectedVersions([...selectedVersions, record.version_number]);
      } else {
        setSelectedVersions(selectedVersions.filter(v => v !== record.version_number));
      }
    },
    getCheckboxProps: (record) => ({
      disabled: selectedVersions.length >= 2 && !selectedVersions.includes(record.version_number),
    }),
  };

  // 版本详情模态框
  const renderVersionDetail = () => (
    <Modal
      title={`版本详情 - v${selectedVersion?.version_number}`}
      open={detailVisible}
      onCancel={() => setDetailVisible(false)}
      footer={[
        <Button key="close" onClick={() => setDetailVisible(false)}>
          关闭
        </Button>,
        <Button 
          key="download" 
          type="primary" 
          icon={<DownloadOutlined />}
          onClick={() => selectedVersion && handleDownloadVersion(selectedVersion.version_number)}
        >
          下载
        </Button>
      ]}
      width={800}
    >
      {selectedVersion && (
        <Descriptions column={2} bordered>
          <Descriptions.Item label="版本号">
            v{selectedVersion.version_number}
          </Descriptions.Item>
          <Descriptions.Item label="版本类型">
            {getVersionTypeTag(selectedVersion)}
          </Descriptions.Item>
          <Descriptions.Item label="标题" span={2}>
            {selectedVersion.title}
          </Descriptions.Item>
          <Descriptions.Item label="文件大小">
            {formatFileSize(selectedVersion.file_size)}
          </Descriptions.Item>
          <Descriptions.Item label="MIME类型">
            {selectedVersion.mime_type || 'unknown'}
          </Descriptions.Item>
          <Descriptions.Item label="创建者">
            {selectedVersion.created_by_name || '未知'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {new Date(selectedVersion.created_at).toLocaleString('zh-CN')}
          </Descriptions.Item>
          {selectedVersion.change_summary && (
            <Descriptions.Item label="变更摘要" span={2}>
              <Paragraph>{selectedVersion.change_summary}</Paragraph>
            </Descriptions.Item>
          )}
          {selectedVersion.tags && selectedVersion.tags.length > 0 && (
            <Descriptions.Item label="标签" span={2}>
              {selectedVersion.tags.map(tag => (
                <Tag key={tag} icon={<TagOutlined />}>{tag}</Tag>
              ))}
            </Descriptions.Item>
          )}
        </Descriptions>
      )}
    </Modal>
  );

  // 版本比较模态框
  const renderVersionComparison = () => (
    <Modal
      title="版本比较"
      open={compareVisible}
      onCancel={() => setCompareVisible(false)}
      footer={[
        <Button key="close" onClick={() => setCompareVisible(false)}>
          关闭
        </Button>
      ]}
      width={1000}
    >
      {comparison && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert message={comparison.summary} type="info" />
          
          <Row gutter={16}>
            <Col span={12}>
              <Card title={`版本 v${comparison.version1.version_number}`} >
                <Descriptions  column={1}>
                  <Descriptions.Item label="标题">
                    {comparison.version1.title}
                  </Descriptions.Item>
                  <Descriptions.Item label="文件大小">
                    {formatFileSize(comparison.version1.file_size)}
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间">
                    {new Date(comparison.version1.created_at).toLocaleString('zh-CN')}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
            <Col span={12}>
              <Card title={`版本 v${comparison.version2.version_number}`} >
                <Descriptions  column={1}>
                  <Descriptions.Item label="标题">
                    {comparison.version2.title}
                  </Descriptions.Item>
                  <Descriptions.Item label="文件大小">
                    {formatFileSize(comparison.version2.file_size)}
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间">
                    {new Date(comparison.version2.created_at).toLocaleString('zh-CN')}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          </Row>

          <Card title="差异统计" >
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="大小变化"
                  value={comparison.size_diff}
                  suffix="字节"
                  valueStyle={{ color: comparison.size_diff > 0 ? '#3f8600' : '#cf1322' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="内容变化"
                  value={comparison.content_changed ? '是' : '否'}
                  valueStyle={{ color: comparison.content_changed ? '#1890ff' : '#52c41a' }}
                />
              </Col>
            </Row>
          </Card>
        </Space>
      )}
    </Modal>
  );

  // 上传新版本模态框
  const renderUploadModal = () => (
    <Modal
      title="创建新版本"
      open={uploadVisible}
      onCancel={() => setUploadVisible(false)}
      onOk={handleCreateVersion}
      okText="创建版本"
      cancelText="取消"
      width={600}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Text strong>文件上传 *</Text>
          <Upload
            beforeUpload={(file) => {
              setUploadForm({ ...uploadForm, file });
              return false;
            }}
            onRemove={() => setUploadForm({ ...uploadForm, file: null })}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>选择文件</Button>
          </Upload>
        </div>

        <div>
          <Text strong>版本标题</Text>
          <Input
            placeholder="版本标题（可选）"
            value={uploadForm.title}
            onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
          />
        </div>

        <div>
          <Text strong>版本描述</Text>
          <TextArea
            placeholder="版本描述（可选）"
            rows={3}
            value={uploadForm.description}
            onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
          />
        </div>

        <div>
          <Text strong>变更摘要 *</Text>
          <TextArea
            placeholder="请描述本次更改的内容"
            rows={2}
            value={uploadForm.changesSummary}
            onChange={(e) => setUploadForm({ ...uploadForm, changesSummary: e.target.value })}
          />
        </div>
      </Space>
    </Modal>
  );

  const content = (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* 统计信息 */}
      <Card>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="总版本数"
              value={stats.total_versions || 0}
              prefix={<HistoryOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="当前版本"
              value={stats.current_version || 1}
              prefix={<FileTextOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="主要版本"
              value={stats.major_versions || 0}
              prefix={<TagOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="贡献者"
              value={stats.contributors_count || 0}
              prefix={<UserOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* 操作按钮 */}
      <Card>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setUploadVisible(true)}
          >
            创建新版本
          </Button>
          <Button
            icon={<DiffOutlined />}
            onClick={handleCompareVersions}
            disabled={selectedVersions.length !== 2}
          >
            比较版本
          </Button>
          <Button
            icon={<HistoryOutlined />}
            onClick={loadVersionHistory}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
        {selectedVersions.length > 0 && (
          <Text type="secondary" style={{ marginLeft: 16 }}>
            已选择 {selectedVersions.length} 个版本
          </Text>
        )}
      </Card>

      {/* 版本列表 */}
      <Card title="版本历史">
        <Table
          columns={columns}
          dataSource={versions}
          rowKey="version_number"
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个版本`,
          }}
          
        />
      </Card>

      {/* 模态框 */}
      {renderUploadModal()}
      {renderVersionComparison()}
      {renderVersionDetail()}
    </Space>
  );

  if (mode === 'embedded') {
    return content;
  }

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1200}
      destroyOnClose
    >
      {content}
    </Modal>
  );
};

export default DocumentVersionControl;