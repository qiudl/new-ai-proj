import React from 'react';
import { Table, Tag, Space, Button, Tooltip, Typography } from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  UserOutlined,
  TeamOutlined,
  MailOutlined,
  PhoneOutlined 
} from '@ant-design/icons';
import type { ColumnsType, TableProps } from 'antd/es/table';
import { Enterprise } from '../types/enterprise';

const { Text } = Typography;

interface EnterpriseTableProps extends Omit<TableProps<Enterprise>, 'columns' | 'dataSource'> {
  data: Enterprise[];
  loading?: boolean;
  onEdit?: (enterprise: Enterprise) => void;
  onDelete?: (enterprise: Enterprise) => void;
  onView?: (enterprise: Enterprise) => void;
  onManageUsers?: (enterprise: Enterprise) => void;
  onManageDepartments?: (enterprise: Enterprise) => void;
  showActions?: boolean;
  columnsToShow?: string[];
}

/**
 * 企业数据表格组件
 * 可复用的企业数据展示组件，支持自定义操作和列显示
 */
const EnterpriseTable: React.FC<EnterpriseTableProps> = ({
  data,
  loading = false,
  onEdit,
  onDelete,
  onView,
  onManageUsers,
  onManageDepartments,
  showActions = true,
  columnsToShow = ['id', 'name', 'business_type', 'industry_type', 'status', 'contact', 'stats', 'created_at', 'actions'],
  ...tableProps
}) => {
  
  // 获取状态标签颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'orange';
      case 'suspended': return 'red';
      default: return 'default';
    }
  };

  // 获取业务类型标签颜色
  const getBusinessTypeColor = (businessType: string) => {
    switch (businessType) {
      case 'corporation': return 'blue';
      case 'llc': return 'cyan';
      case 'partnership': return 'purple';
      case 'individual': return 'orange';
      default: return 'default';
    }
  };

  // 定义所有可能的列
  const allColumns: Record<string, any> = {
    id: {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a: Enterprise, b: Enterprise) => a.id - b.id,
    },
    name: {
      title: '企业名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Enterprise) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.code}
          </Text>
        </div>
      ),
      sorter: (a: Enterprise, b: Enterprise) => a.name.localeCompare(b.name),
    },
    business_type: {
      title: '业务类型',
      dataIndex: 'business_type',
      key: 'business_type',
      render: (text: string, record: Enterprise) => (
        <Tag color={getBusinessTypeColor(text)}>
          {record.business_type_text}
        </Tag>
      ),
      filters: [
        { text: '个人', value: 'individual' },
        { text: '合伙制', value: 'partnership' },
        { text: '股份制', value: 'corporation' },
        { text: '有限责任公司', value: 'llc' },
      ],
      onFilter: (value: any, record: Enterprise) => record.business_type === value,
    },
    industry_type: {
      title: '行业类型',
      dataIndex: 'industry_type',
      key: 'industry_type',
      render: (text: string | undefined, record: Enterprise) => (
        text ? (
          <Tag color="geekblue">
            {record.industry_type_text || text}
          </Tag>
        ) : (
          <Text type="secondary">未设置</Text>
        )
      ),
      filters: [
        { text: '科技', value: 'technology' },
        { text: '金融', value: 'finance' },
        { text: '医疗健康', value: 'healthcare' },
        { text: '教育', value: 'education' },
        { text: '制造业', value: 'manufacturing' },
        { text: '零售', value: 'retail' },
        { text: '其他', value: 'other' },
      ],
      onFilter: (value: any, record: Enterprise) => record.industry_type === value,
    },
    status: {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (text: string, record: Enterprise) => (
        <Tag color={getStatusColor(text)}>
          {record.status_text}
        </Tag>
      ),
      filters: [
        { text: '活跃', value: 'active' },
        { text: '非活跃', value: 'inactive' },
        { text: '暂停', value: 'suspended' },
      ],
      onFilter: (value: any, record: Enterprise) => record.status === value,
    },
    contact: {
      title: '联系方式',
      key: 'contact',
      render: (_, record: Enterprise) => (
        <div>
          {record.contact_email && (
            <div>
              <MailOutlined style={{ marginRight: 4 }} />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.contact_email}
              </Text>
            </div>
          )}
          {record.contact_phone && (
            <div>
              <PhoneOutlined style={{ marginRight: 4 }} />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.contact_phone}
              </Text>
            </div>
          )}
          {!record.contact_email && !record.contact_phone && (
            <Text type="secondary">暂无</Text>
          )}
        </div>
      ),
    },
    stats: {
      title: '统计',
      key: 'stats',
      render: (_, record: Enterprise) => (
        <Space direction="vertical" size="small">
          <div>
            <UserOutlined style={{ marginRight: 4, color: '#1890ff' }} />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              用户: {record.user_count || 0}
            </Text>
          </div>
          <div>
            <TeamOutlined style={{ marginRight: 4, color: '#52c41a' }} />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              部门: {record.department_count || 0}
            </Text>
          </div>
        </Space>
      ),
      sorter: (a: Enterprise, b: Enterprise) => (a.user_count || 0) - (b.user_count || 0),
    },
    created_at: {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString(),
      sorter: (a: Enterprise, b: Enterprise) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    actions: {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 200,
      render: (_, record: Enterprise) => (
        <Space>
          {onView && (
            <Tooltip title="查看详情">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => onView(record)}
                size="small"
              />
            </Tooltip>
          )}
          {onManageUsers && (
            <Tooltip title="管理用户">
              <Button
                type="text"
                icon={<UserOutlined />}
                onClick={() => onManageUsers(record)}
                size="small"
              />
            </Tooltip>
          )}
          {onManageDepartments && (
            <Tooltip title="管理部门">
              <Button
                type="text"
                icon={<TeamOutlined />}
                onClick={() => onManageDepartments(record)}
                size="small"
              />
            </Tooltip>
          )}
          {onEdit && (
            <Tooltip title="编辑">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => onEdit(record)}
                size="small"
              />
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title="删除">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => onDelete(record)}
                size="small"
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  };

  // 根据配置生成显示的列
  const getColumns = (): ColumnsType<Enterprise> => {
    let columns = columnsToShow
      .filter(key => allColumns[key])
      .map(key => allColumns[key]);
    
    // 如果不显示操作列，则移除
    if (!showActions) {
      columns = columns.filter(col => col.key !== 'actions');
    }
    
    return columns;
  };

  return (
    <Table
      columns={getColumns()}
      dataSource={data}
      rowKey="id"
      loading={loading}
      scroll={{ x: 1000 }}
      {...tableProps}
    />
  );
};

export default EnterpriseTable;