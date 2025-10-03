import React from 'react';
import { Table, Tag, Button, Space, Tooltip, Badge } from 'antd';
import { 
  EyeOutlined, 
  EditOutlined, 
  FolderOpenOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  CaretRightOutlined,
  CaretDownOutlined
} from '@ant-design/icons';
import { Task } from '../types/task';
import dayjs from 'dayjs';
import './HierarchicalTaskTable.css';

export interface HierarchicalTaskWithDocument extends Task {
  level: number;
  parent_id?: number;
  children_count: number;
  expanded: boolean;
  hasChildren: boolean;
  
  documents: any[];
  documentCount: number;
  lastDocumentUpdate?: string;
  
  ancestorIds: number[];
  ancestorTitles: string[];
  
  isLoading?: boolean;
  loadError?: string;
}

interface HierarchicalTaskTableProps {
  tasks: HierarchicalTaskWithDocument[];
  loading?: boolean;
  onExpand?: (taskId: number) => void;
  onCollapse?: (taskId: number) => void;
  onTaskClick?: (task: HierarchicalTaskWithDocument) => void;
  onDocumentView?: (task: HierarchicalTaskWithDocument) => void;
  onDocumentEdit?: (task: HierarchicalTaskWithDocument) => void;
  onProjectView?: (task: HierarchicalTaskWithDocument) => void;
  expandedDocumentTaskId?: number | null; // 当前展开的文档任务ID
}

