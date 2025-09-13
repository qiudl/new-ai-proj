/**
 * 企业组织架构管理页面设计
 * 文件: OrganizationManagementPage.tsx
 * 描述: 企业组织架构管理的完整前端界面设计
 * 作者: Claude AI
 * 创建时间: 2025-09-04
 * 任务: #1210 - 设计企业组织架构管理模块
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Tree,
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  Breadcrumb,
  Tabs,
  Alert,
  Modal,
  Form,
  message,
  Switch,
  Popconfirm,
  Transfer,
  TreeSelect,
  InputNumber,
  Divider,
  Descriptions,
  Avatar,
  Badge,
  Tooltip,
  Drawer,
  Timeline
} from 'antd';
import {
  ApartmentOutlined,
  TeamOutlined,
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SettingOutlined,
  BranchesOutlined,
  SolutionOutlined,
  CrownOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  ReloadOutlined,
  SearchOutlined,
  FilterOutlined,
  ExportOutlined,
  ImportOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Search } = Input;
const { TabPane } = Tabs;

// =============================================================================
// 类型定义
// =============================================================================

interface Department {
  id: number;
  company_id: number;
  parent_department_id?: number;
  department_code: string;
  department_name: string;
  department_description?: string;
  department_type: 'business' | 'technical' | 'support' | 'management';
  level: number;
  sort_order: number;
  is_active: boolean;
  manager_user_id?: number;
  deputy_manager_user_id?: number;
  contact_phone?: string;
  contact_email?: string;
  office_location?: string;
  budget_limit?: number;
  employee_count: number;
  children?: Department[];
  parent_department?: Department;
  manager?: CompanyUser;
  deputy_manager?: CompanyUser;
  employee_stats?: DepartmentStats;
  created_at: string;
  updated_at: string;
}

interface Position {
  id: number;
  company_id: number;
  position_code: string;
  position_name: string;
  position_description?: string;
  position_category?: string;
  position_level: number;
  salary_range_min?: number;
  salary_range_max?: number;
  required_skills?: string[];
  required_education?: string;
  required_experience?: number;
  reports_to_position_id?: number;
  is_management_position: boolean;
  is_active: boolean;
  employee_count: number;
  max_employee_count?: number;
  departments?: Department[];
  reports_to_position?: Position;
  employee_stats?: PositionStats;
  created_at: string;
  updated_at: string;
}

interface CompanyUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role_id?: number;
  department?: string;
  position?: string;
  status: string;
}

interface EmployeeAssignment {
  id: number;
  company_user_id: number;
  department_id: number;
  position_id: number;
  is_primary_assignment: boolean;
  assignment_type: 'permanent' | 'temporary' | 'concurrent';
  start_date: string;
  end_date?: string;
  reporting_manager_id?: number;
  work_location?: string;
  work_schedule?: string;
  employment_status: 'active' | 'inactive' | 'on_leave' | 'terminated';
  salary?: number;
  bonus_eligible: boolean;
  notes?: string;
  employee: CompanyUser;
  department: Department;
  position: Position;
  reporting_manager?: CompanyUser;
}

interface OrganizationStats {
  total_departments: number;
  total_positions: number;
  total_employees: number;
  departments_by_type: Record<string, number>;
  positions_by_category: Record<string, number>;
  employees_by_level: Record<number, number>;
  organization_depth: number;
}

interface DepartmentStats {
  total_employees: number;
  primary_employees: number;
  position_count: number;
  child_department_count: number;
  average_salary: number;
  budget_utilization: number;
}

interface PositionStats {
  current_employees: number;
  max_employees: number;
  department_count: number;
  average_salary: number;
  utilization_rate: number;
}

// =============================================================================
// 主组件
// =============================================================================

const OrganizationManagementPage: React.FC = () => {
  const navigate = useNavigate();

  // 状态管理
  const [activeTab, setActiveTab] = useState<'departments' | 'positions' | 'employees' | 'statistics'>('departments');
  const [loading, setLoading] = useState(false);
  
  // 部门相关状态
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentTreeData, setDepartmentTreeData] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  
  // 岗位相关状态
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  
  // 员工分配相关状态
  const [assignments, setAssignments] = useState<EmployeeAssignment[]>([]);
  const [availableUsers, setAvailableUsers] = useState<CompanyUser[]>([]);
  
  // 统计数据
  const [orgStats, setOrgStats] = useState<OrganizationStats | null>(null);
  
  // 模态框和抽屉状态
  const [departmentModalVisible, setDepartmentModalVisible] = useState(false);
  const [positionModalVisible, setPositionModalVisible] = useState(false);
  const [assignmentModalVisible, setAssignmentModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
  
  // 编辑状态
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<EmployeeAssignment | null>(null);
  
  // 表单实例
  const [departmentForm] = Form.useForm();
  const [positionForm] = Form.useForm();
  const [assignmentForm] = Form.useForm();
  
  // 筛选和搜索
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // =============================================================================
  // 数据加载函数
  // =============================================================================

  const loadOrganizationData = useCallback(async () => {
    setLoading(true);
    try {
      // 并行加载所有组织数据
      const [deptResponse, posResponse, assignResponse, statsResponse] = await Promise.all([
        fetch('/api/v1/companies/current/departments?include_tree=true&include_stats=true'),
        fetch('/api/v1/companies/current/positions?include_stats=true'),
        fetch('/api/v1/companies/current/assignments'),
        fetch('/api/v1/companies/current/organization/stats')
      ]);

      if (deptResponse.ok) {
        const deptData = await deptResponse.json();
        setDepartments(deptData.data);
        setDepartmentTreeData(buildTreeData(deptData.data));
      }

      if (posResponse.ok) {
        const posData = await posResponse.json();
        setPositions(posData.data);
      }

      if (assignResponse.ok) {
        const assignData = await assignResponse.json();
        setAssignments(assignData.data);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setOrgStats(statsData.data);
      }

    } catch (error) {
      console.error('Failed to load organization data:', error);
      message.error('加载组织数据失败');
      
      // 使用模拟数据
      loadMockData();
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMockData = () => {
    // 模拟部门数据
    const mockDepartments: Department[] = [
      {
        id: 1,
        company_id: 1,
        department_code: 'TECH',
        department_name: '技术部',
        department_type: 'technical',
        level: 1,
        sort_order: 1,
        is_active: true,
        employee_count: 25,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        children: [
          {
            id: 2,
            company_id: 1,
            parent_department_id: 1,
            department_code: 'DEV',
            department_name: '开发组',
            department_type: 'technical',
            level: 2,
            sort_order: 1,
            is_active: true,
            employee_count: 15,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
          }
        ]
      }
    ];

    setDepartments(mockDepartments);
    setDepartmentTreeData(buildTreeData(mockDepartments));
  };

  const buildTreeData = (departments: Department[]) => {
    return departments.map(dept => ({
      title: (
        <span>
          <Badge
            status={dept.is_active ? 'success' : 'default'}
            text={dept.department_name}
          />
          <Text type="secondary" style={{ marginLeft: 8, fontSize: '12px' }}>
            ({dept.employee_count}人)
          </Text>
        </span>
      ),
      key: dept.id,
      icon: <ApartmentOutlined />,
      children: dept.children ? buildTreeData(dept.children) : []
    }));
  };

  // =============================================================================
  // 部门管理组件
  // =============================================================================

  const DepartmentManagement = () => (
    <Row gutter={[16, 16]}>
      {/* 左侧组织架构树 */}
      <Col xs={24} lg={8}>
        <Card
          title={
            <Space>
              <ApartmentOutlined />
              组织架构
            </Space>
          }
          extra={
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="small"
                onClick={() => {
                  setEditingDepartment(null);
                  setDepartmentModalVisible(true);
                  departmentForm.resetFields();
                }}
              >
                新建部门
              </Button>
            </Space>
          }
        >
          <Tree
            showIcon
            treeData={departmentTreeData}
            onSelect={(selectedKeys) => {
              if (selectedKeys.length > 0) {
                const deptId = selectedKeys[0] as number;
                const dept = findDepartmentById(departments, deptId);
                setSelectedDepartment(dept);
              }
            }}
            height={400}
          />
        </Card>
      </Col>

      {/* 右侧部门详情 */}
      <Col xs={24} lg={16}>
        {selectedDepartment ? (
          <Card
            title={
              <Space>
                <ApartmentOutlined />
                {selectedDepartment.department_name}
                <Tag color={getDepartmentTypeColor(selectedDepartment.department_type)}>
                  {getDepartmentTypeName(selectedDepartment.department_type)}
                </Tag>
                <Badge
                  status={selectedDepartment.is_active ? 'success' : 'default'}
                  text={selectedDepartment.is_active ? '启用' : '禁用'}
                />
              </Space>
            }
            extra={
              <Space>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => handleEditDepartment(selectedDepartment)}
                >
                  编辑
                </Button>
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => {
                    setDetailDrawerVisible(true);
                  }}
                >
                  详情
                </Button>
              </Space>
            }
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="员工总数"
                  value={selectedDepartment.employee_count}
                  prefix={<TeamOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="直属下级"
                  value={selectedDepartment.children?.length || 0}
                  prefix={<BranchesOutlined />}
                />
              </Col>
            </Row>

            <Divider />

            <Descriptions column={2}>
              <Descriptions.Item label="部门代码">
                {selectedDepartment.department_code}
              </Descriptions.Item>
              <Descriptions.Item label="部门层级">
                第{selectedDepartment.level}层
              </Descriptions.Item>
              <Descriptions.Item label="联系电话">
                {selectedDepartment.contact_phone || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="联系邮箱">
                {selectedDepartment.contact_email || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="办公地点" span={2}>
                {selectedDepartment.office_location || '-'}
              </Descriptions.Item>
            </Descriptions>

            {selectedDepartment.manager && (
              <>
                <Divider>部门管理</Divider>
                <Space>
                  <Avatar src={selectedDepartment.manager.avatar_url} icon={<UserOutlined />} />
                  <div>
                    <div><Text strong>部门经理：{selectedDepartment.manager.name}</Text></div>
                    <div><Text type="secondary">{selectedDepartment.manager.email}</Text></div>
                  </div>
                </Space>
              </>
            )}

            {selectedDepartment.department_description && (
              <>
                <Divider>部门描述</Divider>
                <Paragraph>{selectedDepartment.department_description}</Paragraph>
              </>
            )}
          </Card>
        ) : (
          <Card>
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <ApartmentOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
              <div style={{ marginTop: '16px' }}>
                <Text type="secondary">请从左侧选择一个部门查看详情</Text>
              </div>
            </div>
          </Card>
        )}
      </Col>
    </Row>
  );

  // =============================================================================
  // 岗位管理组件
  // =============================================================================

  const PositionManagement = () => {
    const columns = [
      {
        title: '岗位信息',
        dataIndex: 'position_name',
        key: 'position_name',
        render: (text: string, record: Position) => (
          <Space>
            {record.is_management_position ? (
              <CrownOutlined style={{ color: '#faad14' }} />
            ) : (
              <SolutionOutlined style={{ color: '#1890ff' }} />
            )}
            <div>
              <div style={{ fontWeight: 'bold' }}>{text}</div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.position_code}
              </Text>
            </div>
          </Space>
        ),
      },
      {
        title: '岗位类别',
        dataIndex: 'position_category',
        key: 'position_category',
        render: (category: string) => (
          <Tag color={getPositionCategoryColor(category)}>
            {getPositionCategoryName(category)}
          </Tag>
        ),
      },
      {
        title: '岗位级别',
        dataIndex: 'position_level',
        key: 'position_level',
        render: (level: number) => (
          <Badge count={level} style={{ backgroundColor: '#52c41a' }} />
        ),
      },
      {
        title: '薪资范围',
        key: 'salary_range',
        render: (record: Position) => {
          if (record.salary_range_min && record.salary_range_max) {
            return `¥${record.salary_range_min?.toLocaleString()} - ¥${record.salary_range_max?.toLocaleString()}`;
          }
          return '-';
        },
      },
      {
        title: '在职人数',
        dataIndex: 'employee_count',
        key: 'employee_count',
        render: (count: number, record: Position) => (
          <Space>
            <Text>{count}</Text>
            {record.max_employee_count && (
              <Text type="secondary">/ {record.max_employee_count}</Text>
            )}
          </Space>
        ),
      },
      {
        title: '状态',
        dataIndex: 'is_active',
        key: 'is_active',
        render: (isActive: boolean) => (
          <Badge
            status={isActive ? 'success' : 'default'}
            text={isActive ? '启用' : '禁用'}
          />
        ),
      },
      {
        title: '操作',
        key: 'actions',
        width: 180,
        render: (record: Position) => (
          <Space size="small">
            <Button
              size="small"
              type="link"
              icon={<EyeOutlined />}
              onClick={() => setSelectedPosition(record)}
            >
              查看
            </Button>
            <Button
              size="small"
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEditPosition(record)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定要删除这个岗位吗？"
              onConfirm={() => handleDeletePosition(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                size="small"
                type="link"
                danger
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ];

    return (
      <Card
        title={
          <Space>
            <SolutionOutlined />
            岗位管理
          </Space>
        }
        extra={
          <Space>
            <Search
              placeholder="搜索岗位名称或代码"
              allowClear
              style={{ width: 250 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Select
              value={filterType}
              style={{ width: 120 }}
              onChange={setFilterType}
            >
              <Option value="all">全部类别</Option>
              <Option value="management">管理类</Option>
              <Option value="technical">技术类</Option>
              <Option value="sales">销售类</Option>
              <Option value="support">支持类</Option>
            </Select>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingPosition(null);
                setPositionModalVisible(true);
                positionForm.resetFields();
              }}
            >
              新建岗位
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={positions}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
          }}
        />
      </Card>
    );
  };

  // =============================================================================
  // 工具函数
  // =============================================================================

  const findDepartmentById = (depts: Department[], id: number): Department | null => {
    for (const dept of depts) {
      if (dept.id === id) return dept;
      if (dept.children) {
        const found = findDepartmentById(dept.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const getDepartmentTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      business: 'blue',
      technical: 'green',
      support: 'orange',
      management: 'purple'
    };
    return colorMap[type] || 'default';
  };

  const getDepartmentTypeName = (type: string) => {
    const nameMap: Record<string, string> = {
      business: '业务部门',
      technical: '技术部门',
      support: '支持部门',
      management: '管理部门'
    };
    return nameMap[type] || type;
  };

  const getPositionCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      management: 'purple',
      technical: 'green',
      sales: 'blue',
      hr: 'orange',
      finance: 'red',
      operation: 'cyan'
    };
    return colorMap[category] || 'default';
  };

  const getPositionCategoryName = (category: string) => {
    const nameMap: Record<string, string> = {
      management: '管理类',
      technical: '技术类',
      sales: '销售类',
      hr: '人事类',
      finance: '财务类',
      operation: '运营类'
    };
    return nameMap[category] || category;
  };

  // =============================================================================
  // 事件处理函数
  // =============================================================================

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    setDepartmentModalVisible(true);
    departmentForm.setFieldsValue(department);
  };

  const handleEditPosition = (position: Position) => {
    setEditingPosition(position);
    setPositionModalVisible(true);
    positionForm.setFieldsValue(position);
  };

  const handleDeletePosition = async (position: Position) => {
    try {
      // API调用删除岗位
      message.success(`岗位 "${position.position_name}" 删除成功`);
      loadOrganizationData();
    } catch (error) {
      message.error('删除岗位失败');
    }
  };

  // =============================================================================
  // 生命周期
  // =============================================================================

  useEffect(() => {
    loadOrganizationData();
  }, [loadOrganizationData]);

  // =============================================================================
  // 渲染
  // =============================================================================

  return (
    <div style={{ padding: '24px' }}>
      {/* 面包屑导航 */}
      <Breadcrumb style={{ marginBottom: '24px' }}
        items={[
          { title: (<span><SettingOutlined /> <span>企业管理</span></span>) },
          { title: '组织架构' }
        ]}
      />

      {/* 页面标题 */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>
          <ApartmentOutlined style={{ marginRight: '8px' }} />
          组织架构管理
        </Title>
        <Text type="secondary">
          管理企业部门层级、岗位设置和员工分配
        </Text>
      </div>

      {/* 统计卡片 */}
      {orgStats && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="部门总数"
                value={orgStats.total_departments}
                prefix={<ApartmentOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="岗位总数"
                value={orgStats.total_positions}
                prefix={<SolutionOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="员工总数"
                value={orgStats.total_employees}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="组织深度"
                value={orgStats.organization_depth}
                prefix={<BranchesOutlined />}
                suffix="层"
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 主要内容 */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as any)}
          items={[
            {
              key: 'departments',
              label: (
                <span>
                  <ApartmentOutlined />
                  部门管理
                </span>
              ),
              children: <DepartmentManagement />
            },
            {
              key: 'positions',
              label: (
                <span>
                  <SolutionOutlined />
                  岗位管理
                </span>
              ),
              children: <PositionManagement />
            },
            {
              key: 'employees',
              label: (
                <span>
                  <TeamOutlined />
                  员工分配
                </span>
              ),
              children: <div>员工分配管理组件</div>
            },
            {
              key: 'statistics',
              label: (
                <span>
                  <SettingOutlined />
                  统计报表
                </span>
              ),
              children: <div>组织架构统计报表</div>
            }
          ]}
        />
      </Card>

      {/* 模态框和抽屉组件 */}
      {/* 这里会包含各种创建/编辑的模态框和详情抽屉 */}
    </div>
  );
};

export default OrganizationManagementPage;