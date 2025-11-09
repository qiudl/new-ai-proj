import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card,
  Button,
  Table,
  Tree,
  Modal,
  Form,
  Input,
  Select,
  message,
  Spin,
  Space,
  Tag,
  Tooltip,
  Row,
  Col,
  Statistic,
  Typography,
  Divider
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BankOutlined,
  TeamOutlined,
  UserOutlined,
  SettingOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import enterpriseService, { EnterpriseDepartment, EnterpriseDepartmentRequest } from '../services/enterpriseService';
import organizationService, { Department, Employee, CreateDepartmentRequest, UpdateDepartmentRequest } from '../services/organizationService';
import { ensureAuthToken } from '../utils/devAuth';
import { getCurrentUser, shouldShowCompanyInfo } from '../utils/userUtils';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const OrganizationStructurePage: React.FC = () => {
  const { enterpriseId } = useParams<{ enterpriseId: string }>();
  const enterpriseIdNum = enterpriseId ? parseInt(enterpriseId, 10) : null;
  
  // 支持新的Enterprise API和旧的Company API
  const [departments, setDepartments] = useState<(Department | EnterpriseDepartment)[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [availableManagers, setAvailableManagers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<(Department | EnterpriseDepartment) | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<(Department | EnterpriseDepartment) | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  
  // 使用当前用户的企业ID，如果是企业用户的话，否则使用默认企业ID
  const currentUser = getCurrentUser();
  const selectedEnterpriseId = currentUser?.enterprise_id || 2;
  const [departmentStats, setDepartmentStats] = useState({
    totalDepartments: 0,
    totalEmployees: 0,
    maxLevel: 0,
    activeDepartments: 0
  });
  const [form] = Form.useForm();

  // 加载部门数据
  const loadDepartments = async () => {
    setLoading(true);
    try {
      let departmentsData: (Department | EnterpriseDepartment)[] = [];
      
      if (enterpriseIdNum) {
        // 使用新的Enterprise API
        console.log('🔄 使用Enterprise API加载部门，企业ID:', enterpriseIdNum);
        const result = await enterpriseService.getEnterpriseDepartments(enterpriseIdNum, 1, 100);
        const flatData = result?.data || [];
        // 将扁平数据转换为树形结构
        departmentsData = buildDepartmentTree(flatData);
        console.log('✅ Enterprise API返回扁平数据:', flatData.length, '个，转换为树形数据:', departmentsData);
      } else {
        // 使用旧的Company API作为兜底
        console.log('🔄 使用Company API加载部门，企业ID:', selectedEnterpriseId);
        const result = await organizationService.getDepartments(selectedEnterpriseId);
        departmentsData = Array.isArray(result) ? result : [];
        console.log('✅ Company API返回树形数据:', departmentsData);
      }
      
      setDepartments(departmentsData);
      
      // 默认展开前几级
      if (departmentsData.length > 0) {
        const keys: string[] = [];
        departmentsData.forEach(dept => {
          keys.push(dept.id.toString());
          // 处理Company API的children结构
          if ('children' in dept && dept.children && Array.isArray(dept.children)) {
            dept.children.forEach(child => {
              keys.push(child.id.toString());
            });
          }
        });
        setExpandedKeys(keys.slice(0, 10)); // 限制展开数量
      }
    } catch (error) {
      console.error('❌ 加载部门数据失败:', error);
      message.error('加载部门数据失败，请检查网络连接或稍后重试');
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  // 加载员工数据
  const loadEmployees = async (departmentId?: number) => {
    try {
      const employeesData = await organizationService.getDepartmentEmployees(departmentId);
      setEmployees(employeesData);
    } catch (error) {
      console.error('加载员工数据失败:', error);
      message.error('加载员工数据失败');
      setEmployees([]);
    }
  };

  // 加载可用经理列表
  const loadAvailableManagers = async () => {
    try {
      const managersData = await organizationService.getAvailableManagers();
      // 经理数据类型验证
      setAvailableManagers(managersData);
    } catch (error) {
      console.error('加载可用经理列表失败:', error);
      message.error('加载可用经理列表失败');
      setAvailableManagers([]);
    }
  };

  // 加载部门统计信息
  const loadDepartmentStats = async () => {
    try {
      if (enterpriseIdNum) {
        // Enterprise API暂时没有统计接口，重新获取数据计算
        const result = await enterpriseService.getEnterpriseDepartments(enterpriseIdNum, 1, 100);
        const departmentsData = result?.data || [];
        const flattenedDepts = flattenDepartments(departmentsData);
        const stats = {
          totalDepartments: flattenedDepts.length,
          totalEmployees: flattenedDepts.reduce((sum, dept) => sum + ('employee_count' in dept ? dept.employee_count : 0), 0),
          maxLevel: Math.max(...flattenedDepts.map(dept => dept.level), 0),
          activeDepartments: flattenedDepts.filter(dept => dept.status === 'active').length
        };
        setDepartmentStats(stats);
      } else {
        // 使用旧的Company API
        const stats = await organizationService.getDepartmentStats(selectedEnterpriseId);
        
        if (stats && typeof stats === 'object') {
          setDepartmentStats({
            totalDepartments: stats.totalDepartments || 0,
            totalEmployees: stats.totalEmployees || 0,
            maxLevel: stats.maxLevel || 0,
            activeDepartments: stats.activeDepartments || 0
          });
        } else {
          setDepartmentStats({ totalDepartments: 0, totalEmployees: 0, maxLevel: 0, activeDepartments: 0 });
        }
      }
    } catch (error) {
      console.error('❌ 加载部门统计信息失败:', error);
      setDepartmentStats({ totalDepartments: 0, totalEmployees: 0, maxLevel: 0, activeDepartments: 0 });
    }
  };

  // 辅助函数：扁平化部门树结构
  const flattenDepartments = (depts: (Department | EnterpriseDepartment)[]): (Department | EnterpriseDepartment)[] => {
    const result: (Department | EnterpriseDepartment)[] = [];
    depts.forEach(dept => {
      result.push(dept);
      if ('children' in dept && dept.children && Array.isArray(dept.children)) {
        result.push(...flattenDepartments(dept.children));
      }
    });
    return result;
  };

  // 辅助函数：将扁平数据转换为树形结构
  const buildDepartmentTree = (flatDepts: (Department | EnterpriseDepartment)[]): (Department | EnterpriseDepartment)[] => {
    if (!flatDepts || flatDepts.length === 0) {
      return [];
    }
    
    const deptMap = new Map<number, any>();
    const result: (Department | EnterpriseDepartment)[] = [];
    
    console.log('🔄 构建部门树，输入数据:', flatDepts.length, '个部门');
    
    // 创建映射，为所有部门添加children属性
    flatDepts.forEach(dept => {
      deptMap.set(dept.id, { ...dept, children: [] });
    });
    
    // 构建树形结构
    flatDepts.forEach(dept => {
      const deptNode = deptMap.get(dept.id)!;
      if (!dept.parent_id) {
        // 根节点
        result.push(deptNode);
        console.log('🌳 根节点:', dept.name);
      } else {
        // 子节点
        const parent = deptMap.get(dept.parent_id);
        if (parent) {
          parent.children.push(deptNode);
          console.log('🌿 子节点:', dept.name, '父节点:', parent.name);
        } else {
          console.warn('⚠️ 找不到父节点:', dept.parent_id, '对于部门:', dept.name);
          // 如果找不到父节点，暂时放到根级别
          result.push(deptNode);
        }
      }
    });
    
    console.log('✅ 构建完成，根节点数量:', result.length);
    return result;
  };

  useEffect(() => {
    const initializeAuth = async () => {
      // 确保在开发环境下有有效的认证token
      const hasAuth = await ensureAuthToken();
      // 认证状态检查
      
      if (hasAuth) {
        loadDepartments();
        loadEmployees();
        // 只在非企业上下文时加载可用经理列表，因为Enterprise API不支持经理管理
        if (!enterpriseIdNum) {
          loadAvailableManagers();
        }
        loadDepartmentStats();
      } else {
        console.warn('❌ 认证失败，无法加载组织数据');
        message.error('认证失败，请刷新页面重试');
      }
    };
    
    initializeAuth();
  }, [selectedEnterpriseId, enterpriseIdNum]);


  // 处理部门选择
  const handleDepartmentSelect = (selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length > 0) {
      const departmentId = parseInt(selectedKeys[0] as string);
      const department = findDepartmentById(departments, departmentId);
      setSelectedDepartment(department);
      loadEmployees(departmentId);
    } else {
      setSelectedDepartment(null);
      loadEmployees();
    }
  };

  // 处理树展开状态
  const handleTreeExpand = (expandedKeys: React.Key[]) => {
    setExpandedKeys(expandedKeys.map(key => key.toString()));
  };

  // 递归查找部门
  const findDepartmentById = (depts: (Department | EnterpriseDepartment)[], id: number): Department | EnterpriseDepartment | null => {
    if (!Array.isArray(depts)) {
      console.warn('findDepartmentById received non-array data:', depts);
      return null;
    }
    
    for (const dept of depts) {
      if (dept.id === id) return dept;
      if ('children' in dept && dept.children && Array.isArray(dept.children)) {
        const found = findDepartmentById(dept.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // 转换为Tree组件数据格式
  const convertToTreeData = (depts: (Department | EnterpriseDepartment)[]): any[] => {
    if (!Array.isArray(depts)) {
      console.warn('convertToTreeData received non-array data:', depts);
      return [];
    }
    
    return depts.map(dept => ({
      key: dept.id.toString(),
      title: (
        <Space>
          <BankOutlined />
          <span>{dept.name}</span>
          <Tag color={dept.status === 'active' ? 'green' : 'red'}>
            {dept.status === 'active' ? '活跃' : '停用'}
          </Tag>
          <Text type="secondary">({'user_count' in dept ? dept.user_count : ('employee_count' in dept ? dept.employee_count : 0)}人)</Text>
        </Space>
      ),
      children: ('children' in dept && dept.children && Array.isArray(dept.children)) ? convertToTreeData(dept.children) : undefined,
      isLeaf: !('children' in dept) || !dept.children || !Array.isArray(dept.children) || dept.children.length === 0
    }));
  };

  // 递归渲染部门选项（用于上级部门选择）
  const renderDepartmentOptions = (department: Department | EnterpriseDepartment, excludeId?: number): JSX.Element[] => {
    const options: JSX.Element[] = [];
    
    // 排除自己（编辑时不能选择自己作为父部门）
    if (department.id !== excludeId) {
      options.push(
        <Option key={department.id} value={department.id}>
          {'  '.repeat(department.level)}{department.name}
        </Option>
      );
    }
    
    // 递归处理子部门
    if ('children' in department && department.children && Array.isArray(department.children)) {
      department.children.forEach(child => {
        options.push(...renderDepartmentOptions(child, excludeId));
      });
    }
    
    return options;
  };

  // 显示添加/编辑部门弹窗
  const showDepartmentModal = (department?: Department | EnterpriseDepartment) => {
    setEditingDepartment(department || null);
    setModalVisible(true);
    
    if (department) {
      form.setFieldsValue({
        name: department.name,
        parent_id: 'parent_id' in department ? department.parent_id : undefined,
        manager_id: 'manager_id' in department ? department.manager_id : undefined,
        description: department.description,
        status: department.status
      });
    } else {
      form.resetFields();
      // 如果有选中的部门，默认设为父部门
      if (selectedDepartment) {
        form.setFieldValue('parent_id', selectedDepartment.id);
      }
    }
  };

  // 处理部门保存
  const handleDepartmentSave = async () => {
    try {
      // 确保有有效的认证token
      const hasAuth = await ensureAuthToken();
      if (!hasAuth) {
        message.error('认证失败，请刷新页面重试');
        return;
      }

      const values = await form.validateFields();
      
      if (editingDepartment) {
        if (enterpriseIdNum) {
          // 使用Enterprise API更新部门
          const updateData: EnterpriseDepartmentRequest = {
            name: values.name,
            description: values.description,
            parent_id: values.parent_id,
            status: values.status
          };
          await enterpriseService.updateEnterpriseDepartment(enterpriseIdNum, editingDepartment.id, updateData);
          message.success('部门更新成功');
        } else {
          // 使用Company API更新部门
          const updateData: UpdateDepartmentRequest = {
            name: values.name,
            parent_id: values.parent_id,
            manager_id: values.manager_id,
            description: values.description,
            status: values.status
          };
          await organizationService.updateDepartment(editingDepartment.id, updateData, selectedEnterpriseId);
          message.success('部门更新成功');
        }
      } else {
        if (enterpriseIdNum) {
          // 使用Enterprise API创建部门
          const createData: EnterpriseDepartmentRequest = {
            name: values.name,
            description: values.description,
            parent_id: values.parent_id,
            status: values.status || 'active'
          };
          await enterpriseService.createEnterpriseDepartment(enterpriseIdNum, createData);
          message.success('部门创建成功');
        } else {
          // 使用Company API创建部门
          const createData: CreateDepartmentRequest = {
            name: values.name,
            parent_id: values.parent_id,
            manager_id: values.manager_id,
            description: values.description,
            status: values.status || 'active'
          };
          await organizationService.createDepartment(createData, selectedEnterpriseId);
          message.success('部门创建成功');
        }
      }
      
      setModalVisible(false);
      loadDepartments();
      loadDepartmentStats();
      
      // 如果有选中的部门，重新加载其员工列表
      if (selectedDepartment) {
        loadEmployees(selectedDepartment.id);
      }
    } catch (error) {
      console.error('保存部门失败:', error);
      message.error('保存部门失败，请检查输入信息');
    }
  };

  // 删除部门
  const handleDepartmentDelete = (department: Department | EnterpriseDepartment) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除部门 "${department.name}" 吗？此操作不可恢复。`,
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          if (enterpriseIdNum) {
            // 使用Enterprise API删除部门
            await enterpriseService.deleteEnterpriseDepartment(enterpriseIdNum, department.id);
          } else {
            // 使用Company API删除部门
            await organizationService.deleteDepartment(department.id, selectedEnterpriseId);
          }
          message.success('部门删除成功');
          loadDepartments();
          loadDepartmentStats();
          
          // 如果删除的是当前选中的部门，清除选中状态
          if (selectedDepartment && selectedDepartment.id === department.id) {
            setSelectedDepartment(null);
            loadEmployees(); // 加载所有员工
          }
        } catch (error) {
          console.error('删除部门失败:', error);
          message.error('删除部门失败，请检查是否存在关联数据');
        }
      }
    });
  };

  // 员工列表列定义
  const employeeColumns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Space>
          <UserOutlined />
          {text}
        </Space>
      )
    },
    {
      title: '职位',
      dataIndex: 'position',
      key: 'position'
    },
    {
      title: '部门',
      dataIndex: 'department_name',
      key: 'department_name'
    },
    {
      title: '联系方式',
      key: 'contact',
      render: (record: Employee) => (
        <div>
          {record.email && <div>{record.email}</div>}
          {record.phone && <div>{record.phone}</div>}
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '在职' : '离职'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: Employee) => (
        <Space>
          <Button
            type="link"
            
            icon={<EditOutlined />}
            onClick={() => message.info('编辑员工功能待实现')}
          >
            编辑
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ marginBottom: 0 }}>
            <BankOutlined /> 组织架构管理
          </Title>
        </Col>
        <Col>
          {/* 移除了测试用户切换和企业选择下拉框 */}
        </Col>
      </Row>
      
      {/* 企业信息卡片 - 仅对企业用户显示 */}
      
      {/* 统计信息 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="部门总数"
              value={departmentStats?.totalDepartments || 0}
              prefix={<BankOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="员工总数"
              value={departmentStats?.totalEmployees || 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="管理层级"
              value={(departmentStats?.maxLevel || 0) + 1}
              prefix={<SettingOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃部门"
              value={departmentStats?.activeDepartments || 0}
              prefix={<InfoCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={24}>
        {/* 左侧：组织架构树 */}
        <Col span={12}>
          <Card
            title="组织架构"
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => showDepartmentModal()}
              >
                新建部门
              </Button>
            }
          >
            <Spin spinning={loading}>
              {departments.length > 0 ? (
                <Tree
                  showLine
                  onSelect={handleDepartmentSelect}
                  expandedKeys={expandedKeys}
                  onExpand={handleTreeExpand}
                  treeData={Array.isArray(departments) ? convertToTreeData(departments) : []}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                  暂无部门数据
                </div>
              )}
            </Spin>
          </Card>
        </Col>

        {/* 右侧：部门详情和员工列表 */}
        <Col span={12}>
          {selectedDepartment ? (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {/* 部门详情 */}
              <Card
                title={
                  <Space>
                    <BankOutlined />
                    {selectedDepartment.name}
                  </Space>
                }
                extra={
                  <Space>
                    <Button
                      type="primary"
                      
                      icon={<EditOutlined />}
                      onClick={() => showDepartmentModal(selectedDepartment)}
                    >
                      编辑
                    </Button>
                    <Button
                      danger
                      
                      icon={<DeleteOutlined />}
                      onClick={() => handleDepartmentDelete(selectedDepartment)}
                    >
                      删除
                    </Button>
                  </Space>
                }
                
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Text strong>部门经理：</Text>
                    <Text>{'manager_name' in selectedDepartment ? selectedDepartment.manager_name || '未设置' : '未设置'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>员工数量：</Text>
                    <Text>{'user_count' in selectedDepartment ? selectedDepartment.user_count : ('employee_count' in selectedDepartment ? selectedDepartment.employee_count : 0)}人</Text>
                  </Col>
                </Row>
                <Divider style={{ margin: '12px 0' }} />
                <div>
                  <Text strong>部门描述：</Text>
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">{selectedDepartment.description || '暂无描述'}</Text>
                  </div>
                </div>
              </Card>

              {/* 部门员工列表 */}
              <Card
                title={`${selectedDepartment.name} - 员工列表`}
                extra={
                  <Button
                    type="primary"
                    
                    icon={<PlusOutlined />}
                    onClick={() => message.info('添加员工功能待实现')}
                  >
                    添加员工
                  </Button>
                }
              >
                <Table
                  columns={employeeColumns}
                  dataSource={employees || []}
                  rowKey="id"
                  
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 条记录`
                  }}
                />
              </Card>
            </Space>
          ) : (
            <Card>
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
                <BankOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                <div>请从左侧选择部门查看详情</div>
              </div>
            </Card>
          )}
        </Col>
      </Row>

      {/* 添加/编辑部门弹窗 */}
      <Modal
        title={editingDepartment ? '编辑部门' : '新建部门'}
        open={modalVisible}
        onOk={handleDepartmentSave}
        onCancel={() => setModalVisible(false)}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'active'
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="部门名称"
                name="name"
                rules={[{ required: true, message: '请输入部门名称' }]}
              >
                <Input placeholder="请输入部门名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="上级部门"
                name="parent_id"
                tooltip="不选择则为顶级部门"
              >
                <Select placeholder="请选择上级部门" allowClear>
                  {Array.isArray(departments) ? departments.map((dept) => 
                    renderDepartmentOptions(dept, editingDepartment?.id)
                  ).flat() : []}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            {!enterpriseIdNum && (
              <Col span={12}>
                <Form.Item
                  label="部门经理"
                  name="manager_id"
                >
                  <Select placeholder="请选择部门经理" allowClear>
                    {Array.isArray(availableManagers) ? availableManagers.map(manager => (
                      <Option key={manager.id} value={manager.id}>
                        {manager.name} ({manager.position})
                      </Option>
                    )) : []}
                </Select>
              </Form.Item>
            </Col>
            )}
            <Col span={enterpriseIdNum ? 24 : 12}>
              <Form.Item
                label="状态"
                name="status"
              >
                <Select>
                  <Option value="active">活跃</Option>
                  <Option value="inactive">停用</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="部门描述"
            name="description"
          >
            <TextArea
              rows={3}
              placeholder="请输入部门职能描述..."
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OrganizationStructurePage;