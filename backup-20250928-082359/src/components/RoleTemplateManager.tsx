import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Modal,
  Form,
  message,
  Popconfirm,
  Tooltip,
  Badge,
  Row,
  Col,
  Statistic,
  Dropdown,
  MenuProps
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  UploadOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  MoreOutlined
} from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import {
  RoleTemplate,
  TemplateCategory,
  RoleTemplateListParams,
  RoleTemplateFilters,
  RoleTemplateStats
} from '../types/roleTemplate';
import roleTemplateService from '../services/roleTemplateService';
import RoleTemplateForm from './RoleTemplateForm';
import RoleTemplateDetail from './RoleTemplateDetail';
import { formatDate } from '../utils/dateUtils';

const { Search } = Input;
const { Option } = Select;

interface RoleTemplateManagerProps {
  onTemplateSelect?: (template: RoleTemplate) => void;
  mode?: 'management' | 'selection'; // 管理模式 或 选择模式
  selectable?: boolean;
  selectedTemplateIds?: number[];
  onSelectionChange?: (selectedIds: number[]) => void;
}

const RoleTemplateManager: React.FC<RoleTemplateManagerProps> = ({
  onTemplateSelect,
  mode = 'management',
  selectable = false,
  selectedTemplateIds = [],
  onSelectionChange
}) => {
  // 状态管理
  const [templates, setTemplates] = useState<RoleTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<RoleTemplateStats | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  // 筛选和搜索状态
  const [filters, setFilters] = useState<RoleTemplateFilters>({
    category: '',
    industry: '',
    department: '',
    is_active: null,
    is_system_template: null,
    search: '',
    tags: [],
    level: null
  });

  // 模态框状态
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<RoleTemplate | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'clone'>('create');

  // 表单实例
  const [form] = Form.useForm();

  // 加载模板列表
  const loadTemplates = useCallback(async (params?: Partial<RoleTemplateListParams>) => {
    setLoading(true);
    try {
      const queryParams: RoleTemplateListParams = {
        page: pagination.current,
        page_size: pagination.pageSize,
        ...filters,
        ...params
      };

      // 清理空值
      Object.keys(queryParams).forEach(key => {
        const value = queryParams[key as keyof RoleTemplateListParams];
        if (value === '' || value === null || value === undefined) {
          delete queryParams[key as keyof RoleTemplateListParams];
        }
      });

      const response = await roleTemplateService.getRoleTemplates(queryParams);
      
      if (response.success && response.data) {
        setTemplates(response.data.templates);
        setPagination(prev => ({
          ...prev,
          total: response.data!.total
        }));
      } else {
        message.error(response.message || '加载模板列表失败');
      }
    } catch (error: any) {
      message.error(error.message || '加载模板列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, filters]);

  // 加载统计数据
  const loadStats = useCallback(async () => {
    try {
      const statsData = await roleTemplateService.getTemplateStats();
      setStats(statsData);
    } catch (error: any) {
      console.error('Failed to load template stats:', error);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadTemplates();
    if (mode === 'management') {
      loadStats();
    }
  }, [loadTemplates, mode]);

  // 处理搜索
  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // 处理筛选变更
  const handleFilterChange = (key: keyof RoleTemplateFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // 处理表格变更
  const handleTableChange = (paginationInfo: any) => {
    setPagination(prev => ({
      ...prev,
      current: paginationInfo.current,
      pageSize: paginationInfo.pageSize
    }));
  };

  // 打开创建表单
  const handleCreate = () => {
    setCurrentTemplate(null);
    setFormMode('create');
    setFormModalVisible(true);
    form.resetFields();
  };

  // 打开编辑表单
  const handleEdit = (template: RoleTemplate) => {
    setCurrentTemplate(template);
    setFormMode('edit');
    setFormModalVisible(true);
    
    // 填充表单数据
    form.setFieldsValue({
      template_code: template.template_code,
      template_name: template.template_name,
      template_description: template.template_description,
      category: template.category,
      industry: template.industry,
      department: template.department,
      parent_template_id: template.parent_template_id,
      is_active: template.is_active,
      configuration: template.configuration,
      metadata: template.metadata,
      tags: template.tags?.map(tag => tag.tag_name) || []
    });
  };

  // 打开克隆表单
  const handleClone = (template: RoleTemplate) => {
    setCurrentTemplate(template);
    setFormMode('clone');
    setFormModalVisible(true);
    
    // 填充表单数据（排除不能克隆的字段）
    form.setFieldsValue({
      template_code: `${template.template_code}_copy`,
      template_name: `${template.template_name} (副本)`,
      template_description: template.template_description,
      category: template.category,
      industry: template.industry,
      department: template.department,
      parent_template_id: template.parent_template_id,
      is_active: true,
      configuration: template.configuration,
      metadata: template.metadata,
      tags: template.tags?.map(tag => tag.tag_name) || []
    });
  };

  // 查看详情
  const handleDetail = (template: RoleTemplate) => {
    setCurrentTemplate(template);
    setDetailModalVisible(true);
  };

  // 删除模板
  const handleDelete = async (template: RoleTemplate) => {
    try {
      const response = await roleTemplateService.deleteRoleTemplate(template.id);
      if (response.success) {
        message.success('删除成功');
        loadTemplates();
        loadStats();
      } else {
        message.error(response.message || '删除失败');
      }
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  // 切换模板状态
  const handleToggleActive = async (template: RoleTemplate) => {
    try {
      const response = await roleTemplateService.updateRoleTemplate(template.id, {
        is_active: !template.is_active
      });
      
      if (response.success) {
        message.success(`${template.is_active ? '停用' : '激活'}成功`);
        loadTemplates();
        loadStats();
      } else {
        message.error(response.message || '操作失败');
      }
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  // 表单提交
  const handleFormSubmit = async (values: any) => {
    try {
      let response;
      
      if (formMode === 'create') {
        response = await roleTemplateService.createRoleTemplate(values);
      } else if (formMode === 'edit' && currentTemplate) {
        response = await roleTemplateService.updateRoleTemplate(currentTemplate.id, values);
      } else if (formMode === 'clone' && currentTemplate) {
        response = await roleTemplateService.cloneTemplate(currentTemplate.id, values);
      }

      if (response?.success) {
        message.success(`${formMode === 'create' ? '创建' : formMode === 'edit' ? '更新' : '克隆'}成功`);
        setFormModalVisible(false);
        loadTemplates();
        loadStats();
      } else {
        message.error(response?.message || '操作失败');
      }
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  // 获取分类标签颜色
  const getCategoryTagColor = (category: TemplateCategory) => {
    switch (category) {
      case 'system': return 'red';
      case 'business': return 'blue';
      case 'custom': return 'green';
      default: return 'default';
    }
  };

  // 获取级别标签
  const getLevelTag = (level: number) => {
    const levelMap: Record<number, { text: string; color: string }> = {
      1: { text: 'L1-高级', color: 'red' },
      2: { text: 'L2-中级', color: 'orange' },
      3: { text: 'L3-基础', color: 'blue' },
      4: { text: 'L4-受限', color: 'gray' }
    };
    return levelMap[level] || { text: `L${level}`, color: 'default' };
  };

  // 操作菜单
  const getActionMenu = (template: RoleTemplate): MenuProps => ({
    items: [
      {
        key: 'detail',
        label: '查看详情',
        icon: <InfoCircleOutlined />,
        onClick: () => handleDetail(template)
      },
      {
        key: 'edit',
        label: '编辑',
        icon: <EditOutlined />,
        onClick: () => handleEdit(template),
        disabled: template.is_system_template && mode === 'management'
      },
      {
        key: 'clone',
        label: '克隆',
        icon: <CopyOutlined />,
        onClick: () => handleClone(template)
      },
      {
        key: 'toggle',
        label: template.is_active ? '停用' : '激活',
        icon: template.is_active ? <CloseOutlined /> : <CheckOutlined />,
        onClick: () => handleToggleActive(template),
        disabled: template.is_system_template
      },
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        disabled: template.is_system_template,
        onClick: () => {
          Modal.confirm({
            title: '确认删除',
            content: `确定要删除模板 "${template.template_name}" 吗？`,
            onOk: () => handleDelete(template)
          });
        }
      }
    ]
  });

  // 表格列定义
  const columns: ColumnsType<RoleTemplate> = [
    {
      title: '模板代码',
      dataIndex: 'template_code',
      key: 'template_code',
      width: 150,
      fixed: 'left'
    },
    {
      title: '模板名称',
      dataIndex: 'template_name',
      key: 'template_name',
      width: 200,
      render: (text, record) => (
        <Space direction="vertical" size={2}>
          <span>{text}</span>
          {record.template_description && (
            <span style={{ fontSize: '12px', color: '#666' }}>
              {record.template_description}
            </span>
          )}
        </Space>
      )
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: TemplateCategory) => (
        <Tag color={getCategoryTagColor(category)}>
          {category === 'system' ? '系统' : category === 'business' ? '业务' : '自定义'}
        </Tag>
      )
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: number) => {
        const levelInfo = getLevelTag(level);
        return <Tag color={levelInfo.color}>{levelInfo.text}</Tag>;
      }
    },
    {
      title: '行业/部门',
      key: 'industry_department',
      width: 150,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          {record.industry && <Tag >{record.industry}</Tag>}
          {record.department && <Tag >{record.department}</Tag>}
        </Space>
      )
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_, record) => (
        <Space>
          <Badge status={record.is_active ? 'success' : 'default'} />
          <span>{record.is_active ? '激活' : '停用'}</span>
          {record.is_system_template && <Tag  color="blue">系统</Tag>}
        </Space>
      )
    },
    {
      title: '使用次数',
      dataIndex: 'usage_count',
      key: 'usage_count',
      width: 100,
      render: (count) => count || 0
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 150,
      render: (date) => formatDate(date)
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space >
          <Tooltip title="查看详情">
            <Button 
              type="text" 
               
              icon={<InfoCircleOutlined />}
              onClick={() => handleDetail(record)}
            />
          </Tooltip>
          <Dropdown menu={getActionMenu(record)} trigger={['click']}>
            <Button type="text"  icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      )
    }
  ];

  // 选择模式时的行选择配置
  const rowSelection = selectable ? {
    selectedRowKeys: selectedTemplateIds,
    onChange: (selectedRowKeys: React.Key[]) => {
      onSelectionChange?.(selectedRowKeys as number[]);
    },
    onSelect: (record: RoleTemplate, selected: boolean) => {
      if (selected) {
        onTemplateSelect?.(record);
      }
    }
  } : undefined;

  return (
    <div>
      {/* 统计卡片 - 仅在管理模式下显示 */}
      {mode === 'management' && stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic title="总模板数" value={stats.total_templates} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="系统模板" value={stats.system_templates} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="业务模板" value={stats.business_templates} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="自定义模板" value={stats.custom_templates} />
            </Card>
          </Col>
        </Row>
      )}

      {/* 主要内容卡片 */}
      <Card
        title={mode === 'management' ? '角色模板管理' : '选择角色模板'}
        extra={
          mode === 'management' && (
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                新建模板
              </Button>
              <Button icon={<UploadOutlined />}>
                导入模板
              </Button>
            </Space>
          )
        }
      >
        {/* 搜索和筛选 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Search
              placeholder="搜索模板名称或描述"
              onSearch={handleSearch}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择分类"
              allowClear
              style={{ width: '100%' }}
              value={filters.category || undefined}
              onChange={(value) => handleFilterChange('category', value)}
            >
              <Option value="system">系统模板</Option>
              <Option value="business">业务模板</Option>
              <Option value="custom">自定义模板</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择状态"
              allowClear
              style={{ width: '100%' }}
              value={filters.is_active}
              onChange={(value) => handleFilterChange('is_active', value)}
            >
              <Option value={true}>激活</Option>
              <Option value={false}>停用</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="模板类型"
              allowClear
              style={{ width: '100%' }}
              value={filters.is_system_template}
              onChange={(value) => handleFilterChange('is_system_template', value)}
            >
              <Option value={true}>系统模板</Option>
              <Option value={false}>用户模板</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Button icon={<FilterOutlined />} onClick={() => setFilters({
              category: '',
              industry: '',
              department: '',
              is_active: null,
              is_system_template: null,
              search: '',
              tags: [],
              level: null
            })}>
              清除筛选
            </Button>
          </Col>
        </Row>

        {/* 表格 */}
        <Table
          dataSource={templates}
          columns={columns}
          loading={loading}
          rowKey="id"
          rowSelection={rowSelection}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          
        />
      </Card>

      {/* 创建/编辑模板表单弹框 */}
      <Modal
        title={`${formMode === 'create' ? '新建' : formMode === 'edit' ? '编辑' : '克隆'}角色模板`}
        open={formModalVisible}
        onCancel={() => setFormModalVisible(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        <RoleTemplateForm
          form={form}
          mode={formMode}
          initialData={currentTemplate}
          onSubmit={handleFormSubmit}
          onCancel={() => setFormModalVisible(false)}
        />
      </Modal>

      {/* 模板详情弹框 */}
      <Modal
        title="角色模板详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={1000}
        destroyOnClose
      >
        {currentTemplate && (
          <RoleTemplateDetail
            template={currentTemplate}
            onEdit={() => {
              setDetailModalVisible(false);
              handleEdit(currentTemplate);
            }}
            onClone={() => {
              setDetailModalVisible(false);
              handleClone(currentTemplate);
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default RoleTemplateManager;