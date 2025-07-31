// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Timeline,
  Progress,
  Badge,
  List,
  Avatar,
  Space,
  Typography,
  Tag,
  Tooltip,
  Button,
  DatePicker,
  Select,
  Divider,
  Alert,
  Tabs
} from 'antd';
import {
  FileOutlined,
  FolderOutlined,
  UserOutlined,
  TeamOutlined,
  HistoryOutlined,
  ShareAltOutlined,
  CommentOutlined,
  TagOutlined,
  RiseOutlined,
  ClockCircleOutlined,
  BulbOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  DatabaseOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
// import { Line, Column, Pie } from '@ant-design/plots';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// 系统统计数据接口
interface SystemStats {
  documents: {
    total: number;
    published: number;
    draft: number;
    archived: number;
    totalSize: number;
    averageSize: number;
  };
  folders: {
    total: number;
    public: number;
    team: number;
    private: number;
  };
  users: {
    total: number;
    active: number;
    contributors: number;
    viewers: number;
  };
  activity: {
    todayActions: number;
    weekActions: number;
    monthActions: number;
    totalActions: number;
  };
  versions: {
    total: number;
    major: number;
    minor: number;
    averagePerDocument: number;
  };
  collaboration: {
    sharedDocuments: number;
    comments: number;
    permissions: number;
    activeCollaborations: number;
  };
}

// 活动记录接口
interface ActivityLog {
  id: number;
  type: 'create' | 'update' | 'delete' | 'share' | 'comment' | 'restore' | 'upload';
  action: string;
  user: string;
  document?: string;
  timestamp: string;
  details?: string;
}

// 热门文档接口
interface PopularDocument {
  id: number;
  title: string;
  views: number;
  downloads: number;
  shares: number;
  comments: number;
  lastModified: string;
  type: string;
  owner: string;
}

// 系统健康状态接口
interface SystemHealth {
  overall: 'excellent' | 'good' | 'warning' | 'critical';
  database: 'online' | 'slow' | 'offline';
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
  performance: {
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
  };
  backup: {
    lastBackup: string;
    status: 'success' | 'failed' | 'running';
    size: number;
  };
}

const DocumentSystemOverview: React.FC = () => {
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [popularDocs, setPopularDocs] = useState<PopularDocument[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [chartData, setChartData] = useState<any[]>([]);

  // 加载系统数据
  useEffect(() => {
    loadSystemData();
  }, [timeRange]);

  const loadSystemData = async () => {
    try {
      setLoading(true);
      
      // 模拟加载系统统计数据
      const mockStats: SystemStats = {
        documents: {
          total: 1247,
          published: 892,
          draft: 245,
          archived: 110,
          totalSize: 15728640000, // ~15GB
          averageSize: 12615360    // ~12MB
        },
        folders: {
          total: 156,
          public: 45,
          team: 89,
          private: 22
        },
        users: {
          total: 48,
          active: 32,
          contributors: 28,
          viewers: 20
        },
        activity: {
          todayActions: 127,
          weekActions: 856,
          monthActions: 3247,
          totalActions: 15629
        },
        versions: {
          total: 4521,
          major: 678,
          minor: 3843,
          averagePerDocument: 3.6
        },
        collaboration: {
          sharedDocuments: 423,
          comments: 1567,
          permissions: 892,
          activeCollaborations: 156
        }
      };

      const mockActivityLogs: ActivityLog[] = [
        {
          id: 1,
          type: 'create',
          action: '创建了新文档',
          user: '张三',
          document: 'API设计规范 v2.0',
          timestamp: '2024-01-25T14:30:00Z',
          details: '项目技术规范文档'
        },
        {
          id: 2,
          type: 'update',
          action: '更新了文档',
          user: '李四',
          document: '用户手册',
          timestamp: '2024-01-25T13:45:00Z',
          details: '修改了第3章内容'
        },
        {
          id: 3,
          type: 'share',
          action: '分享了文档',
          user: 'Admin',
          document: '项目计划书',
          timestamp: '2024-01-25T12:20:00Z',
          details: '与外部团队分享'
        },
        {
          id: 4,
          type: 'comment',
          action: '添加了评论',
          user: '王五',
          document: '系统架构图',
          timestamp: '2024-01-25T11:15:00Z',
          details: '建议优化数据库设计'
        },
        {
          id: 5,
          type: 'restore',
          action: '恢复了版本',
          user: '赵六',
          document: '需求分析报告',
          timestamp: '2024-01-25T10:30:00Z',
          details: '恢复到版本 v1.2'
        }
      ];

      const mockPopularDocs: PopularDocument[] = [
        {
          id: 1,
          title: 'API接口设计规范',
          views: 2847,
          downloads: 156,
          shares: 23,
          comments: 45,
          lastModified: '2024-01-20T14:30:00Z',
          type: 'markdown',
          owner: 'Admin'
        },
        {
          id: 2,
          title: '用户操作手册',
          views: 1923,
          downloads: 89,
          shares: 12,
          comments: 28,
          lastModified: '2024-01-18T16:20:00Z',
          type: 'pdf',
          owner: '张三'
        },
        {
          id: 3,
          title: '系统架构设计文档',
          views: 1456,
          downloads: 67,
          shares: 18,
          comments: 31,
          lastModified: '2024-01-15T09:45:00Z',
          type: 'markdown',
          owner: '李四'
        }
      ];

      const mockSystemHealth: SystemHealth = {
        overall: 'good',
        database: 'online',
        storage: {
          used: 15728640000,
          total: 107374182400, // 100GB
          percentage: 14.6
        },
        performance: {
          averageResponseTime: 245,
          errorRate: 0.02,
          uptime: 99.8
        },
        backup: {
          lastBackup: '2024-01-25T02:00:00Z',
          status: 'success',
          size: 2048576000 // 2GB
        }
      };

      // 生成图表数据
      const mockChartData = [
        { date: '2024-01-19', documents: 45, users: 28, actions: 156 },
        { date: '2024-01-20', documents: 52, users: 31, actions: 189 },
        { date: '2024-01-21', documents: 38, users: 25, actions: 142 },
        { date: '2024-01-22', documents: 61, users: 34, actions: 203 },
        { date: '2024-01-23', documents: 48, users: 29, actions: 167 },
        { date: '2024-01-24', documents: 55, users: 32, actions: 178 },
        { date: '2024-01-25', documents: 42, users: 27, actions: 145 }
      ];

      setStats(mockStats);
      setActivityLogs(mockActivityLogs);
      setPopularDocs(mockPopularDocs);
      setSystemHealth(mockSystemHealth);
      setChartData(mockChartData);

    } catch (error) {
      console.error('Failed to load system data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 获取活动类型图标和颜色
  const getActivityIcon = (type: ActivityLog['type']) => {
    const configs = {
      create: { icon: <FileOutlined />, color: '#52c41a' },
      update: { icon: <EditOutlined />, color: '#1890ff' },
      delete: { icon: <DeleteOutlined />, color: '#f5222d' },
      share: { icon: <ShareAltOutlined />, color: '#fa8c16' },
      comment: { icon: <CommentOutlined />, color: '#722ed1' },
      restore: { icon: <HistoryOutlined />, color: '#eb2f96' },
      upload: { icon: <CloudUploadOutlined />, color: '#13c2c2' }
    };
    return configs[type] || { icon: <FileOutlined />, color: '#666' };
  };

  // 系统健康状态配置
  const getHealthStatus = (health: SystemHealth) => {
    const configs = {
      excellent: { color: '#52c41a', text: '优秀', icon: <CheckCircleOutlined /> },
      good: { color: '#1890ff', text: '良好', icon: <CheckCircleOutlined /> },
      warning: { color: '#fa8c16', text: '警告', icon: <WarningOutlined /> },
      critical: { color: '#f5222d', text: '严重', icon: <WarningOutlined /> }
    };
    return configs[health.overall];
  };

  // 热门文档表格列
  const popularDocsColumns: any[] = [
    {
      title: '文档名称',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <Space>
          <FileOutlined style={{ color: record.type === 'pdf' ? '#f5222d' : '#52c41a' }} />
          <Text strong>{text}</Text>
        </Space>
      )
    },
    {
      title: '浏览量',
      dataIndex: 'views',
      key: 'views',
      width: 100,
      render: (count) => (
        <Space>
          <EyeOutlined />
          <Text>{count.toLocaleString()}</Text>
        </Space>
      ),
      sorter: (a, b) => a.views - b.views
    },
    {
      title: '下载量',
      dataIndex: 'downloads',
      key: 'downloads',
      width: 100,
      render: (count) => (
        <Space>
          <DownloadOutlined />
          <Text>{count.toLocaleString()}</Text>
        </Space>
      ),
      sorter: (a, b) => a.downloads - b.downloads
    },
    {
      title: '分享次数',
      dataIndex: 'shares',
      key: 'shares',
      width: 100,
      render: (count) => (
        <Space>
          <ShareAltOutlined />
          <Text>{count}</Text>
        </Space>
      ),
      sorter: (a, b) => a.shares - b.shares
    },
    {
      title: '评论数',
      dataIndex: 'comments',
      key: 'comments',
      width: 100,
      render: (count) => (
        <Space>
          <CommentOutlined />
          <Text>{count}</Text>
        </Space>
      ),
      sorter: (a, b) => a.comments - b.comments
    },
    {
      title: '所有者',
      dataIndex: 'owner',
      key: 'owner',
      width: 100,
      render: (owner) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <Text>{owner}</Text>
        </Space>
      )
    }
  ];

  // 活动趋势图表配置
  const activityChartConfig = {
    data: chartData,
    xField: 'date',
    yField: 'actions',
    smooth: true,
    color: '#1890ff',
    point: {
      size: 3,
      shape: 'circle'
    },
    label: {
      style: {
        fill: '#aaa'
      }
    }
  };

  if (!stats || !systemHealth) {
    return (
      <Card loading={loading}>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <SyncOutlined spin style={{ fontSize: 48, color: '#1890ff' }} />
          <Title level={4} style={{ marginTop: 16 }}>
            正在加载系统概览...
          </Title>
        </div>
      </Card>
    );
  }

  const healthStatus = getHealthStatus(systemHealth);

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* 页面标题 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            <Space>
              <DatabaseOutlined />
              系统概览
            </Space>
          </Title>
          <Text type="secondary">文档管理系统运行状态和统计信息</Text>
        </Col>
        <Col>
          <Space>
            <Select
              value={timeRange}
              onChange={setTimeRange}
              style={{ width: 120 }}
            >
              <Option value="week">近一周</Option>
              <Option value="month">近一月</Option>
              <Option value="quarter">近三月</Option>
            </Select>
            <Button icon={<SyncOutlined />} onClick={loadSystemData} loading={loading}>
              刷新数据
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 系统健康状态 */}
      <Alert
        message={
          <Space>
            <span>系统运行状态：</span>
            <Badge
              status={healthStatus.color as any}
              text={
                <Text strong style={{ color: healthStatus.color }}>
                  {healthStatus.text}
                </Text>
              }
            />
            <span>• 数据库：在线 • 存储使用：{systemHealth.storage.percentage}% • 运行时间：{systemHealth.performance.uptime}%</span>
          </Space>
        }
        type={systemHealth.overall === 'excellent' || systemHealth.overall === 'good' ? 'success' : 'warning'}
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* 核心统计指标 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="文档总数"
              value={stats.documents.total}
              prefix={<FileOutlined />}
              suffix={
                <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                  <div>已发布: {stats.documents.published}</div>
                  <div>草稿: {stats.documents.draft}</div>
                </div>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="文件夹数量"
              value={stats.folders.total}
              prefix={<FolderOutlined />}
              suffix={
                <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                  <div>公开: {stats.folders.public}</div>
                  <div>团队: {stats.folders.team}</div>
                </div>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="活跃用户"
              value={stats.users.active}
              prefix={<UserOutlined />}
              suffix={
                <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                  <div>总用户: {stats.users.total}</div>
                  <div>贡献者: {stats.users.contributors}</div>
                </div>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="存储使用"
              value={formatFileSize(stats.documents.totalSize)}
              prefix={<DatabaseOutlined />}
              suffix={
                <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                  <Progress
                    percent={systemHealth.storage.percentage}
                    size="small"
                    showInfo={false}
                  />
                  <div>总容量: {formatFileSize(systemHealth.storage.total)}</div>
                </div>
              }
            />
          </Card>
        </Col>
      </Row>

      {/* 详细统计和图表 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="活动趋势" extra={<RiseOutlined />}>
            {/* <Line {...activityChartConfig} height={300} /> */}
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
              图表组件暂时不可用
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="版本统计" extra={<HistoryOutlined />}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="总版本数"
                  value={stats.versions.total}
                  prefix={<TagOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="主要版本"
                  value={stats.versions.major}
                  prefix={<BulbOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="次要版本"
                  value={stats.versions.minor}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="平均版本/文档"
                  value={stats.versions.averagePerDocument}
                  precision={1}
                />
              </Col>
            </Row>
            <Divider />
            <Title level={5}>协作统计</Title>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="分享文档"
                  value={stats.collaboration.sharedDocuments}
                  prefix={<ShareAltOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="评论总数"
                  value={stats.collaboration.comments}
                  prefix={<CommentOutlined />}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 热门文档和最近活动 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="热门文档" extra={<RiseOutlined />}>
            <Table
              columns={popularDocsColumns}
              dataSource={popularDocs}
              rowKey="id"
              size="small"
              pagination={false}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="最近活动" extra={<ClockCircleOutlined />}>
            <List
              dataSource={activityLogs}
              renderItem={(item) => {
                const config = getActivityIcon(item.type);
                return (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          size="small"
                          style={{ backgroundColor: config.color }}
                          icon={config.icon}
                        />
                      }
                      title={
                        <Space>
                          <Text strong>{item.user}</Text>
                          <Text>{item.action}</Text>
                          {item.document && (
                            <Text code style={{ fontSize: '12px' }}>
                              {item.document}
                            </Text>
                          )}
                        </Space>
                      }
                      description={
                        <Space>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {new Date(item.timestamp).toLocaleString('zh-CN')}
                          </Text>
                          {item.details && (
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              • {item.details}
                            </Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DocumentSystemOverview;