const HierarchicalTaskTable: React.FC<HierarchicalTaskTableProps> = ({
  tasks,
  loading = false,
  expandedDocumentTaskId = null,
  onExpand,
  onCollapse,
  onTaskClick,
  onDocumentView,
  onDocumentEdit,
  onProjectView,
}) => {
  
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: 'success', icon: <CheckCircleOutlined />, text: '已完成' };
      case 'in_progress':
        return { color: 'processing', icon: <SyncOutlined spin />, text: '进行中' };
      case 'todo':
        return { color: 'default', icon: <ClockCircleOutlined />, text: '待开始' };
      case 'cancelled':
        return { color: 'error', icon: <ExclamationCircleOutlined />, text: '已取消' };
      default:
        return { color: 'default', icon: <ClockCircleOutlined />, text: status };
    }
  };

  const getLevelBadgeColor = (level: number) => {
    switch (level) {
      case 0: return '#1890ff'; // 蓝色 - 根任务
      case 1: return '#52c41a'; // 绿色 - 一级子任务
      case 2: return '#fa8c16'; // 橙色 - 二级子任务
      case 3: return '#f5222d'; // 红色 - 三级子任务
      default: return '#d9d9d9';
    }
  };

  const getLevelText = (level: number) => {
    return `L${level}`;
  };

  const renderExpandIcon = (task: HierarchicalTaskWithDocument) => {
    if (!task.hasChildren) {
      return <span style={{ width: 16, display: 'inline-block' }} />;
    }

    return (
      <Button
        type="text"
        size="small"
        icon={task.expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
        onClick={() => {
          if (task.expanded) {
            onCollapse?.(task.id);
          } else {
            onExpand?.(task.id);
          }
        }}
        style={{ 
          padding: 0, 
          minWidth: 16, 
          height: 16,
          lineHeight: '16px'
        }}
      />
    );
  };

  const renderTaskTitle = (task: HierarchicalTaskWithDocument) => {
    const indentLevel = task.level * 24; // 24px per level
    const showConnector = task.level > 0;
    
    return (
      <div 
        className="hierarchical-task-title"
        style={{ 
          paddingLeft: indentLevel,
          position: 'relative'
        }}
      >
        {showConnector && (
          <div className="task-connector" style={{ left: indentLevel - 12 }}>
            <span className="connector-line">├─</span>
          </div>
        )}
        <div className="task-title-content">
          {renderExpandIcon(task)}
          <span 
            className="task-title-text"
            onClick={() => onTaskClick?.(task)}
            style={{ 
              marginLeft: 8,
              cursor: 'pointer',
              fontWeight: task.level === 0 ? 600 : 400
            }}
          >
            {task.title}
          </span>
          {task.description && (
            <div className="task-description">
              📝 {task.description.substring(0, 50)}
              {task.description.length > 50 && '...'}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDocumentInfo = (task: HierarchicalTaskWithDocument) => {
    if (task.documentCount === 0) {
      return (
        <div className="document-info">
          <span className="no-document">-</span>
        </div>
      );
    }

    const documents = task.documents.slice(0, 2); // 只显示前2个文档
    const remainingCount = task.documentCount - 2;

    return (
      <div className="document-info">
        {documents.map((doc, index) => (
          <div key={index} className="document-item">
            • {doc.title || doc.name || '未命名文档'}
          </div>
        ))}
        {remainingCount > 0 && (
          <div className="document-more">
            ...更多(+{remainingCount})
          </div>
        )}
      </div>
    );
  };

  const columns = [
    {
      title: '任务ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a: HierarchicalTaskWithDocument, b: HierarchicalTaskWithDocument) => a.id - b.id,
      render: (id: number, record: HierarchicalTaskWithDocument) => (
        <Button
          type="link"
          onClick={() => onTaskClick?.(record)}
          style={{ 
            fontFamily: 'monospace', 
            fontWeight: 'bold',
            padding: 0,
            height: 'auto'
          }}
        >
          #{id}
        </Button>
      ),
    },
    {
      title: '任务标题',
      dataIndex: 'title',
      key: 'title',
      width: 400,
      sorter: (a: HierarchicalTaskWithDocument, b: HierarchicalTaskWithDocument) => 
        a.title.localeCompare(b.title),
      render: (title: string, record: HierarchicalTaskWithDocument) => 
        renderTaskTitle(record),
    },
    {
      title: '层级',
      dataIndex: 'level',
      key: 'level',
      width: 60,
      sorter: (a: HierarchicalTaskWithDocument, b: HierarchicalTaskWithDocument) => a.level - b.level,
      filters: [
        { text: '🌳 根任务 (L0)', value: 0 },
        { text: '📚 一级子任务 (L1)', value: 1 },
        { text: '📖 二级子任务 (L2)', value: 2 },
        { text: '📝 三级子任务 (L3)', value: 3 },
      ],
      onFilter: (value: any, record: HierarchicalTaskWithDocument) => record.level === value,
      render: (level: number) => (
        <Tag 
          color={getLevelBadgeColor(level)}
          style={{ fontWeight: 'bold', minWidth: 32, textAlign: 'center' }}
        >
          {getLevelText(level)}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      sorter: (a: HierarchicalTaskWithDocument, b: HierarchicalTaskWithDocument) => 
        a.status.localeCompare(b.status),
      filters: [
        { text: '待开始', value: 'todo' },
        { text: '进行中', value: 'in_progress' },
        { text: '已完成', value: 'completed' },
        { text: '已取消', value: 'cancelled' },
      ],
      onFilter: (value: any, record: HierarchicalTaskWithDocument) => record.status === value,
      render: (status: string) => {
        const config = getStatusConfig(status);
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '文档状态',
      key: 'documentStatus',
      width: 140,
      sorter: (a: HierarchicalTaskWithDocument, b: HierarchicalTaskWithDocument) => {
        if (a.documentCount > 0 && b.documentCount === 0) return -1;
        if (a.documentCount === 0 && b.documentCount > 0) return 1;
        return a.documentCount - b.documentCount;
      },
      filters: [
        { text: '有文档', value: 'with-doc' },
        { text: '无文档', value: 'without-doc' },
      ],
      onFilter: (value: any, record: HierarchicalTaskWithDocument) => {
        if (value === 'with-doc') return record.documentCount > 0;
        if (value === 'without-doc') return record.documentCount === 0;
        return true;
      },
      render: (_: unknown, record: HierarchicalTaskWithDocument) => (
        <Space direction="vertical" size={2}>
          {record.documentCount > 0 ? (
            <Badge status="success" text={`有文档(${record.documentCount})`} />
          ) : (
            <Badge status="default" text="无文档" />
          )}
          {record.lastDocumentUpdate && (
            <span style={{ fontSize: 11, color: '#999' }}>
              更新: {dayjs(record.lastDocumentUpdate).format('MM-DD HH:mm')}
            </span>
          )}
        </Space>
      ),
    },
    {
      title: '文档信息',
      key: 'documentInfo',
      width: 200,
      render: (_: unknown, record: HierarchicalTaskWithDocument) => 
        renderDocumentInfo(record),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      sorter: (a: HierarchicalTaskWithDocument, b: HierarchicalTaskWithDocument) => 
        dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: HierarchicalTaskWithDocument) => (
        <Space size="small">
          {record.documentCount > 0 && (
            <Tooltip title={expandedDocumentTaskId === record.id ? "收起文档" : "查看文档"}>
              <Button
                type={expandedDocumentTaskId === record.id ? "primary" : "text"}
                size="small"
                icon={<EyeOutlined />}
                onClick={() => onDocumentView?.(record)}
              />
            </Tooltip>
          )}
          <Tooltip title={record.documentCount > 0 ? "编辑文档" : "创建文档"}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onDocumentEdit?.(record)}
            />
          </Tooltip>
          <Tooltip title="查看项目">
            <Button
              type="text"
              size="small"
              icon={<FolderOpenOutlined />}
              onClick={() => onProjectView?.(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={tasks}
      rowKey="id"
      loading={loading}
      pagination={{
        total: tasks.length,
        pageSize: 20,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 个任务`,
      }}
      scroll={{ x: 1200 }}
      className="hierarchical-task-table"
    />
  );
};

export default HierarchicalTaskTable;