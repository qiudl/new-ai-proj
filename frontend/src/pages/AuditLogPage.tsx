import React, { useState, useEffect } from 'react';
import { Table, Typography, Tag, Modal, Button, Space } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { SystemService, AuditLog, PaginatedResponse } from '../services/systemService';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

const AuditLogPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const pageSize = 20;

  // Load audit logs
  const loadAuditLogs = async (page = 1) => {
    setLoading(true);
    try {
      const response: PaginatedResponse<AuditLog> = await SystemService.getAuditLogs(page, pageSize);
      setAuditLogs(response.data);
      setTotal(response.pagination.total);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get action color for tag
  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'green';
      case 'update':
        return 'blue';
      case 'delete':
      case 'soft_delete':
        return 'red';
      case 'restore':
        return 'orange';
      case 'hard_delete':
        return 'volcano';
      case 'login':
        return 'cyan';
      case 'logout':
        return 'default';
      default:
        return 'default';
    }
  };

  // Get action display text
  const getActionText = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return '创建';
      case 'update':
        return '更新';
      case 'delete':
      case 'soft_delete':
        return '删除';
      case 'restore':
        return '恢复';
      case 'hard_delete':
        return '永久删除';
      case 'login':
        return '登录';
      case 'logout':
        return '登出';
      default:
        return action;
    }
  };

  // Get entity type display text
  const getEntityTypeText = (entityType: string) => {
    switch (entityType.toLowerCase()) {
      case 'project':
        return '项目';
      case 'task':
        return '任务';
      case 'user':
        return '用户';
      default:
        return entityType;
    }
  };

  // Show entity data modal
  const showEntityData = (log: AuditLog) => {
    setSelectedLog(log);
    setModalVisible(true);
  };

  // Table columns
  const columns: ColumnsType<AuditLog> = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text) => new Date(text).toLocaleString('zh-CN'),
      sorter: true,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action) => (
        <Tag color={getActionColor(action)}>
          {getActionText(action)}
        </Tag>
      ),
    },
    {
      title: '实体类型',
      dataIndex: 'entity_type',
      key: 'entity_type',
      width: 100,
      render: (entityType) => getEntityTypeText(entityType),
    },
    {
      title: '实体ID',
      dataIndex: 'entity_id',
      key: 'entity_id',
      width: 80,
    },
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 80,
      render: (userId) => userId || '-',
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 120,
      render: (ip) => ip || '-',
    },
    {
      title: '用户代理',
      dataIndex: 'user_agent',
      key: 'user_agent',
      ellipsis: true,
      render: (userAgent) => userAgent || '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          {record.entity_data && (
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => showEntityData(record)}
            >
              查看详情
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // Load data on component mount
  useEffect(() => {
    loadAuditLogs(1);
  }, []);

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>系统审计日志</Title>
      
      <Table
        columns={columns}
        dataSource={auditLogs}
        loading={loading}
        rowKey="id"
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          onChange: loadAuditLogs,
          showSizeChanger: false,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
        }}
        scroll={{ x: 'max-content' }}
        size="small"
      />

      {/* Entity Data Modal */}
      <Modal
        title={`${getActionText(selectedLog?.action || '')} ${getEntityTypeText(selectedLog?.entity_type || '')} - 详细信息`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedLog && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <strong>操作时间：</strong>
              {new Date(selectedLog.created_at).toLocaleString('zh-CN')}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>操作类型：</strong>
              <Tag color={getActionColor(selectedLog.action)}>
                {getActionText(selectedLog.action)}
              </Tag>
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>实体类型：</strong>
              {getEntityTypeText(selectedLog.entity_type)}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>实体ID：</strong>
              {selectedLog.entity_id}
            </div>
            {selectedLog.user_id && (
              <div style={{ marginBottom: 16 }}>
                <strong>用户ID：</strong>
                {selectedLog.user_id}
              </div>
            )}
            {selectedLog.ip_address && (
              <div style={{ marginBottom: 16 }}>
                <strong>IP地址：</strong>
                {selectedLog.ip_address}
              </div>
            )}
            {selectedLog.user_agent && (
              <div style={{ marginBottom: 16 }}>
                <strong>用户代理：</strong>
                <div style={{ 
                  maxHeight: '100px', 
                  overflow: 'auto', 
                  background: '#f5f5f5', 
                  padding: '8px', 
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  {selectedLog.user_agent}
                </div>
              </div>
            )}
            {selectedLog.entity_data && (
              <div>
                <strong>实体数据：</strong>
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: '12px', 
                  borderRadius: '4px',
                  maxHeight: '300px',
                  overflow: 'auto',
                  fontSize: '12px'
                }}>
                  {JSON.stringify(selectedLog.entity_data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AuditLogPage;