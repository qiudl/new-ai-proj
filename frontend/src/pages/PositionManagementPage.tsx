import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Tag,
  Row,
  Col,
  Statistic,
  Typography,
  Divider,
  InputNumber,
  Tabs,
  List,
  Avatar,
  Progress
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ContactsOutlined,
  TeamOutlined,
  StarOutlined,
  DollarOutlined,
  TrophyOutlined,
  UserOutlined,
  BookOutlined,
  RiseOutlined
} from '@ant-design/icons';
import positionService, { Position, SkillRequirement, EmployeePosition, CreatePositionRequest, UpdatePositionRequest } from '../services/positionService';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const PositionManagementPage: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [employeePositions, setEmployeePositions] = useState<EmployeePosition[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<{id: number; name: string}[]>([]);
  const [positionStats, setPositionStats] = useState({
    totalPositions: 0,
    totalEmployees: 0,
    recruitingPositions: 0,
    avgSalaryRange: { min: 0, max: 0 },
    categoryStats: [] as { category: string; count: number }[]
  });
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [activeTab, setActiveTab] = useState('list');
  const [form] = Form.useForm();

  // 加载岗位数据
  const loadPositions = async () => {
    setLoading(true);
    try {
      const positionsData = await positionService.getPositions();
      setPositions(positionsData);
    } catch (error) {
      console.error('加载岗位数据失败:', error);
      message.error('加载岗位数据失败，请检查网络连接或稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 加载员工岗位分配数据
  const loadEmployeePositions = async (positionId?: number) => {
    try {
      const employeePositionsData = await positionService.getPositionEmployees(positionId);
      setEmployeePositions(employeePositionsData);
    } catch (error) {
      console.error('加载员工岗位分配数据失败:', error);
      message.error('加载员工岗位分配数据失败');
      setEmployeePositions([]);
    }
  };

  // 加载可用部门列表
  const loadAvailableDepartments = async () => {
    try {
      const departmentsData = await positionService.getAvailableDepartments();
      setAvailableDepartments(departmentsData);
    } catch (error) {
      console.error('加载可用部门列表失败:', error);
      setAvailableDepartments([]);
    }
  };

  // 加载岗位统计信息
  const loadPositionStats = async () => {
    try {
      const stats = await positionService.getPositionStats();
      setPositionStats(stats);
    } catch (error) {
      console.error('加载岗位统计信息失败:', error);
    }
  };

  useEffect(() => {
    loadPositions();
    loadEmployeePositions();
    loadAvailableDepartments();
    loadPositionStats();
  }, []);

  // 显示添加/编辑岗位弹窗
  const showPositionModal = (position?: Position) => {
    setEditingPosition(position || null);
    setModalVisible(true);
    
    if (position) {
      form.setFieldsValue({
        name: position.name,
        department_id: position.department_id,
        level: position.level,
        category: position.category,
        description: position.description,
        requirements: position.requirements,
        salary_min: position.salary_min,
        salary_max: position.salary_max,
        status: position.status
      });
    } else {
      form.resetFields();
    }
  };

  // 处理岗位保存
  const handlePositionSave = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingPosition) {
        const updateData: UpdatePositionRequest = {
          name: values.name,
          department_id: values.department_id,
          level: values.level,
          category: values.category,
          description: values.description,
          requirements: values.requirements,
          salary_min: values.salary_min,
          salary_max: values.salary_max,
          status: values.status
        };
        await positionService.updatePosition(editingPosition.id, updateData);
        message.success('岗位更新成功');
      } else {
        const createData: CreatePositionRequest = {
          name: values.name,
          department_id: values.department_id,
          level: values.level || 1,
          category: values.category,
          description: values.description,
          requirements: values.requirements || [],
          salary_min: values.salary_min,
          salary_max: values.salary_max,
          status: values.status || 'active'
        };
        await positionService.createPosition(createData);
        message.success('岗位创建成功');
      }
      
      setModalVisible(false);
      loadPositions();
      loadPositionStats();
      
      // 如果有选中的岗位，重新加载其员工列表
      if (selectedPosition) {
        loadEmployeePositions(selectedPosition.id);
      }
    } catch (error) {
      console.error('保存岗位失败:', error);
      message.error('保存岗位失败，请检查输入信息');
    }
  };

  // 删除岗位
  const handlePositionDelete = (position: Position) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除岗位 "${position.name}" 吗？此操作不可恢复。`,
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await positionService.deletePosition(position.id);
          message.success('岗位删除成功');
          loadPositions();
          loadPositionStats();
          
          // 如果删除的是当前选中的岗位，清除选中状态
          if (selectedPosition && selectedPosition.id === position.id) {
            setSelectedPosition(null);
            loadEmployeePositions(); // 加载所有员工岗位分配
          }
        } catch (error) {
          console.error('删除岗位失败:', error);
          message.error('删除岗位失败，请检查是否存在关联数据');
        }
      }
    });
  };

  // 岗位状态渲染
  const renderStatus = (status: string) => {
    const statusMap = {
      active: { color: 'green', text: '活跃' },
      inactive: { color: 'red', text: '停用' },
      recruiting: { color: 'blue', text: '招聘中' }
    };
    const config = statusMap[status as keyof typeof statusMap] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 岗位列表列定义
  const positionColumns = [
    {
      title: '岗位名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Position) => (
        <Space>
          <ContactsOutlined />
          <span style={{ fontWeight: 'bold' }}>{text}</span>
          <Text type="secondary">L{record.level}</Text>
        </Space>
      )
    },
    {
      title: '所属部门',
      dataIndex: 'department_name',
      key: 'department_name'
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => <Tag>{category}</Tag>
    },
    {
      title: '薪资范围',
      key: 'salary',
      render: (record: Position) => (
        record.salary_min && record.salary_max ? (
          <span>
            <DollarOutlined style={{ marginRight: 4 }} />
            {record.salary_min / 1000}K - {record.salary_max / 1000}K
          </span>
        ) : '面议'
      )
    },
    {
      title: '在职人数',
      dataIndex: 'employee_count',
      key: 'employee_count',
      render: (count: number) => (
        <Space>
          <TeamOutlined />
          {count}人
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: renderStatus
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: Position) => (
        <Space>
          <Button
            type="link"
            
            icon={<EditOutlined />}
            onClick={() => showPositionModal(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            
            icon={<DeleteOutlined />}
            danger
            onClick={() => handlePositionDelete(record)}
          >
            删除
          </Button>
          <Button
            type="link"
            
            onClick={() => setSelectedPosition(record)}
          >
            详情
          </Button>
        </Space>
      )
    }
  ];

  // 技能要求数据
  const skillRequirements: SkillRequirement[] = [
    { id: 1, name: 'React', level: 4, required: true, category: '前端框架' },
    { id: 2, name: 'TypeScript', level: 3, required: true, category: '编程语言' },
    { id: 3, name: 'CSS', level: 4, required: true, category: '样式技术' },
    { id: 4, name: 'JavaScript', level: 5, required: true, category: '编程语言' },
    { id: 5, name: 'Git', level: 3, required: true, category: '工具' }
  ];


  const tabItems = [
    {
      key: 'list',
      label: '岗位列表',
      children: (
        <Card>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              <Input.Search
                placeholder="搜索岗位名称..."
                style={{ width: 300 }}
                onSearch={value => { /* TODO: 实现搜索功能 */ }}
              />
              <Select
                placeholder="筛选部门"
                style={{ width: 200 }}
                allowClear
              >
                <Option value="2">技术部</Option>
                <Option value="3">市场部</Option>
                <Option value="4">人事部</Option>
              </Select>
              <Select
                placeholder="筛选状态"
                style={{ width: 120 }}
                allowClear
              >
                <Option value="active">活跃</Option>
                <Option value="inactive">停用</Option>
                <Option value="recruiting">招聘中</Option>
              </Select>
            </Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => showPositionModal()}
            >
              新建岗位
            </Button>
          </div>
          
          <Table
            columns={positionColumns}
            dataSource={positions || []}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`
            }}
          />
        </Card>
      )
    },
    {
      key: 'skills',
      label: '技能管理',
      children: (
        <Card title="技能要求管理">
          <Row gutter={16}>
            <Col span={16}>
              <List
                itemLayout="horizontal"
                dataSource={skillRequirements}
                renderItem={skill => (
                  <List.Item
                    actions={[
                      <Button type="link"  icon={<EditOutlined />}>编辑</Button>,
                      <Button type="link"  danger icon={<DeleteOutlined />}>删除</Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={<BookOutlined />} />}
                      title={
                        <Space>
                          {skill.name}
                          {skill.required && <Tag color="red">必需</Tag>}
                          <Tag>{skill.category}</Tag>
                        </Space>
                      }
                      description={
                        <Space>
                          <Text>熟练度要求：</Text>
                          <Progress
                            percent={skill.level * 20}
                            
                            style={{ width: 100 }}
                            format={() => `L${skill.level}`}
                          />
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Col>
            <Col span={8}>
              <Card  title="技能统计">
                <Statistic title="技能总数" value={skillRequirements.length} prefix={<BookOutlined />} />
                <Divider />
                <Statistic title="必需技能" value={skillRequirements.filter(s => s.required).length} prefix={<StarOutlined />} />
                <Divider />
                <Statistic title="平均熟练度要求" value={3.8} suffix="级" prefix={<TrophyOutlined />} />
              </Card>
            </Col>
          </Row>
        </Card>
      )
    },
    {
      key: 'assignments',
      label: '人员分配',
      children: (
        <Card title="岗位人员分配">
          <Table
            columns={[
              {
                title: '员工姓名',
                dataIndex: 'employee_name',
                key: 'employee_name',
                render: (name: string) => (
                  <Space>
                    <UserOutlined />
                    {name}
                  </Space>
                )
              },
              {
                title: '岗位',
                dataIndex: 'position_name',
                key: 'position_name'
              },
              {
                title: '部门',
                dataIndex: 'department_name',
                key: 'department_name'
              },
              {
                title: '入职日期',
                dataIndex: 'start_date',
                key: 'start_date'
              },
              {
                title: '主岗位',
                dataIndex: 'is_primary',
                key: 'is_primary',
                render: (isPrimary: boolean) => (
                  isPrimary ? <Tag color="blue">主岗位</Tag> : <Tag>副岗位</Tag>
                )
              },
              {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                render: renderStatus
              },
              {
                title: '操作',
                key: 'actions',
                render: () => (
                  <Space>
                    <Button type="link" >调整</Button>
                    <Button type="link"  danger>移除</Button>
                  </Space>
                )
              }
            ]}
            dataSource={employeePositions || []}
            rowKey="id"
            
          />
        </Card>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <ContactsOutlined /> 岗位管理
      </Title>
      
      {/* 统计信息 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="岗位总数"
              value={positionStats.totalPositions}
              prefix={<ContactsOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="在招岗位"
              value={positionStats.recruitingPositions}
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总在职人数"
              value={positionStats.totalEmployees}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均薪资"
              value={Math.round((positionStats.avgSalaryRange.min + positionStats.avgSalaryRange.max) / 2 / 1000)}
              suffix="K"
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />

      {/* 添加/编辑岗位弹窗 */}
      <Modal
        title={editingPosition ? '编辑岗位' : '新建岗位'}
        open={modalVisible}
        onOk={handlePositionSave}
        onCancel={() => setModalVisible(false)}
        width={800}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'active',
            level: 1
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="岗位名称"
                name="name"
                rules={[{ required: true, message: '请输入岗位名称' }]}
              >
                <Input placeholder="请输入岗位名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="所属部门"
                name="department_id"
                rules={[{ required: true, message: '请选择所属部门' }]}
              >
                <Select placeholder="请选择所属部门">
                  {availableDepartments.map(dept => (
                    <Option key={dept.id} value={dept.id}>
                      {dept.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="岗位级别"
                name="level"
                rules={[{ required: true, message: '请选择岗位级别' }]}
              >
                <Select>
                  <Option value={1}>L1 - 初级</Option>
                  <Option value={2}>L2 - 中级</Option>
                  <Option value={3}>L3 - 高级</Option>
                  <Option value={4}>L4 - 专家</Option>
                  <Option value={5}>L5 - 资深专家</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="岗位类别"
                name="category"
                rules={[{ required: true, message: '请选择岗位类别' }]}
              >
                <Select>
                  <Option value="技术类">技术类</Option>
                  <Option value="管理类">管理类</Option>
                  <Option value="设计类">设计类</Option>
                  <Option value="运营类">运营类</Option>
                  <Option value="销售类">销售类</Option>
                  <Option value="支持类">支持类</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="状态"
                name="status"
              >
                <Select>
                  <Option value="active">活跃</Option>
                  <Option value="inactive">停用</Option>
                  <Option value="recruiting">招聘中</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="最低薪资（元）"
                name="salary_min"
              >
                <InputNumber
                  placeholder="最低薪资"
                  style={{ width: '100%' }}
                  min={0}
                  step={1000}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="最高薪资（元）"
                name="salary_max"
              >
                <InputNumber
                  placeholder="最高薪资"
                  style={{ width: '100%' }}
                  min={0}
                  step={1000}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="岗位描述"
            name="description"
            rules={[{ required: true, message: '请输入岗位描述' }]}
          >
            <TextArea
              rows={3}
              placeholder="请输入岗位职责描述..."
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item
            label="技能要求"
            name="requirements"
            tooltip="输入技能名称后回车添加，多个技能分别添加"
          >
            <Select
              mode="tags"
              placeholder="请输入技能要求..."
              style={{ width: '100%' }}
            >
              <Option value="React">React</Option>
              <Option value="Vue">Vue</Option>
              <Option value="TypeScript">TypeScript</Option>
              <Option value="Go">Go</Option>
              <Option value="Python">Python</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 岗位详情弹窗 */}
      {selectedPosition && (
        <Modal
          title={`岗位详情 - ${selectedPosition.name}`}
          open={!!selectedPosition}
          onCancel={() => setSelectedPosition(null)}
          footer={[
            <Button key="close" onClick={() => setSelectedPosition(null)}>
              关闭
            </Button>
          ]}
          width={700}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Card  title="基本信息">
                <p><Text strong>岗位名称：</Text>{selectedPosition.name}</p>
                <p><Text strong>所属部门：</Text>{selectedPosition.department_name}</p>
                <p><Text strong>岗位级别：</Text>L{selectedPosition.level}</p>
                <p><Text strong>岗位类别：</Text>{selectedPosition.category}</p>
                <p><Text strong>状态：</Text>{renderStatus(selectedPosition.status)}</p>
              </Card>
            </Col>
            <Col span={12}>
              <Card  title="薪资与人员">
                <p>
                  <Text strong>薪资范围：</Text>
                  {selectedPosition.salary_min && selectedPosition.salary_max 
                    ? `${selectedPosition.salary_min / 1000}K - ${selectedPosition.salary_max / 1000}K`
                    : '面议'
                  }
                </p>
                <p><Text strong>在职人数：</Text>{selectedPosition.employee_count}人</p>
                <p><Text strong>创建时间：</Text>{new Date(selectedPosition.created_at).toLocaleDateString()}</p>
                <p><Text strong>更新时间：</Text>{new Date(selectedPosition.updated_at).toLocaleDateString()}</p>
              </Card>
            </Col>
          </Row>
          
          <Divider />
          
          <div>
            <Text strong>岗位描述：</Text>
            <div style={{ marginTop: 8, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
              {selectedPosition.description}
            </div>
          </div>
          
          <Divider />
          
          <div>
            <Text strong>技能要求：</Text>
            <div style={{ marginTop: 8 }}>
              {selectedPosition.requirements.map((skill, index) => (
                <Tag key={index} style={{ margin: 4 }}>{skill}</Tag>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PositionManagementPage;