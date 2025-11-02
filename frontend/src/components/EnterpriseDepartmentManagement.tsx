import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  message,
  Tag,
  Spin,
  Statistic,
  Row,
  Col,
  Empty
} from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  ReloadOutlined,
  ApartmentOutlined
} from '@ant-design/icons';
import enterpriseService from '../services/enterpriseService';

interface Department {
  id: number;
  name: string;
  parent_id?: number;
  level: number;
  path?: string;
  manager_id?: number;
  manager_name?: string;
  static_employee_count: number;
  actual_employee_count: number;
  status: string;
  sort_order: number;
  description?: string;
  children?: Department[];
}

interface EnterpriseDepartmentManagementProps {
  enterpriseId: number;
  enterpriseName: string;
}

const EnterpriseDepartmentManagement: React.FC<EnterpriseDepartmentManagementProps> = ({
  enterpriseId,
  enterpriseName
}) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalDepartments, setTotalDepartments] = useState<number>(0);
  const [totalEmployees, setTotalEmployees] = useState<number>(0);

  useEffect(() => {
    loadDepartments();
  }, [enterpriseId]);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const response = await enterpriseService.getDepartmentsWithActualCount(enterpriseId);
      // handleApiResponse wraps the array in { data, pagination }, so extract data
      const departments = Array.isArray(response) ? response : (response as any)?.data || [];
      setDepartments(departments);

      // 计算统计数据
      const flattenDepartments = flattenTree(departments);
      setTotalDepartments(flattenDepartments.length);
      setTotalEmployees(
        flattenDepartments.reduce((sum, dept) => sum + (dept.actual_employee_count || 0), 0)
      );
    } catch (error) {
      console.error('加载部门数据失败:', error);
      message.error('加载部门数据失败');
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  // 将树形结构扁平化
  const flattenTree = (tree: Department[]): Department[] => {
    const result: Department[] = [];
    const flatten = (nodes: Department[]) => {
      nodes.forEach(node => {
        result.push(node);
        if (node.children && node.children.length > 0) {
          flatten(node.children);
        }
      });
    };
    flatten(tree);
    return result;
  };

  const columns = [
    {
      title: '部门名称',
      dataIndex: 'name',
      key: 'name',
      width: 300,
      render: (text: string, record: Department) => (
        <Space>
          <ApartmentOutlined />
          <strong>{text}</strong>
          {record.level === 1 && <Tag color="blue">一级部门</Tag>}
        </Space>
      )
    },
    {
      title: '部门经理',
      dataIndex: 'manager_name',
      key: 'manager_name',
      width: 150,
      render: (text: string) => text || <span style={{ color: '#999' }}>未设置</span>
    },
    {
      title: '实际人数',
      dataIndex: 'actual_employee_count',
      key: 'actual_employee_count',
      width: 120,
      align: 'center' as const,
      render: (count: number) => (
        <Tag color="green" icon={<UserOutlined />}>
          {count || 0} 人
        </Tag>
      )
    },
    {
      title: '静态人数',
      dataIndex: 'static_employee_count',
      key: 'static_employee_count',
      width: 120,
      align: 'center' as const,
      render: (count: number, record: Department) => {
        const diff = (record.actual_employee_count || 0) - (count || 0);
        return (
          <Space>
            <span>{count || 0} 人</span>
            {diff !== 0 && (
              <Tag color={diff > 0 ? 'orange' : 'red'}>
                {diff > 0 ? `+${diff}` : diff}
              </Tag>
            )}
          </Space>
        );
      }
    },
    {
      title: '层级',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      align: 'center' as const,
      render: (level: number) => <Tag>{`L${level}`}</Tag>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center' as const,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '活跃' : '非活跃'}
        </Tag>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => text || <span style={{ color: '#999' }}>-</span>
    }
  ];

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="部门总数"
              value={totalDepartments}
              prefix={<ApartmentOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="员工总数"
              value={totalEmployees}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="平均部门人数"
              value={totalDepartments > 0 ? (totalEmployees / totalDepartments).toFixed(1) : 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#faad14' }}
              suffix="人"
            />
          </Card>
        </Col>
      </Row>

      {/* 部门树形表格 */}
      <Card
        title={
          <Space>
            <ApartmentOutlined />
            <span>部门组织架构</span>
          </Space>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={loadDepartments}
            loading={loading}
          >
            刷新
          </Button>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
          </div>
        ) : departments.length === 0 ? (
          <Empty description="暂无部门数据" />
        ) : (
          <Table
            columns={columns}
            dataSource={departments}
            rowKey="id"
            pagination={false}
            defaultExpandAllRows
            size="middle"
            bordered
          />
        )}
      </Card>

      {/* 说明 */}
      <Card
        title="📊 数据说明"
        size="small"
        style={{ marginTop: 16, background: '#fafafa' }}
      >
        <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
          <li><strong>实际人数</strong>：当前部门中实际分配的员工数量（动态统计）</li>
          <li><strong>静态人数</strong>：数据库中存储的部门人数字段值（可能不准确）</li>
          <li>如果实际人数和静态人数不一致，会显示差异标记（橙色：多出，红色：少于）</li>
          <li>数据按部门层级和排序号组织成树形结构</li>
        </ul>
      </Card>
    </div>
  );
};

export default EnterpriseDepartmentManagement;
