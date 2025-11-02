import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  message,
  Tag,
  Modal,
  Select,
  Spin,
  Statistic,
  Row,
  Col,
  Empty,
  Tooltip
} from 'antd';
import {
  UserOutlined,
  UserAddOutlined,
  ReloadOutlined,
  TeamOutlined,
  ApartmentOutlined,
  EditOutlined
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import enterpriseService, { EnterpriseUser } from '../services/enterpriseService';

interface Department {
  id: number;
  name: string;
  parent_id?: number;
  level: number;
  children?: Department[];
}

interface EnterprisePersonnelManagementProps {
  enterpriseId: number;
  enterpriseName: string;
}

const EnterprisePersonnelManagement: React.FC<EnterprisePersonnelManagementProps> = ({
  enterpriseId,
  enterpriseName
}) => {
  const [unassignedUsers, setUnassignedUsers] = useState<EnterpriseUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [departmentsLoading, setDepartmentsLoading] = useState<boolean>(false);
  const [assignModalVisible, setAssignModalVisible] = useState<boolean>(false);
  const [batchAssignModalVisible, setBatchAssignModalVisible] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<EnterpriseUser | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState<boolean>(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  useEffect(() => {
    loadUnassignedUsers();
    loadDepartments();
  }, [enterpriseId]);

  const loadUnassignedUsers = async (page: number = 1, pageSize: number = 10) => {
    setLoading(true);
    try {
      const result = await enterpriseService.getUnassignedUsers(
        enterpriseId,
        page,
        pageSize
      );
      setUnassignedUsers(result.data || []);
      setPagination({
        current: result.pagination.page,
        pageSize: result.pagination.page_size,
        total: result.pagination.total
      });
    } catch (error) {
      console.error('加载未分配用户失败:', error);
      message.error('加载未分配用户失败');
      setUnassignedUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    setDepartmentsLoading(true);
    try {
      const data = await enterpriseService.getDepartmentsWithActualCount(enterpriseId);
      setDepartments(flattenDepartments(data || []));
    } catch (error) {
      console.error('加载部门列表失败:', error);
      message.error('加载部门列表失败');
      setDepartments([]);
    } finally {
      setDepartmentsLoading(false);
    }
  };

  // 将树形部门结构扁平化为列表（用于Select选项）
  const flattenDepartments = (tree: Department[]): Department[] => {
    const result: Department[] = [];
    const flatten = (nodes: Department[], depth: number = 0) => {
      nodes.forEach(node => {
        result.push({ ...node, level: depth });
        if (node.children && node.children.length > 0) {
          flatten(node.children, depth + 1);
        }
      });
    };
    flatten(tree);
    return result;
  };

  const handleAssignDepartment = (user: EnterpriseUser) => {
    setSelectedUser(user);
    setSelectedDepartmentId(null);
    setAssignModalVisible(true);
  };

  const handleBatchAssign = () => {
    if (selectedUserIds.length === 0) {
      message.warning('请先选择要分配的用户');
      return;
    }
    setSelectedDepartmentId(null);
    setBatchAssignModalVisible(true);
  };

  const handleConfirmAssign = async () => {
    if (!selectedDepartmentId) {
      message.warning('请选择部门');
      return;
    }

    if (!selectedUser) return;

    setAssigning(true);
    try {
      await enterpriseService.updateUserDepartment(
        enterpriseId,
        selectedUser.id,
        selectedDepartmentId
      );
      message.success(`已将 ${selectedUser.name} 分配到部门`);
      setAssignModalVisible(false);
      setSelectedUser(null);
      setSelectedDepartmentId(null);
      loadUnassignedUsers(pagination.current, pagination.pageSize);
    } catch (error: any) {
      console.error('分配部门失败:', error);
      message.error(error?.response?.data?.error?.message || '分配部门失败');
    } finally {
      setAssigning(false);
    }
  };

  const handleConfirmBatchAssign = async () => {
    if (!selectedDepartmentId) {
      message.warning('请选择部门');
      return;
    }

    if (selectedUserIds.length === 0) return;

    setAssigning(true);
    try {
      // 批量分配：逐个调用API
      const promises = selectedUserIds.map(userId =>
        enterpriseService.updateUserDepartment(
          enterpriseId,
          userId,
          selectedDepartmentId
        )
      );

      await Promise.all(promises);
      message.success(`已成功为 ${selectedUserIds.length} 个用户分配部门`);
      setBatchAssignModalVisible(false);
      setSelectedUserIds([]);
      setSelectedDepartmentId(null);
      loadUnassignedUsers(pagination.current, pagination.pageSize);
    } catch (error: any) {
      console.error('批量分配部门失败:', error);
      message.error(error?.response?.data?.error?.message || '批量分配部门失败');
    } finally {
      setAssigning(false);
    }
  };

  const handleTableChange = (newPagination: any) => {
    loadUnassignedUsers(newPagination.current, newPagination.pageSize);
  };

  const rowSelection = {
    selectedRowKeys: selectedUserIds,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedUserIds(selectedRowKeys as number[]);
    }
  };

  const columns: TableColumnsType<EnterpriseUser> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 150,
      render: (text: string) => (
        <Space>
          <UserOutlined />
          <strong>{text}</strong>
        </Space>
      )
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      ellipsis: true
    },
    {
      title: '职位',
      dataIndex: 'position',
      key: 'position',
      width: 150,
      render: (text: string) => text || <span style={{ color: '#999' }}>-</span>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          active: 'green',
          inactive: 'orange',
          suspended: 'red'
        };
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Button
          type="link"
          icon={<UserAddOutlined />}
          onClick={() => handleAssignDepartment(record)}
        >
          分配部门
        </Button>
      )
    }
  ];

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="未分配用户"
              value={pagination.total}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="已选择用户"
              value={selectedUserIds.length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="可用部门"
              value={departments.length}
              prefix={<ApartmentOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 用户列表 */}
      <Card
        title={
          <Space>
            <UserOutlined />
            <span>未分配部门用户列表</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={handleBatchAssign}
              disabled={selectedUserIds.length === 0}
            >
              批量分配 ({selectedUserIds.length})
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => loadUnassignedUsers(pagination.current, pagination.pageSize)}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={unassignedUsers}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          locale={{
            emptyText: (
              <Empty
                description="暂无未分配部门的用户"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )
          }}
        />
      </Card>

      {/* 单个用户分配部门对话框 */}
      <Modal
        title={
          <Space>
            <EditOutlined />
            <span>分配部门</span>
          </Space>
        }
        open={assignModalVisible}
        onOk={handleConfirmAssign}
        onCancel={() => {
          setAssignModalVisible(false);
          setSelectedUser(null);
          setSelectedDepartmentId(null);
        }}
        confirmLoading={assigning}
        okText="确定分配"
        cancelText="取消"
      >
        {selectedUser && (
          <div style={{ marginBottom: 16 }}>
            <p><strong>用户：</strong>{selectedUser.name} ({selectedUser.username})</p>
            <p><strong>邮箱：</strong>{selectedUser.email || '-'}</p>
            <p><strong>职位：</strong>{selectedUser.position || '-'}</p>
          </div>
        )}
        <div>
          <p style={{ marginBottom: 8 }}><strong>选择部门：</strong></p>
          <Select
            style={{ width: '100%' }}
            placeholder="请选择部门"
            value={selectedDepartmentId}
            onChange={setSelectedDepartmentId}
            loading={departmentsLoading}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {departments.map(dept => (
              <Select.Option
                key={dept.id}
                value={dept.id}
                label={dept.name}
              >
                {'　'.repeat(dept.level)}{dept.name}
              </Select.Option>
            ))}
          </Select>
        </div>
      </Modal>

      {/* 批量分配部门对话框 */}
      <Modal
        title={
          <Space>
            <UserAddOutlined />
            <span>批量分配部门</span>
          </Space>
        }
        open={batchAssignModalVisible}
        onOk={handleConfirmBatchAssign}
        onCancel={() => {
          setBatchAssignModalVisible(false);
          setSelectedDepartmentId(null);
        }}
        confirmLoading={assigning}
        okText="确定分配"
        cancelText="取消"
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <p><strong>已选择 {selectedUserIds.length} 个用户</strong></p>
          <div style={{
            maxHeight: '150px',
            overflowY: 'auto',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            padding: '8px',
            marginTop: '8px'
          }}>
            {unassignedUsers
              .filter(user => selectedUserIds.includes(user.id))
              .map(user => (
                <Tag key={user.id} style={{ margin: '4px' }}>
                  {user.name} ({user.username})
                </Tag>
              ))}
          </div>
        </div>
        <div>
          <p style={{ marginBottom: 8 }}><strong>选择目标部门：</strong></p>
          <Select
            style={{ width: '100%' }}
            placeholder="请选择部门"
            value={selectedDepartmentId}
            onChange={setSelectedDepartmentId}
            loading={departmentsLoading}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {departments.map(dept => (
              <Select.Option
                key={dept.id}
                value={dept.id}
                label={dept.name}
              >
                {'　'.repeat(dept.level)}{dept.name}
              </Select.Option>
            ))}
          </Select>
        </div>
        <div style={{ marginTop: 16, padding: '12px', backgroundColor: '#f0f2f5', borderRadius: '4px' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
            💡 提示：批量分配会将所选用户统一分配到同一个部门
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default EnterprisePersonnelManagement;
